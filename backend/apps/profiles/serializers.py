from rest_framework import serializers

from .models import Profile


class ProfileSerializer(serializers.ModelSerializer):
    # Public view: no email (F1-03).
    class Meta:
        model = Profile
        fields = ["id", "display_name", "bio", "major"]
        read_only_fields = ["id"]


class MyProfileSerializer(ProfileSerializer):
    # Only the owner sees their own email.
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta(ProfileSerializer.Meta):
        fields = [*ProfileSerializer.Meta.fields, "email"]
        read_only_fields = ["id", "email"]
