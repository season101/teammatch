from django.core.exceptions import ValidationError
from rest_framework.exceptions import NotFound
from rest_framework.pagination import CursorPagination


class DefaultCursorPagination(CursorPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 50
    ordering = "-created_at"

    def paginate_queryset(self, queryset, request, view=None):
        try:
            return super().paginate_queryset(queryset, request, view)
        except ValidationError:
            # DRF decodes a forged cursor fine, then the ORM rejects its position
            raise NotFound(self.invalid_cursor_message) from None
