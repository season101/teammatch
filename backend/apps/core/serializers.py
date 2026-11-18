from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import Term


class CheckSerializer(serializers.Serializer):
    ok = serializers.BooleanField()
    latency_ms = serializers.FloatField()
    error = serializers.CharField(allow_null=True)


class ChecksSerializer(serializers.Serializer):
    database = CheckSerializer()
    redis = CheckSerializer()


class HealthSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=["ok", "degraded"])
    version = serializers.CharField()
    checks = ChecksSerializer()


class TermSerializer(serializers.ModelSerializer):
    class Meta:
        model = Term
        fields = ["id", "name", "start_date", "end_date"]

    def validate(self, data):
        # Term.clean refuses dates that overlap another term; start < end is checked here
        # so it's a 400, not the database constraint's 500.
        if data["start_date"] >= data["end_date"]:
            raise serializers.ValidationError({"end_date": ["Must be after the start date."]})
        try:
            Term(**data).clean()
        except DjangoValidationError as error:
            raise serializers.ValidationError({"start_date": error.messages}) from None
        return data
