from rest_framework import serializers

from apps.profiles.models import Skill

from . import services
from .models import Project, Role


class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ["id", "title", "pitch", "status", "term", "owner", "created_at"]
        read_only_fields = ["id", "status", "term", "owner", "created_at"]

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
