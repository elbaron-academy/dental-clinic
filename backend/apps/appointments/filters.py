"""Query-string filters for the appointment list (CR-020)."""

import datetime

from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime
from rest_framework.exceptions import ValidationError

from .models import AppointmentStatus


def _aware(value: str, name: str) -> datetime.datetime:
    try:
        parsed = parse_datetime(value)
    except ValueError:
        parsed = None
    if parsed is None:
        raise ValidationError({name: ["Use an ISO 8601 date-time."]})
    if timezone.is_naive(parsed):
        parsed = timezone.make_aware(parsed)
    return parsed


def filter_appointments(queryset, params):
    statuses = [s for s in params.get("status", "").split(",") if s]
    invalid = [s for s in statuses if s not in AppointmentStatus.values]
    if invalid:
        raise ValidationError({"status": [f"Unknown status: {', '.join(invalid)}."]})
    if statuses:
        queryset = queryset.filter(status__in=statuses)

    for name, lookup in (("doctor", "doctor_id"), ("patient", "patient_id")):
        value = params.get(name)
        if value:
            if not value.isdigit():
                raise ValidationError({name: ["Must be an id."]})
            queryset = queryset.filter(**{lookup: int(value)})

    if params.get("date"):
        try:
            day = parse_date(params["date"])
        except ValueError:
            day = None
        if day is None:
            raise ValidationError({"date": ["Use YYYY-MM-DD."]})
        queryset = queryset.filter(scheduled_at__date=day)
    if params.get("scheduled_from"):
        queryset = queryset.filter(
            scheduled_at__gte=_aware(params["scheduled_from"], "scheduled_from")
        )
    if params.get("scheduled_to"):
        queryset = queryset.filter(scheduled_at__lt=_aware(params["scheduled_to"], "scheduled_to"))
    return queryset
