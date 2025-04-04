import React, { useState } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { apiClient } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';

const ClaimSchema = Yup.object().shape({
  injuryType: Yup.string().required('Injury type is required'),
  recoveryTime: Yup.number().required('Expected recovery time is required').positive('Must be a positive number'),
  travelCosts: Yup.number().required('Travel costs are required').min(0, 'Cannot be negative'),
  lossOfEarnings: Yup.number().required('Loss of earnings is required').min(0, 'Cannot be negative'),
  additionalExpenses: Yup.number().required('Additional expenses are required').min(0, 'Cannot be negative'),
  description: Yup.string().required('Description is required')
});

const ClaimForm = () => {
  const { user } = useAuth();
  const [submissionStatus, setSubmissionStatus] = useState({
    isSubmitting: false,
    isSuccess: false,
    isError: false,
    message: ''
  });

  const handleSubmit = async (values, { resetForm }) => {
    setSubmissionStatus({
      isSubmitting: true,
      isSuccess: false,
      isError: false,
      message: ''
    });

    try {
      // Add user information to the claim
      const claimData = {
        ...values,
        userId: user.id,
        submittedAt: new Date().toISOString()
      };

      // Send the claim data to the backend API
      const response = await apiClient.post('/claims/claims/', claimData);

      setSubmissionStatus({
        isSubmitting: false,
        isSuccess: true,
        isError: false,
        message: 'Claim submitted successfully! Your claim ID is: ' + response.data.id
      });

      // Reset the form after successful submission
      resetForm();
    } catch (error) {
      console.error('Error submitting claim:', error);
      setSubmissionStatus({
        isSubmitting: false,
        isSuccess: false,
        isError: true,
        message: error.response?.data?.message || 'Failed to submit claim. Please try again.'
      });
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">Submit Insurance Claim</h2>

      {submissionStatus.isSuccess && (
        <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">{submissionStatus.message}</p>
            </div>
          </div>
        </div>
      )}

      {submissionStatus.isError && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{submissionStatus.message}</p>
            </div>
          </div>
        </div>
      )}

      <Formik
        initialValues={{
          injuryType: '',
          recoveryTime: '',
          travelCosts: '',
          lossOfEarnings: '',
          additionalExpenses: '',
          description: ''
        }}
        validationSchema={ClaimSchema}
        onSubmit={handleSubmit}
      >
        {({ isSubmitting, errors, touched }) => (
          <Form>
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label htmlFor="injuryType" className="block text-sm font-medium text-gray-700">
                  Injury Type
                </label>
                <div className="mt-1">
                  <Field
                    as="select"
                    name="injuryType"
                    id="injuryType"
                    className={`form-input ${errors.injuryType && touched.injuryType ? 'border-red-300' : ''}`}
                  >
                    <option value="">Select Injury Type</option>
                    <option value="Minor">Minor</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Severe">Severe</option>
                    <option value="Critical">Critical</option>
                  </Field>
                  <ErrorMessage name="injuryType" component="div" className="mt-1 text-sm text-red-600" />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="recoveryTime" className="block text-sm font-medium text-gray-700">
                  Expected Recovery Time (days)
                </label>
                <div className="mt-1">
                  <Field
                    type="number"
                    name="recoveryTime"
                    id="recoveryTime"
                    className={`form-input ${errors.recoveryTime && touched.recoveryTime ? 'border-red-300' : ''}`}
                  />
                  <ErrorMessage name="recoveryTime" component="div" className="mt-1 text-sm text-red-600" />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="travelCosts" className="block text-sm font-medium text-gray-700">
                  Travel Costs (£)
                </label>
                <div className="mt-1">
                  <Field
                    type="number"
                    step="0.01"
                    name="travelCosts"
                    id="travelCosts"
                    className={`form-input ${errors.travelCosts && touched.travelCosts ? 'border-red-300' : ''}`}
                  />
                  <ErrorMessage name="travelCosts" component="div" className="mt-1 text-sm text-red-600" />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="lossOfEarnings" className="block text-sm font-medium text-gray-700">
                  Loss of Earnings (£)
                </label>
                <div className="mt-1">
                  <Field
                    type="number"
                    step="0.01"
                    name="lossOfEarnings"
                    id="lossOfEarnings"
                    className={`form-input ${errors.lossOfEarnings && touched.lossOfEarnings ? 'border-red-300' : ''}`}
                  />
                  <ErrorMessage name="lossOfEarnings" component="div" className="mt-1 text-sm text-red-600" />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="additionalExpenses" className="block text-sm font-medium text-gray-700">
                  Additional Expenses (£)
                </label>
                <div className="mt-1">
                  <Field
                    type="number"
                    step="0.01"
                    name="additionalExpenses"
                    id="additionalExpenses"
                    className={`form-input ${errors.additionalExpenses && touched.additionalExpenses ? 'border-red-300' : ''}`}
                  />
                  <ErrorMessage name="additionalExpenses" component="div" className="mt-1 text-sm text-red-600" />
                </div>
              </div>

              <div className="sm:col-span-6">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description of Incident
                </label>
                <div className="mt-1">
                  <Field
                    as="textarea"
                    name="description"
                    id="description"
                    rows="4"
                    className={`form-input ${errors.description && touched.description ? 'border-red-300' : ''}`}
                  />
                  <ErrorMessage name="description" component="div" className="mt-1 text-sm text-red-600" />
                </div>
              </div>
            </div>

            <div className="mt-6">
              <button
                type="submit"
                disabled={submissionStatus.isSubmitting}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
              >
                {submissionStatus.isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </>
                ) : (
                  'Submit Claim'
                )}
              </button>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
};

export default ClaimForm;