from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Custom user model for staff accounts only.
    Public attendees who register via QR code are NOT User accounts —
    they are Registration records (see registrations app). This keeps
    the "3 roles" strictly to people who log in to the system.
    """

    class Role(models.TextChoices):
        DEV = "dev", "Developer"
        ADMIN = "admin", "Administrator"

    role = models.CharField(max_length=10, choices=Role.choices, default=Role.ADMIN)

    @property
    def is_dev(self):
        return self.role == self.Role.DEV

    @property
    def is_admin_role(self):
        return self.role == self.Role.ADMIN

    def __str__(self):
        return f"{self.username} ({self.role})"
