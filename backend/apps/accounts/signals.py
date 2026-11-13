from allauth.account.models import EmailAddress
from allauth.socialaccount.signals import social_account_added
from django.dispatch import receiver


@receiver(social_account_added)
def verify_email_google_proved(request, sociallogin, **kwargs):
    """Mark the address verified once Google has proved the student owns it (F1-14).

    A password account whose email was never verified can Continue with Google.
    allauth wipes that account's password first (someone else may have registered
    the address), then links Google and sends this signal, and only then checks
    for a verified email. Doing this in pre_social_login instead would run before
    the wipe, and the wipe skips a verified address, so a stranger's password
    would keep working.
    """
    proved = {address.email.lower() for address in sociallogin.email_addresses if address.verified}
    if not proved:
        return
    for address in EmailAddress.objects.filter(user=sociallogin.user, verified=False):
        if address.email.lower() in proved:
            address.verified = True
            address.save(update_fields=["verified"])
