from django.core.management.base import BaseCommand, CommandError
from django.db import connection


class Command(BaseCommand):
    help = (
        "Grant the storefront's read-only database role SELECT on the catalog (cards_*) tables only. "
        "Safe to re-run; run after every migrate so new catalog tables are covered."
    )

    def add_arguments(self, parser):
        parser.add_argument("role", help="Name of the read-only Postgres role used by the storefront.")

    def handle(self, *args, role, **options):
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1 FROM pg_roles WHERE rolname = %s", [role])
            if cursor.fetchone() is None:
                raise CommandError(f"Role {role!r} does not exist.")
            cursor.execute(
                "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'cards\\_%%'"
            )
            tables = [row[0] for row in cursor.fetchall()]
            quote = connection.ops.quote_name
            cursor.execute(f"GRANT USAGE ON SCHEMA public TO {quote(role)}")
            for table in tables:
                cursor.execute(f"GRANT SELECT ON {quote(table)} TO {quote(role)}")
        self.stdout.write(self.style.SUCCESS(f"Granted SELECT on {len(tables)} table(s) to {role}."))
