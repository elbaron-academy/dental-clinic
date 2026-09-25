"""Phone number normalisation shared by users and patients (CR-006)."""

import re

from django.core.exceptions import ValidationError

_SEPARATORS = re.compile(r"[\s\-\.\(\)]")
_VALID = re.compile(r"^\+?\d{7,15}$")


def normalize_phone(value: str | None) -> str:
    """Strip common separators. ``"+20 100-123 4567"`` -> ``"+201001234567"``."""
    if value is None:
        return ""
    return _SEPARATORS.sub("", str(value).strip())


def validate_phone(value: str) -> None:
    if not _VALID.match(normalize_phone(value)):
        raise ValidationError(
            "Enter a valid phone number (7-15 digits, optional leading +).",
            code="invalid_phone",
        )
