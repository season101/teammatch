import pytest


@pytest.fixture(autouse=True)
def rules_accepted(request):
    """Every profile a test makes has the Team rules accepted, as everyone past the app's
    gate has (DD-47), so the API's rules check stays out of tests about something else.

    Tests of the rules themselves use @pytest.mark.rules_not_accepted to turn this off.
    """
    if request.node.get_closest_marker("rules_not_accepted"):
        yield
        return

    from django.db.models.signals import pre_save
    from django.utils import timezone

    from apps.profiles.models import Profile

    def accept(sender, instance, raw=False, **kwargs):
        if not raw and instance._state.adding and instance.rules_accepted_at is None:
            instance.rules_accepted_at = timezone.now()

    pre_save.connect(accept, sender=Profile, dispatch_uid="tests-accept-rules")
    yield
    pre_save.disconnect(sender=Profile, dispatch_uid="tests-accept-rules")
