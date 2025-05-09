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
} from 'antd';
import { 
  HomeOutlined, 
  BankOutlined, 
  SaveOutlined, 
  ArrowLeftOutlined,
  PlusOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import moment from 'moment';
import { 
  getInvoice, 
  createInvoice, 
  updateInvoice,
  getInsuranceCompanies,
  getUnbilledRecords,
  addItemsToInvoice
} from '../../services/financeService';
import { createDebugInvoice, testInvoiceCreation } from '../../services/debugInvoiceHelper';
import { useTheme } from '../../context/ThemeContext';
import { generateUniqueMLInvoiceNumber } from '../../services/sharedInvoiceRegistry';
import apiClient from '../../services/apiClient';

const { Option } = Select;
const { Title, Text } = Typography;
// Tabs.TabPane is deprecated - using items prop instead

const InvoiceForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const { darkMode } = useTheme();
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(id ? true : false);
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [unbilledRecords, setUnbilledRecords] = useState([]);
  const [selectedBillingRecords, setSelectedBillingRecords] = useState([]);
  const [invoice, setInvoice] = useState(null);
  const [activeTab, setActiveTab] = useState('1');
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [addingItems, setAddingItems] = useState(false);
  const [invoiceType, setInvoiceType] = useState('regular'); // 'regular' or 'ml_usage'
  
  const isEditing = !!id;

  useEffect(() => {
    fetchCompanies();
    fetchUsers(); // Fetch users for ML usage invoices
    
    if (isEditing) {
      fetchInvoiceDetails();
    }
  }, [id]);
  
  const fetchUsers = async () => {
    try {
      const response = await apiClient.get('/account/users/');
      setUsers(response.data.results || response.data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      // Don't show an error message as this is not critical
    }
  };

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
      
      // Format dates for form using moment
      form.setFieldsValue({
        ...invoiceData,
        issued_date: invoiceData.issued_date ? moment(invoiceData.issued_date) : null,
        due_date: invoiceData.due_date ? moment(invoiceData.due_date) : null,
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
      
      // Make sure we have the company information
      const companyInfo = companies.find(c => c.id === values.insurance_company);
      
      if (!companyInfo) {
        message.error('Selected company information not found. Please try again or select a different company.');
        setLoading(false);
        return;
      }
      
      // Clean and simplify data for submission
      // Only sending the minimum required fields to reduce potential issues
      const formattedValues = {
        insurance_company: parseInt(values.insurance_company, 10), // Ensure it's an integer
        issued_date: values.issued_date ? values.issued_date.format('YYYY-MM-DD') : null,
        due_date: values.due_date ? values.due_date.format('YYYY-MM-DD') : null,
        total_amount: parseFloat(values.total_amount || 0).toFixed(2), // Ensure decimal format
        currency: 'USD', // Using USD to match model default in backend
        status: 'ISSUED', // Simplified status
      };
      
      // Check if this is an ML usage invoice based on the invoice number format or type
      const isMLUsage = values.invoice_type === 'ml_usage' || 
                        (values.invoice_number && values.invoice_number.startsWith('ML-'));
      
      // If ML usage invoice, set special fields to make it discoverable by the ML usage page
      if (isMLUsage) {
        if (!values.user_id) {
          message.error('User ID is required for ML usage invoices');
          setLoading(false);
          return;
        }
        
        // Include additional metadata for ML usage invoices
        formattedValues.invoice_type = 'ml_usage';
        formattedValues.metadata = {
          is_ml_usage: true,
          ml_usage_invoice: true,
          user_id: values.user_id,
        };
        
        // ALWAYS generate a truly unique invoice number for ML invoices
        // This ensures the same number appears in both finance and end-user areas
        const uniqueInvoiceNumber = generateUniqueMLInvoiceNumber(values.user_id);
        formattedValues.invoice_number = uniqueInvoiceNumber;
        
        // Log the unique invoice number being used
        console.log(`Created ML usage invoice with number ${uniqueInvoiceNumber} for user ${values.user_id}`);
        
        // Always store user_id on the invoice itself for lookup
        formattedValues.user_id = values.user_id;
      }
      
      // We're not including insurance_company_name as the backend is supposed to handle this
      
      // Log the values being sent to the API for debugging
      console.log('Submitting invoice with values:', formattedValues);
      
      if (isEditing) {
        await updateInvoice(id, formattedValues);
        message.success('Invoice updated successfully');
        fetchInvoiceDetails(); // Refresh the data
      } else {
        const response = await createInvoice(formattedValues);
        message.success('Invoice created successfully');
        
        // Log success information
        console.log('Invoice created successfully:', {
          id: response.data.id,
          invoice_number: response.data.invoice_number,
          company: companyInfo.name,
          company_id: companyInfo.id
        });
        
        // Redirect to the invoices list page instead of the edit page
        message.info('You can find the invoice in the Invoices list');
        setTimeout(() => {
          navigate('/finance/invoices');
        }, 1500);
      }
    } catch (error) {
      console.error('Error saving invoice:', error);
      
      // Provide more detailed error messages based on the error response
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        
        if (error.response.data && typeof error.response.data === 'object') {
          // Try to extract validation errors
          const errorMessages = [];
          
          Object.entries(error.response.data).forEach(([field, messages]) => {
            if (Array.isArray(messages)) {
              errorMessages.push(`${field}: ${messages.join(', ')}`);
            } else if (typeof messages === 'string') {
              errorMessages.push(`${field}: ${messages}`);
            }
          });
          
          if (errorMessages.length > 0) {
            message.error(`Failed to save invoice: ${errorMessages.join('; ')}`);
          } else {
            message.error(`Failed to save invoice: ${error.response.status} error`);
          }
        } else if (typeof error.response.data === 'string') {
          // If the response is HTML or other string content (like a Django error page)
          message.error(`Failed to save invoice: Server error ${error.response.status}. Check console for details.`);
          console.error('Server returned HTML error page - likely a server-side exception');
        } else {
          message.error(`Failed to save invoice: ${error.response.status} error`);
        }
      } else if (error.request) {
        // The request was made but no response was received
        console.error('Error request:', error.request);
        message.error('Failed to save invoice: No response received from server');
      } else {
        // Something happened in setting up the request that triggered an Error
        message.error(`Failed to save invoice: ${error.message}`);
      }
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

  // Columns for unbilled records table
  const unbilledColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: 'Claim Reference',
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
      {/* Breadcrumbs using items prop to avoid deprecation warning */}
      <Breadcrumb 
        className="mb-6"
        items={[
          {
            title: (
              <Link to="/" className={darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}>
                <HomeOutlined /> Home
              </Link>
            ),
          },
          {
            title: (
              <Link to="/finance/dashboard" className={darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}>
                <BankOutlined /> Finance
              </Link>
            ),
          },
          {
            title: (
              <Link to="/finance/invoices" className={darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}>
                <FileTextOutlined /> Invoices
              </Link>
            ),
          },
          {
            title: (
              <span className={darkMode ? 'text-gray-100' : 'text-gray-800'}>
                {isEditing ? `Invoice #${invoice?.invoice_number}` : 'New Invoice'}
              </span>
            ),
          },
        ]}
      />

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {isEditing ? `Invoice #${invoice?.invoice_number}` : 'Create New Invoice'}
          </h1>
          {isEditing && invoice && (
            <div className="mt-2">
              <Text className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
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
        </div>
      </div>

      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        items={[
          {
            key: "1",
            label: "Invoice Details",
            children: (
              <Card 
                className={`shadow-md ${darkMode ? 'bg-gray-800 text-white' : 'bg-white'}`}
              >
                <Form
                  form={form}
                  layout="vertical"
                  onFinish={handleSubmit}
                  initialValues={{ 
                    total_amount: 0
                  }}
                  className={darkMode ? 'ant-form-dark' : ''}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Form.Item
                      name="invoice_type"
                      label="Invoice Type"
                      initialValue="regular"
                      rules={[{ required: true, message: 'Please select an invoice type' }]}
                    >
                      <Select 
                        placeholder="Select invoice type"
                        onChange={(value) => setInvoiceType(value)}
                        disabled={isEditing}
                        className={darkMode ? 'dark-select' : ''}
                      >
                        <Option value="regular">Regular Invoice</Option>
                        <Option value="ml_usage">ML Usage Invoice</Option>
                      </Select>
                    </Form.Item>

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

                    {invoiceType === 'ml_usage' && (
                      <Form.Item
                        name="user_id"
                        label="End User (for ML Usage)"
                        rules={[{ required: invoiceType === 'ml_usage', message: 'Please select a user for ML usage invoice' }]}
                        tooltip="The end user who will be billed for ML model usage"
                      >
                        <Select 
                          placeholder="Select end user"
                          disabled={isEditing}
                          className={darkMode ? 'dark-select' : ''}
                          showSearch
                          optionFilterProp="children"
                          filterOption={(input, option) =>
                            option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                          }
                        >
                          {users.map(user => (
                            <Option key={user.id} value={user.id}>
                              {user.first_name} {user.last_name} ({user.email})
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                    )}

                    <Form.Item
                      name="invoice_number"
                      label="Invoice Number"
                      extra={invoiceType === 'ml_usage' ? 
                        "For ML Usage invoices, format should be ML-YYYYMM-XXXX" : 
                        "Leave blank to auto-generate"}
                    >
                      <Input 
                        placeholder={invoiceType === 'ml_usage' ? 
                          "ML-YYYYMM-XXXX (auto-generated if blank)" : 
                          "Auto-generated if left blank"}
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
                      label="Total Amount (£)"
                    >
                      <Input 
                        type="number"
                        step="0.01"
                        prefix="£"
                        disabled={isEditing}
                        className={darkMode ? 'bg-gray-700 text-white border-gray-600' : ''}
                      />
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
                    <div className="flex space-x-2">
                      <Button 
                        type="primary" 
                        htmlType="submit" 
                        loading={loading} 
                        icon={<SaveOutlined />}
                        className={darkMode ? 'bg-green-600 hover:bg-green-700 border-green-600' : ''}
                      >
                        {isEditing ? 'Update Invoice' : 'Create Invoice'}
                      </Button>
                      
                      {/* Debug button for testing with simplified payload */}
                      <Button 
                        type="default"
                        onClick={() => {
                          const companyId = form.getFieldValue('insurance_company');
                          if (!companyId) {
                            message.error('Please select an insurance company first');
                            return;
                          }
                          
                          const userId = form.getFieldValue('user_id');
                          const isMLInvoice = form.getFieldValue('invoice_type') === 'ml_usage';
                          
                          setLoading(true);
                          createDebugInvoice(companyId, userId, isMLInvoice)
                            .then(result => {
                              message.success('Debug invoice created successfully!');
                              console.log('Debug invoice result:', result);
                              setTimeout(() => {
                                navigate('/finance/invoices');
                              }, 1500);
                            })
                            .catch(err => {
                              message.error('Debug invoice creation failed. See console for details.');
                            })
                            .finally(() => {
                              setLoading(false);
                            });
                        }}
                      >
                        Debug Create
                      </Button>
                    </div>
                  </Form.Item>
                </Form>
              </Card>
            )
          },
          isEditing && {
            key: "2",
            label: "Invoice Items",
            children: (
              <>
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
              </>
            )
          }
        ].filter(Boolean)}
      />
    </div>
  );
};

export default InvoiceForm;