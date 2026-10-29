from rest_framework import serializers

from apps.profiles.serializers import ProfileSerializer, SkillSerializer
from apps.projects.models import Project, Role

from .models import Application


class FeedProjectSerializer(serializers.ModelSerializer):
    # display name only, never the owner's email
    owner_name = serializers.CharField(source="owner.profile.display_name", read_only=True)

    class Meta:
        model = Project
        fields = ["id", "title", "pitch", "owner_name"]


class FeedRoleSerializer(serializers.ModelSerializer):
    project = FeedProjectSerializer(read_only=True)
    required_skills = SkillSerializer(many=True, read_only=True)

    class Meta:
        model = Role
        fields = ["id", "title", "description", "project", "required_skills", "created_at"]


class RoleApplicationSerializer(serializers.ModelSerializer):
    # Public profile only (name, major, skills), never the applicant's email.
    applicant = ProfileSerializer(source="applicant.profile", read_only=True)

    class Meta:
        model = Application
        fields = ["id", "applicant", "note", "status", "created_at"]


class ApplicationRoleSerializer(serializers.ModelSerializer):
    project = FeedProjectSerializer(read_only=True)

    class Meta:
        model = Role
        fields = ["id", "title", "project"]


class MyApplicationSerializer(serializers.ModelSerializer):
    role = ApplicationRoleSerializer(read_only=True)

    class Meta:
        model = Application
        fields = ["id", "role", "note", "status", "created_at", "updated_at"]


class ApplySerializer(serializers.ModelSerializer):
    class Meta:
        model = Application
        fields = ["id", "role", "note", "status", "created_at"]
        read_only_fields = ["status"]
