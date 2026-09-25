from django.apps import AppConfig
from django.db.models.signals import post_migrate


def _ensure_role_groups(sender, using="default", **kwargs):
    from .roles import ensure_role_groups

    ensure_role_groups(using=using)


class AccountsConfig(AppConfig):
    name = "apps.accounts"
    label = "accounts"
    verbose_name = "Accounts"

    def ready(self):
        post_migrate.connect(_ensure_role_groups, dispatch_uid="accounts.ensure_role_groups")
