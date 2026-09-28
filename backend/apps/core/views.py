from django.http import JsonResponse
from django.views.decorators.http import require_GET
from drf_spectacular.utils import extend_schema
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .serializers import HealthSerializer
from .services import readiness


@require_GET
def healthz(request):
    return JsonResponse({"status": "ok"})


@require_GET
def readyz(request):
    report = readiness()
    return JsonResponse(report, status=200 if report["status"] == "ok" else 503)


# Same report as /readyz, but under /api/v1 so the web app can show it through the client.
# Always 200: the body says whether things are healthy.
@extend_schema(operation_id="health_retrieve", responses=HealthSerializer, tags=["health"])
@api_view(["GET"])
@permission_classes([AllowAny])
def health(request):
    return Response(HealthSerializer(readiness()).data)
