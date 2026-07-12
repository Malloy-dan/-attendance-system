import csv
from io import BytesIO

from django.http import HttpResponse
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from openpyxl import Workbook
from openpyxl.styles import Font
from rest_framework import viewsets, generics, permissions, filters, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Event, Registration
from .permissions import IsAdminOrDev, IsDev
from .serializers import EventSerializer, RegistrationCreateSerializer, RegistrationSerializer


class EventViewSet(viewsets.ModelViewSet):
    """
    Dev-only create/update/delete of events (this is where QR codes are
    generated). Admins get read-only access so they can see which event
    they're monitoring.
    """
    queryset = Event.objects.all()
    serializer_class = EventSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [permissions.IsAuthenticated(), IsAdminOrDev()]
        return [permissions.IsAuthenticated(), IsDev()]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["frontend_base_url"] = self.request.data.get(
            "frontend_base_url", "http://localhost:5173"
        )
        return context


class PublicEventDetailView(generics.RetrieveAPIView):
    """
    Public endpoint the registration page hits to confirm the event
    (from the QR code slug) exists and is open before showing the form.
    """
    queryset = Event.objects.filter(is_active=True)
    serializer_class = EventSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "slug"


class CheckDeviceView(APIView):
    """
    Public endpoint: given an event slug + device fingerprint, tells the
    frontend whether this device has already registered — used so a user
    who cleared localStorage still gets blocked before submitting.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        slug = request.data.get("event_slug")
        fingerprint = request.data.get("device_fingerprint")
        if not slug or not fingerprint:
            return Response(
                {"detail": "event_slug and device_fingerprint are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        already_registered = Registration.objects.filter(
            event__slug=slug, device_fingerprint=fingerprint
        ).exists()
        return Response({"already_registered": already_registered})


class RegistrationCreateView(generics.CreateAPIView):
    """Public: the form a user fills out after scanning the QR code."""
    queryset = Registration.objects.all()
    serializer_class = RegistrationCreateSerializer
    permission_classes = [permissions.AllowAny]


class RegistrationListView(generics.ListAPIView):
    """Admin/dev: view + search + filter registered attendees."""
    queryset = Registration.objects.select_related("event").all()
    serializer_class = RegistrationSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrDev]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["event", "is_flagged"]
    search_fields = ["full_name", "phone_number", "student_id", "institutional_email"]
    ordering_fields = ["created_at", "full_name"]


class RegistrationDeleteView(generics.DestroyAPIView):
    """
    Admin/dev: remove a single registration (e.g. a duplicate, a mistake,
    or someone who shouldn't have checked in). This frees up their device
    fingerprint too, so they could register again for the same event.
    """
    queryset = Registration.objects.all()
    permission_classes = [permissions.IsAuthenticated, IsAdminOrDev]


class RegistrationExportView(APIView):
    """Admin/dev: download the attendee list as CSV for printing/records."""
    permission_classes = [permissions.IsAuthenticated, IsAdminOrDev]

    def get(self, request):
        event_id = request.query_params.get("event")
        qs = Registration.objects.select_related("event").all()
        if event_id:
            qs = qs.filter(event_id=event_id)

        response = HttpResponse(content_type="text/csv")
        filename = f"attendance_{timezone.now().strftime('%Y%m%d_%H%M')}.csv"
        response["Content-Disposition"] = f'attachment; filename="{filename}"'

        writer = csv.writer(response)
        writer.writerow(
            ["#", "Full Name", "Phone Number", "Student ID", "Institutional Email",
             "Department", "Program of Study", "Academic Year", "Event", "Registered At"]
        )
        for i, reg in enumerate(qs, start=1):
            writer.writerow([
                i, reg.full_name, reg.phone_number, reg.student_id,
                reg.institutional_email, reg.get_department_display(),
                reg.get_program_of_study_display(), reg.get_academic_year_display(),
                reg.event.name, reg.created_at.strftime("%Y-%m-%d %H:%M"),
            ])
        return response


class RegistrationExportXlsxView(APIView):
    """Admin/dev: download the attendee list as a real .xlsx Excel file."""
    permission_classes = [permissions.IsAuthenticated, IsAdminOrDev]

    HEADERS = [
        "#", "Full Name", "Phone Number", "Student ID", "Institutional Email",
        "Department", "Program of Study", "Academic Year", "Event", "Registered At",
    ]

    def get(self, request):
        event_id = request.query_params.get("event")
        qs = Registration.objects.select_related("event").all()
        if event_id:
            qs = qs.filter(event_id=event_id)

        wb = Workbook()
        ws = wb.active
        ws.title = "Attendance"

        ws.append(self.HEADERS)
        for cell in ws[1]:
            cell.font = Font(bold=True)

        for i, reg in enumerate(qs, start=1):
            ws.append([
                i, reg.full_name, reg.phone_number, reg.student_id,
                reg.institutional_email, reg.get_department_display(),
                reg.get_program_of_study_display(), reg.get_academic_year_display(),
                reg.event.name, reg.created_at.strftime("%Y-%m-%d %H:%M"),
            ])

        # Auto-size columns roughly to content
        for col_cells in ws.columns:
            length = max((len(str(c.value)) for c in col_cells if c.value is not None), default=10)
            ws.column_dimensions[col_cells[0].column_letter].width = min(length + 2, 45)

        buffer = BytesIO()
        wb.save(buffer)
        buffer.seek(0)

        filename = f"attendance_{timezone.now().strftime('%Y%m%d_%H%M')}.xlsx"
        response = HttpResponse(
            buffer.getvalue(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response