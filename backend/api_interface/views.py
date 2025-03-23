from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response


@api_view(['GET'])
def api_root(request):
    """
    API root endpoint to verify API is working
    """
    return Response({
        "status": "API is operational",
        "version": "1.0",
    })