from django.urls import path

from . import views
from .models import ApplicationStatus

urlpatterns = [
    path("feed/", views.FeedView.as_view(), name="feed"),
    path(
        "roles/<int:pk>/applications/",
        views.RoleApplicationsView.as_view(),
        name="role-applications",
    ),
    path(
        "applications/<int:pk>/like/",
        views.ApplicationDecisionView.as_view(decision=ApplicationStatus.LIKED),
        name="application-like",
    ),
    path(
        "applications/<int:pk>/pass/",
        views.ApplicationDecisionView.as_view(decision=ApplicationStatus.PASSED),
        name="application-pass",
    ),
]
