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

    class Meta:
        model = Profile
        fields = ["id", "display_name", "bio", "major", "skills", "skill_ids"]
        read_only_fields = ["id"]

    def validate_skill_ids(self, ids):
        skills = list(Skill.objects.filter(id__in=ids))
        if len(skills) != len(set(ids)):
            raise serializers.ValidationError("Unknown skill id.")
        return skills


class MyProfileSerializer(ProfileSerializer):
    # Only the owner sees their own email.
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta(ProfileSerializer.Meta):
        fields = [*ProfileSerializer.Meta.fields, "email"]
        read_only_fields = ["id", "email"]
