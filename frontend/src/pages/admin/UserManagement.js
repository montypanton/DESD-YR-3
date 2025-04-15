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
  const [fieldErrors, setFieldErrors] = useState({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

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
      setError(null);
      setFieldErrors({});
      
      await apiClient.post('/account/register/', values);
      
      setSuccessMessage('User created successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      
      resetForm();
      setShowForm(false);
      fetchUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      
      if (error.response?.data && typeof error.response.data === 'object') {
        const formErrors = error.response.data;
        console.log('Form validation errors:', formErrors);
        
        const fieldSpecificErrors = {};
        
        Object.keys(formErrors).forEach(key => {
          if (Array.isArray(formErrors[key])) {
            fieldSpecificErrors[key] = formErrors[key][0];
          } else if (typeof formErrors[key] === 'string') {
            fieldSpecificErrors[key] = formErrors[key];
          }
        });
        
        setFieldErrors(fieldSpecificErrors);
        
        if (formErrors.non_field_errors) {
          setError(
            Array.isArray(formErrors.non_field_errors)
              ? formErrors.non_field_errors[0]
              : formErrors.non_field_errors
          );
        } else if (!Object.keys(fieldSpecificErrors).length) {
          setError('Failed to create user. Please try again.');
        }
      } else {
        setError(error.response?.data?.message || 'Failed to create user. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const toggleUserStatus = async (userId, isActive) => {
    try {
      const action = isActive ? 'deactivate' : 'activate';
      await apiClient.post(`/account/users/${userId}/${action}/`);
      fetchUsers();
      
      setSuccessMessage(`User ${action}d successfully!`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error(`Error ${isActive ? 'deactivating' : 'activating'} user:`, error);
      setError(`Failed to ${isActive ? 'deactivate' : 'activate'} user. Please try again.`);
    }
  };

  const confirmDelete = (user) => {
    setUserToDelete(user);
    setShowDeleteConfirm(true);
  };
  
  const deleteUser = async () => {
    try {
      if (!userToDelete) return;
      
      // Changed from DELETE to POST to match backend implementation
      await apiClient.post(`/account/users/${userToDelete.id}/delete_user/`);
      
      // Show success message
      setSuccessMessage(`User ${userToDelete.email} has been permanently deleted`);
      setTimeout(() => setSuccessMessage(null), 3000);
      
      // Reset state and refresh user list
      setUserToDelete(null);
      setShowDeleteConfirm(false);
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      setError(error.response?.data?.error || 'Failed to delete user. Please try again.');
    }
  };
  
  const cancelDelete = () => {
    setUserToDelete(null);
    setShowDeleteConfirm(false);
  };

  if (loading && users.length === 0) {
    return (
      <div className="page-container flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 dark:border-blue-400"></div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white transition-colors duration-200">User Management</h1>
          <p className="text-gray-600 dark:text-gray-400 transition-colors duration-200">Manage system users</p>
        </div>
        
        <button 
          onClick={() => setShowForm(!showForm)} 
          className="btn btn-primary"
        >
          {showForm ? 'Cancel' : 'Add New User'}
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-900 border-l-4 border-red-500 p-4 transition-colors duration-200">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
            </div>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 bg-green-50 dark:bg-green-900 border-l-4 border-green-500 p-4 transition-colors duration-200">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700 dark:text-green-200">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Add User Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 mb-6 transition-colors duration-200">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4 transition-colors duration-200">Add New User</h2>
          
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
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors duration-200">
                      Email
                    </label>
                    <div className="mt-1">
                      <Field
                        type="email"
                        name="email"
                        id="email"
                        className={`form-input dark:bg-gray-700 dark:border-gray-600 dark:text-white ${errors.email && touched.email ? 'border-red-300' : ''}`}
                      />
                      <ErrorMessage name="email" component="div" className="mt-1 text-sm text-red-600 dark:text-red-400" />
                      {fieldErrors.email && (
                        <div className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.email}</div>
                      )}
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors duration-200">
                      Role
                    </label>
                    <div className="mt-1">
                      <Field
                        as="select"
                        name="role"
                        id="role"
                        className={`form-input dark:bg-gray-700 dark:border-gray-600 dark:text-white ${errors.role && touched.role ? 'border-red-300' : ''}`}
                      >
                        <option value="END_USER">End User</option>
                        <option value="ML_ENGINEER">ML Engineer</option>
                        <option value="FINANCE">Finance</option>
                        <option value="ADMIN">Admin</option>
                      </Field>
                      <ErrorMessage name="role" component="div" className="mt-1 text-sm text-red-600 dark:text-red-400" />
                      {fieldErrors.role && (
                        <div className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.role}</div>
                      )}
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors duration-200">
                      First Name
                    </label>
                    <div className="mt-1">
                      <Field
                        type="text"
                        name="first_name"
                        id="first_name"
                        className={`form-input dark:bg-gray-700 dark:border-gray-600 dark:text-white ${errors.first_name && touched.first_name ? 'border-red-300' : ''}`}
                      />
                      <ErrorMessage name="first_name" component="div" className="mt-1 text-sm text-red-600 dark:text-red-400" />
                      {fieldErrors.first_name && (
                        <div className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.first_name}</div>
                      )}
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors duration-200">
                      Last Name
                    </label>
                    <div className="mt-1">
                      <Field
                        type="text"
                        name="last_name"
                        id="last_name"
                        className={`form-input dark:bg-gray-700 dark:border-gray-600 dark:text-white ${errors.last_name && touched.last_name ? 'border-red-300' : ''}`}
                      />
                      <ErrorMessage name="last_name" component="div" className="mt-1 text-sm text-red-600 dark:text-red-400" />
                      {fieldErrors.last_name && (
                        <div className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.last_name}</div>
                      )}
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <label htmlFor="department" className="block text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors duration-200">
                      Department (Optional)
                    </label>
                    <div className="mt-1">
                      <Field
                        type="text"
                        name="department"
                        id="department"
                        className="form-input dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                      {fieldErrors.department && (
                        <div className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.department}</div>
                      )}
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors duration-200">
                      Phone Number (Optional)
                    </label>
                    <div className="mt-1">
                      <Field
                        type="text"
                        name="phone_number"
                        id="phone_number"
                        className="form-input dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                      {fieldErrors.phone_number && (
                        <div className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.phone_number}</div>
                      )}
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors duration-200">
                      Password
                    </label>
                    <div className="mt-1">
                      <Field
                        type="password"
                        name="password"
                        id="password"
                        className={`form-input dark:bg-gray-700 dark:border-gray-600 dark:text-white ${errors.password && touched.password ? 'border-red-300' : ''}`}
                      />
                      <ErrorMessage name="password" component="div" className="mt-1 text-sm text-red-600 dark:text-red-400" />
                      {fieldErrors.password && (
                        <div className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.password}</div>
                      )}
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <label htmlFor="password2" className="block text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors duration-200">
                      Confirm Password
                    </label>
                    <div className="mt-1">
                      <Field
                        type="password"
                        name="password2"
                        id="password2"
                        className={`form-input dark:bg-gray-700 dark:border-gray-600 dark:text-white ${errors.password2 && touched.password2 ? 'border-red-300' : ''}`}
                      />
                      <ErrorMessage name="password2" component="div" className="mt-1 text-sm text-red-600 dark:text-red-400" />
                      {fieldErrors.password2 && (
                        <div className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.password2}</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn btn-primary dark:focus:ring-offset-gray-900"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating...
                      </div>
                    ) : 'Create User'}
                  </button>
                </div>
              </Form>
            )}
          </Formik>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-red-600 dark:text-red-200" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white" id="modal-title">
                      Delete User
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 dark:text-gray-300">
                        Are you sure you want to delete {userToDelete?.first_name} {userToDelete?.last_name} ({userToDelete?.email})? This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button 
                  type="button" 
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm dark:focus:ring-offset-gray-800"
                  onClick={deleteUser}
                >
                  Delete
                </button>
                <button 
                  type="button" 
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm dark:focus:ring-offset-gray-800"
                  onClick={cancelDelete}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users List */}
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden transition-colors duration-200">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700 transition-colors duration-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider transition-colors duration-200">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider transition-colors duration-200">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider transition-colors duration-200">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider transition-colors duration-200">Department</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider transition-colors duration-200">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider transition-colors duration-200">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700 transition-colors duration-200">
            {users.length > 0 ? (
              users.map((user) => (
                <tr key={user.id} className="transition-colors duration-200">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white transition-colors duration-200">
                    {user.first_name} {user.last_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 transition-colors duration-200">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 transition-colors duration-200">
                    {user.role}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 transition-colors duration-200">
                    {user.department || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap transition-colors duration-200">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.is_active 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium transition-colors duration-200">
                    <button
                      onClick={() => toggleUserStatus(user.id, user.is_active)}
                      className={`mr-3 ${
                        user.is_active 
                          ? 'text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300' 
                          : 'text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300'
                      }`}
                    >
                      {user.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => confirmDelete(user)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 ml-3"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center transition-colors duration-200">
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