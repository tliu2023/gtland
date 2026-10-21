from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone


class Command(BaseCommand):
    help = "Delete self-registered accounts that never verified their email."

    def add_arguments(self, parser):
        parser.add_argument("--days", type=int, default=7, help="Minimum account age in days (default 7).")
        parser.add_argument("--dry-run", action="store_true", help="Only report what would be deleted.")

    def handle(self, *args, days, dry_run, **options):
        stale = get_user_model().objects.filter(
            profile__email_verified=False,
            is_staff=False,
            is_superuser=False,
            date_joined__lt=timezone.now() - timedelta(days=days),
        )
        count = stale.count()
        if dry_run:
            self.stdout.write(f"Would delete {count} unverified account(s) older than {days} day(s).")
            return
        stale.delete()
        self.stdout.write(self.style.SUCCESS(f"Deleted {count} unverified account(s) older than {days} day(s)."))
