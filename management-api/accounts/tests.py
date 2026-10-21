from datetime import timedelta
from io import StringIO

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core import mail
from django.core.cache import cache
from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from cards.models import CardDetails, Product

from .auth import issue_token
from .models import Profile
from .verification import email_verification_token

User = get_user_model()


class AuthApiTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user("alice", "alice@example.com", "s3cret-pass-123")

    def test_login_returns_token_and_role(self):
        res = self.client.post("/api/auth/login/", {"username": "alice", "password": "s3cret-pass-123"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["user"], {"username": "alice", "role": "user"})

        me = self.client.get("/api/auth/me/", HTTP_AUTHORIZATION=f"Bearer {res.json()['token']}")
        self.assertEqual(me.json(), {"username": "alice", "role": "user"})

    def test_login_rejects_bad_password_and_locks_out(self):
        for _ in range(5):
            res = self.client.post("/api/auth/login/", {"username": "alice", "password": "wrong"})
            self.assertEqual(res.status_code, 400)
        res = self.client.post("/api/auth/login/", {"username": "alice", "password": "s3cret-pass-123"})
        self.assertEqual(res.status_code, 429)

    def test_register_creates_unverified_user_and_sends_email(self):
        res = self.client.post(
            "/api/auth/register/",
            {"username": "bob", "email": "Bob@Example.com", "password1": "Another-pass-456", "password2": "Another-pass-456"},
        )
        self.assertEqual(res.status_code, 201)
        self.assertNotIn("token", res.json())
        bob = User.objects.get(username="bob")
        self.assertEqual(bob.email, "bob@example.com")
        self.assertFalse(bob.profile.email_verified)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("/verify-email?uid=", mail.outbox[0].body)

    def test_register_rejects_duplicate_email(self):
        res = self.client.post(
            "/api/auth/register/",
            {"username": "alice2", "email": "ALICE@example.com", "password1": "Another-pass-456", "password2": "Another-pass-456"},
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("email", res.json()["errors"])

    def test_register_rejects_weak_password(self):
        res = self.client.post(
            "/api/auth/register/",
            {"username": "bob", "email": "bob@example.com", "password1": "123", "password2": "123"},
        )
        self.assertEqual(res.status_code, 400)
        self.assertFalse(User.objects.filter(username="bob").exists())

    def test_tampered_or_stale_token_is_rejected(self):
        token = issue_token(self.user)
        self.assertEqual(self.client.get("/api/auth/me/", HTTP_AUTHORIZATION=f"Bearer {token}x").status_code, 401)

        self.user.set_password("changed-pass-789")
        self.user.save()
        self.assertEqual(self.client.get("/api/auth/me/", HTTP_AUTHORIZATION=f"Bearer {token}").status_code, 401)


class EmailVerificationTests(TestCase):
    password = "Unverified-pass-123"

    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user("carol", "carol@example.com", self.password)
        Profile.objects.create(user=self.user, email_verified=False)

    def verify(self, token=None):
        return self.client.post(
            "/api/auth/verify-email/",
            {
                "uid": urlsafe_base64_encode(force_bytes(self.user.pk)),
                "token": token or email_verification_token.make_token(self.user),
            },
        )

    def test_unverified_user_cannot_log_in_or_use_token(self):
        res = self.client.post("/api/auth/login/", {"username": "carol", "password": self.password})
        self.assertEqual(res.status_code, 403)
        self.assertEqual(res.json()["code"], "unverified")
        me = self.client.get("/api/auth/me/", HTTP_AUTHORIZATION=f"Bearer {issue_token(self.user)}")
        self.assertEqual(me.status_code, 401)

    def test_unverified_status_not_revealed_for_wrong_password(self):
        res = self.client.post("/api/auth/login/", {"username": "carol", "password": "wrong"})
        self.assertEqual(res.status_code, 400)

    def test_verify_then_login(self):
        token = email_verification_token.make_token(self.user)
        self.assertEqual(self.verify(token).status_code, 200)
        self.user.profile.refresh_from_db()
        self.assertTrue(self.user.profile.email_verified)
        # link is single-use, but reusing it reports "already verified" rather than an error
        self.assertEqual(self.verify(token).json()["code"], "already_verified")
        res = self.client.post("/api/auth/login/", {"username": "carol", "password": self.password})
        self.assertEqual(res.status_code, 200)

    def test_bad_token_rejected(self):
        res = self.verify("bad-token")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json()["code"], "invalid")

    def test_resend_is_generic_and_rate_limited(self):
        unknown = self.client.post("/api/auth/resend-verification/", {"email": "nobody@example.com"})
        first = self.client.post("/api/auth/resend-verification/", {"email": "CAROL@example.com"})
        second = self.client.post("/api/auth/resend-verification/", {"email": "carol@example.com"})
        self.assertEqual(unknown.json(), first.json())
        self.assertEqual(first.json(), second.json())
        self.assertEqual(len(mail.outbox), 1)

    def test_purge_removes_only_old_unverified_accounts(self):
        User.objects.filter(pk=self.user.pk).update(date_joined=timezone.now() - timedelta(days=8))
        fresh = User.objects.create_user("dave", "dave@example.com", self.password)
        Profile.objects.create(user=fresh, email_verified=False)
        legacy = User.objects.create_user("erin", "erin@example.com", self.password)
        User.objects.filter(pk=legacy.pk).update(date_joined=timezone.now() - timedelta(days=30))

        call_command("purge_unverified_users", days=7, stdout=StringIO())
        self.assertEqual(
            set(User.objects.values_list("username", flat=True)), {"dave", "erin"}
        )


class SubmissionPermissionTests(TestCase):
    payload = {"name": "Test card", "grading_company": "PSA", "submission_tier": "normal", "submission_status": "submission"}

    def make_user(self, username, group=None, superuser=False):
        user = User.objects.create_user(username, password="pw-for-tests-123", is_superuser=superuser)
        if group:
            user.groups.add(Group.objects.get(name=group))
        return {"HTTP_AUTHORIZATION": f"Bearer {issue_token(user)}"}

    def test_anonymous_cannot_create(self):
        self.assertEqual(self.client.post("/api/submissions/", self.payload).status_code, 401)

    def test_plain_user_cannot_create_update_or_delete(self):
        auth = self.make_user("viewer")
        self.assertEqual(self.client.post("/api/submissions/", self.payload, **auth).status_code, 403)

        product = Product.objects.create(slug="x", title="X", category="graded", price=0)
        card = CardDetails.objects.create(product=product, grading_company="PSA")
        self.assertEqual(self.client.post(f"/api/submissions/{card.pk}/", {"grade": "10"}, **auth).status_code, 403)
        self.assertEqual(self.client.post(f"/api/submissions/{card.pk}/delete/", **auth).status_code, 403)
        self.assertTrue(CardDetails.objects.filter(pk=card.pk).exists())

    def test_grading_admin_can_create_and_delete(self):
        auth = self.make_user("grader", group="grading_admin")
        res = self.client.post("/api/submissions/", self.payload, **auth)
        self.assertEqual(res.status_code, 200)
        card_id = res.json()["id"]
        self.assertEqual(self.client.post(f"/api/submissions/{card_id}/delete/", **auth).status_code, 200)
        self.assertFalse(CardDetails.objects.filter(pk=card_id).exists())

    def test_admin_group_and_superuser_can_create(self):
        for auth in (self.make_user("boss", group="admin"), self.make_user("root", superuser=True)):
            self.assertEqual(self.client.post("/api/submissions/", self.payload, **auth).status_code, 200)
