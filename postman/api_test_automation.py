#!/usr/bin/env python3
"""
Automated API Testing Script for Insurance Claims System

This script performs automated testing of all API endpoints in the Insurance Claims system.
It handles authentication, test data creation, and validation of responses.
"""

import requests
import json
import time
import sys
import os
from datetime import datetime, timedelta
import random
import argparse

# Configuration
BASE_URL = "http://localhost:8000"
ML_SERVICE_URL = "http://localhost:5000"
TEST_USERNAME = f"testuser_{int(time.time())}"
TEST_PASSWORD = "SecureTestPassword123!"
TEST_EMAIL = f"testuser_{int(time.time())}@example.com"
TIMEOUT = 10  # seconds

# Test results tracking
results = {
    "total": 0,
    "passed": 0,
    "failed": 0,
    "skipped": 0,
    "errors": [],
    "tests": []
}

# Authentication tokens
auth_tokens = {
    "access": None,
    "refresh": None
}

# Test data IDs for cleanup
test_data = {
    "user_id": None,
    "claim_ids": [],
    "company_ids": [],
    "invoice_ids": [],
    "model_ids": [],
    "prediction_ids": []
}

# Color formatting for terminal output
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

def print_header(text):
    """Print a formatted header"""
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'=' * 80}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{text.center(80)}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'=' * 80}{Colors.ENDC}\n")

def print_test(name, passed, message=None):
    """Print test result with color formatting"""
    results["total"] += 1
    
    if passed:
        results["passed"] += 1
        status = f"{Colors.GREEN}✓ PASS{Colors.ENDC}"
    else:
        results["failed"] += 1
        status = f"{Colors.RED}✗ FAIL{Colors.ENDC}"
        if message:
            results["errors"].append({"test": name, "error": message})
    
    # Add to test results for reporting
    results["tests"].append({
        "name": name,
        "passed": passed,
        "message": message
    })
    
    print(f"{status} {name}")
    if message and not passed:
        print(f"      {Colors.RED}{message}{Colors.ENDC}")

def api_request(method, endpoint, data=None, auth=True, expected_status=200, description=None):
    """Make an API request and validate the response"""
    url = f"{BASE_URL}{endpoint}"
    headers = {}
    
    if auth and auth_tokens["access"]:
        headers["Authorization"] = f"Bearer {auth_tokens['access']}"
    
    if data and method.lower() in ['post', 'put', 'patch']:
        headers["Content-Type"] = "application/json"
    
    try:
        if description:
            print(f"{Colors.BLUE}→ {description}{Colors.ENDC}")
        
        response = requests.request(
            method=method.upper(),
            url=url,
            headers=headers,
            json=data,
            timeout=TIMEOUT
        )
        
        # Check status code
        status_ok = response.status_code == expected_status
        if not status_ok:
            print_test(
                f"{method.upper()} {endpoint}", 
                False, 
                f"Expected status {expected_status}, got {response.status_code}: {response.text}"
            )
            return None
        
        # Try to parse JSON response
        try:
            response_data = response.json()
            return response_data
        except json.JSONDecodeError:
            # For responses that don't return JSON (like DELETE)
            return response.text
    
    except requests.RequestException as e:
        print_test(f"{method.upper()} {endpoint}", False, f"Request failed: {str(e)}")
        return None

def wait_for_services():
    """Wait for backend and ML services to be available"""
    print_header("Checking Service Availability")
    
    # Check backend
    max_retries = 5
    for i in range(max_retries):
        try:
            response = requests.get(f"{BASE_URL}/api/health/", timeout=TIMEOUT)
            if response.status_code == 200:
                print(f"{Colors.GREEN}Backend service is running{Colors.ENDC}")
                break
        except requests.RequestException:
            if i < max_retries - 1:
                print(f"Waiting for backend service (attempt {i+1}/{max_retries})...")
                time.sleep(3)
            else:
                print(f"{Colors.RED}Backend service not available - some tests may fail{Colors.ENDC}")
    
    # Check ML service
    for i in range(max_retries):
        try:
            response = requests.get(f"{ML_SERVICE_URL}/health", timeout=TIMEOUT)
            if response.status_code == 200:
                print(f"{Colors.GREEN}ML service is running{Colors.ENDC}")
                break
        except requests.RequestException:
            if i < max_retries - 1:
                print(f"Waiting for ML service (attempt {i+1}/{max_retries})...")
                time.sleep(3)
            else:
                print(f"{Colors.YELLOW}ML service not available - ML tests will be skipped{Colors.ENDC}")

