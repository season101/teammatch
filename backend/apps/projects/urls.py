from django.urls import path

from . import views

urlpatterns = [
    path("projects/", views.ProjectCreateView.as_view(), name="project-list"),
]
