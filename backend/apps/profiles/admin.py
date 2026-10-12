from django.contrib import admin

from .models import Profile


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ["user", "display_name", "major", "updated_at"]
    search_fields = ["user__email", "display_name", "major"]
