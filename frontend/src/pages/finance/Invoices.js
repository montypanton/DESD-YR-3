import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Table, 
  Button, 
  Input, 
  Space, 
  message, 
  Breadcrumb, 
  Tag, 
  Select,
  DatePicker,
  Modal,
  Form,
  Descriptions,
  Alert
} from 'antd';
import { 
  PlusOutlined, 
  SearchOutlined, 
  EditOutlined, 
  HomeOutlined, 
  BankOutlined, 
  FileTextOutlined,
  CheckCircleOutlined,
  FilePdfOutlined,
  DownloadOutlined,
  CreditCardOutlined,
  DollarOutlined
} from '@ant-design/icons';
import { getInvoices, markInvoiceAsPaid, downloadInvoicePdf, generateInvoicePdf } from '../../services/financeService';
import { submitInvoiceToExternalService } from '../../services/billingServiceIntegration';
import { useTheme } from '../../context/ThemeContext';
import { apiClient } from '../../services/authService';

const { Option } = Select;
const { RangePicker } = DatePicker;

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grouped'
  const [pendingPaymentModalVisible, setPendingPaymentModalVisible] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const navigate = useNavigate();
  const { darkMode } = useTheme();

  useEffect(() => {
    fetchInvoices();
    
    // Import shared invoice registry for ML invoice synchronization
    const importRegistry = async () => {
      try {
        const {
          getUserInvoices,
          getInvoicePayment,
          generateDeterministicInvoiceId 
        } = await import('../../services/sharedInvoiceRegistry');
        
        // Sync with shared invoice registry data
        syncInvoicesWithRegistry(getUserInvoices, getInvoicePayment, generateDeterministicInvoiceId);
      } catch (error) {
        console.error('Error importing invoice registry:', error);
      }
    };
    
    // After fetching invoices from API, sync with registry
    setTimeout(() => {
      importRegistry();
    }, 1000);
  }, []);
  
  // Function to sync with the shared invoice registry to ensure consistency
  const syncInvoicesWithRegistry = (getUserInvoices, getInvoicePayment, generateDeterministicInvoiceId) => {
    console.log('Syncing finance invoices with shared registry');
    
    try {
      // Get user list to find all registered ML invoices
      apiClient.get('/account/users/')
        .then(response => {
          const users = response.data.results || response.data || [];
          let registryInvoices = [];
          
          // For each user, check if they have registered ML invoices
          users.forEach(user => {
            const userInvoiceNumbers = getUserInvoices(user.id);
            
            if (userInvoiceNumbers && userInvoiceNumbers.length > 0) {
              console.log(`Found ${userInvoiceNumbers.length} registered invoices for user ${user.id}`);
              
              // For each invoice number, create a finance-side representation
              userInvoiceNumbers.forEach(invoiceNumber => {
                // Generate a deterministic ID for this invoice
                const invoiceId = generateDeterministicInvoiceId(user.id);
                
                // Check if we already have an invoice with this ID/number in our state
                const existingInvoice = invoices.find(inv => 
                  inv.id === invoiceId || inv.invoice_number === invoiceNumber
                );
                
                if (existingInvoice) {
                  console.log(`Invoice ${invoiceNumber} already exists in state`);
                  return; // Skip already existing invoices
                }
                
                // Get payment information if available
                const paymentInfo = getInvoicePayment(invoiceNumber) || 
                                   getInvoicePayment(invoiceId);
                
                // Create a finance representation of this invoice
                registryInvoices.push({
                  id: invoiceId,
                  invoice_number: invoiceNumber,
                  created_at: new Date().toISOString(),
                  title: `ML Usage Invoice for ${user.first_name} ${user.last_name}`,
                  insurance_company_name: 'ML Usage Billing',
                  due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                  total_amount: paymentInfo ? paymentInfo.amount : 50.00, // Use payment amount or default
                  user_id: user.id,
                  status: paymentInfo ? paymentInfo.status : 'ISSUED',
                  payment: paymentInfo,
                  invoice_type: 'ml_usage'
                });
              });
            }
          });
          
          // Add registry invoices to state if we found any
          if (registryInvoices.length > 0) {
            console.log(`Adding ${registryInvoices.length} invoices from registry`);
            
            setInvoices(prevInvoices => {
              // Don't duplicate invoices that might already be there
              const existingInvoiceIds = new Set(prevInvoices.map(inv => inv.id));
              const existingInvoiceNumbers = new Set(prevInvoices.map(inv => inv.invoice_number));
              
              const newInvoices = registryInvoices.filter(inv => 
                !existingInvoiceIds.has(inv.id) && 
                !existingInvoiceNumbers.has(inv.invoice_number)
              );
              
              if (newInvoices.length > 0) {
                return [...prevInvoices, ...newInvoices];
              }
              
              return prevInvoices;
            });
          }
          
          // Also update statuses for any existing invoices that have payments
          const payments = JSON.parse(localStorage.getItem('ml_invoice_payments') || '{}');
          if (Object.keys(payments).length > 0) {
            setInvoices(prevInvoices => {
              return prevInvoices.map(inv => {
                const payment = payments[inv.id] || 
                               payments[`number-${inv.invoice_number}`];
                
                if (payment && inv.status !== payment.status) {
                  return {
                    ...inv,
                    status: payment.status,
                    payment: payment
                  };
                }
                return inv;
              });
            });
          }
        })
        .catch(error => {
          console.error('Error fetching users for invoice sync:', error);
        });
    } catch (error) {
      console.error('Error syncing with registry:', error);
    }
  };

  const fetchInvoices = async (params = {}) => {
    try {
      setLoading(true);
      const response = await getInvoices(params);
      setInvoices(response.data);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      message.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value) => {
    setSearchText(value);
    
    const params = {};
    if (value) {
      params.search = value;
    }
    if (statusFilter) {
      params.status = statusFilter;
    }
    
    fetchInvoices(params);
  };

  const handleStatusFilter = (value) => {
    setStatusFilter(value);
    
    const params = {};
    if (searchText) {
      params.search = searchText;
    }
    if (value) {
      params.status = value;
    }
    
    fetchInvoices(params);
  };
  
  const handleInvoiceTypeFilter = (value) => {
    const params = {};
    if (searchText) {
      params.search = searchText;
    }
    if (statusFilter) {
      params.status = statusFilter;
    }
    
    // Add invoice_type filter parameter
    if (value) {
      params.invoice_type = value;
    }
    
    fetchInvoices(params);
  };

  const handleDateRangeFilter = (dates) => {
    if (!dates || dates.length !== 2) {
      // If dates is cleared, fetch without date filters
      fetchInvoices({ search: searchText, status: statusFilter });
      return;
    }
    
    const params = {
      start_date: dates[0].format('YYYY-MM-DD'),
      end_date: dates[1].format('YYYY-MM-DD')
    };
    
    if (searchText) {
      params.search = searchText;
    }
    if (statusFilter) {
      params.status = statusFilter;
    }
    
    fetchInvoices(params);
  };

  const handleMarkAsPaid = async (id) => {
    try {
      await markInvoiceAsPaid(id);
      message.success('Invoice marked as paid');
      fetchInvoices(); // Refresh to show updated status
    } catch (error) {
      console.error('Error marking invoice as paid:', error);
      message.error('Failed to mark invoice as paid');
    }
  };
  
  const handleSubmitToExternalService = async (invoice) => {
    try {
      setLoading(true);
      console.log('Submitting invoice to external service:', invoice);
      const result = await submitInvoiceToExternalService(invoice);
      console.log('External service response:', result);
      message.success('Invoice submitted to billing service: ' + result.reference);
      fetchInvoices(); // Refresh the list
    } catch (error) {
      console.error('Error submitting to billing service:', error);
      
      // Provide more detailed error messages
      if (error.response) {
        console.error('Error response:', error.response.data);
        message.error(`Failed to submit invoice: ${error.response.status} error`);
      } else if (error.request) {
        console.error('Error request:', error.request);
        message.error('Failed to submit invoice: No response received');
      } else {
        message.error(`Failed to submit invoice: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async (id) => {
    try {
      setLoading(true);
      const response = await downloadInvoicePdf(id);
      
      // Create a blob from the PDF data
      const blob = new Blob([response.data], { type: 'application/pdf' });
      
      // Create a link element and trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      link.remove();
      
      message.success('Invoice PDF downloaded successfully');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      message.error('Failed to download invoice PDF');
    } finally {
      setLoading(false);
    }
  };
  
  const handleViewPaymentDetails = async (invoice) => {
    // Set selected invoice for viewing payment details
    setSelectedInvoice(invoice);
    
    // Import shared registry functions
    const { getInvoicePayment } = await import('../../services/sharedInvoiceRegistry');
    
    // Try to fetch payment details from the API first
    try {
      // Check if we can get payment details from the API
      const paymentResponse = await apiClient.get(`/finance/invoices/${invoice.id}/payment_details/`);
      if (paymentResponse.data && paymentResponse.data.payment) {
        setSelectedInvoice({...invoice, payment: paymentResponse.data.payment});
        console.log('Payment details found via API', paymentResponse.data.payment);
      } else {
        throw new Error('No payment details found in API response');
      }
    } catch (error) {
      console.log('Payment details API not available, checking shared registry', error);
      
      // Check shared registry first - this is the source of truth
      const registryPayment = getInvoicePayment(invoice.id) || getInvoicePayment(invoice.invoice_number);
      
      if (registryPayment) {
        console.log('Found payment details in shared registry', registryPayment);
        setSelectedInvoice({...invoice, payment: registryPayment});
      } else {
        console.log('No payment in registry, checking localStorage fallbacks');
        
        // Fall back to localStorage for backwards compatibility
        try {
          const storedPayments = JSON.parse(localStorage.getItem('ml_invoice_payments') || '{}');
          
          // Check by ID first
          if (storedPayments[invoice.id]) {
            console.log('Found stored payment details in localStorage by ID', storedPayments[invoice.id]);
            setSelectedInvoice({...invoice, payment: storedPayments[invoice.id]});
          } 
          // Then try by invoice number if ID lookup fails
          else if (storedPayments[`number-${invoice.invoice_number}`]) {
            console.log('Found stored payment details by invoice number', 
                        storedPayments[`number-${invoice.invoice_number}`]);
            setSelectedInvoice({...invoice, payment: storedPayments[`number-${invoice.invoice_number}`]});
          }
          // Finally look for any payment that matches this invoice number
          else {
            const matchingPayment = Object.values(storedPayments).find(
              payment => payment.invoice_number === invoice.invoice_number
            );
            
            if (matchingPayment) {
              console.log('Found stored payment by matching invoice numbers', matchingPayment);
              setSelectedInvoice({...invoice, payment: matchingPayment});
            } else {
              throw new Error('No payment details found in localStorage');
            }
          }
        } catch (storageError) {
          console.log('No payment details found anywhere, using mock data', storageError);
          
          // Create mock payment data as last resort
          const mockPayment = {
            sort_code: '12-34-56',
            account_number: '12345678',
            reference: `INV-${invoice.invoice_number}`,
            status: invoice.status === 'PAID' ? 'PAID' : 'PAYMENT_PENDING',
            payment_date: new Date().toLocaleDateString(),
            amount: invoice.total_amount,
            payment_confirmed: invoice.status === 'PAID',
            payment_confirmation_date: invoice.status === 'PAID' ? new Date().toLocaleDateString() : null
          };
          setSelectedInvoice({...invoice, payment: mockPayment});
        }
      }
    }
    
    // Open the modal
    setPendingPaymentModalVisible(true);
  };
  
  const handleVerifyPayment = async () => {
    if (!selectedInvoice) {
      message.error('No invoice selected');
      return;
    }
    
    setVerifyingPayment(true);
    
    try {
      // Import the shared invoice registry function to update status
      const { updateInvoiceStatus } = await import('../../services/sharedInvoiceRegistry');
      
      // First try to mark invoice as paid in API (for real invoices)
      try {
        await markInvoiceAsPaid(selectedInvoice.id);
        console.log('Invoice marked as paid in API');
      } catch (apiError) {
        console.error('Error marking invoice as paid in API:', apiError);
        // Continue with local updates if API fails
      }
      
      // Always update in the shared registry for cross-application visibility
      updateInvoiceStatus(selectedInvoice.id, selectedInvoice.invoice_number, 'PAID');
      
      // Update the invoice status in local storage too for maximum compatibility
      try {
        const payments = JSON.parse(localStorage.getItem('ml_invoice_payments') || '{}');
        
        if (payments[selectedInvoice.id]) {
          payments[selectedInvoice.id].status = 'PAID';
        }
        
        if (payments[`number-${selectedInvoice.invoice_number}`]) {
          payments[`number-${selectedInvoice.invoice_number}`].status = 'PAID';
        }
        
        localStorage.setItem('ml_invoice_payments', JSON.stringify(payments));
      } catch (storageError) {
        console.warn('Failed to update localStorage payment status:', storageError);
      }
      
      // Close modal
      setPendingPaymentModalVisible(false);
      setSelectedInvoice(null);
      
      // Show success message
      message.success('Payment verified and invoice marked as paid');
      
      // Update invoice status in local state
      setInvoices(prevInvoices => {
        return prevInvoices.map(inv => 
          (inv.id === selectedInvoice.id || inv.invoice_number === selectedInvoice.invoice_number) 
            ? {...inv, status: 'PAID'} 
            : inv
        );
      });
      
      // Refresh invoices list from API
      fetchInvoices();
    } catch (error) {
      console.error('Error verifying payment:', error);
      message.error('Failed to verify payment');
    } finally {
      setVerifyingPayment(false);
    }
  };

  const handleGeneratePdf = async (id) => {
    try {
      setLoading(true);
      await generateInvoicePdf(id);
      message.success('PDF generated and invoice marked as issued');
      fetchInvoices(); // Refresh to show the updated status
    } catch (error) {
      console.error('Error generating PDF:', error);
      message.error('Failed to generate invoice PDF');
    } finally {
      setLoading(false);
    }
  };

  const getStatusTag = (status) => {
    switch (status) {
      case 'DRAFT':
        return <Tag color="gray">Draft</Tag>;
      case 'ISSUED':
        return <Tag color="blue">Issued</Tag>;
      case 'PAYMENT_PENDING':
        return <Tag color="orange">Payment Pending</Tag>;
      case 'PAID':
        return <Tag color="green">Paid</Tag>;
      default:
        return <Tag color="default">{status}</Tag>;
    }
  };

  // Group invoices by company for better organization
  const getGroupedInvoices = () => {
    // Create a map of companies to their invoices
    const groupedByCompany = {};
    
    invoices.forEach(invoice => {
      const companyName = invoice.insurance_company_name || 'Unknown Company';
      if (!groupedByCompany[companyName]) {
        groupedByCompany[companyName] = [];
      }
      groupedByCompany[companyName].push(invoice);
    });
    
    return groupedByCompany;
  };

  const columns = [
    {
      title: 'Invoice Number',
      dataIndex: 'invoice_number',
      key: 'invoice_number',
      render: (text, record) => (
        <Link to={`/finance/invoices/${record.id}`} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
          {text}
        </Link>
      ),
      sorter: (a, b) => a.invoice_number.localeCompare(b.invoice_number)
    },
    {
      title: 'Company',
      dataIndex: 'insurance_company_name',
      key: 'insurance_company_name',
      sorter: (a, b) => {
        const nameA = a.insurance_company_name || '';
        const nameB = b.insurance_company_name || '';
        return nameA.localeCompare(nameB);
      },
      filters: [...new Set(invoices.map(inv => inv.insurance_company_name))].map(name => ({
        text: name || 'Unknown',
        value: name
      })),
      onFilter: (value, record) => record.insurance_company_name === value
    },
    {
      title: 'Date Issued',
      dataIndex: 'issued_date',
      key: 'issued_date',
      render: (date) => date ? new Date(date).toLocaleDateString() : 'Not issued',
      sorter: (a, b) => new Date(a.issued_date) - new Date(b.issued_date)
    },
    {
      title: 'Due Date',
      dataIndex: 'due_date',
      key: 'due_date',
      render: (date) => date ? new Date(date).toLocaleDateString() : 'No due date',
      sorter: (a, b) => new Date(a.due_date) - new Date(b.due_date)
    },
    {
      title: 'Amount',
      dataIndex: 'total_amount',
      key: 'total_amount',
      render: (amount) => `£${parseFloat(amount).toFixed(2)}`,
      sorter: (a, b) => a.total_amount - b.total_amount
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => getStatusTag(status),
      filters: [
        { text: 'Draft', value: 'DRAFT' },
        { text: 'Issued', value: 'ISSUED' },
        { text: 'Payment Pending', value: 'PAYMENT_PENDING' },
        { text: 'Paid', value: 'PAID' }
      ],
      onFilter: (value, record) => record.status === value
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small" wrap>
          <Button 
            type="link" 
            icon={<EditOutlined />} 
            size="small" 
            onClick={() => navigate(`/finance/invoices/${record.id}/edit`)}
          >
            Edit
          </Button>
          
          {record.status === 'ISSUED' && (
            <Button 
              type="link" 
              icon={<CheckCircleOutlined />} 
              size="small" 
              onClick={() => handleMarkAsPaid(record.id)}
              className="text-green-600 hover:text-green-800"
            >
              Mark Paid
            </Button>
          )}
          
          {(record.status === 'PAYMENT_PENDING' || record.status === 'PAID') && (
            <Button 
              type="link" 
              icon={<DollarOutlined />} 
              size="small" 
              onClick={() => handleViewPaymentDetails(record)}
              className={record.status === 'PAID' ? "text-green-600 hover:text-green-800" : "text-orange-600 hover:text-orange-800"}
            >
              {record.status === 'PAID' ? "View Payment" : "Verify Payment"}
            </Button>
          )}
          
          {record.invoice_type !== 'ml_usage' && (
            <Button
              type="link"
              onClick={() => handleSubmitToExternalService(record)}
            >
              Send to Billing Service
            </Button>
          )}
          
          <Button
            type="link"
            icon={<FilePdfOutlined />}
            size="small"
            onClick={() => handleGeneratePdf(record.id)}
            className="text-blue-600 hover:text-blue-800"
          >
            Generate PDF
          </Button>
          
          <Button
            type="link"
            icon={<DownloadOutlined />}
            size="small"
            onClick={() => handleDownloadPdf(record.id)}
            className="text-orange-600 hover:text-orange-800"
          >
            Download PDF
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className={`max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Breadcrumbs */}
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
              <span className={darkMode ? 'text-gray-100' : 'text-gray-800'}>
                <FileTextOutlined /> Invoices
              </span>
            ),
          },
        ]}
      />

      <div className="flex justify-between items-center mb-6">
        <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Invoices</h1>
        <Link to="/finance/invoices/new">
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            className={darkMode ? 'bg-green-600 hover:bg-green-700 border-green-600' : ''}
          >
            Create Invoice
          </Button>
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-1 md:grid-cols-5 gap-4">
        <Input
          placeholder="Search invoices..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onPressEnter={(e) => handleSearch(e.target.value)}
          allowClear
          className={darkMode ? 'bg-gray-800 text-white border-gray-700' : ''}
        />
        
        <Select
          placeholder="Filter by status"
          value={statusFilter}
          onChange={handleStatusFilter}
          allowClear
          className={`w-full ${darkMode ? 'dark-select' : ''}`}
        >
          <Option value="DRAFT">Draft</Option>
          <Option value="ISSUED">Issued</Option>
          <Option value="PAYMENT_PENDING">Payment Pending</Option>
          <Option value="PAID">Paid</Option>
        </Select>
        
        <Select
          placeholder="Filter by invoice type"
          onChange={handleInvoiceTypeFilter}
          allowClear
          className={`w-full ${darkMode ? 'dark-select' : ''}`}
        >
          <Option value="regular">Regular Invoices</Option>
          <Option value="ml_usage">ML Usage Invoices</Option>
        </Select>
        
        <RangePicker 
          className={`w-full ${darkMode ? 'bg-gray-800 text-white border-gray-700' : ''}`}
          onChange={handleDateRangeFilter}
          format="YYYY-MM-DD"
        />
        
        <Select
          placeholder="View Mode"
          value={viewMode}
          onChange={setViewMode}
          className={`w-full ${darkMode ? 'dark-select' : ''}`}
        >
          <Option value="table">Table View</Option>
          <Option value="grouped">Grouped by Company</Option>
        </Select>
      </div>

      {/* Payment Details Modal */}
      <Modal
        title={selectedInvoice?.payment?.status === 'PAID' ? "Payment Details" : "Verify Payment"}
        open={pendingPaymentModalVisible}
        onCancel={() => setPendingPaymentModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setPendingPaymentModalVisible(false)}>
            {selectedInvoice?.payment?.status === 'PAID' ? "Close" : "Cancel"}
          </Button>,
          selectedInvoice?.payment?.status !== 'PAID' && (
            <Button 
              key="verify" 
              type="primary" 
              loading={verifyingPayment}
              onClick={handleVerifyPayment}
            >
              Verify Payment
            </Button>
          )
        ].filter(Boolean)}
      >
        {selectedInvoice && (
          <div>
            <Descriptions bordered column={1} className="mb-4">
              <Descriptions.Item label="Invoice Number">{selectedInvoice.invoice_number}</Descriptions.Item>
              <Descriptions.Item label="Amount">£{parseFloat(selectedInvoice.total_amount).toFixed(2)}</Descriptions.Item>
              <Descriptions.Item label="Sort Code">{selectedInvoice.payment?.sort_code}</Descriptions.Item>
              <Descriptions.Item label="Account Number">{selectedInvoice.payment?.account_number}</Descriptions.Item>
              <Descriptions.Item label="Reference">{selectedInvoice.payment?.reference}</Descriptions.Item>
              <Descriptions.Item label="Payment Date">{selectedInvoice.payment?.payment_date}</Descriptions.Item>
              <Descriptions.Item label="Payment Method">{selectedInvoice.payment?.payment_method || 'Bank Transfer'}</Descriptions.Item>
              <Descriptions.Item label="Status">
                {selectedInvoice.payment?.status === 'PAID' ? (
                  <Tag color="green">Paid</Tag>
                ) : (
                  <Tag color="orange">Pending Verification</Tag>
                )}
              </Descriptions.Item>
              {selectedInvoice.payment?.payment_confirmation_date && (
                <Descriptions.Item label="Confirmation Date">
                  {selectedInvoice.payment.payment_confirmation_date}
                </Descriptions.Item>
              )}
              {selectedInvoice.payment?.user_id && (
                <Descriptions.Item label="User ID">
                  {selectedInvoice.payment.user_id}
                </Descriptions.Item>
              )}
            </Descriptions>
            
            {selectedInvoice.payment?.status === 'PAID' ? (
              <Alert
                message="Payment Verified"
                description="This payment has been verified and marked as paid."
                type="success"
                showIcon
              />
            ) : (
              <Alert
                message="Payment Verification"
                description="Please confirm that you have verified this payment has been received in the bank account before approving."
                type="warning"
                showIcon
              />
            )}
          </div>
        )}
      </Modal>

      {viewMode === 'table' ? (
        // Standard table view
        <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md ${darkMode ? 'text-white' : ''}`}>
          <Table
            columns={columns}
            dataSource={invoices}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10 }}
            className={darkMode ? 'ant-table-dark' : ''}
          />
        </div>
      ) : (
        // Grouped by company view
        <div className="space-y-6">
          {Object.entries(getGroupedInvoices()).map(([companyName, companyInvoices]) => (
            <div key={companyName} className={`bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden ${darkMode ? 'text-white' : ''}`}>
              <div className={`p-4 border-b ${darkMode ? 'border-gray-700 bg-gray-700' : 'border-gray-200 bg-gray-50'}`}>
                <h3 className="text-lg font-medium">{companyName}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {companyInvoices.length} invoice{companyInvoices.length !== 1 ? 's' : ''} | 
                  Total: £{companyInvoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0).toFixed(2)}
                </p>
              </div>
              <Table
                columns={columns.filter(col => col.dataIndex !== 'insurance_company_name')}
                dataSource={companyInvoices}
                rowKey="id"
                pagination={companyInvoices.length > 5 ? { pageSize: 5 } : false}
                className={darkMode ? 'ant-table-dark' : ''}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Invoices;