from django.contrib import admin

from apps.profiles.models import Profile

from .models import Term


# The app reads terms live: the current one is the term whose dates cover today
# (get_active_term), so a term added here counts from its start date (PL-07). The standard
# form runs Term.clean, which refuses dates that overlap another term, so only one covers a day.
@admin.register(Term)
class TermAdmin(admin.ModelAdmin):
    list_display = ("name", "start_date", "end_date")
    search_fields = ("name",)

    def save_model(self, request, obj, form, change):
        old_end = Term.objects.filter(pk=obj.pk).values_list("end_date", flat=True).first()
        super().save_model(request, obj, form, change)
        if old_end and old_end != obj.end_date:
            # Team members are benched until their term's end (BR-08), so the date follows it.
            # shortcut: matches on the date, fine while terms never share an end date.
            Profile.objects.filter(retired_until=old_end).update(retired_until=obj.end_date)
