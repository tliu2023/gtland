from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def verify_existing_users(apps, schema_editor):
    # accounts created before verification existed (e.g. createsuperuser) are trusted
    User = apps.get_model(*settings.AUTH_USER_MODEL.split("."))
    Profile = apps.get_model("accounts", "Profile")
    Profile.objects.bulk_create(
        [Profile(user_id=pk, email_verified=True) for pk in User.objects.values_list("pk", flat=True)]
    )


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0001_role_groups"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Profile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("email_verified", models.BooleanField(default=False)),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="profile",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
        ),
        migrations.RunPython(verify_existing_users, migrations.RunPython.noop),
    ]
