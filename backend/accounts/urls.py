from rest_framework.routers import DefaultRouter
from .views import StaffUserViewSet

router = DefaultRouter()
router.register("staff", StaffUserViewSet, basename="staff")

urlpatterns = router.urls
