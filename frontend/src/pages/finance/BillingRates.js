import React, { useState, useEffect } from 'react';
import { Space, Table, Button, Form, Input, DatePicker, InputNumber, Modal, Select, Tag, Popconfirm, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CheckCircleOutlined, StopOutlined } from '@ant-design/icons';
import moment from 'moment';
import {
  getBillingRates,
  getInsuranceCompanies,
  createBillingRate,
  updateBillingRate,
  deleteBillingRate,
  activateBillingRate,
  deactivateBillingRate
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
    setIsModalVisible(true);
  };

  // Show modal for editing an existing rate
  const showEditModal = (rate) => {
    setEditingRate(rate);
    form.setFieldsValue({
      insurance_company: rate.insurance_company,
      rate_per_claim: rate.rate_per_claim,
      effective_from: rate.effective_from ? moment(rate.effective_from) : null,
      effective_to: rate.effective_to ? moment(rate.effective_to) : null,
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
      
      // Format dates
      const formattedValues = {
        ...values,
        effective_from: values.effective_from ? values.effective_from.format('YYYY-MM-DD') : moment().format('YYYY-MM-DD'),
        effective_to: values.effective_to ? values.effective_to.format('YYYY-MM-DD') : null
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
      message.error('Failed to save billing rate. ' + (error.response?.data?.detail || 'Please try again.'));
    }
  };

  // Handle rate deletion
  const handleDelete = async (rateId) => {
    try {
      await deleteBillingRate(rateId);
      message.success('Billing rate deleted successfully!');
      
      // Remove the deleted rate from state
      setBillingRates(billingRates.filter(rate => rate.id !== rateId));
    } catch (error) {
      console.error('Error deleting rate:', error);
      message.error('Failed to delete billing rate. Please try again.');
    }
  };

  // Handle rate activation
  const handleActivate = async (rateId) => {
    try {
      await activateBillingRate(rateId);
      message.success('Billing rate activated successfully!');
      
      // Reload billing rates to reflect changes
      const response = await getBillingRates();
      setBillingRates(response.data);
    } catch (error) {
      console.error('Error activating rate:', error);
      message.error('Failed to activate billing rate. Please try again.');
    }
  };

  // Handle rate deactivation
  const handleDeactivate = async (rateId) => {
    try {
      await deactivateBillingRate(rateId);
      message.success('Billing rate deactivated successfully!');
      
      // Reload billing rates to reflect changes
      const response = await getBillingRates();
      setBillingRates(response.data);
    } catch (error) {
      console.error('Error deactivating rate:', error);
      message.error('Failed to deactivate billing rate. Please try again.');
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
      title: 'Effective From',
      dataIndex: 'effective_from',
      key: 'effective_from',
      render: (text) => moment(text).format('DD MMM YYYY'),
      sorter: (a, b) => moment(a.effective_from).diff(moment(b.effective_from))
    },
    {
      title: 'Effective To',
      dataIndex: 'effective_to',
      key: 'effective_to',
      render: (text) => text ? moment(text).format('DD MMM YYYY') : 'Indefinite',
      sorter: (a, b) => {
        if (!a.effective_to && !b.effective_to) return 0;
        if (!a.effective_to) return 1;
        if (!b.effective_to) return -1;
        return moment(a.effective_to).diff(moment(b.effective_to));
      }
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive) => (
        isActive ? (
          <Tag color="green">Active</Tag>
        ) : (
          <Tag color="red">Inactive</Tag>
        )
      ),
      filters: [
        { text: 'Active', value: true },
        { text: 'Inactive', value: false }
      ],
      onFilter: (value, record) => record.is_active === value
    },
    {
      title: 'Created By',
      dataIndex: 'created_by_name',
      key: 'created_by_name'
    },
    {
      title: 'Created At',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text) => moment(text).format('DD MMM YYYY HH:mm'),
      sorter: (a, b) => moment(a.created_at).diff(moment(b.created_at))
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Button 
            type="link" 
            icon={<EditOutlined />} 
            onClick={() => showEditModal(record)}
          />
          
          {record.is_active ? (
            <Popconfirm
              title="Are you sure you want to deactivate this rate?"
              onConfirm={() => handleDeactivate(record.id)}
              okText="Yes"
              cancelText="No"
            >
              <Button type="link" icon={<StopOutlined />} />
            </Popconfirm>
          ) : (
            <Popconfirm
              title="Are you sure you want to activate this rate? This will deactivate any other active rates for this company."
              onConfirm={() => handleActivate(record.id)}
              okText="Yes"
              cancelText="No"
            >
              <Button type="link" icon={<CheckCircleOutlined />} />
            </Popconfirm>
          )}
          
          <Popconfirm
            title="Are you sure you want to delete this rate?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Billing Rates Management</h1>
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
          scroll={{ x: 'max-content' }}
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
            is_active: true,
            effective_from: moment()
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
          
          <Form.Item
            name="effective_from"
            label="Effective From"
            rules={[
              { required: true, message: 'Please select effective from date' }
            ]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          
          <Form.Item
            name="effective_to"
            label="Effective To (leave blank for indefinite)"
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          
          <Form.Item
            name="is_active"
            valuePropName="checked"
            label="Status"
          >
            <Select>
              <Option value={true}>Active</Option>
              <Option value={false}>Inactive</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default BillingRates;