from django.contrib import admin

from .models import Project


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("title", "owner", "term", "status", "created_at")
    list_filter = ("status", "term")
    search_fields = ("title", "owner__email")
