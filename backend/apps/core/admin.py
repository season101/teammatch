from django.contrib import admin

from .models import Term


# The app reads terms live: the current one is the term whose dates cover today
# (get_active_term), so a term added here counts from its start date (PL-07). The standard
# form runs Term.clean, which refuses dates that overlap another term, so only one covers a day.
@admin.register(Term)
class TermAdmin(admin.ModelAdmin):
    list_display = ("name", "start_date", "end_date")
    search_fields = ("name",)