def test_auth_endpoints():
    """Test authentication endpoints"""
    global auth_tokens
    
    print_header("Testing Authentication Endpoints")
    
    # Test registration
    registration_data = {
        "username": TEST_USERNAME,
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD,
        "first_name": "Test",
        "last_name": "User",
        "role": "CLAIMANT"
    }
    
    register_response = api_request(
        "post", 
        "/api/account/register/", 
        data=registration_data,
        auth=False,
        description="Registering test user"
    )
    
    if register_response:
        print_test("Register User", True)
        if "id" in register_response:
            test_data["user_id"] = register_response["id"]
    
    # Test login
    login_data = {
        "username": TEST_USERNAME,
        "password": TEST_PASSWORD
    }
    
    login_response = api_request(
        "post", 
        "/api/account/login/", 
        data=login_data,
        auth=False,
        description="Logging in with test user"
    )
    
    if login_response and "access" in login_response:
        print_test("Login", True)
        auth_tokens["access"] = login_response["access"]
        auth_tokens["refresh"] = login_response["refresh"]
    else:
        print_test("Login", False, "Failed to obtain authentication tokens")
        return False
    
    # Test token refresh
    refresh_data = {
        "refresh": auth_tokens["refresh"]
    }
    
    refresh_response = api_request(
        "post", 
        "/api/account/token/refresh/", 
        data=refresh_data,
        auth=False,
        description="Refreshing access token"
    )
    
    if refresh_response and "access" in refresh_response:
        print_test("Refresh Token", True)
        auth_tokens["access"] = refresh_response["access"]
    else:
        print_test("Refresh Token", False)
    
    # Test profile access
    profile_response = api_request(
        "get", 
        "/api/account/profile/", 
        description="Retrieving user profile"
    )
    
    if profile_response:
        print_test("Get Profile", True)
    
    return True

def test_claims_endpoints():
    """Test claims management endpoints"""
    print_header("Testing Claims Endpoints")
    
    # Test getting all claims
    claims_response = api_request(
        "get", 
        "/api/claims/",
        description="Retrieving all claims"
    )
    
    if claims_response is not None:
        print_test("List Claims", True)
    
    # Test creating a claim
    claim_data = {
        "title": f"Test Claim {int(time.time())}",
        "description": "This is an automated test claim",
        "amount": 1500.00,
        "incident_date": (datetime.now() - timedelta(days=5)).isoformat(),
        "status": "SUBMITTED"
    }
    
    create_claim_response = api_request(
        "post", 
        "/api/claims/", 
        data=claim_data,
        description="Creating a test claim"
    )
    
    if create_claim_response and "id" in create_claim_response:
        print_test("Create Claim", True)
        claim_id = create_claim_response["id"]
        test_data["claim_ids"].append(claim_id)
        
        # Test getting specific claim
        get_claim_response = api_request(
            "get", 
            f"/api/claims/{claim_id}/",
            description=f"Retrieving claim #{claim_id}"
        )
        
        if get_claim_response and "id" in get_claim_response:
            print_test("Get Specific Claim", True)
        
        # Test updating claim
        update_data = {
            "title": f"Updated Test Claim {int(time.time())}",
            "description": "This claim has been updated by the automated test",
            "amount": 2000.00,
            "incident_date": (datetime.now() - timedelta(days=5)).isoformat(),
            "status": "SUBMITTED"
        }
        
        update_claim_response = api_request(
            "put", 
            f"/api/claims/{claim_id}/", 
            data=update_data,
            description=f"Updating claim #{claim_id}"
        )
        
        if update_claim_response:
            print_test("Update Claim", True)
        
        # Test partial update
        patch_data = {
            "status": "UNDER_REVIEW"
        }
        
        patch_claim_response = api_request(
            "patch", 
            f"/api/claims/{claim_id}/", 
            data=patch_data,
            description=f"Partially updating claim #{claim_id}"
        )
        
        if patch_claim_response:
            print_test("Partially Update Claim", True)
    else:
        print_test("Create Claim", False)

