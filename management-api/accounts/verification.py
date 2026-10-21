from django.conf import settings
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from .models import Profile


def is_email_verified(user):
    # users without a profile were created by admins/createsuperuser and are trusted
    profile = Profile.objects.filter(user=user).first()
    return profile is None or profile.email_verified


class EmailVerificationTokenGenerator(PasswordResetTokenGenerator):
    """Single-use: the hash changes once the email is verified. Expires after PASSWORD_RESET_TIMEOUT."""

    key_salt = "gtland.accounts.email_verification"

    def _make_hash_value(self, user, timestamp):
        return f"{user.pk}{user.email}{is_email_verified(user)}{timestamp}"


email_verification_token = EmailVerificationTokenGenerator()


def send_verification_email(user):
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = email_verification_token.make_token(user)
    link = f"{settings.STOREFRONT_URL}/verify-email?uid={uid}&token={token}"
    send_mail(
        subject="Verify your gtland account",
        message=(
            f"Hi {user.username},\n\n"
            f"Confirm your email address to finish creating your gtland account:\n{link}\n\n"
            "This link expires in 3 days. If you didn't sign up, you can ignore this email."
        ),
        from_email=None,
        recipient_list=[user.email],
    )
