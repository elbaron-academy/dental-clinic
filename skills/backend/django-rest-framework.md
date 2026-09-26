# Django REST Framework Engineering Skill

## Purpose

This skill defines the standard architecture, development workflow, testing strategy, Docker configuration, deployment structure, and engineering rules for Django REST Framework backend projects.

This skill is **domain-agnostic**.

It can be used for any DRF backend, including:

* SaaS
* Delivery
* Healthcare
* E-commerce
* ERP
* CRM
* Booking
* Fintech
* Internal systems
* APIs
* Microservices

The skill supports three modes:

1. **CREATE** — create a new DRF project.
2. **REFACTOR** — refactor an existing Django/DRF project.
3. **UPDATE** — add or modify functionality in an existing project.

---

# 1. General Engineering Principles

The agent MUST:

* Read and understand the project before making changes.
* Keep business domains separated into Django apps.
* Keep business logic in the backend.
* Keep cross-cutting infrastructure in `common/`.
* Use environment variables for configuration and secrets.
* Use automated tests for business behavior.
* Preserve existing behavior when refactoring unless explicitly requested otherwise.
* Avoid unnecessary rewrites.
* Prefer incremental and testable changes.
* Maintain backward compatibility whenever possible.
* Keep API contracts consistent.
* Use migrations for database schema changes.
* Never hardcode secrets, domains, ports, filesystem paths, or service names.
* Treat deployment configuration as code.
* Validate changes before declaring work complete.

The backend is the source of truth for:

* Business rules
* Validation
* Authorization
* State transitions
* Data integrity
* Security
* Business calculations
* Lifecycle rules

Frontend applications must not duplicate backend business rules.

---

# 2. Technology Stack

## Required

* Python 3.13+
* Django
* Django REST Framework
* `django-environ`
* `dj-database-url`
* `djangorestframework-simplejwt`
* `drf-spectacular`
* pytest
* pytest-django
* pytest-cov
* Docker
* Docker Compose

## Database

Local development:

* SQLite by default

Staging:

* PostgreSQL

Production:

* PostgreSQL

## Optional Infrastructure

* Redis
* Celery
* Celery Beat
* Nginx
* systemd

Celery and Redis are optional and must be controlled through environment configuration.

---

# 3. Standard Project Structure

A new project SHOULD use:

```text
backend/
├── manage.py
│
├── config/
│   ├── __init__.py
│   ├── celery.py
│   │
│   ├── settings/
│   │   ├── __init__.py
│   │   ├── base.py
│   │   ├── development.py
│   │   └── production.py
│   │
│   ├── urls.py
│   ├── asgi.py
│   └── wsgi.py
│
├── apps/
│   ├── __init__.py
│   │
│   ├── users/
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── models.py
│   │   ├── managers.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── permissions.py
│   │   ├── services.py
│   │   ├── selectors.py
│   │   ├── tasks.py
│   │   ├── tests/
│   │   │   ├── __init__.py
│   │   │   ├── conftest.py
│   │   │   ├── test_models.py
│   │   │   ├── test_serializers.py
│   │   │   ├── test_views.py
│   │   │   ├── test_services.py
│   │   │   └── test_tasks.py
│   │   └── migrations/
│   │
│   └── <domain_apps>/
│
├── common/
│   ├── __init__.py
│   ├── models.py
│   ├── managers.py
│   ├── exceptions.py
│   ├── exception_handler.py
│   ├── responses.py
│   ├── pagination.py
│   └── permissions.py
│
├── tests/
│   ├── __init__.py
│   └── conftest.py
│
├── requirements/
│   ├── base.txt
│   ├── development.txt
│   └── production.txt
│
├── docker/
│   ├── local/
│   │   ├── Dockerfile
│   │   └── docker-compose.yml
│   │
│   ├── staging/
│   │   ├── Dockerfile
│   │   └── docker-compose.yml
│   │
│   └── production/
│       ├── Dockerfile
│       └── docker-compose.yml
│
├── deploy/
│   ├── nginx/
│   │   ├── generate.sh
│   │   └── templates/
│   │       └── nginx.conf.template
│   │
│   ├── systemd/
│   │   └── templates/
│   │       └── backend.service.template
│   │
│   └── scripts/
│       ├── deploy.sh
│       ├── migrate.sh
│       ├── collectstatic.sh
│       ├── restart.sh
│       └── healthcheck.sh
│
├── scripts/
│   ├── entrypoint.sh
│   └── wait_for_db.sh
│
├── .env
├── .env.example
├── .gitignore
├── Makefile
├── pytest.ini
└── README.md
```

