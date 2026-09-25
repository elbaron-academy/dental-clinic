from django.core.exceptions import ValidationError

# FDI World Dental Federation two-digit notation (CR-011).
PERMANENT_TEETH = {f"{q}{t}" for q in range(1, 5) for t in range(1, 9)}
PRIMARY_TEETH = {f"{q}{t}" for q in range(5, 9) for t in range(1, 6)}
VALID_TEETH = PERMANENT_TEETH | PRIMARY_TEETH


def validate_tooth(value: str) -> None:
    if value and value not in VALID_TEETH:
        raise ValidationError(
            "Use FDI tooth notation: 11-48 for permanent or 51-85 for primary teeth.",
            code="invalid_tooth",
        )
