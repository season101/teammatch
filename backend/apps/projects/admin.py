from django.contrib import admin

from .models import Project, Role


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("title", "owner", "term", "status", "created_at")
    list_filter = ("status", "term")
    search_fields = ("title", "owner__email")


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ("title", "project", "status", "filled_by", "created_at")
    list_filter = ("status",)
    search_fields = ("title", "project__title")
