from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.profiles.models import Profile


class Command(BaseCommand):
    help = "Clear retired_until dates that have passed (F1-08). One UPDATE, safe to run again."

    def handle(self, *args, **options):
        cleared = Profile.objects.filter(retired_until__lt=timezone.localdate()).update(
            retired_until=None
        )
        self.stdout.write(f"cleared retired_until on {cleared} profile(s)")
