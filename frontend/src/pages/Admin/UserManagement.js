import React, { useState, useEffect } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { apiClient } from '../../services/authService';

const UserSchema = Yup.object().shape({
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
  first_name: Yup.string()
    .required('First name is required'),
  last_name: Yup.string()
    .required('Last name is required'),
  role: Yup.string()
    .oneOf(['ADMIN', 'END_USER', 'ML_ENGINEER', 'FINANCE'], 'Invalid role')
    .required('Role is required'),
  password: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .required('Password is required'),
  password2: Yup.string()
    .oneOf([Yup.ref('password'), null], 'Passwords must match')
    .required('Confirm password is required'),
});

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/account/users/');
      setUsers(response.data.results || response.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to load users. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleUserSubmit = async (values, { setSubmitting, resetForm }) => {
    try {
      await apiClient.post('/account/register/', values);
      
      // Show success message
      setSuccessMessage('User created successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      
      // Reset form and refresh user list
      resetForm();
      setShowForm(false);
      fetchUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      setError(error.response?.data?.message || 'Failed to create user. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleUserStatus = async (userId, isActive) => {
    try {
      const action = isActive ? 'deactivate' : 'activate';
      await apiClient.post(`/account/users/${userId}/${action}/`);
      fetchUsers();
      
      // Show success message
      setSuccessMessage(`User ${action}d successfully!`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error(`Error ${action} user:`, error);
      setError(`Failed to ${action} user. Please try again.`);
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="page-container flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">Manage system users</p>
        </div>
        
        <button 
          onClick={() => setShowForm(!showForm)} 
          className="btn btn-primary"
        >
          {showForm ? 'Cancel' : 'Add New User'}
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 bg-green-50 border-l-4 border-green-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Add User Form */}
      {showForm && (
        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Add New User</h2>
          
          <Formik
            initialValues={{
              email: '',
              first_name: '',
              last_name: '',
              role: 'END_USER',
              department: '',
              phone_number: '',
              password: '',
              password2: '',
            }}
            validationSchema={UserSchema}
            onSubmit={handleUserSubmit}
          >
            {({ isSubmitting, errors, touched }) => (
              <Form>
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                  <div className="sm:col-span-3">
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <div className="mt-1">
                      <Field
                        type="email"
                        name="email"
                        id="email"
                        className={`form-input ${errors.email && touched.email ? 'border-red-300' : ''}`}
                      />
                      <ErrorMessage name="email" component="div" className="mt-1 text-sm text-red-600" />
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                      Role
                    </label>
                    <div className="mt-1">
                      <Field
                        as="select"
                        name="role"
                        id="role"
                        className={`form-input ${errors.role && touched.role ? 'border-red-300' : ''}`}
                      >
                        <option value="END_USER">End User</option>
                        <option value="ML_ENGINEER">ML Engineer</option>
                        <option value="FINANCE">Finance</option>
                        <option value="ADMIN">Admin</option>
                      </Field>
                      <ErrorMessage name="role" component="div" className="mt-1 text-sm text-red-600" />
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">
                      First Name
                    </label>
                    <div className="mt-1">
                      <Field
                        type="text"
                        name="first_name"
                        id="first_name"
                        className={`form-input ${errors.first_name && touched.first_name ? 'border-red-300' : ''}`}
                      />
                      <ErrorMessage name="first_name" component="div" className="mt-1 text-sm text-red-600" />
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">
                      Last Name
                    </label>
                    <div className="mt-1">
                      <Field
                        type="text"
                        name="last_name"
                        id="last_name"
                        className={`form-input ${errors.last_name && touched.last_name ? 'border-red-300' : ''}`}
                      />
                      <ErrorMessage name="last_name" component="div" className="mt-1 text-sm text-red-600" />
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <label htmlFor="department" className="block text-sm font-medium text-gray-700">
                      Department (Optional)
                    </label>
                    <div className="mt-1">
                      <Field
                        type="text"
                        name="department"
                        id="department"
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700">
                      Phone Number (Optional)
                    </label>
                    <div className="mt-1">
                      <Field
                        type="text"
                        name="phone_number"
                        id="phone_number"
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                      Password
                    </label>
                    <div className="mt-1">
                      <Field
                        type="password"
                        name="password"
                        id="password"
                        className={`form-input ${errors.password && touched.password ? 'border-red-300' : ''}`}
                      />
                      <ErrorMessage name="password" component="div" className="mt-1 text-sm text-red-600" />
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <label htmlFor="password2" className="block text-sm font-medium text-gray-700">
                      Confirm Password
                    </label>
                    <div className="mt-1">
                      <Field
                        type="password"
                        name="password2"
                        id="password2"
                        className={`form-input ${errors.password2 && touched.password2 ? 'border-red-300' : ''}`}
                      />
                      <ErrorMessage name="password2" component="div" className="mt-1 text-sm text-red-600" />
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn btn-primary"
                  >
                    {isSubmitting ? 'Creating...' : 'Create User'}
                  </button>
                </div>
              </Form>
            )}
          </Formik>
        </div>
      )}

      {/* Users List */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.length > 0 ? (
              users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {user.first_name} {user.last_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.role}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.department || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => toggleUserStatus(user.id, user.is_active)}
                      className={`mr-3 ${
                        user.is_active ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'
                      }`}
                    >
                      {user.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserManagement;