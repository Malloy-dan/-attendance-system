import uuid
from io import BytesIO

import qrcode
from django.core.files.base import ContentFile
from django.db import models


class Event(models.Model):
    """
    An attendance session/event. Each event gets its own QR code and its
    own pool of registrations, so device-uniqueness is enforced per event
    (a phone can register once per event, not once ever).
    """
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    slug = models.SlugField(unique=True, max_length=220)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, related_name="events_created"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    qr_code = models.ImageField(upload_to="qr_codes/", blank=True, null=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name

    def registration_url(self, frontend_base_url: str) -> str:
        return f"{frontend_base_url.rstrip('/')}/register/{self.slug}"

    def generate_qr_code(self, frontend_base_url: str, save=True):
        url = self.registration_url(frontend_base_url)
        qr_img = qrcode.make(url, box_size=10, border=2)
        buffer = BytesIO()
        qr_img.save(buffer, format="PNG")
        filename = f"{self.slug}.png"
        self.qr_code.save(filename, ContentFile(buffer.getvalue()), save=save)
        return self.qr_code


class Registration(models.Model):
    """
    A single attendee's registration for an Event. Device-uniqueness is
    enforced by (event, device_token) AND (event, device_fingerprint):
    either one matching an existing row blocks a new registration, so
    clearing localStorage alone (fingerprint still matches) or a
    fingerprint collision alone (token still matches) both get caught.
    """

    # Each department maps to its own set of programs. This is the single
    # source of truth — DEPARTMENT_CHOICES and PROGRAM_CHOICES below are
    # derived from it so the two never drift out of sync.
    DEPARTMENT_PROGRAMS = {
        "computer_science": {
            "label": "Department of Computer Science",
            "programs": [
                ("bsc_computer_science", "B.Sc. in Computer Science"),
                ("bsc_data_science", "B.Sc. in Data Science"),
                ("bsc_network_science", "B.Sc. in Network Science"),
                ("dip_computer_science", "Diploma in Computer Science"),
            ],
        },
        "information_systems_technology": {
            "label": "Department of Information Systems & Technology",
            "programs": [
                ("bsc_information_technology", "B.Sc. in Information Technology"),
                ("bsc_information_systems", "B.Sc. in Information Systems"),
            ],
        },
        "business_computing": {
            "label": "Department of Business Computing",
            "programs": [
                ("bsc_computing_with_accounting", "B.Sc. in Computing-With-Accounting"),
            ],
        },
        "cyber_security_computer_engineering": {
            "label": "Department of Cyber Security & Computer Engineering Technology",
            "programs": [
                ("bsc_cyber_security", "B.Sc. in Cyber Security"),
                ("bsc_software_engineering", "B.Sc. in Software Engineering"),
                ("dip_cyber_security", "Diploma in Cyber Security"),
                ("dip_software_engineering", "Diploma in Software Engineering"),
            ],
        },
    }

    DEPARTMENT_CHOICES = [(key, val["label"]) for key, val in DEPARTMENT_PROGRAMS.items()]
    PROGRAM_CHOICES = [
        program for val in DEPARTMENT_PROGRAMS.values() for program in val["programs"]
    ]

    ACADEMIC_YEAR_CHOICES = [
        ("200", "Level 200"),
        ("300", "Level 300"),
    ]

    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="registrations")

    full_name = models.CharField(max_length=150)
    phone_number = models.CharField(max_length=20)
    student_id = models.CharField(max_length=50)
    institutional_email = models.EmailField()
    department = models.CharField(max_length=50, choices=DEPARTMENT_CHOICES)
    program_of_study = models.CharField(max_length=50, choices=PROGRAM_CHOICES)
    academic_year = models.CharField(max_length=10, choices=ACADEMIC_YEAR_CHOICES)

    # Device-uniqueness signals
    device_token = models.UUIDField(default=uuid.uuid4, editable=False)
    device_fingerprint = models.CharField(max_length=255, db_index=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=500, blank=True)

    is_flagged = models.BooleanField(
        default=False,
        help_text="Set automatically when a fingerprint collision is manually approved by an admin.",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["event", "device_fingerprint"], name="unique_device_per_event"
            ),
        ]

    def __str__(self):
        return f"{self.full_name} — {self.event.name}"