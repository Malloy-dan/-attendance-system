from django.contrib import admin
from .models import Event, Registration


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "is_active", "created_at", "created_by")
    list_filter = ("is_active",)
    search_fields = ("name", "slug")


@admin.register(Registration)
class RegistrationAdmin(admin.ModelAdmin):
    list_display = (
        "full_name", "event", "phone_number", "student_id", "institutional_email",
        "department", "program_of_study", "academic_year", "created_at",
    )
    list_filter = ("event", "is_flagged", "department", "program_of_study", "academic_year")
    search_fields = ("full_name", "phone_number", "student_id", "institutional_email")