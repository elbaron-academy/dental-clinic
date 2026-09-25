from rest_framework import status
from rest_framework.exceptions import APIException, ErrorDetail
from rest_framework.views import exception_handler


class BusinessRuleViolation(APIException):
    """A request that is well-formed but breaks a business rule (HTTP 409).

    Example: starting a second active visit for the same patient.
    """

    status_code = status.HTTP_409_CONFLICT
    default_detail = "This action is not allowed in the current state."
    default_code = "conflict"


def api_exception_handler(exc, context):
    """DRF's default handler, plus a machine-readable ``code`` for single errors.

    ``{"detail": "...", "code": "active_visit_exists"}`` lets clients react to
    specific failures without parsing human-readable text.
    """
    response = exception_handler(exc, context)
    if response is None or not isinstance(response.data, dict):
        return response
    detail = response.data.get("detail")
    if isinstance(detail, ErrorDetail) and "code" not in response.data:
        response.data["code"] = detail.code
    return response
