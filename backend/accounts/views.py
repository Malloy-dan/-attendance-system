from django.contrib.auth import get_user_model
from rest_framework import viewsets, permissions
from rest_framework_simplejwt.views import TokenObtainPairView

from .permissions import IsDev
from .serializers import CustomTokenObtainPairSerializer, StaffUserSerializer

User = get_user_model()


class LoginView(TokenObtainPairView):
    """POST username + password -> access/refresh tokens + role."""
    serializer_class = CustomTokenObtainPairSerializer


class StaffUserViewSet(viewsets.ModelViewSet):
    """
    Dev-only page: create/edit/deactivate admin and dev accounts.
    This is the "dev's own page" where the developer manages the system.
    """
    queryset = User.objects.all().order_by("-date_joined")
    serializer_class = StaffUserSerializer
    permission_classes = [permissions.IsAuthenticated, IsDev]
