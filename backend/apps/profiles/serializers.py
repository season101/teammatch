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
    skill_ids = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Skill.objects.all(), source="skills", write_only=True, required=False
    )

    class Meta:
        model = Profile
        fields = ["id", "display_name", "bio", "major", "skills", "skill_ids"]
        read_only_fields = ["id"]


class MyProfileSerializer(ProfileSerializer):
    # Only the owner sees their own email.
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta(ProfileSerializer.Meta):
        fields = [*ProfileSerializer.Meta.fields, "email"]
        read_only_fields = ["id", "email"]
