# Converts User model data between JSON and Python for API use.

from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from .models import User, ActivityLog


class UserSerializer(serializers.ModelSerializer):
    insurance_company_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'role', 'profile_picture', 
                 'phone_number', 'department', 'date_joined', 'last_login', 'is_superuser', 
                 'is_staff', 'approval_status', 'insurance_company', 'insurance_company_name']
        read_only_fields = ['id', 'date_joined', 'last_login', 'is_superuser', 'is_staff']
    
    def get_insurance_company_name(self, obj):
        return obj.insurance_company.name if obj.insurance_company else None


class UserDetailSerializer(serializers.ModelSerializer):
    insurance_company_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'role', 'profile_picture', 
                 'phone_number', 'department', 'date_joined', 'last_login', 'is_active', 
                 'is_staff', 'is_superuser', 'approval_status', 'insurance_company', 'insurance_company_name']
        read_only_fields = ['id', 'date_joined', 'last_login', 'is_staff', 'is_superuser']
    
    def get_insurance_company_name(self, obj):
        return obj.insurance_company.name if obj.insurance_company else None


class RegisterSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(
        required=True,
        validators=[UniqueValidator(queryset=User.objects.all())]
    )
    password = serializers.CharField(
        write_only=True, required=True, validators=[validate_password]
    )
    password2 = serializers.CharField(write_only=True, required=True)
    insurance_company = serializers.PrimaryKeyRelatedField(
        required=False, 
        allow_null=True, 
        queryset=User._meta.get_field('insurance_company').remote_field.model.objects.all()
    )

    class Meta:
        model = User
        fields = ['email', 'password', 'password2', 'first_name', 'last_name', 
                 'role', 'phone_number', 'department', 'insurance_company']

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        
        # Set approval status based on role
        role = validated_data.get('role')
        if role in ['ML_ENGINEER', 'FINANCE']:
            validated_data['approval_status'] = 'PENDING'
        else:
            validated_data['approval_status'] = 'APPROVED'
            
        user = User.objects.create_user(**validated_data)
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')

        if email and password:
            user = authenticate(request=self.context.get('request'),
                                email=email, password=password)
            if not user:
                msg = 'Unable to log in with provided credentials.'
                raise serializers.ValidationError(msg, code='authorization')
            if not user.is_active:
                raise serializers.ValidationError('Account is disabled.', code='authorization')
            if user.approval_status == 'PENDING':
                raise serializers.ValidationError('Your account is pending approval. Please wait for an administrator to approve your account.', code='authorization')
            if user.approval_status == 'REJECTED':
                raise serializers.ValidationError('Your account registration has been rejected. Please contact an administrator for more information.', code='authorization')
        else:
            msg = 'Must include "email" and "password".'
            raise serializers.ValidationError(msg, code='authorization')

        attrs['user'] = user
        return attrs


class PasswordChangeSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])
    confirm_password = serializers.CharField(required=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({"new_password": "Password fields didn't match."})
        return attrs


class ProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'phone_number', 'department', 'profile_picture']


class ActivityLogSerializer(serializers.ModelSerializer):
    user_email = serializers.SerializerMethodField()
    
    class Meta:
        model = ActivityLog
        fields = ['id', 'user', 'user_email', 'action', 'resource_type', 
                  'resource_id', 'ip_address', 'timestamp', 'additional_data']
        read_only_fields = fields
    
    def get_user_email(self, obj):
        return obj.user.email if obj.user else 'Anonymous'