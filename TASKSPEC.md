Case Study for Advanced AI.
Background
Make sure that you have read the Assessment specification – available via Blackboard.

The assignment brief and ‘project guidelines’ for Distributed and Enterprise Systems. still apply. The principle difference is that for this case study you will create an instance of ‘Machine Learning-as-a-service’ (MLAAS) rather than connecting to pre-existing external services.
All other characteristics and requirements, still apply, including
•	The need for different classes of users, in this case:
o	End-users (which could be different groups within the organisation, or external customers) should be able to access a dashboard via which they can upload a record (which may be text, image, video, audio file) to the service and in get outputs (for example, predictions) returned by the ML model. In some scenarios the system should prompt the user for feedback and store that.
o	AI engineers should be able to train a new ML model outside the system and then upload that model into the MLAAS service. They should also be able to access a database of all end-user interactions for the purpose of refining the ML model.
o	Administrators should be able to see all activity on the system and manage users. You may wish to add the ability to monitor the level of activity on the MLAAS.
o	Finance teams should able to generate billing and invoices (for example, to different insurance companies) based on end-user activity. 
•	Web interfaces that involve different dashboards for different users
•	The use of a database to store logs of all interactions with the system
•	The ability to connect to a billing service
Choice of Case Study/project
The default situation is that groups will create, evaluate and deploy a solution for the case study below.
However, we do not wish to restrict your creativity or interests. Therefore,  groups may choose to propose a different case study, and then negotiate with tutors what changes might be needed to make it  an appropriate level of complexity. We reserve the right not to accept proposals we think unsuitable. 
 To avoid any doubt. 
•	If you do not have specific written agreement from the module team you must do the case study below.
•	Groups who submit work based on a ML project that has not been agreed in writing with the module team will still have their worked marked. But we will treat it as if it were an effort at the case study below.  Obviously that means it is highly unlikely to pass.

Description of Default Case Study
You will be given a ‘synthetic’  data set comprising a number of records of insurance claims cases, with a range of categorical and numeric fields holding values such as type and prognosis (expected recovery time) of injury, travel costs, loss of earnings, and various additional expenses. Each record also has a “settlement value”: the value the claim was settled for after negotiation.
The dataset contains many of the characteristics typical of real-world such as incomplete records, and imbalance between different types (and values) of claims. 
The company wishes to create a system and then deploy to streamline the negotiation process and improve the ‘customer journey’ by predicting the settlement value early in the process.
The task is to:
•	Design an experimental methodology for solving the problem/evaluating the proposed technique.
•	Implement and test AI-based solutions.
•	Demonstrate a working implementation, 
•	Report your findings in ways suitable for different audiences.
•	Include a recommendation of whether the technology is suitable to be adopted by the organisation: now, after further work, or never.
Some Considerations
This data contains personal information, so you should be mindful of GDPR considerations as laid out in the Information Commissioner’s Office AI & Data Protection Toolkit.
Specifically you should consider:
•	Explainability: 
o	users at the company are more likely to adopt a tool if they can understand it’s predictions,
o	 the company will need to be able to make a convincing argument that this is ‘decision support’ rather than ‘Automated Decision Making’ (which could be illegal- see the ICO toolkit for descriptions).
•	Fairness, Accountability and Trust.
o	Does the data contain records relating to protected characteristics? 
o	If so, what are you going to do about it?
o	What is your strategy for monitoring accuracy over time?
•	Interactions: if a user over-rides the model’s prediction, what are you going to do about that? How does that relate to monitoring performance over time? 



User Stories:
# MLaaS Insurance Claims System: User Stories

## End-User (Claims Handler) Stories

### Registration and Onboarding
1. As a claims handler, I want to receive login credentials from my department manager so I can access the MLaaS system.
2. As a claims handler, I want to complete my profile with professional details so the system can track my activity.
3. As a claims handler, I want to complete a brief tutorial on using the prediction system so I understand how to interpret results.
4. As a claims handler, I want to review the explanation documentation so I understand how the AI generates settlement predictions.

### Claims Processing
5. As a claims handler, I want to upload a new insurance claim form so the system can analyze it for settlement prediction.
6. As a claims handler, I want to upload supporting documents (medical reports, images, audio statements) so they can be considered in the prediction.
7. As a claims handler, I want to enter claim details manually via a form when digital documents aren't available.
8. As a claims handler, I want to review the system's predicted settlement value so I can determine if it's appropriate.
9. As a claims handler, I want to see an explanation of factors influencing the prediction so I can trust the recommendation.
10. As a claims handler, I want to override the predicted settlement with my own value when I disagree with the system's assessment.
11. As a claims handler, I want to provide feedback on why I overrode a prediction so AI engineers can improve the model.
12. As a claims handler, I want to accept a prediction and mark the claim as processed when I agree with the system.
13. As a claims handler, I want to flag a claim for review by senior staff when the case is particularly complex.

