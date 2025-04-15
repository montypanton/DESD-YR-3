import React, { useState, useEffect } from 'react';
import { Form, Button, Input, Card, InputNumber, message, Select, Upload, DatePicker } from 'antd';
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
        amount: values.claimAmount, // This is the amount being claimed, not the settlement
        claim_data: {
          // Store all the form fields that aren't part of the main fields
          incidentDate: values.incidentDate,
          policyNumber: values.policyNumber,
          incidentType: values.incidentType,
          incidentLocation: values.incidentLocation,
          damageDescription: values.damageDescription,
          additionalInfo: values.additionalInfo,
        }
      };

      await axios.post('/api/claims/', claimData);
      message.success('Insurance claim submitted successfully!');
      form.resetFields();
      navigate('/claims');
    } catch (error) {
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
          name="claimAmount"
          label="Claimed Amount (Estimate)"
          rules={[{ required: true, message: 'Please estimate the claim amount' }]}
          extra="This is your estimated damage value. The actual settlement will be determined by our system."
        >
          <InputNumber
            style={{ width: '100%' }}
            formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={value => value.replace(/\$\s?|(,*)/g, '')}
            min={0}
            placeholder="0.00"
          />
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
