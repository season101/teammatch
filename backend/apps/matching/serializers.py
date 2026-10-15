from rest_framework import serializers

from apps.profiles.serializers import ProfileSerializer
from apps.projects.models import Project, Role

from .models import Application


class FeedProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ["id", "title", "pitch"]


class FeedRoleSerializer(serializers.ModelSerializer):
    project = FeedProjectSerializer(read_only=True)

    class Meta:
        model = Role
        fields = ["id", "title", "description", "project", "created_at"]


class RoleApplicationSerializer(serializers.ModelSerializer):
    # Public profile only (name, major, skills), never the applicant's email.
    applicant = ProfileSerializer(source="applicant.profile", read_only=True)

    class Meta:
        model = Application
        fields = ["id", "applicant", "note", "status", "created_at"]