### Claims Management
14. As a claims handler, I want to view my personal dashboard showing my recent claim activities.
15. As a claims handler, I want to search for previously processed claims so I can reference similar cases.
16. As a claims handler, I want to filter claims by type, status, or date range to organize my work.
17. As a claims handler, I want to export a report of my processed claims for my performance review.
18. As a claims handler, I want to receive notifications when a flagged claim has been reviewed by senior staff.
19. As a claims handler, I want to bookmark complex claims as reference examples for future similar cases.

## AI Engineer Stories

### Model Management
20. As an AI engineer, I want to upload a new prediction model to the system so it can be tested before deployment.
21. As an AI engineer, I want to run validation tests on uploaded models so I can verify their performance.
22. As an AI engineer, I want to compare performance metrics between different model versions so I can choose the best one.
23. As an AI engineer, I want to deploy a validated model to production so claims handlers can use it.
24. As an AI engineer, I want to roll back to a previous model version if issues are discovered in production.
25. As an AI engineer, I want to schedule automated retraining of models based on new data accumulation.

### Data Analysis
26. As an AI engineer, I want to access the database of all claim predictions and outcomes so I can analyze model performance.
27. As an AI engineer, I want to view user feedback on predictions so I can identify patterns of model weakness.
28. As an AI engineer, I want to extract datasets of claims where users overrode the prediction so I can improve those areas.
29. As an AI engineer, I want to generate fairness reports to ensure the model isn't biased against protected characteristics.
30. As an AI engineer, I want to analyze prediction accuracy across different claim types to identify areas for improvement.
31. As an AI engineer, I want to set up automated alerts for when model drift exceeds acceptable thresholds.

### Documentation
32. As an AI engineer, I want to document model versions with detailed release notes for traceability.
33. As an AI engineer, I want to update the explanation framework when model methodology changes.
34. As an AI engineer, I want to publish internal reports on model performance for stakeholders.
35. As an AI engineer, I want to create training materials for claims handlers on new model features.

## Administrator Stories

### User Management
36. As an administrator, I want to create new user accounts for staff joining the organization.
37. As an administrator, I want to assign users to appropriate roles so they have correct system permissions.
38. As an administrator, I want to deactivate accounts when staff leave the organization.
39. As an administrator, I want to reset passwords for users who have trouble accessing their accounts.
40. As an administrator, I want to audit user activity logs to ensure proper system usage.

### System Configuration
41. As an administrator, I want to configure system-wide settings that affect all users.
42. As an administrator, I want to set up new insurance company profiles in the system.
43. As an administrator, I want to define department structures within each insurance company.
44. As an administrator, I want to manage API access credentials for system integrations.
45. As an administrator, I want to configure security policies like password requirements and session timeouts.

### Monitoring
46. As an administrator, I want to view overall system usage metrics to monitor performance.
47. As an administrator, I want to generate reports on system health and performance.
48. As an administrator, I want to receive alerts when system errors or anomalies occur.
49. As an administrator, I want to track load patterns to plan for infrastructure scaling.
50. As an administrator, I want to monitor security events and potential unauthorized access attempts.

## Finance User Stories

### Billing Configuration
51. As a finance user, I want to set up pricing tiers for different levels of system usage.
52. As a finance user, I want to configure client-specific pricing arrangements for contract clients.
53. As a finance user, I want to define billing cycles (monthly, quarterly) for each client.
54. As a finance user, I want to update tax rates and payment terms when financial policies change.
55. As a finance user, I want to set up volume discounts that automatically apply when usage thresholds are met.

### Invoice Management
56. As a finance user, I want to generate invoices for client insurance companies based on their system usage.
57. As a finance user, I want to review draft invoices before sending them to clients.
58. As a finance user, I want to send invoices directly through the system to client billing contacts.
59. As a finance user, I want to record payments received against outstanding invoices.
60. As a finance user, I want to send reminders for overdue invoices to client contacts.
61. As a finance user, I want to apply credits or adjustments to client accounts when necessary.

### Financial Reporting
62. As a finance user, I want to generate revenue reports for specific time periods.
63. As a finance user, I want to analyze usage patterns to forecast future revenue.
64. As a finance user, I want to export financial data to our accounting system.
65. As a finance user, I want to track profitability metrics by client and service type.
66. As a finance user, I want to compare actual revenue against projections.
67. As a finance user, I want to generate tax documentation based on system transactions.

