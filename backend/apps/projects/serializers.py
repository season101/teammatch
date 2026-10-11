from rest_framework import serializers

from . import services
from .models import Project


class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ["id", "title", "pitch", "status", "term", "owner", "created_at"]
        read_only_fields = ["id", "status", "term", "owner", "created_at"]

    def create(self, validated_data):
        return services.create_project(owner=self.context["request"].user, **validated_data)
