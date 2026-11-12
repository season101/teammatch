from rest_framework.views import exception_handler as drf_exception_handler


def exception_handler(exc, context):
    """DRF's handler, plus the error's code beside its message.

    {"detail": "...", "code": "owns_open_project"}, so the frontend can branch on the
    code and the wording stays free to change. Field errors keep their usual shape.
    """
    response = drf_exception_handler(exc, context)
    if (
        response is not None
        and isinstance(response.data, dict)
        and set(response.data) == {"detail"}
    ):
        code = getattr(response.data["detail"], "code", None)
        if code:
            response.data["code"] = code
    return response