## Insurance Company Manager Stories

### Team Management
68. As a company manager, I want to request new user accounts for team members.
69. As a company manager, I want to view activity reports for my team members.
70. As a company manager, I want to set individual performance targets related to system usage.
71. As a company manager, I want to approve complex claims that have been flagged for review.

### Performance Monitoring
72. As a company manager, I want to view dashboards showing my company's claim processing metrics.
73. As a company manager, I want to compare prediction accuracy rates for my company against benchmarks.
74. As a company manager, I want to analyze settlement patterns to identify trends and outliers.
75. As a company manager, I want to generate reports on override rates to evaluate system adoption.
76. As a company manager, I want to track claim processing times to identify efficiency improvements.

### Account Management
77. As a company manager, I want to review our company's usage data before invoices are generated.
78. As a company manager, I want to update company contact information and billing details.
79. As a company manager, I want to request additional features or service tier changes.
80. As a company manager, I want to view our contract terms and renewal dates.

## Cross-System Stories

### Data Protection and Compliance
81. As any user, I want to acknowledge data protection policies before processing sensitive claims.
82. As any user, I want to receive notifications about compliance updates that affect system usage.
83. As any user, I want to access audit trails of my own system actions for accountability.
84. As any user, I want to report potential data protection issues through a dedicated channel.

### Integrations
85. As a system integrator, I want to set up API connections between the MLaaS and our claims management system.
86. As a system integrator, I want to configure automated data synchronization between systems.
87. As a system integrator, I want to map data fields between our internal formats and the MLaaS requirements.
88. As a system integrator, I want to monitor API call logs to ensure smooth integration.

### Feedback and Improvement
89. As any user, I want to submit feature suggestions to improve the system.
90. As any user, I want to report bugs or issues encountered while using the system.
91. As any user, I want to rate my satisfaction with the prediction service.
92. As any user, I want to participate in user research to influence future development.


SYSTEM OVERVIEW
Core System Components
1. Data Pipeline

Data Ingestion: System accepts claim records from insurance companies via web interface or API
Data Processing: Raw claim data is cleaned, validated, and standardized
Feature Engineering: Relevant features are extracted from claim data (injury type, prognosis, expenses, etc.)
Data Storage: Processed data stored in secure database with proper access controls
Data Export: Ability to extract datasets for model training and analysis

2. ML Model Pipeline

Model Training: AI engineers train settlement prediction models using historical claims data
Model Validation: Models undergo testing for accuracy, fairness, and compliance
Model Registry: Approved models are stored in a version-controlled repository
Model Deployment: Selected models are deployed to the production environment
Inference Engine: Handles prediction requests from the frontend
Feedback Loop: Captures user corrections to improve future model iterations

3. User Management

Authentication: Secure login system with role-based permissions
User Provisioning: Process for creating/modifying/removing user accounts
Role Definition: Clear delineation of capabilities for each user type
Access Controls: Ensures users can only access appropriate data and functions

4. Insurance Company Management

Company Registration: Process to onboard new insurance companies to the system
Company Profile: Contains contact info, billing details, and service configurations
Department Setup: Configure divisions within companies (claims, management, etc.)
User Association: Link users to their respective companies and departments
Service Tier Configuration: Set up service packages and access levels by company

5. Billing System

Usage Tracking: Monitors prediction requests and system usage by company
Rate Configuration: Defines pricing structure (per prediction, subscription, etc.)
Invoice Generation: Creates invoices based on tracked usage and rates
Payment Processing: Records and tracks payments received
Financial Reporting: Generates revenue reports and financial analytics

User Workflows
End-User (Claims Handler) Flow:

Logs into system with credentials linked to their insurance company
Uploads new claim details via form or document upload
System preprocesses claim data and runs it through the ML model
Prediction for settlement value is displayed with confidence level and explanation
User can accept prediction, provide feedback, or override with manual value
All actions are logged for model improvement and billing purposes
User can access historical claims they've processed

AI Engineer Flow:

Develops and trains models in external environment
Logs into system with AI engineer credentials
Uploads new model version with documentation
Tests model with validation dataset
If approved, deploys model to production
Monitors model performance metrics
Accesses user feedback data for model refinement
Implements improvements based on performance analysis

Administrator Flow:

Manages user accounts across all companies
Configures system settings and permissions
Monitors system health and performance
Reviews audit logs and security metrics
Addresses technical issues and user support requests
Implements compliance updates as regulations change

Finance User Flow:

