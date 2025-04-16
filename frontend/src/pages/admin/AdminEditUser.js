import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Form, 
  Input, 
  Button, 
  Spin, 
  message, 
  Card, 
  Breadcrumb, 
  Switch,
  Select,
  Divider 
} from 'antd';
import { 
  UserOutlined, 
  HomeOutlined, 
  ArrowLeftOutlined,
  MailOutlined,
  PhoneOutlined,
  SaveOutlined,
  IdcardOutlined
} from '@ant-design/icons';
import { apiClient } from '../../services/authService';
import { useTheme } from '../../context/ThemeContext';

const { Option } = Select;

const AdminEditUser = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const { darkMode } = useTheme();
  
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get(`/account/users/${id}/`);
        setUser(response.data);
        
        // Set form values with the user data
        form.setFieldsValue({
          first_name: response.data.first_name,
          last_name: response.data.last_name,
          email: response.data.email,
          phone_number: response.data.phone_number || '',
          address: response.data.address || '',
          is_active: response.data.is_active,
          role: response.data.role || 'USER',
          is_staff: response.data.is_staff,
          is_superuser: response.data.is_superuser
        });
      } catch (error) {
        console.error('Error fetching user details:', error);
        setError('Failed to load user data. Please try again later.');
        message.error('Failed to load user data');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchUserDetails();
    }
  }, [id, form]);

  const handleSubmit = async (values) => {
    try {
      setSaving(true);
      
      // Update user data
      await apiClient.patch(`/account/users/${id}/`, values);
      
      message.success('User information updated successfully');
      navigate(`/admin/users/${id}`);
    } catch (error) {
      console.error('Error updating user:', error);
      message.error('Failed to update user information');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={`max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
        <div className="flex justify-center items-center h-64">
          <Spin size="large" />
          <p className="ml-4">Loading user data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
        <div className="bg-red-50 dark:bg-red-900 border-l-4 border-red-500 text-red-700 dark:text-red-200 p-4">
          <p>{error}</p>
          <Button 
            type="primary" 
            onClick={() => navigate('/admin/users')} 
            className="mt-4"
          >
            Back to Users
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Breadcrumbs */}
      <Breadcrumb className="mb-6">
        <Breadcrumb.Item>
          <Link to="/admin" className={darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}>
            <HomeOutlined /> Admin
          </Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <Link to="/admin/users" className={darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}>
            <UserOutlined /> Users
          </Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <Link 
            to={`/admin/users/${id}`} 
            className={darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}
          >
            {user?.first_name} {user?.last_name}
          </Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item className={darkMode ? 'text-gray-100' : 'text-gray-800'}>
          Edit
        </Breadcrumb.Item>
      </Breadcrumb>

      <div className="flex justify-between items-center mb-6">
        <Button 
          type="primary" 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate(`/admin/users/${id}`)}
        >
          Back to Profile
        </Button>
      </div>

      <Card 
        title={<h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Edit User Profile</h2>}
        className={`shadow-md ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}
        headStyle={{ 
          borderBottom: darkMode ? '1px solid #4B5563' : '1px solid #E5E7EB',
          padding: '1rem'
        }}
        bodyStyle={{ 
          padding: '1.5rem' 
        }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          className={darkMode ? 'dark-mode-form' : ''}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Information */}
            <div>
              <h3 className={`text-lg font-medium mb-4 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                Personal Information
              </h3>

              <Form.Item
                name="first_name"
                label={<span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>First Name</span>}
                rules={[
                  { required: true, message: 'Please enter first name' }
                ]}
              >
                <Input 
                  prefix={<UserOutlined className="site-form-item-icon" />} 
                  placeholder="First Name"
                  className={darkMode ? 'bg-gray-700 border-gray-600 text-white' : ''} 
                />
              </Form.Item>

              <Form.Item
                name="last_name"
                label={<span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Last Name</span>}
                rules={[
                  { required: true, message: 'Please enter last name' }
                ]}
              >
                <Input 
                  prefix={<UserOutlined className="site-form-item-icon" />} 
                  placeholder="Last Name" 
                  className={darkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}
                />
              </Form.Item>

              <Form.Item
                name="email"
                label={<span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Email</span>}
                rules={[
                  { required: true, message: 'Please enter email' },
                  { type: 'email', message: 'Please enter a valid email' }
                ]}
              >
                <Input 
                  prefix={<MailOutlined className="site-form-item-icon" />} 
                  placeholder="Email" 
                  className={darkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}
                />
              </Form.Item>

              <Form.Item
                name="phone_number"
                label={<span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Phone Number</span>}
              >
                <Input 
                  prefix={<PhoneOutlined className="site-form-item-icon" />} 
                  placeholder="Phone Number" 
                  className={darkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}
                />
              </Form.Item>

              <Form.Item
                name="address"
                label={<span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Address</span>}
              >
                <Input.TextArea 
                  placeholder="Address" 
                  rows={3} 
                  className={darkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}
                />
              </Form.Item>
            </div>

            {/* Account Settings */}
            <div>
              <h3 className={`text-lg font-medium mb-4 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                Account Settings
              </h3>

              <Form.Item
                name="role"
                label={<span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Role</span>}
              >
                <Select 
                  placeholder="Select role" 
                  className={darkMode ? 'custom-dark-select' : ''}
                >
                  <Option value="USER">User</Option>
                  <Option value="MANAGER">Manager</Option>
                  <Option value="ADMIN">Admin</Option>
                  <Option value="FINANCE">Finance</Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="is_active"
                label={<span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Account Status</span>}
                valuePropName="checked"
              >
                <Switch 
                  checkedChildren="Active" 
                  unCheckedChildren="Inactive"
                />
              </Form.Item>

              <Form.Item
                name="is_staff"
                label={<span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Staff Access</span>}
                valuePropName="checked"
              >
                <Switch 
                  checkedChildren="Yes" 
                  unCheckedChildren="No"
                />
              </Form.Item>

              <Form.Item
                name="is_superuser"
                label={<span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Admin Access</span>}
                valuePropName="checked"
              >
                <Switch 
                  checkedChildren="Yes" 
                  unCheckedChildren="No"
                />
              </Form.Item>
            </div>
          </div>

          <Divider className={darkMode ? 'border-gray-700' : 'border-gray-200'} />

          <div className="flex justify-end">
            <Button 
              type="default" 
              onClick={() => navigate(`/admin/users/${id}`)} 
              className="mr-4"
            >
              Cancel
            </Button>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={saving}
              icon={<SaveOutlined />}
            >
              Save Changes
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default AdminEditUser;