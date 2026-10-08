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
