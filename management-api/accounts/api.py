from django import forms
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.forms import UserCreationForm
from django.core.cache import cache
from django.db import transaction
from django.http import JsonResponse
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST

from .auth import issue_token, role_for, user_from_request
from .models import Profile
from .verification import email_verification_token, is_email_verified, send_verification_email

User = get_user_model()

MAX_LOGIN_FAILURES = 5
LOGIN_LOCKOUT_SECONDS = 15 * 60
RESEND_COOLDOWN_SECONDS = 60


class RegistrationForm(UserCreationForm):
    email = forms.EmailField()

    class Meta(UserCreationForm.Meta):
        fields = ("username", "email")

    def clean_email(self):
        email = self.cleaned_data["email"].strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise forms.ValidationError("An account with this email already exists.")
        return email


def _session_response(user, status=200):
    return JsonResponse(
        {"token": issue_token(user), "user": {"username": user.username, "role": role_for(user)}},
        status=status,
    )


# called server-to-server by the storefront, which holds the token in an httpOnly cookie
@csrf_exempt
@require_POST
def login(request):
    username = request.POST.get("username", "").strip()
    password = request.POST.get("password", "")
    failures_key = f"login-failures:{username.lower()}"

    if cache.get(failures_key, 0) >= MAX_LOGIN_FAILURES:
        return JsonResponse(
            {"error": "Too many failed attempts. Try again in 15 minutes."}, status=429
        )

    user = authenticate(request, username=username, password=password)
    if user is None:
        cache.add(failures_key, 0, LOGIN_LOCKOUT_SECONDS)
        cache.incr(failures_key)
        return JsonResponse({"error": "Invalid username or password."}, status=400)

    cache.delete(failures_key)
    # only revealed after a correct password, so it doesn't leak which accounts exist
    if not is_email_verified(user):
        return JsonResponse(
            {"error": "Please verify your email before logging in.", "code": "unverified"}, status=403
        )
    return _session_response(user)


@csrf_exempt
@require_POST
def register(request):
    form = RegistrationForm(request.POST)
    if not form.is_valid():
        return JsonResponse({"errors": form.errors}, status=400)
    with transaction.atomic():
        user = form.save()
        Profile.objects.create(user=user, email_verified=False)
    send_verification_email(user)
    return JsonResponse({"detail": "Check your email to verify your account."}, status=201)


@csrf_exempt
@require_POST
def verify_email(request):
    try:
        user = User.objects.get(pk=force_str(urlsafe_base64_decode(request.POST.get("uid", ""))))
    except (ValueError, TypeError, OverflowError, User.DoesNotExist):
        user = None

    if user is not None and email_verification_token.check_token(user, request.POST.get("token", "")):
        Profile.objects.update_or_create(user=user, defaults={"email_verified": True})
        return JsonResponse({"detail": "Email verified."})
    if user is not None and is_email_verified(user):
        return JsonResponse({"detail": "Email already verified.", "code": "already_verified"})
    return JsonResponse(
        {"error": "This verification link is invalid or has expired.", "code": "invalid"}, status=400
    )


@csrf_exempt
@require_POST
def resend_verification(request):
    email = request.POST.get("email", "").strip().lower()
    # same response either way so this can't be used to discover registered emails
    response = JsonResponse(
        {"detail": "If an unverified account exists for that email, a new link has been sent."}
    )
    if not email or not cache.add(f"verify-resend:{email}", 1, RESEND_COOLDOWN_SECONDS):
        return response
    user = User.objects.filter(
        email__iexact=email, is_active=True, profile__email_verified=False
    ).first()
    if user is not None:
        send_verification_email(user)
    return response


@require_GET
def me(request):
    user = user_from_request(request)
    if user is None:
        return JsonResponse({"error": "Authentication required."}, status=401)
    return JsonResponse({"username": user.username, "role": role_for(user)})