The structure may be adapted for an existing project when necessary.

Do not force a large refactor merely to match this structure if the existing architecture is already valid.

---

# 4. CREATE Mode

When creating a new DRF project, follow this order:

```text
Requirements
    ↓
Project structure
    ↓
Settings
    ↓
Environment configuration
    ↓
Database
    ↓
DRF
    ↓
JWT
    ↓
Common infrastructure
    ↓
OpenAPI
    ↓
Testing
    ↓
Docker
    ↓
Celery/Redis if enabled
    ↓
Deployment structure
    ↓
Domain applications
    ↓
Business features
    ↓
Validation
```

The agent MUST establish the foundation before implementing business features.

---

# 5. REFACTOR Mode

When refactoring an existing project:

DO NOT immediately rewrite the project.

First inspect:

```text
Project structure
Settings
Requirements
Models
Managers
Views
ViewSets
Serializers
URLs
Permissions
Authentication
Services
Selectors
Tasks
Tests
Migrations
Environment configuration
Docker
Docker Compose
Nginx
systemd
Deployment scripts
API documentation
```

Then identify:

```text
Current architecture
Problems
Technical debt
Security risks
Testing gaps
Deployment problems
Performance problems
Potential breaking changes
Recommended refactoring order
```

Refactor incrementally.

Recommended order:

```text
1. Environment configuration
2. Settings separation
3. Common infrastructure
4. Authentication
5. Exception handling
6. Response standardization
7. Base model
8. Soft delete/managers
9. Domain separation
10. Services/selectors
11. Testing
12. OpenAPI
13. Docker
14. Deployment
15. Performance
```

Never perform a large rewrite without a clear reason.

---

# 6. UPDATE Mode

When adding a feature to an existing project:

```text
Read
→ Understand
→ Identify affected domain
→ Inspect existing implementation
→ Inspect tests
→ Implement
→ Add/update tests
→ Update OpenAPI
→ Run validation
```

Do not modify unrelated functionality.

---

# 7. Settings

Never put all settings into one file.

Use:

```text
config/settings/
├── base.py
├── development.py
└── production.py
```

## base.py

Contains shared settings:

* Installed apps
* Middleware
* DRF
* Authentication
* JWT
* OpenAPI
* Internationalization
* Static/media configuration
* Shared security configuration

## development.py

Contains local development configuration.

## production.py

Contains production configuration.

---

# 8. Environment Variables

Use `.env` for local configuration.

Commit only:

```text
.env.example
```

Never commit:

```text
.env
```

Example:

```env
SECRET_KEY=change-me
DEBUG=True

DATABASE_URL=sqlite:///db.sqlite3

ALLOWED_HOSTS=localhost,127.0.0.1

JWT_ACCESS_TOKEN_LIFETIME_MINUTES=30
JWT_REFRESH_TOKEN_LIFETIME_DAYS=7

CELERY_ENABLED=False
CELERY_BEAT_ENABLED=False

CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/1

CELERY_WORKER_CONCURRENCY=2

DOMAIN=localhost

BACKEND_PORT=8000
FRONTEND_PORT=3000

BACKEND_PATH=/opt/app/backend
FRONTEND_PATH=/opt/app/frontend

MEDIA_PATH=/opt/app/backend/media
STATIC_PATH=/opt/app/backend/static

SYSTEMD_SERVICE_NAME=myapp-backend
```

Never hardcode:

* Secrets
* Passwords
* API keys
* Domains
* Ports
* Filesystem paths
* systemd service names

---

# 9. Database

Use `DATABASE_URL`.

Example:

```python
import dj_database_url

DATABASES = {
    "default": dj_database_url.config(
        default="sqlite:///db.sqlite3",
        conn_max_age=600,
    )
}
```

Default:

```text
SQLite
```