def test_finance_endpoints():
    """Test finance endpoints"""
    print_header("Testing Finance Endpoints")
    
    # Test insurance companies endpoints
    companies_response = api_request(
        "get", 
        "/api/finance/insurance-companies/",
        description="Retrieving insurance companies"
    )
    
    if companies_response is not None:
        print_test("List Insurance Companies", True)
    
    # Test creating an insurance company
    company_data = {
        "name": f"Test Insurance Co {int(time.time())}",
        "contact_email": f"contact_{int(time.time())}@example.com",
        "contact_phone": "555-123-4567",
        "address": "123 Test Street, Test City, TS 12345"
    }
    
    create_company_response = api_request(
        "post", 
        "/api/finance/insurance-companies/", 
        data=company_data,
        description="Creating test insurance company"
    )
    
    if create_company_response and "id" in create_company_response:
        print_test("Create Insurance Company", True)
        company_id = create_company_response["id"]
        test_data["company_ids"].append(company_id)
        
        # Test getting specific company
        get_company_response = api_request(
            "get", 
            f"/api/finance/insurance-companies/{company_id}/",
            description=f"Retrieving company #{company_id}"
        )
        
        if get_company_response:
            print_test("Get Specific Insurance Company", True)
    else:
        print_test("Create Insurance Company", False)
    
    # Test public companies endpoint
    public_companies_response = api_request(
        "get", 
        "/api/finance/public/insurance-companies/",
        auth=False,
        description="Retrieving public insurance companies list"
    )
    
    if public_companies_response is not None:
        print_test("Public Insurance Companies", True)
    
    # Test finance dashboard
    dashboard_response = api_request(
        "get", 
        "/api/finance/dashboard/",
        description="Retrieving finance dashboard"
    )
    
    if dashboard_response is not None:
        print_test("Finance Dashboard", True)

def test_ml_endpoints():
    """Test ML endpoints"""
    print_header("Testing ML Endpoints")
    
    # Test if ML service is available
    try:
        ml_health_response = requests.get(f"{ML_SERVICE_URL}/health", timeout=TIMEOUT)
        ml_available = ml_health_response.status_code == 200
    except:
        ml_available = False
    
    if not ml_available:
        print(f"{Colors.YELLOW}Skipping ML tests as ML service is not available{Colors.ENDC}")
        results["skipped"] += 5  # Approximate number of ML tests
        return
    
    # Test listing ML models
    models_response = api_request(
        "get", 
        "/api/ml/models/",
        description="Retrieving ML models"
    )
    
    if models_response is not None:
        print_test("List ML Models", True)
    
    # Test creating/registering an ML model
    model_data = {
        "name": f"Test ML Model {int(time.time())}",
        "version": "1.0.0",
        "model_path": "models/test_model.pkl",
        "description": "This is a test model created by automated tests",
        "accuracy": 0.85,
        "active": True
    }
    
    create_model_response = api_request(
        "post", 
        "/api/ml/models/", 
        data=model_data,
        description="Registering test ML model"
    )
    
    if create_model_response and "id" in create_model_response:
        print_test("Register ML Model", True)
        model_id = create_model_response["id"]
        test_data["model_ids"].append(model_id)
        
        # Test getting specific model
        get_model_response = api_request(
            "get", 
            f"/api/ml/models/{model_id}/",
            description=f"Retrieving ML model #{model_id}"
        )
        
        if get_model_response:
            print_test("Get Specific ML Model", True)
        
        # Test predictions only if we have claims
        if test_data["claim_ids"]:
            claim_id = test_data["claim_ids"][0]
            
            # Test creating a prediction
            prediction_data = {
                "claim": claim_id,
                "model": model_id
            }
            
            create_prediction_response = api_request(
                "post", 
                "/api/ml/predictions/", 
                data=prediction_data,
                description=f"Creating prediction for claim #{claim_id}"
            )
            
            if create_prediction_response and "id" in create_prediction_response:
                print_test("Create Prediction", True)
                prediction_id = create_prediction_response["id"]
                test_data["prediction_ids"].append(prediction_id)
                
                # Test getting specific prediction
                get_prediction_response = api_request(
                    "get", 
                    f"/api/ml/predictions/{prediction_id}/",
                    description=f"Retrieving prediction #{prediction_id}"
                )
                
                if get_prediction_response:
                    print_test("Get Specific Prediction", True)
            else:
                print_test("Create Prediction", False)
    else:
        print_test("Register ML Model", False)

