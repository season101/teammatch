from django.core.exceptions import ValidationError
from django.db import models


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Term(models.Model):
    name = models.CharField(max_length=50, unique=True)
    # "end" is reserved in SQL, so both get a _date suffix
    start_date = models.DateField()
    end_date = models.DateField()

    class Meta:
        ordering = ["-start_date"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(start_date__lt=models.F("end_date")),
                name="term_start_before_end",
            ),
        ]

    def __str__(self):
        return self.name

    def clean(self):
        # Two terms on one day would make "the current term" ambiguous (admin runs this).
        # shortcut: not a DB constraint, so bootstrap's TERMS list must not overlap either.
        if self.start_date and self.end_date:
            overlap = (
                Term.objects.filter(start_date__lte=self.end_date, end_date__gte=self.start_date)
                .exclude(pk=self.pk)
                .first()
            )
            if overlap:
                raise ValidationError(
                    f"These dates overlap {overlap.name} "
                    f"({overlap.start_date:%b %d, %Y} to {overlap.end_date:%b %d, %Y})."
                )