Production:

```text
PostgreSQL
```

All schema changes MUST use Django migrations.

---

# 10. `common/`

Use `common/` instead of `utils/` for shared architectural infrastructure.

Do not turn `utils/` into a dumping ground.

`common/` may contain:

```text
common/
├── models.py
├── managers.py
├── exceptions.py
├── exception_handler.py
├── responses.py
├── pagination.py
└── permissions.py
```

Domain-specific functionality MUST remain in domain applications.

---

# 11. Base Model

Create an abstract base model:

```python
from django.db import models


class BaseModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    modified_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    class Meta:
        abstract = True
```

Use this model for entities that require lifecycle tracking.

---

# 12. Soft Delete

Soft delete should normally set:

```text
deleted_at = current timestamp
```

instead of physically deleting records.

Provide:

```python
soft_delete()
restore()
```

where appropriate.

---

# 13. Managers

Create reusable managers:

```python
class ActiveManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(
            deleted_at__isnull=True
        )


class DeletedManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(
            deleted_at__isnull=False
        )


class AllManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset()
```

Example:

```python
class Example(BaseModel):
    objects = ActiveManager()
    deleted_objects = DeletedManager()
    all_objects = AllManager()
```

Behavior:

```python
Example.objects.all()
Example.deleted_objects.all()
Example.all_objects.all()
```

Default manager should normally return only active records.

---

# 14. Django Applications

Business domains must be separated into Django apps.

Example:

```text
apps/
├── users/
├── orders/
├── products/
├── payments/
└── notifications/
```

The actual apps depend on the project.

Do not create a single giant application.

---

# 15. DRF API Architecture

Each API should contain the appropriate:

* Serializer
* View/ViewSet
* URL
* Permission
* Validation
* Tests

Use the simplest suitable DRF abstraction.

---

# 16. Business Logic

Business logic belongs in the backend.

Preferred layers:

```text
models.py
services.py
selectors.py
```

Use services for workflows.

Use selectors for complex queries.

Do not duplicate business logic in:

* Web
* PWA
* Flutter
* Mobile clients

---

# 17. Authentication

Use:

```text
djangorestframework-simplejwt
```

Support:

```text
Access Token
Refresh Token
```

Typical endpoints:

```text
POST /api/auth/token/
POST /api/auth/token/refresh/
```

JWT configuration must come from environment variables where appropriate.

---

# 18. Authorization

Use DRF permissions.

Examples:

```text
IsAuthenticated
IsAdminUser
CustomRolePermission
Object-level permissions
```

Never trust frontend permissions as a security mechanism.

---

# 19. API Responses

All APIs should use one consistent response format.

Success:

```json
{
    "success": true,
    "message": "Operation completed successfully.",
    "data": {}
}
```

Error:

```json
{
    "success": false,
    "message": "Validation failed.",
    "errors": {
        "field": [
            "This field is required."
        ]
    }
}
```

Existing API contracts must not be changed unnecessarily.

---

# 20. Exception Handling

Implement centralized exception handling in:

```text
common/exception_handler.py
```

Handle:

* Validation errors
* Authentication errors
* Permission errors
* Not found
* Throttling
* Custom application exceptions
* Unexpected exceptions

All errors should use the standard API response structure.

---

# 21. OpenAPI

Use:

```text
drf-spectacular
```

Provide:

```text
/api/schema/
/api/docs/
/api/redoc/
```

Every public API must be documented.

---

# 22. Celery

Celery is an optional infrastructure component.

The same application must support:

```env
CELERY_ENABLED=False
```

and:

```env
CELERY_ENABLED=True
```

without changing business code.

Celery configuration:

```env
CELERY_ENABLED=False
CELERY_BEAT_ENABLED=False

CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/1

CELERY_TASK_ALWAYS_EAGER=False
CELERY_TASK_EAGER_PROPAGATES=False

CELERY_WORKER_CONCURRENCY=2
```

When disabled:

* Django must start normally.
* Redis must not be required for normal Django operation.
* Celery workers must not be started.
* Celery Beat must not be started.

When enabled:

* Redis or another configured broker must be available.
* Celery workers must be deployed.
* Celery Beat must be deployed only when `CELERY_BEAT_ENABLED=True`.

