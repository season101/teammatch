from rest_framework import generics

from .serializers import ProjectSerializer


class ProjectCreateView(generics.CreateAPIView):
    serializer_class = ProjectSerializer
