# Handles requests related to API-level operations or integrations.

from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response


@api_view(['GET'])
def api_root(request):
    return Response({
        "status": "API is operational",
        "version": "1.0",
    })