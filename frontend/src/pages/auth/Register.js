import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';

const RegisterSchema = Yup.object().shape({
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
  password: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .matches(/[a-z]/, 'Password must contain at least one lowercase letter')
    .matches(/[0-9]/, 'Password must contain at least one number')
    .matches(/[^A-Za-z0-9]/, 'Password must contain at least one special character')
    .required('Password is required'),
  password2: Yup.string()
    .oneOf([Yup.ref('password'), null], 'Passwords must match')
    .required('Confirm password is required'),
  first_name: Yup.string()
    .required('First name is required'),
  last_name: Yup.string()
    .required('Last name is required'),
  role: Yup.string()
    .oneOf(['END_USER', 'ML_ENGINEER', 'FINANCE'], 'Invalid role')
    .required('Role is required')
});

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [apiError, setApiError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      setApiError(null);
      setFieldErrors({});
      console.log('Registering with data:', values);
      await register(values);
      navigate('/login', { state: { message: 'Registration successful! Please log in.' } });
    } catch (error) {
      console.error('Registration error:', error);
      
      // Handle validation errors from API
      if (error.response?.data && typeof error.response.data === 'object') {
        const formErrors = error.response.data;
        console.log('Form validation errors:', formErrors);
        
        // Create a map for field-specific errors
        const fieldSpecificErrors = {};
        
        // Handle specific error messages for form fields
        Object.keys(formErrors).forEach(key => {
          if (Array.isArray(formErrors[key])) {
            fieldSpecificErrors[key] = formErrors[key][0];
          } else if (typeof formErrors[key] === 'string') {
            fieldSpecificErrors[key] = formErrors[key];
          }
        });
        
        // Set field-specific errors
        setFieldErrors(fieldSpecificErrors);
        
        // Set a general API error message if there are non-field errors
        if (formErrors.non_field_errors) {
          setApiError(
            Array.isArray(formErrors.non_field_errors)
              ? formErrors.non_field_errors[0]
              : formErrors.non_field_errors
          );
        } else if (!Object.keys(fieldSpecificErrors).length) {
          setApiError('Failed to register. Please try again.');
        }
      } else {
        setApiError(
          error.response?.data?.message || 
          'Failed to register. Please try again.'
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900 dark:text-white">
            Create a new account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Or{' '}
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
              sign in to your existing account
            </Link>
          </p>
        </div>
        
        <Formik
          initialValues={{ 
            email: '', 
            password: '', 
            password2: '', 
            first_name: '', 
            last_name: '',
            role: 'END_USER',
            department: '',
            phone_number: ''
          }}
          validationSchema={RegisterSchema}
          onSubmit={handleSubmit}
        >
          {({ isSubmitting, errors, touched }) => (
            <Form className="mt-8 space-y-6">
              {apiError && (
                <div className="bg-red-50 dark:bg-red-900 border-l-4 border-red-500 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700 dark:text-red-200">{apiError}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-md shadow-sm -space-y-px">
                <div className="grid grid-cols-1 gap-4 mb-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email address
                    </label>
                    <Field
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      className={`appearance-none relative block w-full px-3 py-2 border ${
                        errors.email && touched.email ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                      } placeholder-gray-500 text-gray-900 dark:text-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                    />
                    <ErrorMessage 
                      name="email" 
                      component="div" 
                      className="text-red-500 text-xs mt-1" 
                    />
                    {fieldErrors.email && (
                      <div className="text-red-500 text-xs mt-1">{fieldErrors.email}</div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        First name
                      </label>
                      <Field
                        id="first_name"
                        name="first_name"
                        type="text"
                        autoComplete="given-name"
                        className={`appearance-none relative block w-full px-3 py-2 border ${
                          errors.first_name && touched.first_name ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                        } placeholder-gray-500 text-gray-900 dark:text-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                      />
                      <ErrorMessage 
                        name="first_name" 
                        component="div" 
                        className="text-red-500 text-xs mt-1" 
                      />
                      {fieldErrors.first_name && (
                        <div className="text-red-500 text-xs mt-1">{fieldErrors.first_name}</div>
                      )}
                    </div>
                    
                    <div>
                      <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Last name
                      </label>
                      <Field
                        id="last_name"
                        name="last_name"
                        type="text"
                        autoComplete="family-name"
                        className={`appearance-none relative block w-full px-3 py-2 border ${
                          errors.last_name && touched.last_name ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                        } placeholder-gray-500 text-gray-900 dark:text-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                      />
                      <ErrorMessage 
                        name="last_name" 
                        component="div" 
                        className="text-red-500 text-xs mt-1" 
                      />
                      {fieldErrors.last_name && (
                        <div className="text-red-500 text-xs mt-1">{fieldErrors.last_name}</div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Role
                    </label>
                    <Field
                      as="select"
                      id="role"
                      name="role"
                      className={`appearance-none relative block w-full px-3 py-2 border ${
                        errors.role && touched.role ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                      } placeholder-gray-500 text-gray-900 dark:text-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                    >
                      <option value="END_USER">End User</option>
                      <option value="ML_ENGINEER">ML Engineer</option>
                      <option value="FINANCE">Finance</option>
                    </Field>
                    <ErrorMessage 
                      name="role" 
                      component="div" 
                      className="text-red-500 text-xs mt-1" 
                    />
                    {fieldErrors.role && (
                      <div className="text-red-500 text-xs mt-1">{fieldErrors.role}</div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="department" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Department (Optional)
                      </label>
                      <Field
                        id="department"
                        name="department"
                        type="text"
                        className="appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 text-gray-900 dark:text-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Phone (Optional)
                      </label>
                      <Field
                        id="phone_number"
                        name="phone_number"
                        type="tel"
                        autoComplete="tel"
                        className="appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 text-gray-900 dark:text-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Password
                    </label>
                    <Field
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      className={`appearance-none relative block w-full px-3 py-2 border ${
                        errors.password && touched.password ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                      } placeholder-gray-500 text-gray-900 dark:text-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                    />
                    <ErrorMessage 
                      name="password" 
                      component="div" 
                      className="text-red-500 text-xs mt-1" 
                    />
                    {fieldErrors.password && (
                      <div className="text-red-500 text-xs mt-1">{fieldErrors.password}</div>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="password2" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Confirm Password
                    </label>
                    <Field
                      id="password2"
                      name="password2"
                      type="password"
                      autoComplete="new-password"
                      className={`appearance-none relative block w-full px-3 py-2 border ${
                        errors.password2 && touched.password2 ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                      } placeholder-gray-500 text-gray-900 dark:text-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                    />
                    <ErrorMessage 
                      name="password2" 
                      component="div" 
                      className="text-red-500 text-xs mt-1" 
                    />
                    {fieldErrors.password2 && (
                      <div className="text-red-500 text-xs mt-1">{fieldErrors.password2}</div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 dark:focus:ring-offset-gray-900"
                >
                  {isSubmitting ? (
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : 'Create Account'}
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
};

export default Register;