import pytest
from django.core.exceptions import ValidationError

from apps.core.phone import normalize_phone, validate_phone


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("+20 100-123 4567", "+201001234567"),
        (" (010) 1234.5678 ", "01012345678"),
        ("01012345678", "01012345678"),
        (None, ""),
    ],
)
def test_normalize_phone(raw, expected):
    assert normalize_phone(raw) == expected


@pytest.mark.parametrize("value", ["01012345678", "+201001234567", "1234567"])
def test_valid_phones(value):
    validate_phone(value)


@pytest.mark.parametrize("value", ["", "123", "abc12345678", "++2010012345", "1234567890123456"])
def test_invalid_phones(value):
    with pytest.raises(ValidationError):
        validate_phone(value)