---

# 23. Celery Structure

Use:

```text
config/
├── celery.py
└── __init__.py
```

Example:

```python
# config/celery.py

import os

from celery import Celery

os.environ.setdefault(
    "DJANGO_SETTINGS_MODULE",
    "config.settings.development",
)

app = Celery("backend")

app.config_from_object(
    "django.conf:settings",
    namespace="CELERY",
)

app.autodiscover_tasks()
```

Tasks belong to the application that owns the business functionality:

```text
apps/
└── notifications/
    └── tasks.py
```

Tasks should be thin wrappers around services.

Preferred architecture:

```text
Celery Task
    ↓
Service
    ↓
Business Logic
    ↓
Database
```

---

# 24. Celery Transactions

When a task depends on data created inside a transaction, use:

```python
from django.db import transaction

transaction.on_commit(
    lambda: task.delay(object.id)
)
```

This prevents the task from running before the transaction commits.

---

# 25. Celery Reliability

Tasks interacting with external systems should consider:

* Retry
* Backoff
* Maximum retry count
* Failure handling
* Idempotency

Do not blindly retry non-idempotent operations.

---

# 26. Celery Docker

When enabled, Docker Compose should provide:

```text
redis
celery-worker
```

When Beat is enabled:

```text
celery-beat
```

Example architecture:

```text
Django
   │
   ▼
 Redis
   │
   ├── Celery Worker
   │
   └── Celery Beat
```

Do not start Celery services when they are disabled.

---

# 27. Testing

Use:

```text
pytest
pytest-django
pytest-cov
```

Test:

### Models

* Creation
* Modification
* Soft delete
* Restore
* Managers
* Constraints
* Model methods

### Serializers

* Valid input
* Invalid input
* Required fields
* Validation
* Representation

### APIs

* Authentication
* Authorization
* Success
* Validation errors
* Not found
* Permissions
* Pagination
* Filtering

### Services

* Happy path
* Business rules
* Failure cases
* Edge cases
* Transactions

### Celery

* Task execution
* Task arguments
* Success
* Failure
* Retry behavior
* Idempotency where applicable

---

# 28. Fixtures

Use pytest fixtures.

Global:

```text
tests/conftest.py
```

Application-specific:

```text
apps/<app>/tests/conftest.py
```

Use fixtures for:

* Users
* API clients
* Authentication
* Domain objects
* Roles
* Permissions
* Common test data

Do not duplicate setup unnecessarily.

---

# 29. Coverage

Use:

```bash
pytest --cov=. --cov-report=term-missing
```

Coverage must represent meaningful tests.

Do not create meaningless tests solely to increase coverage.

Recommended initial threshold:

```text
80%
```

unless project requirements specify otherwise.

---

# 30. Migrations

Use:

```bash
python manage.py makemigrations
python manage.py migrate
```

Validate:

```bash
python manage.py makemigrations --check
```

Never destructively modify migration history in an established project without explicit approval.

---

# 31. Docker

Separate Docker configuration by environment:

```text
docker/
├── local/
│   ├── Dockerfile
│   └── docker-compose.yml
│
├── staging/
│   ├── Dockerfile
│   └── docker-compose.yml
│
└── production/
    ├── Dockerfile
    └── docker-compose.yml
```

---

# 32. Local Docker

Local Docker should optimize developer experience.

It may contain:

```text
backend
database
redis
celery-worker
celery-beat
```

only when required.

SQLite may be used locally when PostgreSQL is not required.

---

# 33. Staging Docker

Staging should resemble production.

Typical services:

```text
backend
postgres
redis
celery-worker
celery-beat
nginx
```

Only required services should be included.

Staging must remain isolated from production.

---

# 34. Production Docker

Production should be production-oriented.

Typical services:

```text
backend
postgres
redis
celery-worker
celery-beat
nginx
```

Managed external services may be used instead of Docker services.

Do not force infrastructure into Docker when the deployment architecture uses managed services.

---

# 35. Makefile

Every new project must contain:

```text
Makefile
```

It should expose common commands.

Required examples:

