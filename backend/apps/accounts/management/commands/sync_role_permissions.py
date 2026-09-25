from django.core.management.base import BaseCommand

from apps.accounts.roles import ensure_role_groups


class Command(BaseCommand):
    help = "Create the Doctor/Assistant/Receptionist groups and grant their default permissions."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Remove permissions that were added to the role groups by hand.",
        )

    def handle(self, *args, reset=False, **options):
        missing = ensure_role_groups(reset=reset)
        for name in missing:
            self.stderr.write(self.style.WARNING(f"Permission not found: {name}"))
        self.stdout.write(self.style.SUCCESS("Role groups are up to date."))
