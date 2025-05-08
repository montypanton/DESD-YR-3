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
  DatePicker
} from 'antd';
import { 
  PlusOutlined, 
  SearchOutlined, 
  EditOutlined, 
  HomeOutlined, 
  BankOutlined, 
  FileTextOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { getInvoices, markInvoiceAsPaid } from '../../services/financeService';
import { submitInvoiceToExternalService } from '../../services/billingServiceIntegration';
import { useTheme } from '../../context/ThemeContext';

const { Option } = Select;
const { RangePicker } = DatePicker;

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grouped'
  const navigate = useNavigate();
  const { darkMode } = useTheme();

  useEffect(() => {
    fetchInvoices();
  }, []);

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

  const getStatusTag = (status) => {
    switch (status) {
      case 'DRAFT':
        return <Tag color="gray">Draft</Tag>;
      case 'ISSUED':
        return <Tag color="blue">Issued</Tag>;
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
        { text: 'Paid', value: 'PAID' }
      ],
      onFilter: (value, record) => record.status === value
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
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
          
          <Button
            type="link"
            onClick={() => handleSubmitToExternalService(record)}
          >
            Send to Billing Service
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

      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
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
          <Option value="PAID">Paid</Option>
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