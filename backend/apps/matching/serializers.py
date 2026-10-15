from rest_framework import serializers

from apps.projects.models import Project, Role


class FeedProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ["id", "title", "pitch"]


class FeedRoleSerializer(serializers.ModelSerializer):
    project = FeedProjectSerializer(read_only=True)

    class Meta:
        model = Role
        fields = ["id", "title", "description", "project", "created_at"]
