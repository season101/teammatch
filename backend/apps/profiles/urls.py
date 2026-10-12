from django.urls import path

from . import views

urlpatterns = [
    path("me/profile/", views.MyProfileView.as_view(), name="my-profile"),
    path("profiles/<int:pk>/", views.ProfileDetailView.as_view(), name="profile-detail"),
    path("skills/", views.SkillListView.as_view(), name="skill-list"),
]
