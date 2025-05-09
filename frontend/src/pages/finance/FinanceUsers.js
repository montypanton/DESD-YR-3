import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Breadcrumb, Table, Tag, Input, Button, message, Spin, Select } from 'antd';
import { 
  UserOutlined, 
  SearchOutlined, 
  HomeOutlined, 
  BankOutlined,
  DollarOutlined,
  FilterOutlined
} from '@ant-design/icons';
import { apiClient } from '../../services/authService';
import { getCompanyUsers } from '../../services/financeService';
import { useTheme } from '../../context/ThemeContext';
// Import the shared invoice registry helper to check for paid invoices
import { getUserInvoices, getInvoicePayment } from '../../services/sharedInvoiceRegistry';

const { Option } = Select;

const FinanceUsers = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { darkMode } = useTheme();
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Use the finance service to get users with billing info
      const params = {
        include_paid_claims: true, // Request paid claims count
      };
      
      if (selectedCompany) {
        params.company_id = selectedCompany;
      }
      
      const response = await getCompanyUsers(params);
      
      // Get payments from localStorage to check for any paid invoices
      let payments = {};
      try {
        payments = JSON.parse(localStorage.getItem('ml_invoice_payments') || '{}');
      } catch (e) {
        console.error('Error parsing payments from localStorage:', e);
      }
      
      // Process the response to ensure we have paid_claims_count for each user
      const processedUsers = (response.data || []).map(user => {
        // Start with API-provided count or 0
        let paidClaimsCount = user.paid_claims_count || 0;
        
        // If the API doesn't provide paid_claims_count but does provide paid_invoices
        if (!user.paid_claims_count && user.paid_invoices) {
          paidClaimsCount = user.paid_invoices.length;
        }
        
        // ENHANCEMENT: Check the shared invoice registry for this user
        try {
          // First get all invoice numbers registered for this user
          const userInvoiceNumbers = getUserInvoices(user.id);
          console.log(`Found ${userInvoiceNumbers.length} invoices in registry for user ${user.id}`);
          
          if (userInvoiceNumbers && userInvoiceNumbers.length > 0) {
            // For each invoice, check if it has a payment record
            let paidInvoicesCount = 0;
            
            userInvoiceNumbers.forEach(invoiceNumber => {
              // Look for payments by invoice number
              const paymentByNumber = Object.values(payments).find(p => 
                p.invoice_number === invoiceNumber && 
                (p.status === 'PAID' || p.status === 'PAYMENT_PENDING')
              );
              
              if (paymentByNumber) {
                console.log(`Found payment for invoice ${invoiceNumber} for user ${user.id}`);
                paidInvoicesCount++;
              }
            });
            
            // Also check if there are any payments directly by user ID
            const userPayments = Object.values(payments).filter(
              p => p.user_id === user.id && (p.status === 'PAID' || p.status === 'PAYMENT_PENDING')
            );
            
            // Total paid invoices is the greater of registry count or API count
            paidClaimsCount = Math.max(paidClaimsCount, paidInvoicesCount, userPayments.length);
            console.log(`User ${user.id} has ${paidClaimsCount} paid invoices`);
          }
        } catch (e) {
          console.error(`Error checking paid invoices for user ${user.id}:`, e);
        }
        
        // Return the user with the updated paid_claims_count
        return {
          ...user,
          paid_claims_count: paidClaimsCount
        };
      });
      
      setUsers(processedUsers);
      setError(null);
    } catch (error) {
      console.error('Error fetching users:', error);
      message.error('Failed to load users. Please try again later.');
      setError('Failed to load users. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchCompanies = async () => {
    try {
      const response = await apiClient.get('/finance/insurance-companies/');
      setCompanies(response.data || []);
    } catch (error) {
      console.error('Error fetching insurance companies:', error);
      message.error('Failed to load insurance companies.');
    }
  };
  
  useEffect(() => {
    fetchUsers();
    fetchCompanies();
  }, [selectedCompany]);
  
  // Add an effect to refresh the user list periodically to catch payment updates
  useEffect(() => {
    // Set up an interval to refresh the user list every 30 seconds
    const refreshInterval = setInterval(() => {
      console.log('Refreshing user list to check for payment updates');
      fetchUsers();
    }, 30000); // 30 seconds
    
    // Clean up the interval when the component unmounts
    return () => clearInterval(refreshInterval);
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return 'Invalid date';
    }
  };

  const filteredUsers = users.filter(user => 
    (user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     user.email?.toLowerCase().includes(searchTerm.toLowerCase())) 
  );

  const handleViewUser = (userId) => {
    navigate(`/finance/users/${userId}`);
  };

  const handleCompanyChange = (value) => {
    setSelectedCompany(value);
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'full_name',
      key: 'full_name',
      render: (text, record) => (
        <Link
          to={`/finance/users/${record.id}`}
          className={`font-medium ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'}`}
        >
          {text || 'Unknown'}
        </Link>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Company',
      dataIndex: 'company_name',
      key: 'company_name',
      render: text => text || 'No Company',
    },
    {
      title: 'ML Usage Paid',
      key: 'ml_usage_paid',
      render: (_, record) => {
        const paidCount = record.paid_claims_count || 0;
        let tagColor = 'default';
        
        if (paidCount > 0) {
          tagColor = 'green';
        }
        
        return (
          <div>
            <Tag color={tagColor} className="text-center" style={{ minWidth: '60px' }}>
              {paidCount} Paid
            </Tag>
          </div>
        );
      },
      sorter: (a, b) => (a.paid_claims_count || 0) - (b.paid_claims_count || 0),
    },
    {
      title: 'ML Usage Billing',
      key: 'billing',
      render: (_, record) => (
        <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          ${record.billable_amount ? parseFloat(record.billable_amount).toFixed(2) : '0.00'}
        </div>
      ),
    },
    {
      title: 'Last Active',
      dataIndex: 'last_active',
      key: 'last_active',
      render: text => formatDate(text),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <div className="flex space-x-2">
          <Button 
            type="primary"
            size="small"
            icon={<UserOutlined />}
            onClick={() => handleViewUser(record.id)}
          >
            View
          </Button>
          <Button
            type="default"
            size="small"
            icon={<DollarOutlined />}
            onClick={() => handleViewUser(record.id)}
          >
            Invoices
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className={`max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <Breadcrumb className="mb-6">
        <Breadcrumb.Item>
          <Link to="/" className={darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}>
            <HomeOutlined /> Home
          </Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <Link to="/finance/dashboard" className={darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}>
            <BankOutlined /> Finance
          </Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item className={darkMode ? 'text-gray-100' : 'text-gray-800'}>
          <UserOutlined /> Users
        </Breadcrumb.Item>
      </Breadcrumb>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h1 className={`text-2xl font-bold mb-4 sm:mb-0 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          User Management
        </h1>
      </div>

      <div className={`p-6 rounded-lg shadow-md mb-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div className="flex-1">
            <Input
              placeholder="Search by name or email"
              prefix={<SearchOutlined />}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className={darkMode ? 'bg-gray-700 text-white border-gray-600' : ''}
            />
          </div>
          <div className="w-full md:w-64">
            <Select
              placeholder="Filter by company"
              onChange={handleCompanyChange}
              allowClear
              style={{ width: '100%' }}
              className={darkMode ? 'dark-select' : ''}
            >
              {companies.map(company => (
                <Option key={company.id} value={company.id}>{company.name}</Option>
              ))}
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Spin size="large" />
          </div>
        ) : error ? (
          <div className={`text-center py-10 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
            {error}
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={filteredUsers}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            className={darkMode ? 'ant-table-dark' : ''}
          />
        )}
      </div>
    </div>
  );
};

export default FinanceUsers;