from django.utils.text import Truncator
from rest_framework import serializers

from apps.profiles.models import Skill

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


class RoleSerializer(serializers.ModelSerializer):
    required_skills = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Skill.objects.all(), allow_empty=False
    )

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
