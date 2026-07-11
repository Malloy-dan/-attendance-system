from rest_framework.routers import DefaultRouter
from django.urls import path, include

from .views import (
    EventViewSet,
    PublicEventDetailView,
    CheckDeviceView,
    RegistrationCreateView,
    RegistrationListView,
    RegistrationExportView,
)

router = DefaultRouter()
router.register("events", EventViewSet, basename="event")

urlpatterns = [
    path("", include(router.urls)),
    path("public/events/<slug:slug>/", PublicEventDetailView.as_view(), name="public-event-detail"),
    path("public/check-device/", CheckDeviceView.as_view(), name="check-device"),
    path("public/register/", RegistrationCreateView.as_view(), name="register-create"),
    path("registrations/", RegistrationListView.as_view(), name="registration-list"),
    path("registrations/export/", RegistrationExportView.as_view(), name="registration-export"),
]
