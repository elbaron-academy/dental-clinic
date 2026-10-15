# Authentication

## Login
All application users authenticate with:
- Username **or** phone number (either one identifies the account)
- Password

The username is optional and set by an administrator in Django Admin. It is
unique, not case-sensitive, 3-32 characters, starts with a letter and may
contain letters, digits, dots, dashes and underscores. Every user always has a
phone number, so every user can sign in with it.

There is NO separate "foreign password" flow.

After successful authentication, the user's role and permissions determine access.

Initial roles:
- Doctor
- Assistant
- Receptionist
