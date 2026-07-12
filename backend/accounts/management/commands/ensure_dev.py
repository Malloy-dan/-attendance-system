from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

User = get_user_model()


class Command(BaseCommand):
    """
    Like create_dev, but safe to run on every deploy: does nothing if the
    account already exists instead of erroring. Reads credentials from
    --username/--email/--password so they can come from env vars in the
    build command, keeping the real password out of source control.
    """
    help = "Create the initial dev account if it doesn't already exist."

    def add_arguments(self, parser):
        parser.add_argument("--username", required=True)
        parser.add_argument("--email", required=True)
        parser.add_argument("--password", required=True)

    def handle(self, *args, **options):
        username = options["username"]
        if User.objects.filter(username=username).exists():
            self.stdout.write(f"User '{username}' already exists, skipping.")
            return

        user = User.objects.create_superuser(
            username=username,
            email=options["email"],
            password=options["password"],
        )
        user.role = User.Role.DEV
        user.is_active = True
        user.save()
        self.stdout.write(self.style.SUCCESS(f"Dev account '{username}' created."))
