from django.db.models.functions import Coalesce, Now
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Profile, Skill
from .permissions import IsOwnerOrReadOnly
from .serializers import MyProfileSerializer, ProfileSerializer, SkillSerializer


class MyProfileView(generics.RetrieveUpdateAPIView):
    """GET or PATCH the signed-in user's own profile."""

    serializer_class = MyProfileSerializer
    http_method_names = ["get", "patch"]

    def get_object(self):
        # Made when the user is created (#83); get_or_create is only a safety net.
        profile, _ = Profile.objects.get_or_create(user=self.request.user)
        return profile


@extend_schema(request=None, responses={204: None})
class AcceptRulesView(APIView):
    """I agree to the Team rules (DD-12). Repeats keep the first time."""

    def post(self, request):
        Profile.objects.get_or_create(user=request.user)
        Profile.objects.filter(user=request.user).update(
            rules_accepted_at=Coalesce("rules_accepted_at", Now())
        )
        return Response(status=204)


class ProfileDetailView(generics.RetrieveUpdateAPIView):
    """Someone's public profile. Editing it is owner-only (403 otherwise)."""

    queryset = Profile.objects.select_related("user").prefetch_related("skills")
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
    http_method_names = ["get", "patch"]


@extend_schema(
    parameters=[OpenApiParameter("q", str, description="Filter by name, ignoring case.")]
)
class SkillListView(generics.ListAPIView):
    """The skill list for pickers. ?q= filters by name. Small list, so no paging."""

    serializer_class = SkillSerializer
    pagination_class = None

    def get_queryset(self):
        skills = Skill.objects.all()
        query = self.request.query_params.get("q", "").strip()
        if query:
            skills = skills.filter(name__icontains=query)
        return skills
