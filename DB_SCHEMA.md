User Table
Fields:
id: Primary key (auto-generated).
email: Unique email address.
first_name: First name (optional).
last_name: Last name (optional).
role: User role (ADMIN, END_USER, ML_ENGINEER, FINANCE).
profile_picture: Image field for profile pictures (optional).
phone_number: Phone number (optional).
department: Department name (optional).
is_active: Boolean indicating if the user is active.
is_staff: Boolean indicating if the user is staff.
date_joined: Date the user joined.
last_login: Last login timestamp.
Relationships:
groups: Many-to-many relationship with auth.Group.
user_permissions: Many-to-many relationship with auth.Permission.
ActivityLog Table
Fields:
id: Primary key (auto-generated).
user: Foreign key to User (nullable).
action: Description of the action.
resource_type: Type of resource affected (optional).
resource_id: ID of the resource affected (optional).
ip_address: IP address of the user (optional).
timestamp: Timestamp of the action.
additional_data: JSON field for extra data (optional).
Finance App
BillingRecord Table
Fields:
id: Primary key (auto-generated).
user: Foreign key to User.
prediction: One-to-one relationship with Prediction (nullable).
amount: Decimal field for the billing amount.
currency: Currency code (default: USD).
payment_status: Payment status (PENDING, PAID, FAILED, REFUNDED).
description: Description of the billing record (optional).
invoice_number: Unique invoice number.
created_at: Timestamp when the record was created.
updated_at: Timestamp when the record was last updated.
paid_at: Timestamp when the payment was made (optional).
UsageStatistics Table
Fields:
id: Primary key (auto-generated).
user: Foreign key to User.
date: Date of the statistics.
predictions_count: Total number of predictions.
successful_predictions: Number of successful predictions.
failed_predictions: Number of failed predictions.
total_processing_time: Total processing time in seconds.
average_processing_time: Average processing time in seconds.
billed_amount: Decimal field for the billed amount.
ML Interface App
MLModel Table
Fields:
id: Primary key (auto-generated).
name: Name of the ML model.
version: Version of the ML model.
description: Description of the model (optional).
model_file: File field for the model file.
model_type: Type of the ML model.
input_format: JSON field describing the input format.
output_format: JSON field describing the output format.
created_by: Foreign key to User.
created_at: Timestamp when the model was created.
updated_at: Timestamp when the model was last updated.
is_active: Boolean indicating if the model is active.
Prediction Table
Fields:
id: Primary key (auto-generated).
model: Foreign key to MLModel.
user: Foreign key to User.
input_data: JSON field for input data.
output_data: JSON field for output data.
created_at: Timestamp when the prediction was created.
processing_time: Processing time in seconds (optional).
status: Status of the prediction (PENDING, PROCESSING, COMPLETED, FAILED).
error_message: Error message (optional).