def test_ml_service_endpoints():
    """Test direct ML service endpoints"""
    print_header("Testing ML Service Endpoints")
    
    # Check if ML service is available
    try:
        ml_health_response = requests.get(f"{ML_SERVICE_URL}/health", timeout=TIMEOUT)
        ml_available = ml_health_response.status_code == 200
    except:
        ml_available = False
    
    if not ml_available:
        print(f"{Colors.YELLOW}Skipping ML service tests as service is not available{Colors.ENDC}")
        results["skipped"] += 3  # Approximate number of ML service tests
        return
    
    # Test health endpoint
    print(f"{Colors.BLUE}→ Checking ML service health{Colors.ENDC}")
    try:
        health_response = requests.get(f"{ML_SERVICE_URL}/health", timeout=TIMEOUT)
        print_test("ML Service Health", health_response.status_code == 200)
    except requests.RequestException as e:
        print_test("ML Service Health", False, str(e))
    
    # Test models list endpoint
    print(f"{Colors.BLUE}→ Retrieving ML service models{Colors.ENDC}")
    try:
        models_response = requests.get(f"{ML_SERVICE_URL}/models", timeout=TIMEOUT)
        print_test("ML Service Models List", models_response.status_code == 200)
        
        # If we have models, test prediction endpoint
        if models_response.status_code == 200:
            models_data = models_response.json()
            if models_data and len(models_data) > 0:
                model_name = models_data[0].get("name", "")
                
                if model_name:
                    # Test prediction endpoint
                    prediction_data = {
                        "model_name": model_name,
                        "data": {
                            "claim_amount": random.randint(1000, 5000),
                            "claim_type": "car_accident",
                            "claim_description": "Test prediction via automated test",
                            "claimant_age": random.randint(18, 65),
                            "previous_claims_count": random.randint(0, 5)
                        }
                    }
                    
                    print(f"{Colors.BLUE}→ Testing prediction with model '{model_name}'{Colors.ENDC}")
                    try:
                        prediction_response = requests.post(
                            f"{ML_SERVICE_URL}/predict",
                            json=prediction_data,
                            timeout=TIMEOUT
                        )
                        print_test("ML Service Prediction", prediction_response.status_code == 200)
                    except requests.RequestException as e:
                        print_test("ML Service Prediction", False, str(e))
    except requests.RequestException as e:
        print_test("ML Service Models List", False, str(e))

