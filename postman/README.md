# API Testing Suite

This folder contains a streamlined API testing solution for the Insurance Claims Processing System with both manual and automated options.

## Quick Start

### Manual Testing with Postman

1. Install [Postman](https://www.postman.com/downloads/)
2. Import these files:
   - `Insurance_Claims_API.postman_collection.json`
   - `Local_Development.postman_environment.json`
3. Select "Local Development" environment from the dropdown (top-right)
4. Use the collection to test API endpoints

### Automated Testing with Python Script

```bash
# Install dependency
pip install requests

# Run tests
./api_test_automation.py

# View results in the reports directory
```

## Files Overview

- **Collection Files**
  - `Insurance_Claims_API.postman_collection.json` - API endpoints for Postman
  - `Local_Development.postman_environment.json` - Environment configuration

- **Automated Testing**
  - `api_test_automation.py` - Python script for automated testing
  - `reports/` - Directory for test output reports

- **Documentation**
  - `POSTMAN_API_DOCUMENTATION.md` - API reference documentation

## Test Output

The automated tests generate:
1. Real-time terminal output with test results
2. JSON report in the `reports` directory (created automatically)
3. HTML summary report if requested

## Available Tests

### Authentication
- User registration
- Login/token handling
- Profile management

### Claims Management
- Create/read/update/delete claims
- Status changes
- Data validation

### Finance Operations
- Insurance companies management
- Billing operations
- Finance reporting

### ML Services
- ML model management
- Prediction operations
- ML service direct testing

## Command Line Options

```bash
# Run with different API URLs
./api_test_automation.py --base-url http://localhost:8000 --ml-url http://localhost:5000

# Keep test data after running (skip cleanup)
./api_test_automation.py --no-cleanup

# Generate HTML report
./api_test_automation.py --report html

# Specify report output location
./api_test_automation.py --report-dir ./custom-reports
```

## CI/CD Integration

### GitHub Actions

```yaml
- name: Run API tests
  run: |
    cd postman
    pip install requests
    ./api_test_automation.py --report html
    
- name: Archive test results
  uses: actions/upload-artifact@v2
  with:
    name: test-reports
    path: ./postman/reports
```

### Postman/Newman

```bash
npm install -g newman newman-reporter-htmlextra
newman run Insurance_Claims_API.postman_collection.json -e Local_Development.postman_environment.json --reporters cli,htmlextra --reporter-htmlextra-export ./reports/results.html
```