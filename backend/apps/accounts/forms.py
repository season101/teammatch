from allauth.account.adapter import get_adapter
from django import forms

from .models import User


class SignupForm(forms.Form):
    """ACCOUNT_SIGNUP_FORM_CLASS, the base of allauth's headless signup input.

    That input checks the password without a user, so UserAttributeSimilarityValidator
    never sees the email and "sam1234@latech.edu" / "sam12341" got through. This runs
    the validators again with the email, like allauth's own (non-headless) form does.
    """

    def clean(self):
        cleaned_data = super().clean()
        password, email = cleaned_data.get("password"), cleaned_data.get("email")
        if password and email:
            try:
                get_adapter().clean_password(password, user=User(email=email))
            except forms.ValidationError as error:
                self.add_error("password", error)
        return cleaned_data

    def signup(self, request, user):
        pass  # required by allauth; nothing extra to save
