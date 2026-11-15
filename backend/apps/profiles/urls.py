from django.urls import path

from . import views

urlpatterns = [
    path("me/profile/", views.MyProfileView.as_view(), name="my-profile"),
    path("me/rules/accept/", views.AcceptRulesView.as_view(), name="accept-rules"),
    path("me/avatar/", views.MyAvatarView.as_view(), name="my-avatar"),
    path("profiles/<int:pk>/", views.ProfileDetailView.as_view(), name="profile-detail"),
    path("profiles/<int:pk>/avatar/", views.AvatarView.as_view(), name="profile-avatar"),
    path("skills/", views.SkillListView.as_view(), name="skill-list"),
]
