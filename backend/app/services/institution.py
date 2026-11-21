"""Email normalization for student registration and admin-provisioned accounts.

Pydantic's EmailStr validates incoming email addresses at the API boundary.
We deliberately do not impose an institutional-domain restriction.
"""


def normalize_email(email: str) -> str:
    return str(email).strip().lower()
