from django.contrib.auth.models import update_last_login
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .serializers import (
    DoctorSummarySerializer,
    LoginResponseSerializer,
    LoginSerializer,
    MeSerializer,
)


class LoginView(APIView):
    """Phone number + password login for every role (AUTH-001)."""

    authentication_classes: list = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    @extend_schema(request=LoginSerializer, responses={200: LoginResponseSerializer})
    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        token, _ = Token.objects.get_or_create(user=user)
        update_last_login(None, user)
        return Response({"token": token.key, "user": MeSerializer(user).data})


class LogoutView(APIView):
    """Revokes the token used for the request."""

    @extend_schema(request=None, responses={204: None})
    def post(self, request):
        if isinstance(request.auth, Token):
            request.auth.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    """The signed-in user, their clinic, permissions and permitted doctors (AUTH-002)."""

    @extend_schema(responses=MeSerializer)
    def get(self, request):
        return Response(MeSerializer(request.user).data)


class DoctorListView(APIView):
    """Doctors the user may select (CLINIC-002/003).

    When exactly one doctor is returned, clients select it automatically.
    """

    @extend_schema(responses=DoctorSummarySerializer(many=True))
    def get(self, request):
        return Response(DoctorSummarySerializer(request.user.permitted_doctors(), many=True).data)
