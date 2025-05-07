import React, { useState, useEffect } from 'react';
import { Table, Button, Form, InputNumber, Modal, Select, message } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import {
  getBillingRates,
  getInsuranceCompanies,
  createBillingRate,
  updateBillingRate
} from '../../services/financeService';

const { Option } = Select;

const BillingRates = () => {
  const [loading, setLoading] = useState(true);
  const [billingRates, setBillingRates] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRate, setEditingRate] = useState(null);
  const [form] = Form.useForm();

  // Fetch billing rates and companies when component mounts
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [ratesResponse, companiesResponse] = await Promise.all([
          getBillingRates(),
          getInsuranceCompanies()
        ]);
        
        setBillingRates(ratesResponse.data);
        setCompanies(companiesResponse.data);
      } catch (error) {
        console.error('Error fetching data:', error);
        message.error('Failed to load billing rates data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Show modal for adding a new rate
  const showAddModal = () => {
    setEditingRate(null);
    form.resetFields();
    form.setFieldsValue({
      is_active: true
    });
    setIsModalVisible(true);
  };

  // Show modal for editing an existing rate
  const showEditModal = (rate) => {
    setEditingRate(rate);
    form.setFieldsValue({
      insurance_company: rate.insurance_company,
      rate_per_claim: rate.rate_per_claim,
      is_active: rate.is_active
    });
    setIsModalVisible(true);
  };

  // Handle modal cancel
  const handleCancel = () => {
    setIsModalVisible(false);
  };

  // Handle form submission
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      // Prepare values for API
      const formattedValues = {
        ...values,
        is_active: true // Always set active to true to simplify
      };
      
      if (editingRate) {
        // Update existing rate
        await updateBillingRate(editingRate.id, formattedValues);
        message.success('Billing rate updated successfully!');
      } else {
        // Create new rate
        await createBillingRate(formattedValues);
        message.success('Billing rate created successfully!');
      }
      
      // Reload billing rates
      const response = await getBillingRates();
      setBillingRates(response.data);
      
      setIsModalVisible(false);
    } catch (error) {
      console.error('Error submitting form:', error);
      message.error('Failed to save billing rate. Please try again.');
    }
  };

  // Table columns configuration
  const columns = [
    {
      title: 'Insurance Company',
      dataIndex: 'insurance_company_name',
      key: 'insurance_company_name',
      sorter: (a, b) => a.insurance_company_name.localeCompare(b.insurance_company_name)
    },
    {
      title: 'Rate Per Claim (£)',
      dataIndex: 'rate_per_claim',
      key: 'rate_per_claim',
      render: (text) => `£${parseFloat(text).toFixed(2)}`,
      sorter: (a, b) => a.rate_per_claim - b.rate_per_claim
    },
    {
      title: 'Last Updated',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text) => new Date(text).toLocaleDateString(),
      sorter: (a, b) => new Date(a.created_at) - new Date(b.created_at)
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button 
          type="link" 
          icon={<EditOutlined />} 
          onClick={() => showEditModal(record)}
        />
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Billing Rates</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={showAddModal}>
          Add New Rate
        </Button>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <Table
          columns={columns}
          dataSource={billingRates}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </div>
      
      <Modal
        title={editingRate ? 'Edit Billing Rate' : 'Add New Billing Rate'}
        visible={isModalVisible}
        onCancel={handleCancel}
        onOk={handleSubmit}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            is_active: true
          }}
        >
          <Form.Item
            name="insurance_company"
            label="Insurance Company"
            rules={[
              { required: true, message: 'Please select an insurance company' }
            ]}
          >
            <Select placeholder="Select insurance company">
              {companies.map(company => (
                <Option key={company.id} value={company.id}>{company.name}</Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            name="rate_per_claim"
            label="Rate Per Claim (£)"
            rules={[
              { required: true, message: 'Please enter rate per claim' },
              { type: 'number', min: 0.01, message: 'Rate must be greater than 0' }
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              step={0.01}
              precision={2}
              prefix="£"
              placeholder="0.00"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default BillingRates;