```makefile
install:
	pip install -r requirements/base.txt

install-dev:
	pip install -r requirements/development.txt

run:
	python manage.py runserver

migrate:
	python manage.py migrate

makemigrations:
	python manage.py makemigrations

test:
	pytest

coverage:
	pytest --cov=. --cov-report=term-missing

check:
	python manage.py check

lint:
	ruff check .

format:
	ruff format .

shell:
	python manage.py shell

collectstatic:
	python manage.py collectstatic --noinput

celery-worker:
	celery -A config worker --loglevel=INFO

celery-beat:
	celery -A config beat --loglevel=INFO

docker-local:
	docker compose -f docker/local/docker-compose.yml up --build

docker-staging:
	docker compose -f docker/staging/docker-compose.yml up --build -d

docker-production:
	docker compose -f docker/production/docker-compose.yml up --build -d

deploy-staging:
	bash deploy/scripts/deploy.sh staging

deploy-production:
	bash deploy/scripts/deploy.sh production
```

The agent may add project-specific commands.

---

# 36. Deployment Structure

Deployment configuration belongs in:

```text
deploy/
├── nginx/
│   ├── generate.sh
│   └── templates/
│       └── nginx.conf.template
│
├── systemd/
│   └── templates/
│       └── backend.service.template
│
└── scripts/
    ├── deploy.sh
    ├── migrate.sh
    ├── collectstatic.sh
    ├── restart.sh
    └── healthcheck.sh
```

---

# 37. Deployment Environment Variables

Deployment MUST read configuration from `.env`.

At minimum:

```env
DOMAIN=example.com

BACKEND_PORT=8000
FRONTEND_PORT=3000

BACKEND_PATH=/opt/myapp/backend
FRONTEND_PATH=/opt/myapp/frontend

MEDIA_PATH=/opt/myapp/backend/media
STATIC_PATH=/opt/myapp/backend/static

SYSTEMD_SERVICE_NAME=myapp-backend
```

Never hardcode these values inside deployment scripts.

---

# 38. Nginx

Nginx configuration must use a template:

```text
deploy/nginx/templates/nginx.conf.template
```

and generator:

```text
deploy/nginx/generate.sh
```

The generator must read from environment variables.

At minimum:

```text
DOMAIN
BACKEND_PORT
FRONTEND_PORT
BACKEND_PATH
FRONTEND_PATH
MEDIA_PATH
STATIC_PATH
```

Example:

```nginx
server {
    listen 80;
    server_name ${DOMAIN};

    location /api/ {
        proxy_pass http://127.0.0.1:${BACKEND_PORT};
    }

    location /media/ {
        alias ${MEDIA_PATH}/;
    }

    location /static/ {
        alias ${STATIC_PATH}/;
    }

    location / {
        root ${FRONTEND_PATH};
        try_files $uri $uri/ /index.html;
    }
}
```

The exact configuration must be adapted to the actual frontend/backend architecture.

The agent MUST NOT hardcode the domain or filesystem paths.

---

# 39. systemd

For deployments using systemd, use:

```text
deploy/systemd/templates/backend.service.template
```

Values must come from `.env`.

Required variables include:

```text
SYSTEMD_SERVICE_NAME
BACKEND_PATH
BACKEND_PORT
```

Example:

```ini
[Unit]
Description=${SYSTEMD_SERVICE_NAME}
After=network.target

[Service]
WorkingDirectory=${BACKEND_PATH}

ExecStart=${BACKEND_PATH}/venv/bin/gunicorn \
    config.wsgi:application \
    --bind 127.0.0.1:${BACKEND_PORT}

Restart=always

[Install]
WantedBy=multi-user.target
```

The actual process may use Gunicorn, Uvicorn, or another appropriate server.

---

# 40. Deployment Scripts

Required scripts:

```text
deploy/scripts/deploy.sh
deploy/scripts/migrate.sh
deploy/scripts/collectstatic.sh
deploy/scripts/restart.sh
deploy/scripts/healthcheck.sh
```

Deployment flow:

```text
Load environment
    ↓
Validate required variables
    ↓
Build/pull application
    ↓
Install dependencies
    ↓
Run migrations
    ↓
Collect static files
    ↓
Generate Nginx configuration
    ↓
Generate/update systemd configuration
    ↓
Restart services
    ↓
Start required Celery services
    ↓
Health check
```