Configures billing rates and payment terms
Reviews system usage by company
Generates monthly invoices for client companies
Tracks payment status and follows up on overdue amounts
Produces financial reports for management
Projects future revenue based on usage trends

Insurance Company Onboarding Process

Initial Setup:

Company profile created with basic information
Master administrator account created for the company
Service agreement and pricing terms established
Legal and compliance documentation processed


Configuration:

Company structure defined (departments, regions)
User roles customized to company needs
Access permissions configured
Billing settings and payment methods established


User Provisioning:

Company admin creates department managers
Department managers create end-user accounts
Users receive credentials and onboarding materials
Training sessions conducted for new users


System Integration (optional):

API keys generated for system-to-system integration
Data mapping configured for company's claim format
Test integrations performed and validated
Production integration activated



Data Flow and Processing

Claim Submission:

End-user enters claim details or uploads documents
System extracts structured data from submissions
Initial validation checks performed
Claim assigned unique identifier


Preprocessing:

Data cleaned and normalized
Missing values handled according to defined rules
Features extracted and transformed
Sensitive data masked or encrypted as needed


Prediction Generation:

Preprocessed data sent to current production model
Model generates settlement prediction
Confidence score calculated
Explanation factors identified


Result Presentation:

Prediction displayed to user with supporting information
Visualizations show key factors influencing prediction
Historical comparison provided for context
Options presented for accepting or adjusting


Feedback Handling:

User accepts or modifies prediction
Feedback stored with original prediction
Discrepancies flagged for model improvement
Final decision recorded in audit trail



Security and Compliance

Data Protection:

Personal data encrypted at rest and in transit
Access controls limit data visibility by role and company
Retention policies automatically archive or delete old data
Regular security audits and penetration testing


GDPR Compliance:

Data processing agreements with each company
Subject access request mechanism
Data minimization principles applied
Right to erasure process implemented


Fairness Monitoring:

Regular bias audits across protected characteristics
Fairness metrics tracked and reported
Intervention process for detecting and addressing biases
Transparent documentation of fairness approach


Explainability:

All predictions include human-readable explanations
Importance factors clearly presented
Documentation available on model methodology
Clear indication this is "decision support" not "automated decision-making"



Monitoring and Maintenance

System Health:

Performance metrics continuously monitored
Automated alerts for system issues
Regular database maintenance and optimization
Backup and disaster recovery processes


Model Performance:

Accuracy metrics tracked over time
Drift detection to identify changing patterns
Regular retraining schedule
A/B testing for model improvements


Usage Patterns:

Analytics on system utilization
Peak usage monitoring for capacity planning
User behavior analysis for UI improvements
Feature usage tracking for product development



Deployment and Scaling

Infrastructure:

Cloud-based deployment for flexibility
Containerized components for easy scaling
Load balancing for high availability
Geographic distribution based on client locations


Scalability:

Auto-scaling based on demand
Batch processing for high-volume periods
Queue management for prediction requests
Resource allocation optimized by usage patterns


USER ROLES:
End-users (Insurance Claim Handlers)

Access a personalized dashboard interface
Upload insurance claim records (text, image, video, audio files)
Receive ML model predictions for settlement values
View explanations of how predictions were generated
Provide feedback on predictions (accept/reject/modify)
Override model predictions with manual values when necessary
View history of their own claim submissions and outcomes
Access documentation on how to interpret model outputs

AI Engineers

Upload new trained ML models to the MLaaS platform
Access the database of all end-user interactions
View comprehensive analytics on model performance
Access feedback data from end-users for model refinement
Monitor prediction accuracy metrics over time
Analyze cases where users overrode model predictions
Run validation tests against historical data
Implement fairness monitoring for protected characteristics
Generate technical reports on model performance

Administrators

Manage user accounts (create, modify, delete)
Set access permissions for different user categories
Monitor overall system activity and usage
View audit logs of all system interactions
Track security metrics and potential issues
Generate system performance reports
Configure system settings and parameters
Monitor regulatory compliance (GDPR, etc.)
Investigate incidents or unusual activities

Finance Teams

Generate billing statements based on end-user activity
Create invoices for different insurance companies
Track usage metrics for billing purposes
Access financial dashboards showing MLaaS utilization
Generate financial reports for different time periods
Set up billing parameters and rates
View usage patterns to optimize billing strategies
Export financial data for integration with other systems

All user types should have secure authentication, appropriate data access controls, and interfaces designed specifically for their needs. The system should maintain comprehensive logs of all interactions while ensuring GDPR compliance, with particular attention to data protection, explainability, fairness, and accountability as emphasized in the case study.