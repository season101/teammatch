from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from .models import Profile
from .permissions import IsOwnerOrReadOnly
from .serializers import MyProfileSerializer, ProfileSerializer


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

    queryset = Profile.objects.select_related("user")
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
    http_method_names = ["get", "patch"]
