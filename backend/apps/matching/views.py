from drf_spectacular.utils import extend_schema
from rest_framework import generics

from apps.core.pagination import DefaultCursorPagination

from . import services
from .serializers import FeedRoleSerializer


@extend_schema(tags=["feed"])
class FeedView(generics.ListAPIView):
    serializer_class = FeedRoleSerializer
    pagination_class = DefaultCursorPagination

    def get_queryset(self):
        return services.feed_roles(self.request.user)
