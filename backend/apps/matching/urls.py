from django.urls import path

from . import views
from .models import ApplicationStatus

urlpatterns = [
    path("feed/", views.FeedView.as_view(), name="feed"),
    path("applications/", views.ApplyView.as_view(), name="application-create"),
    path("applications/mine/", views.MyApplicationsView.as_view(), name="my-applications"),
    path(
        "applications/<int:pk>/withdraw/",
        views.WithdrawApplicationView.as_view(),
        name="application-withdraw",
    ),
    path("roles/<int:pk>/dismiss/", views.DismissRoleView.as_view(), name="role-dismiss"),
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
    path("teams/<int:pk>/seen/", views.TeamSeenView.as_view(), name="team-seen"),
]
