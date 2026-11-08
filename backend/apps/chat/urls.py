from django.urls import path

from . import views

urlpatterns = [
    path("teams/<int:pk>/messages/", views.TeamMessagesView.as_view(), name="team-messages"),
]
