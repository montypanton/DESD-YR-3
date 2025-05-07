import React, { useState, useEffect } from 'react';
import { Form, Button, Input, Card, message, Select, Upload, DatePicker } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';

const { TextArea } = Input;
const { Option } = Select;

const ClaimForm = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Direct to modern interface if accessed directly
  useEffect(() => {
    // If accessed directly through /claims/new, 
    // redirect to the newer submit-claim path
    if (location.pathname === '/claims/new' && !location.state?.fromClaimsList) {
      navigate('/submit-claim', { replace: true });
    }
  }, [location, navigate]);
  
  // If redirected from elsewhere, continue with the component
  if (location.pathname === '/claims/new' && !location.state?.fromClaimsList) {
    return null; // Component will be unmounted during redirect
  }

  const onFinish = async (values) => {
    setLoading(true);
    try {
      // Transform form values into the required format
      const claimData = {
        title: values.title,
        description: values.description,
        amount: 0, // Default amount that will be calculated by backend or ML model
        status: 'PENDING', // Ensure status is PENDING for finance review
        claim_data: {
          // Store all the form fields that aren't part of the main fields
          incidentDate: values.incidentDate,
          policyNumber: values.policyNumber,
          incidentType: values.incidentType,
          incidentLocation: values.incidentLocation,
          damageDescription: values.damageDescription,
          additionalInfo: values.additionalInfo,
          // Add necessary fields for ML prediction
          Accident_Date: values.incidentDate ? values.incidentDate.format('YYYY-MM-DD') : null,
          AccidentType: values.incidentType || 'Other',
          DominantInjury: 'Multiple', // Default value
          InjuryPrognosis: 'A. 1 month', // Default value
        }
      };

      // Use the claims service to ensure it reaches both endpoints
      const response = await fetch('/api/claims/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(claimData)
      });
      
      // Handle response
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${await response.text()}`);
      }
      
      message.success('Insurance claim submitted successfully!');
      form.resetFields();
      navigate('/claims');
    } catch (error) {
      // Also try the finance endpoint as fallback
      try {
        const claimData = {
          title: values.title,
          description: values.description,
          amount: 0, // Default amount that will be calculated by backend or ML model
          status: 'PENDING', // Ensure status is PENDING for finance review
          claim_data: {
            // Store all the form fields that aren't part of the main fields
            incidentDate: values.incidentDate,
            policyNumber: values.policyNumber,
            incidentType: values.incidentType,
            incidentLocation: values.incidentLocation,
            damageDescription: values.damageDescription,
            additionalInfo: values.additionalInfo,
            // Add necessary fields for ML prediction
            Accident_Date: values.incidentDate ? values.incidentDate.format('YYYY-MM-DD') : null,
            AccidentType: values.incidentType || 'Other',
            DominantInjury: 'Multiple', // Default value
            InjuryPrognosis: 'A. 1 month', // Default value
          }
        };

        const financeResponse = await fetch('/api/finance/claims/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(claimData)
        });
        
        if (financeResponse.ok) {
          message.success('Insurance claim submitted successfully!');
          form.resetFields();
          navigate('/claims');
          return;
        }
      } catch (fallbackError) {
        // Continue to the error handler
      }
      
      message.error('Failed to submit claim: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Submit a New Insurance Claim" style={{ maxWidth: 800, margin: '0 auto' }}>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
      >
        <Form.Item
          name="title"
          label="Claim Title"
          rules={[{ required: true, message: 'Please enter a title for your claim' }]}
        >
          <Input placeholder="e.g., Car Accident Claim" />
        </Form.Item>

        <Form.Item
          name="incidentType"
          label="Incident Type"
          rules={[{ required: true, message: 'Please select the type of incident' }]}
        >
          <Select placeholder="Select incident type">
            <Option value="accident">Vehicle Accident</Option>
            <Option value="property">Property Damage</Option>
            <Option value="theft">Theft/Burglary</Option>
            <Option value="medical">Medical</Option>
            <Option value="other">Other</Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="incidentDate"
          label="Date of Incident"
          rules={[{ required: true, message: 'Please provide the incident date' }]}
        >
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          name="policyNumber"
          label="Policy Number"
          rules={[{ required: true, message: 'Please enter your policy number' }]}
        >
          <Input placeholder="e.g., POL-12345678" />
        </Form.Item>

        <Form.Item
          name="incidentLocation"
          label="Incident Location"
        >
          <Input placeholder="e.g., 123 Main St, Anytown" />
        </Form.Item>

        <Form.Item
          name="description"
          label="Claim Description"
          rules={[{ required: true, message: 'Please provide a description' }]}
        >
          <TextArea rows={4} placeholder="Provide a detailed description of the incident" />
        </Form.Item>

        <Form.Item
          name="damageDescription"
          label="Damage Description"
        >
          <TextArea rows={3} placeholder="Describe the damages incurred" />
        </Form.Item>

        <Form.Item
          name="evidence"
          label="Supporting Evidence"
          extra="Upload photos, reports, or other evidence to support your claim"
        >
          <Upload name="files" action="/api/uploads/" listType="picture">
            <Button icon={<UploadOutlined />}>Upload Files</Button>
          </Upload>
        </Form.Item>

        <Form.Item
          name="additionalInfo"
          label="Additional Information"
        >
          <TextArea rows={3} placeholder="Any additional details that might be relevant" />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>
            Submit Insurance Claim
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default ClaimForm;
