from django.utils.text import Truncator
from drf_spectacular.extensions import OpenApiSerializerFieldExtension
from rest_framework import serializers

from apps.profiles.serializers import skills_from_ids

from . import services
from .models import Project, Role

GITHUB = "https://github.com/"
NOT_GITHUB = f"Enter a link that starts with {GITHUB}"


class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = [
            "id",
            "title",
            "pitch",
            "repo_url",
            "details",
            "status",
            "term",
            "owner",
            "created_at",
        ]
        read_only_fields = ["id", "status", "term", "owner", "created_at"]
        # Not a link at all gets the same message as a link that isn't to GitHub.
        extra_kwargs = {"repo_url": {"error_messages": {"invalid": NOT_GITHUB}}}

    def validate_repo_url(self, value):
        # The trailing slash pins the host, so github.com.evil.io and user@ tricks fail.
        if value and (not value.startswith(GITHUB) or value == GITHUB):
            raise serializers.ValidationError(NOT_GITHUB, code="repo_url_not_github")
        return value

    def create(self, validated_data):
        return services.create_project(owner=self.context["request"].user, **validated_data)


MAX_SKILLS = 20  # a role's required skills, the same cap as a profile's skill_ids


class SkillIdsField(serializers.ListField):
    """Skill ids in and out. Reads the role's skills, prefetched where the view does."""

    child = serializers.IntegerField(min_value=1)

    def to_representation(self, skills):
        return [skill.pk for skill in skills.all()]


class SkillIdsFieldSchema(OpenApiSerializerFieldExtension):
    """The 1-20 rule is on input only: a role saved before the cap, or in admin, can hold
    more or none, so responses promise just a list of ids. (The cap is checked in
    RoleSerializer, not as the field's max_length, which spectacular would add to both.)"""

    target_class = SkillIdsField

    def map_serializer_field(self, auto_schema, direction):
        ids = {"type": "array", "items": {"type": "integer"}}
        if direction == "request":
            ids["items"]["minimum"] = 1
            ids.update(minItems=1, maxItems=MAX_SKILLS)
        return ids


class RoleSerializer(serializers.ModelSerializer):
    # Capped and looked up in one query (as ProfileSerializer.skill_ids), so a huge list
    # can't cost one query per id while the view holds the project lock.
    required_skills = SkillIdsField(allow_empty=False)

    class Meta:
        model = Role
        fields = [
            "id",
            "project",
            "title",
            "description",
            "status",
            "required_skills",
            "created_at",
        ]
        read_only_fields = ["id", "project", "status", "created_at"]

    def validate_required_skills(self, ids):
        if len(ids) > MAX_SKILLS:
            raise serializers.ValidationError(f"Choose at most {MAX_SKILLS} skills.")
        return skills_from_ids(ids)


class ProjectListSerializer(serializers.ModelSerializer):
    # Public info only: the owner's display name, never their email.
    owner_name = serializers.CharField(source="owner.profile.display_name", read_only=True)
    pitch_preview = serializers.SerializerMethodField()
    open_role_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Project
        fields = [
            "id",
            "title",
            "pitch_preview",
            "owner",
            "owner_name",
            "open_role_count",
            "created_at",
        ]

    def get_pitch_preview(self, project) -> str:
        return Truncator(project.pitch).chars(200)


class RoleDetailSerializer(RoleSerializer):
    # Public info only: the member's display name, never their email.
    filled_by_name = serializers.SerializerMethodField()

    class Meta(RoleSerializer.Meta):
        fields = [*RoleSerializer.Meta.fields, "filled_by_name"]

    def get_filled_by_name(self, role) -> str:
        if role.filled_by_id is None:
            return ""
        profile = getattr(role.filled_by, "profile", None)
        return profile.display_name if profile else ""


class MyRoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ["id", "title", "status"]


class MyProjectSerializer(serializers.ModelSerializer):
    roles = MyRoleSerializer(many=True, read_only=True)

    class Meta:
        model = Project
        fields = ["id", "title", "status", "roles", "created_at"]


class ProjectDetailSerializer(serializers.ModelSerializer):
    # Public info only: the owner's display name, never their email.
    owner_name = serializers.CharField(source="owner.profile.display_name", read_only=True)
    roles = RoleDetailSerializer(many=True, read_only=True)

    class Meta:
        model = Project
        fields = [
            "id",
            "title",
            "pitch",
            "repo_url",
            "details",
            "status",
            "owner",
            "owner_name",
            "roles",
            "created_at",
        ]