def cleanup_test_data():
    """Clean up test data created during testing"""
    print_header("Cleaning Up Test Data")
    
    # Delete test predictions
    for prediction_id in test_data["prediction_ids"]:
        print(f"{Colors.BLUE}→ Deleting test prediction #{prediction_id}{Colors.ENDC}")
        api_request(
            "delete",
            f"/api/ml/predictions/{prediction_id}/",
            expected_status=204
        )
    
    # Delete test ML models
    for model_id in test_data["model_ids"]:
        print(f"{Colors.BLUE}→ Deleting test ML model #{model_id}{Colors.ENDC}")
        api_request(
            "delete",
            f"/api/ml/models/{model_id}/",
            expected_status=204
        )
    
    # Delete test claims
    for claim_id in test_data["claim_ids"]:
        print(f"{Colors.BLUE}→ Deleting test claim #{claim_id}{Colors.ENDC}")
        api_request(
            "delete",
            f"/api/claims/{claim_id}/",
            expected_status=204
        )
    
    # Delete test companies
    for company_id in test_data["company_ids"]:
        print(f"{Colors.BLUE}→ Deleting test insurance company #{company_id}{Colors.ENDC}")
        api_request(
            "delete",
            f"/api/finance/insurance-companies/{company_id}/",
            expected_status=204
        )
    
    # We don't delete the test user as there might not be a delete endpoint
    # and the username is timestamped to prevent conflicts

