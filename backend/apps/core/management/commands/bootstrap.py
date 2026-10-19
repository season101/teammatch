import datetime
import os

from allauth.account.models import EmailAddress
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.core.models import Term

# Add a line once the next term's dates are known. A term that exists keeps the dates an admin set.
TERMS = [("Fall 2026", datetime.date(2026, 9, 1), datetime.date(2026, 11, 20))]

# Env prefix and whether the account is an admin. Skipped unless SEED_<PREFIX>_EMAIL and
# SEED_<PREFIX>_PASSWORD are both set.
ACCOUNTS = [("ADMIN", True), ("OWNER", False), ("CANDIDATE", False)]


class Command(BaseCommand):
    help = "Add the known terms and the SEED_* accounts (verified). Safe to run on every start."

    @transaction.atomic
    def handle(self, *args, **options):
        for name, start, end in TERMS:
            _, created = Term.objects.get_or_create(
                name=name, defaults={"start_date": start, "end_date": end}
            )
            self.stdout.write(f"term {name}: {'added' if created else 'already there'}")

        User = get_user_model()
        for prefix, is_admin in ACCOUNTS:
            email = os.environ.get(f"SEED_{prefix}_EMAIL", "").strip()
            password = os.environ.get(f"SEED_{prefix}_PASSWORD", "")
            if not (email and password):
                self.stdout.write(f"{prefix.lower()} account: skipped, SEED_{prefix}_* not set")
                continue

            user = User.objects.filter(email__iexact=email).first()
            created = user is None
            if created:
                user = User.objects.create_user(email)
            # .env is the source of truth: running again resets the password to the .env value
            user.set_password(password)
            if is_admin:
                user.is_staff = user.is_superuser = True
            user.save()
            EmailAddress.objects.update_or_create(
                user=user, email=user.email, defaults={"verified": True, "primary": True}
            )
            role = ", admin" if is_admin else ""
            action = "created" if created else "updated"
            self.stdout.write(f"{prefix.lower()} account {user.email}: {action}, verified{role}")
