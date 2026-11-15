import mimetypes

from django.db.models.functions import Coalesce, Now
from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import generics
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Profile, Skill
from .permissions import IsOwnerOrReadOnly
from .serializers import (
    AvatarUploadSerializer,
    MyProfileSerializer,
    ProfileSerializer,
    SkillSerializer,
)
from .services import set_avatar


def my_profile(user):
    # Made when the user is created (#83); get_or_create is only a safety net.
    profile, _ = Profile.objects.get_or_create(user=user)
    return profile


class MyProfileView(generics.RetrieveUpdateAPIView):
    """GET or PATCH the signed-in user's own profile."""

    serializer_class = MyProfileSerializer
    http_method_names = ["get", "patch"]

    def get_object(self):
        return my_profile(self.request.user)


class MyAvatarView(APIView):
    """Upload or remove my avatar (F1-07). Answers with my profile."""

    parser_classes = [MultiPartParser]

    @extend_schema(
        request={"multipart/form-data": AvatarUploadSerializer},
        responses=MyProfileSerializer,
    )
    def post(self, request):
        """JPEG, PNG or WebP, 2 MB or less. Anything else: 400 invalid_avatar, old one kept."""
        profile = my_profile(request.user)
        set_avatar(profile, request.FILES.get("avatar"))
        return Response(MyProfileSerializer(profile).data)

    @extend_schema(request=None, responses={200: MyProfileSerializer})
    def delete(self, request):
        """Remove my avatar and delete its file."""
        profile = my_profile(request.user)
        profile.avatar.delete()  # the file, then the field; nothing to do without one
        return Response(MyProfileSerializer(profile).data)


@extend_schema(responses={(200, "image/*"): OpenApiTypes.BINARY, 404: None})
class AvatarView(APIView):
    """Someone's avatar, streamed from storage. 404 when they have none."""

    def get(self, request, pk):
        profile = get_object_or_404(Profile, pk=pk)
        if not profile.avatar:
            raise Http404
        content_type, _ = mimetypes.guess_type(profile.avatar.name)
        response = FileResponse(profile.avatar.open("rb"), content_type=content_type)
        # The address changes with each upload (?v=), so a day's cache is safe.
        response["Cache-Control"] = "private, max-age=86400"
        response["X-Content-Type-Options"] = "nosniff"
        return response


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
