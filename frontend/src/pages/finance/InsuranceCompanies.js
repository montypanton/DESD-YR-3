import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Table, Button, Input, Space, Popconfirm, message, Breadcrumb, Tag } from 'antd';
import { 
  PlusOutlined, 
  SearchOutlined, 
  EditOutlined, 
  DeleteOutlined,
  FileTextOutlined,
  HomeOutlined,
  BankOutlined
} from '@ant-design/icons';
import { getInsuranceCompanies, deleteInsuranceCompany } from '../../services/financeService';
import { useTheme } from '../../context/ThemeContext';

const InsuranceCompanies = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filteredCompanies, setFilteredCompanies] = useState([]);
  const { darkMode } = useTheme();

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (searchText) {
      const filtered = companies.filter(company => 
        company.name.toLowerCase().includes(searchText.toLowerCase()) ||
        company.company_id.toLowerCase().includes(searchText.toLowerCase()) ||
        company.contact_email.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredCompanies(filtered);
    } else {
      setFilteredCompanies(companies);
    }
  }, [companies, searchText]);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const response = await getInsuranceCompanies();
      setCompanies(response.data);
      setFilteredCompanies(response.data);
    } catch (error) {
      console.error('Error fetching insurance companies:', error);
      message.error('Failed to load insurance companies');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteInsuranceCompany(id);
      message.success('Insurance company deleted successfully');
      fetchCompanies();
    } catch (error) {
      console.error('Error deleting insurance company:', error);
      message.error('Failed to delete insurance company');
    }
  };

  const columns = [
    {
      title: 'Company Name',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Link to={`/finance/insurance-companies/${record.id}`} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
          {text}
        </Link>
      )
    },
    {
      title: 'Company ID',
      dataIndex: 'company_id',
      key: 'company_id',
    },
    {
      title: 'Contact Email',
      dataIndex: 'contact_email',
      key: 'contact_email',
    },
    {
      title: 'Contact Phone',
      dataIndex: 'contact_phone',
      key: 'contact_phone',
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Active' : 'Inactive'}
        </Tag>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          <Link to={`/finance/insurance-companies/${record.id}/edit`}>
            <Button type="link" icon={<EditOutlined />} size="small">
              Edit
            </Button>
          </Link>
          <Link to={`/finance/insurance-companies/${record.id}/invoices`}>
            <Button type="link" icon={<FileTextOutlined />} size="small">
              Invoices
            </Button>
          </Link>
          <Popconfirm
            title="Are you sure you want to delete this company?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="link" danger icon={<DeleteOutlined />} size="small">
              Delete
            </Button>
          </Popconfirm>
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
          Insurance Companies
        </Breadcrumb.Item>
      </Breadcrumb>

      <div className="flex justify-between items-center mb-6">
        <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Insurance Companies</h1>
        <Link to="/finance/insurance-companies/new">
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            className={darkMode ? 'bg-green-600 hover:bg-green-700 border-green-600' : ''}
          >
            Add Company
          </Button>
        </Link>
      </div>

      <div className="mb-6">
        <Input
          placeholder="Search companies..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
          className={darkMode ? 'bg-gray-800 text-white border-gray-700' : ''}
        />
      </div>

      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md ${darkMode ? 'text-white' : ''}`}>
        <Table
          columns={columns}
          dataSource={filteredCompanies}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          className={darkMode ? 'ant-table-dark' : ''}
        />
      </div>
    </div>
  );
};

export default InsuranceCompanies;