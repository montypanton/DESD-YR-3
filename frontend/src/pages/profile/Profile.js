import React, { useState } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const ProfileSchema = Yup.object().shape({
  first_name: Yup.string().required('First name is required'),
  last_name: Yup.string().required('Last name is required'),
  phone_number: Yup.string(),
});

const PasswordSchema = Yup.object().shape({
  old_password: Yup.string().required('Current password is required'),
  new_password: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .required('New password is required'),
  confirm_password: Yup.string()
    .oneOf([Yup.ref('new_password'), null], 'Passwords must match')
    .required('Confirm password is required'),
});

const Profile = () => {
  const { user, updateProfile, changePassword } = useAuth();
  const { darkMode } = useTheme();
  const [activeTab, setActiveTab] = useState('profile');
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [updateError, setUpdateError] = useState(null);
  const [passwordError, setPasswordError] = useState(null);

  const handleProfileSubmit = async (values, { setSubmitting }) => {
    try {
      setUpdateError(null);
      setUpdateSuccess(false);
      await updateProfile(values);
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 3000);
    } catch (error) {
      console.error('Profile update error:', error);
      setUpdateError(
        error.response?.data?.message || 
        'Failed to update profile. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (values, { setSubmitting, resetForm }) => {
    try {
      setPasswordError(null);
      setPasswordSuccess(false);
      await changePassword(values);
      setPasswordSuccess(true);
      resetForm();
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (error) {
      console.error('Password change error:', error);
      setPasswordError(
        error.response?.data?.message || 
        error.response?.data?.old_password?.[0] ||
        'Failed to change password. Please check your current password.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Determine title text based on user role
  const getRoleSpecificTitle = () => {
    if (user?.role === 'ADMIN' || user?.is_superuser === true) {
      return "Admin Profile";
    } else if (user?.role === 'FINANCE') {
      return "Finance Profile";
    } else {
      return "My Profile";
    }
  };

  return (
    <div className="page-container">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white transition-colors duration-200">{getRoleSpecificTitle()}</h1>
        <p className="text-gray-600 dark:text-gray-400 transition-colors duration-200">Manage your account information and password</p>
      </div>

      <div className="mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700 transition-colors duration-200">
          <nav className="-mb-px flex">
            <button
              className={`${
                activeTab === 'profile'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm mr-8 transition-colors duration-200`}
              onClick={() => setActiveTab('profile')}
            >
              Profile Information
            </button>
            <button
              className={`${
                activeTab === 'password'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200`}
              onClick={() => setActiveTab('password')}
            >
              Change Password
            </button>
          </nav>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 transition-colors duration-200">
        {activeTab === 'profile' ? (
          <>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-6 transition-colors duration-200">Profile Information</h2>

            {updateSuccess && (
              <div className="mb-4 bg-green-50 dark:bg-green-900 border-l-4 border-green-500 p-4 transition-colors duration-200">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-green-700 dark:text-green-200 transition-colors duration-200">Profile updated successfully!</p>
                  </div>
                </div>
              </div>
            )}

            {updateError && (
              <div className="mb-4 bg-red-50 dark:bg-red-900 border-l-4 border-red-500 p-4 transition-colors duration-200">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700 dark:text-red-200 transition-colors duration-200">{updateError}</p>
                  </div>
                </div>
              </div>
            )}

            <Formik
              initialValues={{
                first_name: user?.first_name || '',
                last_name: user?.last_name || '',
                phone_number: user?.phone_number || '',
              }}
              validationSchema={ProfileSchema}
              onSubmit={handleProfileSubmit}
            >
              {({ isSubmitting, errors, touched }) => (
                <Form>
                  <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                    <div className="sm:col-span-3">
                      <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors duration-200">
                        First name
                      </label>
                      <div className="mt-1">
                        <Field
                          type="text"
                          name="first_name"
                          id="first_name"
                          className={`form-input dark:bg-gray-700 dark:border-gray-600 dark:text-white ${errors.first_name && touched.first_name ? 'border-red-300' : ''}`}
                        />
                        <ErrorMessage name="first_name" component="div" className="mt-1 text-sm text-red-600 dark:text-red-400" />
                      </div>
                    </div>

                    <div className="sm:col-span-3">
                      <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors duration-200">
                        Last name
                      </label>
                      <div className="mt-1">
                        <Field
                          type="text"
                          name="last_name"
                          id="last_name"
                          className={`form-input dark:bg-gray-700 dark:border-gray-600 dark:text-white ${errors.last_name && touched.last_name ? 'border-red-300' : ''}`}
                        />
                        <ErrorMessage name="last_name" component="div" className="mt-1 text-sm text-red-600 dark:text-red-400" />
                      </div>
                    </div>

                    <div className="sm:col-span-3">
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors duration-200">
                        Email
                      </label>
                      <div className="mt-1">
                        <input
                          type="email"
                          id="email"
                          value={user?.email || ''}
                          disabled
                          className="form-input bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400 cursor-not-allowed"
                        />
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 transition-colors duration-200">Email cannot be changed</p>
                      </div>
                    </div>

                    <div className="sm:col-span-3">
                      <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors duration-200">
                        Phone number
                      </label>
                      <div className="mt-1">
                        <Field
                          type="text"
                          name="phone_number"
                          id="phone_number"
                          className="form-input dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="btn btn-primary dark:focus:ring-offset-gray-900"
                    >
                      {isSubmitting ? 'Updating...' : 'Update Profile'}
                    </button>
                  </div>
                </Form>
              )}
            </Formik>
          </>
        ) : (
          <>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-6 transition-colors duration-200">Change Password</h2>

            {passwordSuccess && (
              <div className="mb-4 bg-green-50 dark:bg-green-900 border-l-4 border-green-500 p-4 transition-colors duration-200">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-green-700 dark:text-green-200 transition-colors duration-200">Password updated successfully!</p>
                  </div>
                </div>
              </div>
            )}

            {passwordError && (
              <div className="mb-4 bg-red-50 dark:bg-red-900 border-l-4 border-red-500 p-4 transition-colors duration-200">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700 dark:text-red-200 transition-colors duration-200">{passwordError}</p>
                  </div>
                </div>
              </div>
            )}

            <Formik
              initialValues={{
                old_password: '',
                new_password: '',
                confirm_password: '',
              }}
              validationSchema={PasswordSchema}
              onSubmit={handlePasswordSubmit}
            >
              {({ isSubmitting, errors, touched }) => (
                <Form>
                  <div className="space-y-6">
                    <div>
                      <label htmlFor="old_password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors duration-200">
                        Current Password
                      </label>
                      <div className="mt-1">
                        <Field
                          type="password"
                          name="old_password"
                          id="old_password"
                          className={`form-input dark:bg-gray-700 dark:border-gray-600 dark:text-white ${errors.old_password && touched.old_password ? 'border-red-300' : ''}`}
                        />
                        <ErrorMessage name="old_password" component="div" className="mt-1 text-sm text-red-600 dark:text-red-400" />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="new_password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors duration-200">
                        New Password
                      </label>
                      <div className="mt-1">
                        <Field
                          type="password"
                          name="new_password"
                          id="new_password"
                          className={`form-input dark:bg-gray-700 dark:border-gray-600 dark:text-white ${errors.new_password && touched.new_password ? 'border-red-300' : ''}`}
                        />
                        <ErrorMessage name="new_password" component="div" className="mt-1 text-sm text-red-600 dark:text-red-400" />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors duration-200">
                        Confirm New Password
                      </label>
                      <div className="mt-1">
                        <Field
                          type="password"
                          name="confirm_password"
                          id="confirm_password"
                          className={`form-input dark:bg-gray-700 dark:border-gray-600 dark:text-white ${errors.confirm_password && touched.confirm_password ? 'border-red-300' : ''}`}
                        />
                        <ErrorMessage name="confirm_password" component="div" className="mt-1 text-sm text-red-600 dark:text-red-400" />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="btn btn-primary dark:focus:ring-offset-gray-900"
                    >
                      {isSubmitting ? 'Updating...' : 'Change Password'}
                    </button>
                  </div>
                </Form>
              )}
            </Formik>
          </>
        )}
      </div>
    </div>
  );
};

export default Profile;