from functools import wraps

from django.contrib.auth import get_user_model
from django.core import signing
from django.http import JsonResponse
from django.utils.crypto import constant_time_compare

from .verification import is_email_verified

ADMIN = "admin"
GRADING_ADMIN = "grading_admin"
USER = "user"

# group names double as role names; plain users have no group
ROLE_GROUPS = (ADMIN, GRADING_ADMIN)
SUBMISSION_EDITOR_ROLES = {ADMIN, GRADING_ADMIN}

TOKEN_SALT = "gtland.accounts.token"
TOKEN_MAX_AGE = 60 * 60 * 24 * 7


def role_for(user):
    if user.is_superuser:
        return ADMIN
    groups = set(user.groups.values_list("name", flat=True))
    for role in ROLE_GROUPS:
        if role in groups:
            return role
    return USER


def issue_token(user):
    # embedding the session auth hash invalidates tokens when the password changes
    return signing.dumps({"uid": user.pk, "h": user.get_session_auth_hash()}, salt=TOKEN_SALT)


def user_from_request(request):
    header = request.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        return None
    try:
        data = signing.loads(header[7:], salt=TOKEN_SALT, max_age=TOKEN_MAX_AGE)
    except signing.BadSignature:
        return None
    user = get_user_model().objects.filter(pk=data.get("uid"), is_active=True).first()
    if user is None or not constant_time_compare(data.get("h", ""), user.get_session_auth_hash()):
        return None
    if not is_email_verified(user):
        return None
    return user


def login_required_api(view):
    @wraps(view)
    def wrapper(request, *args, **kwargs):
        user = user_from_request(request)
        if user is None:
            return JsonResponse({"error": "Authentication required."}, status=401)
        request.user = user
        return view(request, *args, **kwargs)

    return wrapper


def submission_editor_required(view):
    @wraps(view)
    def wrapper(request, *args, **kwargs):
        user = user_from_request(request)
        if user is None:
            return JsonResponse({"error": "Authentication required."}, status=401)
        if role_for(user) not in SUBMISSION_EDITOR_ROLES:
            return JsonResponse({"error": "You don't have permission to change submissions."}, status=403)
        request.user = user
        return view(request, *args, **kwargs)

    return wrapper
