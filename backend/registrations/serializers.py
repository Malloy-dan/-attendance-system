from django.utils.text import slugify
from rest_framework import serializers

from .models import Event, Registration


class EventSerializer(serializers.ModelSerializer):
    registration_count = serializers.IntegerField(source="registrations.count", read_only=True)
    qr_code_url = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = [
            "id", "name", "description", "slug", "is_active",
            "created_at", "qr_code_url", "registration_count",
        ]
        read_only_fields = ["slug", "created_at", "qr_code_url", "registration_count"]

    def get_qr_code_url(self, obj):
        request = self.context.get("request")
        if obj.qr_code and request:
            return request.build_absolute_uri(obj.qr_code.url)
        return None

    def create(self, validated_data):
        base_slug = slugify(validated_data["name"])[:200]
        slug = base_slug
        counter = 1
        while Event.objects.filter(slug=slug).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1
        validated_data["slug"] = slug
        event = Event.objects.create(**validated_data)
        frontend_base_url = self.context.get("frontend_base_url", "http://localhost:5173")
        event.generate_qr_code(frontend_base_url)
        return event


class RegistrationCreateSerializer(serializers.ModelSerializer):
    event_slug = serializers.SlugField(write_only=True)

    class Meta:
        model = Registration
        fields = [
            "full_name", "phone_number", "student_id",
            "institutional_email", "department", "program_of_study",
            "academic_year", "device_fingerprint", "event_slug",
        ]

    def validate(self, attrs):
        try:
            event = Event.objects.get(slug=attrs["event_slug"], is_active=True)
        except Event.DoesNotExist:
            raise serializers.ValidationError(
                {"event_slug": "This event doesn't exist or is no longer accepting registrations."}
            )
        attrs["event"] = event

        valid_programs = {
            code for code, _ in Registration.DEPARTMENT_PROGRAMS[attrs["department"]]["programs"]
        }
        if attrs["program_of_study"] not in valid_programs:
            raise serializers.ValidationError(
                {"program_of_study": "This program doesn't belong to the selected department."}
            )

        if Registration.objects.filter(
            event=event, device_fingerprint=attrs["device_fingerprint"]
        ).exists():
            raise serializers.ValidationError(
                {"device": "This device has already been used to register for this event."}
            )
        return attrs

    def create(self, validated_data):
        validated_data.pop("event_slug", None)
        request = self.context.get("request")
        validated_data["ip_address"] = self._get_client_ip(request) if request else None
        validated_data["user_agent"] = request.META.get("HTTP_USER_AGENT", "")[:500] if request else ""
        return Registration.objects.create(**validated_data)

    @staticmethod
    def _get_client_ip(request):
        forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.META.get("REMOTE_ADDR")


class RegistrationSerializer(serializers.ModelSerializer):
    """Used by admins/devs to list & review registrations."""
    event_name = serializers.CharField(source="event.name", read_only=True)
    department_display = serializers.CharField(source="get_department_display", read_only=True)
    program_of_study_display = serializers.CharField(source="get_program_of_study_display", read_only=True)
    academic_year_display = serializers.CharField(source="get_academic_year_display", read_only=True)

    class Meta:
        model = Registration
        fields = [
            "id", "event", "event_name", "full_name", "phone_number",
            "student_id", "institutional_email", "department",
            "program_of_study", "academic_year", "department_display",
            "program_of_study_display", "academic_year_display",
            "ip_address", "is_flagged", "created_at",
        ]