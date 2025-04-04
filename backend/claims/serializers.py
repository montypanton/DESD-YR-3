from rest_framework import serializers
from .models import Claim, ClaimDocument, ClaimHistory
from account.serializers import UserSerializer

class ClaimDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClaimDocument
        fields = ['id', 'document', 'document_type', 'uploadedAt']


class ClaimHistorySerializer(serializers.ModelSerializer):
    changed_by = UserSerializer(read_only=True)
    
    class Meta:
        model = ClaimHistory
        fields = ['id', 'from_status', 'to_status', 'changed_by', 'changed_at', 'notes']


class ClaimSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    documents = ClaimDocumentSerializer(many=True, read_only=True)
    total_claim_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    days_since_submission = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Claim
        fields = [
            'id', 'user', 'injuryType', 'recoveryTime', 'travelCosts', 
            'lossOfEarnings', 'additionalExpenses', 'description', 
            'status', 'settlementValue', 'reviewNotes', 'submittedAt', 
            'updatedAt', 'reviewedAt', 'documents', 'total_claim_amount',
            'days_since_submission', 'predictedSettlement', 'confidenceScore'
        ]
        read_only_fields = [
            'id', 'user', 'status', 'settlementValue', 'reviewNotes', 
            'submittedAt', 'updatedAt', 'reviewedAt', 'predictedSettlement', 
            'confidenceScore'
        ]
    
    def create(self, validated_data):
        """Add the user from request to the claim"""
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class ClaimDetailSerializer(ClaimSerializer):
    """Extended serializer with history for detailed view"""
    history = ClaimHistorySerializer(many=True, read_only=True)
    reviewedBy = UserSerializer(read_only=True)
    
    class Meta(ClaimSerializer.Meta):
        fields = ClaimSerializer.Meta.fields + ['history', 'reviewedBy']
        read_only_fields = ClaimSerializer.Meta.read_only_fields + ['history', 'reviewedBy']


class ClaimReviewSerializer(serializers.ModelSerializer):
    """Serializer for claim review actions (by admins/reviewers)"""
    class Meta:
        model = Claim
        fields = ['status', 'settlementValue', 'reviewNotes']
    
    def update(self, instance, validated_data):
        request = self.context.get('request')
        old_status = instance.status
        new_status = validated_data.get('status', old_status)
        
        # Create history record if status changed
        if old_status != new_status and request and hasattr(request, 'user'):
            ClaimHistory.objects.create(
                claim=instance,
                from_status=old_status,
                to_status=new_status,
                changed_by=request.user,
                notes=validated_data.get('reviewNotes', '')
            )
            
            # If newly approved/rejected, set reviewed fields
            if new_status in ['APPROVED', 'REJECTED']:
                from django.utils import timezone
                instance.reviewedBy = request.user
                instance.reviewedAt = timezone.now()
        
        return super().update(instance, validated_data)


class ClaimDocumentUploadSerializer(serializers.ModelSerializer):
    """Serializer for uploading documents"""
    class Meta:
        model = ClaimDocument
        fields = ['document', 'document_type', 'claim']
        read_only_fields = ['claim']  # The claim will be set in the view
    
    def create(self, validated_data):
        """Ensure claim belongs to requesting user"""
        claim_id = self.context['view'].kwargs.get('claim_id')
        claim = Claim.objects.get(id=claim_id)
        
        # Security check
        request = self.context.get('request')
        if request and request.user != claim.user:
            raise serializers.ValidationError("Cannot upload documents to someone else's claim")
            
        validated_data['claim'] = claim
        return super().create(validated_data)