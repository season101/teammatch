from pathlib import Path

from django.urls import reverse
from rest_framework import serializers

from .models import Profile, Skill


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

    class Meta:
        model = Profile
        fields = ["id", "display_name", "bio", "major", "skills", "skill_ids", "avatar_url"]
        read_only_fields = ["id"]

    def validate_skill_ids(self, ids):
        skills = list(Skill.objects.filter(id__in=ids))
        if len(skills) != len(set(ids)):
            raise serializers.ValidationError("Unknown skill id.")
        return skills

    def get_avatar_url(self, profile) -> str | None:
        # The API's own address, never the bucket's. ?v= changes with each upload.
        if not profile.avatar:
            return None
        url = reverse("profile-avatar", args=[profile.id])
        return f"{url}?v={Path(profile.avatar.name).stem}"


class AvatarUploadSerializer(serializers.Serializer):
    avatar = serializers.FileField(help_text="JPEG, PNG or WebP, 2 MB or less.")


class MyProfileSerializer(ProfileSerializer):
    # Only the owner sees their own email.
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta(ProfileSerializer.Meta):
        fields = [*ProfileSerializer.Meta.fields, "email", "rules_accepted_at"]
        read_only_fields = ["id", "email", "rules_accepted_at"]
