from django.contrib import admin

from .models import Application, RoleDismissal


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = ("applicant", "role", "status", "created_at")
    list_filter = ("status", "role__project__term")
    search_fields = ("applicant__email", "role__title")


@admin.register(RoleDismissal)
class RoleDismissalAdmin(admin.ModelAdmin):
    list_display = ("user", "role", "created_at")
    list_filter = ("role__project__term",)
    search_fields = ("user__email", "role__title")
