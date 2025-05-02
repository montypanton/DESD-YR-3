import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Form, 
  Input, 
  Button, 
  DatePicker, 
  Switch, 
  message, 
  Spin, 
  Breadcrumb, 
  Card 
} from 'antd';
import { 
  HomeOutlined, 
  BankOutlined, 
  SaveOutlined, 
  ArrowLeftOutlined,
  BuildOutlined
} from '@ant-design/icons';
import { 
  getInsuranceCompany, 
  createInsuranceCompany, 
  updateInsuranceCompany 
} from '../../services/financeService';
import { useTheme } from '../../context/ThemeContext';

const InsuranceCompanyForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const { darkMode } = useTheme();
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(id ? true : false);
  const isEditing = !!id;

  useEffect(() => {
    if (isEditing) {
      fetchCompanyDetails();
    }
  }, [id]);

  const fetchCompanyDetails = async () => {
    try {
      setInitialLoading(true);
      const response = await getInsuranceCompany(id);
      const company = response.data;
      
      // Format dates for form
      form.setFieldsValue({
        ...company,
        contract_start_date: company.contract_start_date ? new Date(company.contract_start_date) : null,
        contract_end_date: company.contract_end_date ? new Date(company.contract_end_date) : null,
      });
    } catch (error) {
      console.error('Error fetching insurance company:', error);
      message.error('Failed to load insurance company details');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      
      // Format dates for API
      const formattedValues = {
        ...values,
        contract_start_date: values.contract_start_date ? values.contract_start_date.toISOString().split('T')[0] : null,
        contract_end_date: values.contract_end_date ? values.contract_end_date.toISOString().split('T')[0] : null,
      };
      
      if (isEditing) {
        await updateInsuranceCompany(id, formattedValues);
        message.success('Insurance company updated successfully');
      } else {
        await createInsuranceCompany(formattedValues);
        message.success('Insurance company created successfully');
      }
      
      navigate('/finance/insurance-companies');
    } catch (error) {
      console.error('Error saving insurance company:', error);
      message.error('Failed to save insurance company');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className={`max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Breadcrumbs */}
      <Breadcrumb className="mb-6">
        <Breadcrumb.Item>
          <Link to="/" className={darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}>
            <HomeOutlined /> Home
          </Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <Link to="/finance" className={darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}>
            <BankOutlined /> Finance
          </Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <Link to="/finance/insurance-companies" className={darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}>
            <BuildOutlined /> Insurance Companies
          </Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item className={darkMode ? 'text-gray-100' : 'text-gray-800'}>
          {isEditing ? 'Edit Company' : 'New Company'}
        </Breadcrumb.Item>
      </Breadcrumb>

      <div className="flex justify-between items-center mb-6">
        <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          {isEditing ? 'Edit Insurance Company' : 'Add Insurance Company'}
        </h1>
        <Button 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate('/finance/insurance-companies')}
        >
          Back to Companies
        </Button>
      </div>

      <Card 
        className={`shadow-md ${darkMode ? 'bg-gray-800 text-white' : 'bg-white'}`}
        title={
          <div className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            Company Information
          </div>
        }
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ is_active: true }}
          className={darkMode ? 'ant-form-dark' : ''}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Form.Item
              name="name"
              label="Company Name"
              rules={[{ required: true, message: 'Please enter the company name' }]}
            >
              <Input className={darkMode ? 'bg-gray-700 text-white border-gray-600' : ''} />
            </Form.Item>

            <Form.Item
              name="company_id"
              label="Company ID (Tax ID)"
              rules={[{ required: true, message: 'Please enter the company ID' }]}
            >
              <Input className={darkMode ? 'bg-gray-700 text-white border-gray-600' : ''} />
            </Form.Item>

            <Form.Item
              name="contact_email"
              label="Contact Email"
              rules={[
                { required: true, message: 'Please enter the contact email' },
                { type: 'email', message: 'Please enter a valid email' }
              ]}
            >
              <Input className={darkMode ? 'bg-gray-700 text-white border-gray-600' : ''} />
            </Form.Item>

            <Form.Item
              name="billing_email"
              label="Billing Email"
              rules={[
                { required: true, message: 'Please enter the billing email' },
                { type: 'email', message: 'Please enter a valid email' }
              ]}
            >
              <Input className={darkMode ? 'bg-gray-700 text-white border-gray-600' : ''} />
            </Form.Item>

            <Form.Item
              name="contact_phone"
              label="Contact Phone"
            >
              <Input className={darkMode ? 'bg-gray-700 text-white border-gray-600' : ''} />
            </Form.Item>

            <Form.Item
              name="contract_number"
              label="Contract Number"
            >
              <Input className={darkMode ? 'bg-gray-700 text-white border-gray-600' : ''} />
            </Form.Item>

            <Form.Item
              name="contract_start_date"
              label="Contract Start Date"
            >
              <DatePicker 
                className={`w-full ${darkMode ? 'bg-gray-700 text-white border-gray-600' : ''}`} 
              />
            </Form.Item>

            <Form.Item
              name="contract_end_date"
              label="Contract End Date"
            >
              <DatePicker 
                className={`w-full ${darkMode ? 'bg-gray-700 text-white border-gray-600' : ''}`} 
              />
            </Form.Item>
          </div>

          <Form.Item
            name="address"
            label="Address"
          >
            <Input.TextArea 
              rows={4} 
              className={darkMode ? 'bg-gray-700 text-white border-gray-600' : ''} 
            />
          </Form.Item>

          <Form.Item 
            name="is_active" 
            label="Active" 
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item className="mt-6">
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading} 
              icon={<SaveOutlined />}
              className={darkMode ? 'bg-green-600 hover:bg-green-700 border-green-600' : ''}
            >
              {isEditing ? 'Update Company' : 'Create Company'}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default InsuranceCompanyForm;