Scripts should use:

```bash
set -euo pipefail
```

when appropriate.

Scripts must never expose secrets in logs.

---

# 41. Environment Separation

The project must clearly separate:

```text
Local
Staging
Production
```

Docker:

```text
docker/local/
docker/staging/
docker/production/
```

Django:

```text
config/settings/development.py
config/settings/production.py
```

Deployment scripts must know which environment they are operating on.

Never accidentally deploy staging configuration to production.

---

# 42. Security

Never hardcode:

* Passwords
* Secret keys
* Database credentials
* API keys
* JWT secrets
* Domain names
* Production paths
* Service names

Use environment variables.

Do not expose `.env`.

Do not log sensitive environment variables.

---

# 43. Query Performance

Avoid N+1 queries.

Use:

```python
select_related()
prefetch_related()
```

where appropriate.

Do not optimize prematurely.

---

# 44. Pagination

Collection APIs should use pagination where appropriate.

Never expose unbounded large querysets through public APIs.

---

# 45. Backward Compatibility

When modifying an existing project:

* Preserve API contracts where possible.
* Preserve existing data.
* Preserve authentication behavior.
* Preserve business behavior.
* Avoid unnecessary field renaming.
* Avoid unnecessary endpoint removal.
* Avoid destructive migrations.

Breaking changes must be clearly identified.

---

# 46. API Contract

For significant features:

```text
Requirement
    ↓
Domain Analysis
    ↓
Data Model
    ↓
API Contract
    ↓
Serializer
    ↓
Service
    ↓
View
    ↓
Permission
    ↓
Tests
    ↓
OpenAPI
```

The API contract must be clear before dependent frontend clients are implemented.

---

# 47. Validation Commands

Before completing work, run:

```bash
python manage.py check
```

```bash
python manage.py makemigrations --check
```

```bash
pytest
```

```bash
pytest --cov=. --cov-report=term-missing
```

If configured:

```bash
ruff check .
```

For Docker changes:

```bash
docker compose -f docker/local/docker-compose.yml config
```

and the equivalent staging/production Compose configuration when modified.

For deployment changes:

* Validate generated Nginx configuration.
* Validate generated systemd configuration.
* Verify required environment variables.
* Run deployment health checks.

---

# 48. Definition of Done

A feature is complete only when:

* [ ] Requirement understood
* [ ] Correct Django app identified
* [ ] Model implemented if required
* [ ] Migration created
* [ ] Serializer implemented
* [ ] Business logic implemented
* [ ] View/ViewSet implemented
* [ ] URL configured
* [ ] Permission implemented
* [ ] Validation implemented
* [ ] Standard API response verified
* [ ] Exception handling verified
* [ ] Tests implemented
* [ ] Fixtures added where useful
* [ ] Coverage checked
* [ ] OpenAPI updated
* [ ] Existing tests still pass
* [ ] Django checks pass
* [ ] Migration checks pass
* [ ] Docker validated if changed
* [ ] Celery validated if used
* [ ] Nginx validated if changed
* [ ] systemd validated if changed
* [ ] Deployment scripts validated if changed
* [ ] No secrets or environment-specific values are hardcoded

---

# 49. Existing Project Safety

When working on an existing project:

1. Read before changing.
2. Understand existing behavior.
3. Inspect existing tests.
4. Inspect migrations.
5. Inspect API contracts.
6. Inspect Docker configuration.
7. Inspect deployment configuration.
8. Inspect Nginx configuration.
9. Inspect systemd configuration.
10. Inspect Celery configuration.
11. Avoid unnecessary rewrites.
12. Make incremental changes.
13. Add regression tests.
14. Run the existing test suite.
15. Validate the final architecture.
16. Document breaking changes.

Never assume the existing project already follows this skill.

---

# 50. Final Principle

Business requirements determine:

```text
WHAT the system does.
```

This skill determines:

```text
HOW the DRF backend is:

- structured
- configured
- implemented
- tested
- documented
- containerized
- deployed
- maintained
```

The skill must remain generic.

It must be reusable for any Django REST Framework project without being tied to a specific business domain.
