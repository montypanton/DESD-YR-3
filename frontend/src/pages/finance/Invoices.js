import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Table, 
  Button, 
  Input, 
  Space, 
  Popconfirm, 
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
  DeleteOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  MailOutlined,
  CheckCircleOutlined,
  HomeOutlined,
  BankOutlined,
  BuildOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { getInvoices, deleteInvoice, exportInvoiceCsv, generateInvoicePdf, sendInvoice, markInvoiceAsPaid } from '../../services/financeService';
import { useTheme } from '../../context/ThemeContext';

const { Option } = Select;
const { RangePicker } = DatePicker;

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
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

  const handleDelete = async (id) => {
    try {
      await deleteInvoice(id);
      message.success('Invoice deleted successfully');
      fetchInvoices();
    } catch (error) {
      console.error('Error deleting invoice:', error);
      message.error('Failed to delete invoice');
    }
  };

  const handleExportCsv = async (id) => {
    try {
      const response = await exportInvoiceCsv(id);
      
      // Create a blob from the response data
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice_${id}.csv`);
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      message.success('Invoice exported successfully');
    } catch (error) {
      console.error('Error exporting invoice:', error);
      message.error('Failed to export invoice');
    }
  };

  const handleGeneratePdf = async (id) => {
    try {
      await generateInvoicePdf(id);
      message.success('Invoice PDF generated successfully');
      fetchInvoices(); // Refresh to show updated status
    } catch (error) {
      console.error('Error generating PDF:', error);
      message.error('Failed to generate PDF');
    }
  };

  const handleSendInvoice = async (id) => {
    try {
      await sendInvoice(id);
      message.success('Invoice sent successfully');
      fetchInvoices(); // Refresh to show updated status
    } catch (error) {
      console.error('Error sending invoice:', error);
      message.error('Failed to send invoice');
    }
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

  const columns = [
    {
      title: 'Invoice Number',
      dataIndex: 'invoice_number',
      key: 'invoice_number',
      render: (text, record) => (
        <Link to={`/finance/invoices/${record.id}`} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
          {text}
        </Link>
      )
    },
    {
      title: 'Company',
      dataIndex: 'insurance_company_name',
      key: 'insurance_company_name',
    },
    {
      title: 'Date Issued',
      dataIndex: 'issued_date',
      key: 'issued_date',
      render: (date) => new Date(date).toLocaleDateString()
    },
    {
      title: 'Due Date',
      dataIndex: 'due_date',
      key: 'due_date',
      render: (date) => new Date(date).toLocaleDateString()
    },
    {
      title: 'Amount',
      dataIndex: 'total_amount',
      key: 'total_amount',
      render: (amount) => `£${parseFloat(amount).toFixed(2)}`
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => getStatusTag(status)
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
          
          {record.status === 'DRAFT' && (
            <Button 
              type="link" 
              icon={<FilePdfOutlined />} 
              size="small" 
              onClick={() => handleGeneratePdf(record.id)}
            >
              Generate
            </Button>
          )}
          
          {record.status === 'ISSUED' && (
            <Button 
              type="link" 
              icon={<MailOutlined />} 
              size="small" 
              onClick={() => handleSendInvoice(record.id)}
            >
              Send
            </Button>
          )}
          
          {(record.status === 'SENT' || record.status === 'ISSUED') && (
            <Button 
              type="link" 
              icon={<CheckCircleOutlined />} 
              size="small" 
              onClick={() => handleMarkAsPaid(record.id)}
              className="text-green-600 hover:text-green-800"
            >
              Paid
            </Button>
          )}
          
          <Button 
            type="link" 
            icon={<FileExcelOutlined />} 
            size="small" 
            onClick={() => handleExportCsv(record.id)}
          >
            Export
          </Button>
          
          {record.status === 'DRAFT' && (
            <Popconfirm
              title="Are you sure you want to delete this invoice?"
              onConfirm={() => handleDelete(record.id)}
              okText="Yes"
              cancelText="No"
            >
              <Button type="link" danger icon={<DeleteOutlined />} size="small">
                Delete
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

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
        <Breadcrumb.Item className={darkMode ? 'text-gray-100' : 'text-gray-800'}>
          <FileTextOutlined /> Invoices
        </Breadcrumb.Item>
      </Breadcrumb>

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

      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <Option value="SENT">Sent</Option>
          <Option value="PAID">Paid</Option>
          <Option value="OVERDUE">Overdue</Option>
          <Option value="CANCELLED">Cancelled</Option>
        </Select>
        
        <RangePicker 
          className={`w-full ${darkMode ? 'bg-gray-800 text-white border-gray-700' : ''}`}
          onChange={handleDateRangeFilter}
          format="YYYY-MM-DD"
        />
      </div>

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
    </div>
  );
};

export default Invoices;