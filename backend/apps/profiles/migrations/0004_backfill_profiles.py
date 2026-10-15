# Users made before profiles were created on sign-up (#83) get one now.

from django.conf import settings
from django.db import migrations


def backfill(apps, schema_editor):
    User = apps.get_model(settings.AUTH_USER_MODEL)
    Profile = apps.get_model("profiles", "Profile")
    Profile.objects.bulk_create(
        [Profile(user=user) for user in User.objects.filter(profile__isnull=True)]
    )


class Migration(migrations.Migration):
    dependencies = [
        ("profiles", "0003_seed_skills"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [migrations.RunPython(backfill, migrations.RunPython.noop)]
