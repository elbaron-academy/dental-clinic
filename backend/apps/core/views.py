from django.db import connection
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


class HealthView(APIView):
    """Liveness/readiness probe for load balancers and deployment checks."""

    authentication_classes: list = []
    permission_classes = [AllowAny]

    @extend_schema(
        responses=inline_serializer(
            "Health",
            fields={"status": serializers.CharField(), "database": serializers.CharField()},
        )
    )
    def get(self, request):
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        return Response({"status": "ok", "database": "ok"})
