from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin

from .models import Profile

User = get_user_model()


class ProfileInline(admin.StackedInline):
    model = Profile
    can_delete = False
    verbose_name_plural = "Email verification"


admin.site.unregister(User)


@admin.register(User)
class GtlandUserAdmin(UserAdmin):
    inlines = [ProfileInline]
    list_display = (*UserAdmin.list_display, "email_verified")
    list_filter = (*UserAdmin.list_filter, "profile__email_verified")

    @admin.display(boolean=True, description="Email verified")
    def email_verified(self, user):
        # no profile means admin-created, which is trusted
        return getattr(getattr(user, "profile", None), "email_verified", True)
