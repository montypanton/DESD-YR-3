# Middleware to log user actions and activities to the database.

import json
import logging
from django.urls import resolve
from django.utils.deprecation import MiddlewareMixin





logger = logging.getLogger('user_activity')

class ActivityLogMiddleware(MiddlewareMixin):
    async_mode = False
    
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def process_request(self, request):
        if request.path.startswith('/static/') or request.path.startswith('/media/'):
            return None
        
        return None
    
    def process_response(self, request, response):
        if request.path.startswith('/static/') or request.path.startswith('/media/'):
            return response
        
        if response.status_code >= 400:
            return response
        
        user = request.user if request.user.is_authenticated else None
        
        if user:
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded_for:
                ip_address = x_forwarded_for.split(',')[0]
            else:
                ip_address = request.META.get('REMOTE_ADDR')
            
            action_map = {
                'GET': 'viewed',
                'POST': 'created',
                'PUT': 'updated',
                'PATCH': 'partially updated',
                'DELETE': 'deleted'
            }
            action = action_map.get(request.method, request.method.lower())
            
            try:
                url_name = resolve(request.path_info).url_name
                resource_type = url_name.replace('-list', '').replace('-detail', '')
            except:
                resource_type = request.path.split('/')[-2] if request.path.split('/')[-1] == '' else request.path.split('/')[-1]
            
            # logs activity to database
            try:
                from account.models import ActivityLog
                
                additional_data = None
                if request.method in ['POST', 'PUT', 'PATCH'] and request.content_type == 'application/json':
                    try:
                        body = getattr(request, '_body', request.body)
                        if body:
                            additional_data = json.loads(body.decode('utf-8'))
                            if 'password' in additional_data:
                                additional_data['password'] = '[REDACTED]'
                    except:
                        additional_data = {'error': 'Could not parse request body'}
                
                
                
                
                ActivityLog.objects.create(
                    user=user,
                    action=f"{action} {resource_type}",
                    resource_type=resource_type,
                    resource_id=request.resolver_match.kwargs.get('pk', None) if hasattr(request, 'resolver_match') else None,
                    ip_address=ip_address,
                    additional_data=additional_data
                )
                
                logger.info(
                    f"User {user.email} {action} {resource_type} from {ip_address}"
                )
            except Exception as e:
                logger.error(f"Failed to log activity: {str(e)}")
        
        return response