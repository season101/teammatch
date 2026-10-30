from rest_framework import serializers

from apps.core.models import Term
from apps.profiles.serializers import ProfileSerializer, SkillSerializer
from apps.projects.models import Project, Role

from .models import Application, Membership


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


class ApplicationDecisionSerializer(RoleApplicationSerializer):
    """A like or pass, plus whether that like locked the team (F4-05)."""

    team_locked = serializers.SerializerMethodField()
    team_id = serializers.SerializerMethodField()

    class Meta(RoleApplicationSerializer.Meta):
        fields = [*RoleApplicationSerializer.Meta.fields, "team_locked", "team_id"]

    def get_team_locked(self, application) -> bool:
        return self.context["team"] is not None

    def get_team_id(self, application) -> int | None:
        return self.context["team"] and self.context["team"].id


class TeamProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ["id", "title"]


class TeamTermSerializer(serializers.ModelSerializer):
    class Meta:
        model = Term
        fields = ["name", "end_date"]


class TeamMemberSerializer(serializers.ModelSerializer):
    # display name only, never the member's email
    display_name = serializers.CharField(source="user.profile.display_name", read_only=True)
    role = serializers.SerializerMethodField()

    class Meta:
        model = Membership
        fields = ["display_name", "role"]

    def get_role(self, membership) -> str:
        return membership.role.title if membership.role else "Owner"


class MyTeamSerializer(serializers.ModelSerializer):
    """My team this term, from my seat on it (F4-05)."""

    id = serializers.IntegerField(source="team_id", read_only=True)
    project = TeamProjectSerializer(source="team.project", read_only=True)
    term = TeamTermSerializer(source="team.project.term", read_only=True)
    members = TeamMemberSerializer(source="team.memberships", many=True, read_only=True)

    class Meta:
        model = Membership
        fields = ["id", "project", "term", "members", "seen_at"]
        read_only_fields = ["seen_at"]


class MyTeamResponseSerializer(serializers.Serializer):
    # Wrapped so "no team" is a plain null the schema can describe.
    team = MyTeamSerializer(allow_null=True, read_only=True)
