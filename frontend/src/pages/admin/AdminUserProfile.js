import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { apiClient } from '../../services/authService';
import { useTheme } from '../../context/ThemeContext';

const ProfileSchema = Yup.object().shape({
  email: Yup.string().email('Invalid email address').required('Email is required'),
  first_name: Yup.string().required('First name is required'),
  last_name: Yup.string().required('Last name is required'),
  role: Yup.string().required('Role is required'),
  phone_number: Yup.string(),
  department: Yup.string(),
});

const PasswordSchema = Yup.object().shape({
  new_password: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .required('New password is required'),
  confirm_password: Yup.string()
    .oneOf([Yup.ref('new_password'), null], 'Passwords must match')
    .required('Please confirm your password'),
});

const AdminUserProfile = () => {
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { darkMode } = useTheme();
  
  const userId = params.id;
  
  console.log('Route params in AdminUserProfile:', params);
  console.log('userId in AdminUserProfile:', userId);
  console.log('Current path:', location.pathname);
  
  const [user, setUser] = useState(null);
  const [userClaims, setUserClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  useEffect(() => {
    console.log('AdminUserProfile mounted, userId:', userId);
    console.log('userId type:', typeof userId);
    
    if (userId !== undefined && userId !== null) {
      console.log('Fetching data for userId:', userId);
      fetchUserData();
    } else {
      console.log('No userId provided in params');
      setLoading(false);
      setError('No user ID provided. Please select a user from the user management page.');
    }
  }, [userId]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/account/users/${userId}/`);
      setUser(response.data);
      
      try {
        const claimsResponse = await apiClient.get(`/claims/?user=${userId}`);
        setUserClaims(claimsResponse.data.results || claimsResponse.data || []);
      } catch (claimsError) {
        console.error('Error fetching user claims:', claimsError);
        setUserClaims([]);
      }
      
      setError(null);
    } catch (error) {
      console.error('Error fetching user data:', error);
      setError('Failed to load user data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (values, { setSubmitting }) => {
    try {
      setFieldErrors({});
      setError(null);
      
      const response = await apiClient.patch(`/account/users/${userId}/`, values);
      setUser(response.data);
      
      setSuccessMessage('User profile updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      
      setIsEditMode(false);
    } catch (error) {
      console.error('Error updating user profile:', error);
      
      if (error.response?.data && typeof error.response.data === 'object') {
        const formErrors = error.response.data;
        
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
          setError('Failed to update user profile. Please try again.');
        }
      } else {
        setError(error.response?.data?.message || 'Failed to update user profile. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordReset = async (values, { setSubmitting, resetForm }) => {
    try {
      setFieldErrors({});
      setError(null);
      
      await apiClient.post(`/account/users/${userId}/reset-password/`, {
        new_password: values.new_password
      });
      
      setSuccessMessage('Password reset successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      
      resetForm();
      setShowPasswordForm(false);
    } catch (error) {
      console.error('Error resetting password:', error);
      
      if (error.response?.data && typeof error.response.data === 'object') {
        const formErrors = error.response.data;
        
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
          setError('Failed to reset password. Please try again.');
        }
      } else {
        setError(error.response?.data?.message || 'Failed to reset password. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 dark:border-blue-400"></div>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
        <div className="flex items-center justify-center flex-col">
          <svg className="h-16 w-16 text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Error Loading User</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => navigate('/admin/users')}
            className="btn btn-secondary"
          >
            Back to User Management
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white transition-colors duration-200">User Profile</h1>
            <p className="text-gray-600 dark:text-gray-400 transition-colors duration-200">
              Managing profile for {user?.first_name} {user?.last_name}
            </p>
          </div>
          <div className="space-x-2">
            <button
              onClick={() => navigate('/admin/users')}
              className="btn btn-secondary"
            >
              Back to Users
            </button>
            {!isEditMode && (
              <button
                onClick={() => setIsEditMode(true)}
                className="btn btn-primary"
              >
                Edit Profile
              </button>
            )}
          </div>
        </div>
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
              <svg className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700 dark:text-green-200">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* User Profile Info */}
          <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden transition-colors duration-200">
            {isEditMode ? (
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4 transition-colors duration-200">
                  Edit Profile
                </h2>
                <Formik
                  initialValues={{
                    email: user?.email || '',
                    first_name: user?.first_name || '',
                    last_name: user?.last_name || '',
                    role: user?.role || 'END_USER',
                    department: user?.department || '',
                    phone_number: user?.phone_number || '',
                  }}
                  validationSchema={ProfileSchema}
                  onSubmit={handleProfileSubmit}
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
                            Department
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
                            Phone Number
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
                      </div>

                      <div className="mt-6 flex justify-end space-x-3">
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditMode(false);
                            setFieldErrors({});
                          }}
                          className="btn btn-secondary"
                        >
                          Cancel
                        </button>
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
                              <span>Saving...</span>
                            </div>
                          ) : (
                            'Save Changes'
                          )}
                        </button>
                      </div>
                    </Form>
                  )}
                </Formik>
              </div>
            ) : (
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-6 transition-colors duration-200">
                  User Information
                </h2>
                
                <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">{user?.email}</dd>
                  </div>
                  
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Role</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                      {user?.role === 'END_USER' && 'End User'}
                      {user?.role === 'ML_ENGINEER' && 'ML Engineer'}
                      {user?.role === 'FINANCE' && 'Finance'}
                      {user?.role === 'ADMIN' && 'Admin'}
                    </dd>
                  </div>
                  
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">First Name</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">{user?.first_name}</dd>
                  </div>
                  
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Name</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">{user?.last_name}</dd>
                  </div>
                  
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone Number</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">{user?.phone_number || '-'}</dd>
                  </div>
                  
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</dt>
                    <dd className="mt-1 text-sm">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user?.is_active 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {user?.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </dd>
                  </div>
                  
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Date Joined</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">{formatDate(user?.date_joined)}</dd>
                  </div>
                  
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Login</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">{formatDate(user?.last_login)}</dd>
                  </div>
                </dl>
              </div>
            )}
          </div>
          
          {/* User Claims */}
          <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden mt-6 transition-colors duration-200">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4 transition-colors duration-200">
                User Claims
              </h2>
              
              {userClaims.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Reference</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Title</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {userClaims.map(claim => (
                        <tr key={claim.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {claim.reference_number}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                            {claim.title}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                            {typeof claim.amount === 'number' 
                              ? `$${claim.amount.toFixed(2)}` 
                              : claim.amount 
                                ? `$${claim.amount}` 
                                : '$0.00'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              claim.status === 'APPROVED' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                              claim.status === 'REJECTED' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                              claim.status === 'PROCESSING' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                              'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            }`}>
                              {claim.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                            {new Date(claim.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <Link to={`/admin/claims/${claim.id}`} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300">
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No claims found for this user.
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Sidebar Actions */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden transition-colors duration-200">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4 transition-colors duration-200">
                Account Actions
              </h2>
              
              <div className="space-y-4">
                <button
                  onClick={async () => {
                    try {
                      await apiClient.post(`/account/users/${userId}/${user?.is_active ? 'deactivate' : 'activate'}/`);
                      setUser({
                        ...user,
                        is_active: !user.is_active
                      });
                      setSuccessMessage(`User ${user?.is_active ? 'deactivated' : 'activated'} successfully!`);
                      setTimeout(() => setSuccessMessage(null), 3000);
                    } catch (error) {
                      console.error('Error toggling user status:', error);
                      setError(`Failed to ${user?.is_active ? 'deactivate' : 'activate'} user. Please try again.`);
                    }
                  }}
                  className={`w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium ${
                    user?.is_active 
                      ? 'text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900 focus:ring-red-500' 
                      : 'text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-900 focus:ring-green-500'
                  } bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800`}
                >
                  {user?.is_active ? 'Deactivate Account' : 'Activate Account'}
                </button>

                <button
                  onClick={async () => {
                    if (window.confirm(`Are you sure you want to permanently delete ${user?.first_name} ${user?.last_name}? This action cannot be undone.`)) {
                      try {
                        await apiClient.post(`/account/users/${userId}/delete_user/`);
                        setSuccessMessage('User deleted successfully!');
                        setTimeout(() => {
                          navigate('/admin/users');
                        }, 2000);
                      } catch (error) {
                        console.error('Error deleting user:', error);
                        setError('Failed to delete user. Please try again.');
                      }
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-red-700 dark:text-red-300 bg-white dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-gray-800"
                >
                  Delete User
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminUserProfile;