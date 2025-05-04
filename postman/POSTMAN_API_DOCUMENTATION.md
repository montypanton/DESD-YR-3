# Insurance Claims API Documentation

This document provides a comprehensive overview of all API endpoints in the Insurance Claims Processing System, organized by functional domain.

## Authentication

### Register User
- **Endpoint:** `POST /api/account/register/`
- **Description:** Register a new user in the system
- **Authentication:** None required
- **Request Body:**
  ```json
  {
    "username": "testuser",
    "email": "testuser@example.com",
    "password": "secure_password123",
    "first_name": "Test",
    "last_name": "User",
    "role": "CLAIMANT"
  }
  ```
- **Response:** User details with token

### Login
- **Endpoint:** `POST /api/account/login/`
- **Description:** Authenticate a user and retrieve JWT tokens
- **Authentication:** None required
- **Request Body:**
  ```json
  {
    "username": "testuser",
    "password": "secure_password123"
  }
  ```
- **Response:** Access and refresh tokens

### Refresh Token
- **Endpoint:** `POST /api/account/token/refresh/`
- **Description:** Refresh an expired JWT access token
- **Authentication:** None required
- **Request Body:**
  ```json
  {
    "refresh": "refresh_token_here"
  }
  ```
- **Response:** New access token

### Logout
- **Endpoint:** `POST /api/account/logout/`
- **Description:** Invalidate the current JWT token
- **Authentication:** Bearer token
- **Response:** Success confirmation

## User Management

### User Profile
- **Endpoint:** `GET /api/account/profile/`
- **Description:** Get the current user's profile information
- **Authentication:** Bearer token
- **Response:** User profile details

### Update Profile
- **Endpoint:** `PUT /api/account/profile/`
- **Description:** Update the current user's profile information
- **Authentication:** Bearer token
- **Request Body:**
  ```json
  {
    "first_name": "Updated",
    "last_name": "Name",
    "email": "updated@example.com"
  }
  ```
- **Response:** Updated user profile

### Change Password
- **Endpoint:** `POST /api/account/change-password/`
- **Description:** Change the current user's password
- **Authentication:** Bearer token
- **Request Body:**
  ```json
  {
    "old_password": "current_password",
    "new_password": "new_secure_password"
  }
  ```
- **Response:** Success confirmation

### List All Users (Admin)
- **Endpoint:** `GET /api/account/users/`
- **Description:** List all users (Admin access required)
- **Authentication:** Bearer token with Admin privileges
- **Response:** List of users

### Get Specific User (Admin)
- **Endpoint:** `GET /api/account/users/{id}/`
- **Description:** Get details for a specific user (Admin access required)
- **Authentication:** Bearer token with Admin privileges
- **Response:** User details

### Activity Logs
- **Endpoint:** `GET /api/account/activity-logs/`
- **Description:** View user activity logs (Admin access required)
- **Authentication:** Bearer token with Admin privileges
- **Response:** List of activity logs

## Claims Management

### List All Claims
- **Endpoint:** `GET /api/claims/`
- **Description:** Get a list of all claims accessible to the current user
- **Authentication:** Bearer token
- **Query Parameters:**
  - `status`: Filter by claim status
  - `page`: Page number for pagination
  - `page_size`: Number of results per page
- **Response:** List of claims with pagination

### Create New Claim
- **Endpoint:** `POST /api/claims/`
- **Description:** Submit a new insurance claim
- **Authentication:** Bearer token
- **Request Body:**
  ```json
  {
    "title": "Car Accident Claim",
    "description": "Front bumper damage from minor collision",
    "amount": 2500.00,
    "incident_date": "2023-01-15T14:30:00Z",
    "status": "SUBMITTED"
  }
  ```
- **Response:** Created claim details with ID

### Get Specific Claim
- **Endpoint:** `GET /api/claims/{id}/`
- **Description:** Get details for a specific claim
- **Authentication:** Bearer token
- **Response:** Claim details

### Update Claim
- **Endpoint:** `PUT /api/claims/{id}/`
- **Description:** Update all fields of a specific claim
- **Authentication:** Bearer token
- **Request Body:**
  ```json
  {
    "title": "Updated Claim Title",
    "description": "Updated description with more details",
    "amount": 3000.00,
    "incident_date": "2023-01-15T14:30:00Z",
    "status": "SUBMITTED"
  }
  ```
- **Response:** Updated claim details

### Partial Update Claim
- **Endpoint:** `PATCH /api/claims/{id}/`
- **Description:** Update specific fields of a claim
- **Authentication:** Bearer token
- **Request Body:**
  ```json
  {
    "status": "UNDER_REVIEW"
  }
  ```
- **Response:** Updated claim details

### Delete Claim
- **Endpoint:** `DELETE /api/claims/{id}/`
- **Description:** Delete a specific claim
- **Authentication:** Bearer token
- **Response:** Success confirmation or 404 if not found

## Finance

### Insurance Companies

#### List Insurance Companies
- **Endpoint:** `GET /api/finance/insurance-companies/`
- **Description:** Get a list of all insurance companies
- **Authentication:** Bearer token
- **Response:** List of insurance companies

#### Create Insurance Company
- **Endpoint:** `POST /api/finance/insurance-companies/`
- **Description:** Create a new insurance company
- **Authentication:** Bearer token with Finance or Admin privileges
- **Request Body:**
  ```json
  {
    "name": "ABC Insurance",
    "contact_email": "contact@abcinsurance.com",
    "contact_phone": "555-123-4567",
    "address": "123 Main St, Anytown, AN 12345"
  }
  ```
- **Response:** Created company details with ID

#### Get Specific Insurance Company
- **Endpoint:** `GET /api/finance/insurance-companies/{id}/`
- **Description:** Get details for a specific insurance company
- **Authentication:** Bearer token
- **Response:** Company details

#### Public Insurance Companies
- **Endpoint:** `GET /api/finance/public/insurance-companies/`
- **Description:** Get a list of insurance companies (public endpoint)
- **Authentication:** None required
- **Response:** List of insurance companies with limited information

### Billing

#### List Billing Records
- **Endpoint:** `GET /api/finance/billing/`
- **Description:** Get a list of all billing records
- **Authentication:** Bearer token with Finance privileges
- **Response:** List of billing records

#### Create Billing Record
- **Endpoint:** `POST /api/finance/billing/`
- **Description:** Create a new billing record
- **Authentication:** Bearer token with Finance privileges
- **Request Body:**
  ```json
  {
    "claim": 1,
    "amount": 500.00,
    "description": "Processing fee",
    "status": "PENDING"
  }
  ```
- **Response:** Created billing record details

### Invoices

#### List Invoices
- **Endpoint:** `GET /api/finance/invoices/`
- **Description:** Get a list of all invoices
- **Authentication:** Bearer token with Finance privileges
- **Response:** List of invoices

#### Create Invoice
- **Endpoint:** `POST /api/finance/invoices/`
- **Description:** Create a new invoice
- **Authentication:** Bearer token with Finance privileges
- **Request Body:**
  ```json
  {
    "insurance_company": 1,
    "billing_period_start": "2023-01-01",
    "billing_period_end": "2023-01-31",
    "due_date": "2023-02-15",
    "amount": 5000.00,
    "status": "ISSUED"
  }
  ```
- **Response:** Created invoice details

### Financial Reporting

#### Finance Dashboard
- **Endpoint:** `GET /api/finance/dashboard/`
- **Description:** Get financial dashboard data
- **Authentication:** Bearer token with Finance privileges
- **Response:** Financial dashboard data

#### User Billing Statistics
- **Endpoint:** `GET /api/finance/user-stats/`
- **Description:** Get billing statistics for all users
- **Authentication:** Bearer token with Finance privileges
- **Response:** User billing statistics

