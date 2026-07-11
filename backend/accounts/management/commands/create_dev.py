from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

User = get_user_model()


class Command(BaseCommand):
    help = "Create the initial developer account (role=dev) with full system access."

    def add_arguments(self, parser):
        parser.add_argument("--username", required=True)
        parser.add_argument("--email", required=True)
        parser.add_argument("--password", required=True)

    def handle(self, *args, **options):
        username = options["username"]
        if User.objects.filter(username=username).exists():
            raise CommandError(f"User '{username}' already exists.")

        user = User.objects.create_superuser(
            username=username,
            email=options["email"],
            password=options["password"],
        )
        user.role = User.Role.DEV
        user.save()
        self.stdout.write(self.style.SUCCESS(f"Dev account '{username}' created."))
