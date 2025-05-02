import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Form, 
  Input, 
  Button, 
  DatePicker, 
  Select, 
  Table,
  message, 
  Spin, 
  Breadcrumb, 
  Card,
  Typography,
  Tabs,
  Tag,
  Popconfirm
} from 'antd';
import { 
  HomeOutlined, 
  BankOutlined, 
  SaveOutlined, 
  ArrowLeftOutlined,
  PlusOutlined,
  DeleteOutlined,
  FileTextOutlined,
  FilePdfOutlined,
  MailOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { 
  getInvoice, 
  createInvoice, 
  updateInvoice,
  getInsuranceCompanies,
  getUnbilledRecords,
  addItemsToInvoice,
  generateInvoicePdf,
  sendInvoice,
  markInvoiceAsPaid
} from '../../services/financeService';
import { useTheme } from '../../context/ThemeContext';

const { Option } = Select;
const { Title, Text } = Typography;
const { TabPane } = Tabs;

const InvoiceForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const { darkMode } = useTheme();
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(id ? true : false);
  const [companies, setCompanies] = useState([]);
  const [unbilledRecords, setUnbilledRecords] = useState([]);
  const [selectedBillingRecords, setSelectedBillingRecords] = useState([]);
  const [invoice, setInvoice] = useState(null);
  const [activeTab, setActiveTab] = useState('1');
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [addingItems, setAddingItems] = useState(false);
  
  const isEditing = !!id;

  useEffect(() => {
    fetchCompanies();
    
    if (isEditing) {
      fetchInvoiceDetails();
    }
  }, [id]);

  const fetchCompanies = async () => {
    try {
      const response = await getInsuranceCompanies();
      setCompanies(response.data);
    } catch (error) {
      console.error('Error fetching companies:', error);
      message.error('Failed to load insurance companies');
    }
  };

  const fetchInvoiceDetails = async () => {
    try {
      setInitialLoading(true);
      const response = await getInvoice(id);
      const invoiceData = response.data;
      setInvoice(invoiceData);
      
      // Format dates for form
      form.setFieldsValue({
        ...invoiceData,
        issued_date: invoiceData.issued_date ? new Date(invoiceData.issued_date) : null,
        due_date: invoiceData.due_date ? new Date(invoiceData.due_date) : null,
      });
    } catch (error) {
      console.error('Error fetching invoice:', error);
      message.error('Failed to load invoice details');
    } finally {
      setInitialLoading(false);
    }
  };

  const fetchUnbilledRecords = async (companyId) => {
    if (!companyId) return;
    
    try {
      setLoadingRecords(true);
      const response = await getUnbilledRecords({ insurance_company: companyId });
      setUnbilledRecords(response.data);
    } catch (error) {
      console.error('Error fetching unbilled records:', error);
      message.error('Failed to load unbilled records');
    } finally {
      setLoadingRecords(false);
    }
  };

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      
      // Format dates for API using the Ant Design DatePicker values
      // Note: Ant Design's DatePicker returns an object with a format method even without moment
      const formattedValues = {
        ...values,
        issued_date: values.issued_date ? values.issued_date.format('YYYY-MM-DD') : null,
        due_date: values.due_date ? values.due_date.format('YYYY-MM-DD') : null,
        total_amount: values.total_amount || 0, // Ensure a default value
      };
      
      if (isEditing) {
        await updateInvoice(id, formattedValues);
        message.success('Invoice updated successfully');
        fetchInvoiceDetails(); // Refresh the data
      } else {
        const response = await createInvoice(formattedValues);
        message.success('Invoice created successfully');
        navigate(`/finance/invoices/${response.data.id}`);
      }
    } catch (error) {
      console.error('Error saving invoice:', error);
      message.error('Failed to save invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleCompanyChange = (value) => {
    fetchUnbilledRecords(value);
  };

  const handleAddItems = async () => {
    if (!selectedBillingRecords.length) {
      message.warning('Please select at least one billing record to add');
      return;
    }
    
    try {
      setAddingItems(true);
      await addItemsToInvoice(id, selectedBillingRecords);
      message.success('Items added to invoice successfully');
      fetchInvoiceDetails(); // Refresh the invoice data
      fetchUnbilledRecords(invoice.insurance_company); // Refresh unbilled records
      setSelectedBillingRecords([]); // Clear selection
    } catch (error) {
      console.error('Error adding items to invoice:', error);
      message.error('Failed to add items to invoice');
    } finally {
      setAddingItems(false);
    }
  };

  const handleGeneratePdf = async () => {
    try {
      await generateInvoicePdf(id);
      message.success('Invoice PDF generated successfully');
      fetchInvoiceDetails(); // Refresh to show updated status
    } catch (error) {
      console.error('Error generating PDF:', error);
      message.error('Failed to generate PDF');
    }
  };

  const handleSendInvoice = async () => {
    try {
      await sendInvoice(id);
      message.success('Invoice sent successfully');
      fetchInvoiceDetails(); // Refresh to show updated status
    } catch (error) {
      console.error('Error sending invoice:', error);
      message.error('Failed to send invoice');
    }
  };

  const handleMarkAsPaid = async () => {
    try {
      await markInvoiceAsPaid(id);
      message.success('Invoice marked as paid');
      fetchInvoiceDetails(); // Refresh to show updated status
    } catch (error) {
      console.error('Error marking invoice as paid:', error);
      message.error('Failed to mark invoice as paid');
    }
  };

  const getStatusTag = (status) => {
    switch (status) {
      case 'DRAFT':
        return <Tag color="gray">Draft</Tag>;
      case 'ISSUED':
        return <Tag color="blue">Issued</Tag>;
      case 'SENT':
        return <Tag color="purple">Sent</Tag>;
      case 'PAID':
        return <Tag color="green">Paid</Tag>;
      case 'OVERDUE':
        return <Tag color="red">Overdue</Tag>;
      case 'CANCELLED':
        return <Tag color="volcano">Cancelled</Tag>;
      default:
        return <Tag color="default">{status}</Tag>;
    }
  };

  // Columns for unbilled records table
  const unbilledColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: 'User',
      dataIndex: ['user', 'email'],
      key: 'user',
    },
    {
      title: 'Invoice #',
      dataIndex: 'invoice_number',
      key: 'invoice_number',
    },
    {
      title: 'Reference',
      dataIndex: 'claim_reference',
      key: 'claim_reference',
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      render: amount => `£${parseFloat(amount).toFixed(2)}`
    },
    {
      title: 'Date',
      dataIndex: 'created_at',
      key: 'created_at',
      render: date => new Date(date).toLocaleDateString()
    }
  ];

  // Columns for invoice items table
  const invoiceItemsColumns = [
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
    },
    {
      title: 'Unit Price',
      dataIndex: 'unit_price',
      key: 'unit_price',
      render: price => `£${parseFloat(price).toFixed(2)}`
    },
    {
      title: 'Total',
      dataIndex: 'total_price',
      key: 'total_price',
      render: price => `£${parseFloat(price).toFixed(2)}`
    }
  ];

  const rowSelection = {
    onChange: (selectedRowKeys) => {
      setSelectedBillingRecords(selectedRowKeys);
    },
    selectedRowKeys: selectedBillingRecords
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
          <Link to="/finance/invoices" className={darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}>
            <FileTextOutlined /> Invoices
          </Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item className={darkMode ? 'text-gray-100' : 'text-gray-800'}>
          {isEditing ? `Invoice #${invoice?.invoice_number}` : 'New Invoice'}
        </Breadcrumb.Item>
      </Breadcrumb>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {isEditing ? `Invoice #${invoice?.invoice_number}` : 'Create New Invoice'}
          </h1>
          {isEditing && invoice && (
            <div className="mt-2">
              {getStatusTag(invoice.status)}
              <Text className={`ml-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Created: {new Date(invoice.created_at).toLocaleString()}
              </Text>
            </div>
          )}
        </div>
        <div className="flex space-x-2">
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate('/finance/invoices')}
          >
            Back to Invoices
          </Button>
          
          {isEditing && invoice && (
            <>
              {invoice.status === 'DRAFT' && (
                <Button 
                  type="primary"
                  ghost
                  icon={<FilePdfOutlined />}
                  onClick={handleGeneratePdf}
                >
                  Generate PDF
                </Button>
              )}
              
              {invoice.status === 'ISSUED' && (
                <Button 
                  type="primary"
                  icon={<MailOutlined />}
                  onClick={handleSendInvoice}
                  className="bg-purple-600 hover:bg-purple-700 border-purple-600"
                >
                  Send Invoice
                </Button>
              )}
              
              {(invoice.status === 'ISSUED' || invoice.status === 'SENT') && (
                <Button 
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={handleMarkAsPaid}
                  className="bg-green-600 hover:bg-green-700 border-green-600"
                >
                  Mark as Paid
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="Invoice Details" key="1">
          <Card 
            className={`shadow-md ${darkMode ? 'bg-gray-800 text-white' : 'bg-white'}`}
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              initialValues={{ 
                status: 'DRAFT',
                currency: 'USD',
                total_amount: 0
              }}
              className={darkMode ? 'ant-form-dark' : ''}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Form.Item
                  name="insurance_company"
                  label="Insurance Company"
                  rules={[{ required: true, message: 'Please select an insurance company' }]}
                >
                  <Select 
                    placeholder="Select a company"
                    onChange={handleCompanyChange}
                    disabled={isEditing}
                    className={darkMode ? 'dark-select' : ''}
                  >
                    {companies.map(company => (
                      <Option key={company.id} value={company.id}>{company.name}</Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item
                  name="invoice_number"
                  label="Invoice Number"
                  extra="Leave blank to auto-generate"
                >
                  <Input 
                    disabled={isEditing}
                    className={darkMode ? 'bg-gray-700 text-white border-gray-600' : ''} 
                  />
                </Form.Item>

                <Form.Item
                  name="issued_date"
                  label="Issue Date"
                  rules={[{ required: true, message: 'Please select an issue date' }]}
                >
                  <DatePicker 
                    className={`w-full ${darkMode ? 'bg-gray-700 text-white border-gray-600' : ''}`}
                  />
                </Form.Item>

                <Form.Item
                  name="due_date"
                  label="Due Date"
                  rules={[{ required: true, message: 'Please select a due date' }]}
                >
                  <DatePicker 
                    className={`w-full ${darkMode ? 'bg-gray-700 text-white border-gray-600' : ''}`}
                  />
                </Form.Item>

                <Form.Item
                  name="total_amount"
                  label="Total Amount"
                >
                  <Input 
                    type="number"
                    step="0.01"
                    prefix="$"
                    disabled={isEditing}
                    className={darkMode ? 'bg-gray-700 text-white border-gray-600' : ''}
                  />
                </Form.Item>

                <Form.Item
                  name="currency"
                  label="Currency"
                >
                  <Input 
                    disabled
                    className={darkMode ? 'bg-gray-700 text-white border-gray-600' : ''}
                  />
                </Form.Item>

                <Form.Item
                  name="status"
                  label="Status"
                  className="col-span-2"
                >
                  <Select 
                    disabled={isEditing}
                    className={darkMode ? 'dark-select' : ''}
                  >
                    <Option value="DRAFT">Draft</Option>
                    <Option value="ISSUED">Issued</Option>
                    <Option value="SENT">Sent</Option>
                    <Option value="PAID">Paid</Option>
                    <Option value="OVERDUE">Overdue</Option>
                    <Option value="CANCELLED">Cancelled</Option>
                  </Select>
                </Form.Item>
              </div>

              <Form.Item
                name="notes"
                label="Notes"
              >
                <Input.TextArea 
                  rows={4}
                  className={darkMode ? 'bg-gray-700 text-white border-gray-600' : ''}
                />
              </Form.Item>

              <Form.Item className="mt-6">
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  loading={loading} 
                  icon={<SaveOutlined />}
                  className={darkMode ? 'bg-green-600 hover:bg-green-700 border-green-600' : ''}
                >
                  {isEditing ? 'Update Invoice' : 'Create Invoice'}
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </TabPane>
        
        {isEditing && (
          <TabPane tab="Invoice Items" key="2">
            <Card 
              className={`shadow-md mb-6 ${darkMode ? 'bg-gray-800 text-white' : 'bg-white'}`}
              title={
                <div className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  Current Invoice Items
                </div>
              }
            >
              {invoice && invoice.items && invoice.items.length > 0 ? (
                <Table
                  columns={invoiceItemsColumns}
                  dataSource={invoice.items}
                  rowKey="id"
                  pagination={false}
                  summary={() => (
                    <Table.Summary fixed>
                      <Table.Summary.Row>
                        <Table.Summary.Cell index={0} colSpan={3}>
                          <strong>Total</strong>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={1}>
                          <strong>£{parseFloat(invoice.total_amount).toFixed(2)}</strong>
                        </Table.Summary.Cell>
                      </Table.Summary.Row>
                    </Table.Summary>
                  )}
                />
              ) : (
                <div className="py-6 text-center text-gray-500">
                  No items have been added to this invoice yet.
                </div>
              )}
            </Card>
            
            {invoice && invoice.status === 'DRAFT' && (
              <Card 
                className={`shadow-md ${darkMode ? 'bg-gray-800 text-white' : 'bg-white'}`}
                title={
                  <div className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    Add Billing Records to Invoice
                  </div>
                }
                extra={
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleAddItems}
                    disabled={selectedBillingRecords.length === 0}
                    loading={addingItems}
                    className={darkMode ? 'bg-green-600 hover:bg-green-700 border-green-600' : ''}
                  >
                    Add Selected Items
                  </Button>
                }
              >
                <Table
                  rowSelection={rowSelection}
                  columns={unbilledColumns}
                  dataSource={unbilledRecords}
                  rowKey="id"
                  loading={loadingRecords}
                  pagination={{ pageSize: 5 }}
                />
              </Card>
            )}
          </TabPane>
        )}
      </Tabs>
    </div>
  );
};

export default InvoiceForm;