def generate_report(report_format, report_dir):
    """Generate test report in specified format"""
    if not os.path.exists(report_dir):
        os.makedirs(report_dir)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Basic report data
    report_data = {
        "summary": {
            "total": results["total"],
            "passed": results["passed"],
            "failed": results["failed"],
            "skipped": results["skipped"],
            "success_rate": results["passed"] / (results["total"] - results["skipped"]) * 100 if results["total"] - results["skipped"] > 0 else 0
        },
        "tests": results["tests"],
        "errors": results["errors"],
        "timestamp": timestamp,
        "api_url": BASE_URL,
        "ml_service_url": ML_SERVICE_URL
    }
    
    # JSON report (always generated)
    json_path = os.path.join(report_dir, f"api_test_results_{timestamp}.json")
    with open(json_path, 'w') as json_file:
        json.dump(report_data, json_file, indent=2)
    
    # HTML report if requested
    if report_format == "html":
        html_path = os.path.join(report_dir, f"api_test_results_{timestamp}.html")
        
        # Basic HTML template
        html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API Test Results</title>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; }}
        h1, h2, h3 {{ color: #333; }}
        .container {{ max-width: 1200px; margin: 0 auto; }}
        .summary {{ background: #f4f4f4; padding: 15px; border-radius: 5px; margin-bottom: 20px; }}
        .summary-item {{ display: inline-block; margin-right: 20px; font-weight: bold; }}
        .test-item {{ margin-bottom: 10px; padding: 10px; border-radius: 5px; }}
        .pass {{ background-color: #dff0d8; border: 1px solid #d6e9c6; }}
        .fail {{ background-color: #f2dede; border: 1px solid #ebccd1; }}
        .skipped {{ background-color: #fcf8e3; border: 1px solid #faebcc; }}
        .timestamp {{ color: #777; font-size: 0.9em; margin-top: 5px; }}
        .section {{ margin-bottom: 30px; }}
    </style>
</head>
<body>
    <div class="container">
        <h1>API Test Results</h1>
        <div class="timestamp">Generated: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}</div>
        
        <div class="section">
            <h2>Test Environment</h2>
            <p>API URL: {BASE_URL}</p>
            <p>ML Service URL: {ML_SERVICE_URL}</p>
        </div>
        
        <div class="section summary">
            <h2>Summary</h2>
            <div class="summary-item">Total: {results["total"]}</div>
            <div class="summary-item" style="color: green;">Passed: {results["passed"]}</div>
            <div class="summary-item" style="color: red;">Failed: {results["failed"]}</div>
            <div class="summary-item" style="color: orange;">Skipped: {results["skipped"]}</div>
            <div class="summary-item">Success Rate: {report_data["summary"]["success_rate"]:.1f}%</div>
        </div>
        
        <div class="section">
            <h2>Test Results</h2>
"""
        
        # Add test results
        for test in results["tests"]:
            status_class = "pass" if test["passed"] else "fail"
            message = f'<div class="test-message">{test["message"]}</div>' if test["message"] and not test["passed"] else ""
            
            html_content += f"""
            <div class="test-item {status_class}">
                <div class="test-name"><strong>{"✓" if test["passed"] else "✗"} {test["name"]}</strong></div>
                {message}
            </div>"""
        
        # Close HTML
        html_content += """
        </div>
    </div>
</body>
</html>
"""
        
        with open(html_path, 'w') as html_file:
            html_file.write(html_content)
        
        print(f"\n{Colors.GREEN}HTML report generated: {html_path}{Colors.ENDC}")
    
    print(f"{Colors.GREEN}JSON report generated: {json_path}{Colors.ENDC}")
    return json_path

def print_summary():
    """Print test results summary"""
    print_header("Test Results Summary")
    
    print(f"{Colors.BOLD}Total Tests:{Colors.ENDC} {results['total']}")
    print(f"{Colors.GREEN}Passed:{Colors.ENDC} {results['passed']}")
    print(f"{Colors.RED}Failed:{Colors.ENDC} {results['failed']}")
    print(f"{Colors.YELLOW}Skipped:{Colors.ENDC} {results['skipped']}")
    
    if results['errors']:
        print(f"\n{Colors.RED}{Colors.BOLD}Errors:{Colors.ENDC}")
        for error in results['errors']:
            print(f"{Colors.RED}• {error['test']}: {error['error']}{Colors.ENDC}")
    
    success_rate = results['passed'] / (results['total'] - results['skipped']) * 100 if results['total'] - results['skipped'] > 0 else 0
    print(f"\n{Colors.BOLD}Success Rate:{Colors.ENDC} {success_rate:.1f}%")
    
    if results['failed'] == 0:
        print(f"\n{Colors.GREEN}{Colors.BOLD}All tests passed successfully!{Colors.ENDC}")
    else:
        print(f"\n{Colors.RED}{Colors.BOLD}Some tests failed. Review the errors above.{Colors.ENDC}")

def main():
    """Main function to run the tests"""
    parser = argparse.ArgumentParser(description='Automated API tests for Insurance Claims System')
    parser.add_argument('--no-cleanup', action='store_true', help='Skip cleaning up test data')
    parser.add_argument('--base-url', type=str, help=f'Base URL for the API (default: {BASE_URL})')
    parser.add_argument('--ml-url', type=str, help=f'Base URL for the ML service (default: {ML_SERVICE_URL})')
    parser.add_argument('--report', type=str, choices=['json', 'html'], default='json', help='Report format (default: json)')
    parser.add_argument('--report-dir', type=str, default='./reports', help='Directory for test reports (default: ./reports)')
    args = parser.parse_args()
    
    global BASE_URL, ML_SERVICE_URL
    
    if args.base_url:
        BASE_URL = args.base_url
    
    if args.ml_url:
        ML_SERVICE_URL = args.ml_url
    
    print_header("Insurance Claims API Automated Tests")
    print(f"API URL: {BASE_URL}")
    print(f"ML Service URL: {ML_SERVICE_URL}")
    print(f"Test Username: {TEST_USERNAME}")
    print(f"Test Start Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    try:
        # Wait for services to be available
        wait_for_services()
        
        # Run tests
        auth_ok = test_auth_endpoints()
        
        if auth_ok:
            test_claims_endpoints()
            test_finance_endpoints()
            test_ml_endpoints()
            test_ml_service_endpoints()
            
            # Cleanup test data
            if not args.no_cleanup:
                cleanup_test_data()
        else:
            print(f"{Colors.RED}Authentication failed. Skipping remaining tests.{Colors.ENDC}")
        
        # Print summary
        print_summary()
        
        # Generate report
        report_path = generate_report(args.report, args.report_dir)
        
        # Return exit code based on test results
        return 1 if results['failed'] > 0 else 0
        
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}Tests interrupted. Exiting...{Colors.ENDC}")
        return 1
    except Exception as e:
        print(f"\n{Colors.RED}An error occurred: {str(e)}{Colors.ENDC}")
        return 1

if __name__ == "__main__":
    sys.exit(main())