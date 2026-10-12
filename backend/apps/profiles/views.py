from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from .models import Profile, Skill
from .permissions import IsOwnerOrReadOnly
from .serializers import MyProfileSerializer, ProfileSerializer, SkillSerializer


class MyProfileView(generics.RetrieveUpdateAPIView):
    """GET or PATCH the signed-in user's own profile."""

    serializer_class = MyProfileSerializer
    http_method_names = ["get", "patch"]

    def get_object(self):
        # Created on first visit, so every user has a profile.
        profile, _ = Profile.objects.get_or_create(user=self.request.user)
        return profile


class ProfileDetailView(generics.RetrieveUpdateAPIView):
    """Someone's public profile. Editing it is owner-only (403 otherwise)."""

    queryset = Profile.objects.select_related("user").prefetch_related("skills")
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
    http_method_names = ["get", "patch"]


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
