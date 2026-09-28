from rest_framework import serializers


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
