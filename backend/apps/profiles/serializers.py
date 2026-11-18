from pathlib import Path
from urllib.parse import urlsplit

from django.urls import reverse
from rest_framework import serializers

from .models import Profile, Skill


def https_link(site, code):
    """A field for a link to one site (F1-15): https, that host with or without www., a path.

    One message for anything else, so the form can show it as it is. Blank clears the link.
    """
    message = f"Enter a link that starts with https://{site}/"

    def check(value):
        if not value:
            return
        try:
            parts = urlsplit(value)
        except ValueError:  # e.g. an unclosed [ in the host
            parts = None
        # The whole netloc, so a user, password or port is refused too.
        if (
            parts is None
            or parts.scheme != "https"
            or parts.netloc.lower() not in (site, f"www.{site}")
            or parts.path in ("", "/")
        ):
            raise serializers.ValidationError(message, code=code)

    return serializers.CharField(
        max_length=200, allow_blank=True, required=False, validators=[check]
    )


def skills_from_ids(ids):
    """The skills for these ids in one query. Unknown ids are rejected (F1-04)."""
    skills = list(Skill.objects.filter(id__in=ids))
    if len(skills) != len(set(ids)):
        raise serializers.ValidationError("Unknown skill id.")
    return skills


class SkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = ["id", "name", "slug"]


class ProfileSerializer(serializers.ModelSerializer):
    # Public view: no email (F1-03). Skills are shown with their names.
    skills = SkillSerializer(many=True, read_only=True)
    # To change skills, send the full list of ids. Unknown ids are rejected (F1-04).
    # Capped and looked up in one query, so a huge list can't cost one query per id.
    skill_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        max_length=20,
        source="skills",
        write_only=True,
        required=False,
    )
    avatar_url = serializers.SerializerMethodField()
    github_url = https_link("github.com", "github_url_invalid")
    linkedin_url = https_link("linkedin.com", "linkedin_url_invalid")
    # Never the file or its address: GET /profiles/{id}/resume/ checks who's asking (DD-42).
    has_resume = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = [
            "id",
            "display_name",
            "bio",
            "major",
            "skills",
            "skill_ids",
            "avatar_url",
            "github_url",
            "linkedin_url",
            "has_resume",
        ]
        read_only_fields = ["id"]

    def get_has_resume(self, profile) -> bool:
        return bool(profile.resume)

    def validate_skill_ids(self, ids):
        return skills_from_ids(ids)

    def update(self, profile, validated_data):
        # Only the fields sent: a full save could put back an avatar or retire() that
        # changed while this request ran, pointing at a file already deleted.
        skills = validated_data.pop("skills", None)
        for field, value in validated_data.items():
            setattr(profile, field, value)
        profile.save(update_fields=[*validated_data, "updated_at"])
        if skills is not None:
            profile.skills.set(skills)
        return profile

    def get_avatar_url(self, profile) -> str | None:
        # The API's own address, never the bucket's. ?v= changes with each upload.
        if not profile.avatar:
            return None
        url = reverse("profile-avatar", args=[profile.id])
        return f"{url}?v={Path(profile.avatar.name).stem}"


class AvatarUploadSerializer(serializers.Serializer):
    avatar = serializers.FileField(help_text="JPEG, PNG or WebP, 2 MB or less.")


class ResumeUploadSerializer(serializers.Serializer):
    resume = serializers.FileField(help_text="A PDF of 5 MB or less.")


class MyProfileSerializer(ProfileSerializer):
    # Only the owner sees their own email and resume file name.
    email = serializers.EmailField(source="user.email", read_only=True)
    # What the app shows me: only students get the deck, admins get the moderation page.
    role = serializers.ChoiceField(
        choices=["admin", "moderator", "student"], source="user.role", read_only=True
    )

    class Meta(ProfileSerializer.Meta):
        fields = [
            *ProfileSerializer.Meta.fields,
            "email",
            "role",
            "rules_accepted_at",
            "resume_name",
        ]
        read_only_fields = ["id", "email", "rules_accepted_at", "resume_name"]