#### Specific User Billing Statistics
- **Endpoint:** `GET /api/finance/user-stats/{user_id}/`
- **Description:** Get billing statistics for a specific user
- **Authentication:** Bearer token with Finance privileges
- **Response:** Specific user billing statistics

#### Invoicing Statistics
- **Endpoint:** `GET /api/finance/invoicing-stats/`
- **Description:** Get statistics about invoicing
- **Authentication:** Bearer token with Finance privileges
- **Response:** Invoicing statistics data

## ML Interface

### ML Models

#### List ML Models
- **Endpoint:** `GET /api/ml/models/`
- **Description:** Get a list of all ML models
- **Authentication:** Bearer token
- **Response:** List of ML models

#### Register ML Model
- **Endpoint:** `POST /api/ml/models/`
- **Description:** Register a new ML model
- **Authentication:** Bearer token with ML Engineer privileges
- **Request Body:**
  ```json
  {
    "name": "Random Forest Classifier",
    "version": "1.0.0",
    "model_path": "models/random_forest_model.pkl",
    "description": "A model for predicting claim approval",
    "accuracy": 0.85,
    "active": true
  }
  ```
- **Response:** Created ML model details

#### Get Specific ML Model
- **Endpoint:** `GET /api/ml/models/{id}/`
- **Description:** Get details for a specific ML model
- **Authentication:** Bearer token
- **Response:** ML model details

#### Activate/Deactivate ML Model
- **Endpoint:** `PATCH /api/ml/models/{id}/`
- **Description:** Activate or deactivate a specific ML model
- **Authentication:** Bearer token with ML Engineer privileges
- **Request Body:**
  ```json
  {
    "active": false
  }
  ```
- **Response:** Updated ML model details

### Predictions

#### List Predictions
- **Endpoint:** `GET /api/ml/predictions/`
- **Description:** Get a list of all predictions
- **Authentication:** Bearer token
- **Response:** List of predictions

#### Create Prediction
- **Endpoint:** `POST /api/ml/predictions/`
- **Description:** Create a new prediction for a claim
- **Authentication:** Bearer token
- **Request Body:**
  ```json
  {
    "claim": 1,
    "model": 1
  }
  ```
- **Response:** Prediction results

#### Get Specific Prediction
- **Endpoint:** `GET /api/ml/predictions/{id}/`
- **Description:** Get details for a specific prediction
- **Authentication:** Bearer token
- **Response:** Prediction details

## ML Service (External Microservice)

### Health Check
- **Endpoint:** `GET /health`
- **Description:** Check if the ML service is running
- **Authentication:** None required
- **Response:** Service health status

### List Models
- **Endpoint:** `GET /models`
- **Description:** Get a list of available ML models
- **Authentication:** None required
- **Response:** List of available models

### Get Model Info
- **Endpoint:** `GET /models/{model_name}`
- **Description:** Get information about a specific ML model
- **Authentication:** None required
- **Response:** Model information

### Predict
- **Endpoint:** `POST /predict`
- **Description:** Make a prediction using a specific model
- **Authentication:** None required
- **Request Body:**
  ```json
  {
    "model_name": "random_forest",
    "data": {
      "claim_amount": 5000,
      "claim_type": "car_accident",
      "claim_description": "Minor fender bender in parking lot",
      "claimant_age": 35,
      "previous_claims_count": 2
    }
  }
  ```
- **Response:** Prediction results

### Model Performance
- **Endpoint:** `GET /models/performance/{model_name}`
- **Description:** Get performance metrics for a specific model
- **Authentication:** None required
- **Response:** Model performance metrics

## System Endpoints

### Health Check
- **Endpoint:** `GET /api/health/`
- **Description:** Check if the API is running
- **Authentication:** None required
- **Response:** Service health status

### Admin Panel
- **Endpoint:** `GET /admin/`
- **Description:** Access the Django admin panel
- **Authentication:** Django admin credentials required
- **Response:** Django admin interface