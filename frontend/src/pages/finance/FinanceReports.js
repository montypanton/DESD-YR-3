import React, { useState } from 'react';

const FinanceReports = () => {
  const [reportType, setReportType] = useState('monthly');
  const [dateRange, setDateRange] = useState('current');

  // Sample data for reports
  const departmentSpending = [
    { department: 'Engineering', amount: 45250.75, percentage: 32.5 },
    { department: 'Marketing', amount: 28750.50, percentage: 20.6 },
    { department: 'Sales', amount: 24500.25, percentage: 17.6 },
    { department: 'HR', amount: 19750.50, percentage: 14.2 },
    { department: 'Operations', amount: 16500.00, percentage: 11.8 },
    { department: 'Executive', amount: 4600.00, percentage: 3.3 },
  ];

  const expenseCategories = [
    { category: 'Travel', amount: 42750.50, percentage: 30.7 },
    { category: 'Equipment', amount: 35250.25, percentage: 25.3 },
    { category: 'Software', amount: 28500.75, percentage: 20.5 },
    { category: 'Training', amount: 18750.50, percentage: 13.5 },
    { category: 'Office Supplies', amount: 9500.25, percentage: 6.8 },
    { category: 'Miscellaneous', amount: 4600.00, percentage: 3.2 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Financial Reports</h1>
        <div className="flex items-center space-x-3">
          <button 
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Export Report
          </button>
        </div>
      </div>

      {/* Report Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Report Type</label>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setReportType('monthly')}
              className={`px-4 py-2 text-sm font-medium rounded-md 
                ${reportType === 'monthly' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' 
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}
            >
              Monthly Summary
            </button>
            <button
              onClick={() => setReportType('quarterly')}
              className={`px-4 py-2 text-sm font-medium rounded-md 
                ${reportType === 'quarterly' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' 
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}
            >
              Quarterly Report
            </button>
            <button
              onClick={() => setReportType('annual')}
              className={`px-4 py-2 text-sm font-medium rounded-md 
                ${reportType === 'annual' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' 
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}
            >
              Annual Review
            </button>
            <button
              onClick={() => setReportType('custom')}
              className={`px-4 py-2 text-sm font-medium rounded-md 
                ${reportType === 'custom' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' 
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}
            >
              Custom Date Range
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Time Period</label>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setDateRange('current')}
              className={`px-4 py-2 text-sm font-medium rounded-md 
                ${dateRange === 'current' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' 
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}
            >
              Current
            </button>
            <button
              onClick={() => setDateRange('previous')}
              className={`px-4 py-2 text-sm font-medium rounded-md 
                ${dateRange === 'previous' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' 
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}
            >
              Previous
            </button>
            <button
              onClick={() => setDateRange('year-to-date')}
              className={`px-4 py-2 text-sm font-medium rounded-md 
                ${dateRange === 'year-to-date' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' 
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}
            >
              Year to Date
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase mb-2">Total Expenses</h3>
          <div className="flex items-baseline">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">£139,352.00</span>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {reportType === 'monthly' ? 'April 2025' : 
             reportType === 'quarterly' ? 'Q2 2025' : 
             reportType === 'annual' ? '2025' : 'Custom Period'}
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase mb-2">Average Per Claim</h3>
          <div className="flex items-baseline">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">£487.25</span>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Across {reportType === 'monthly' ? '47' : reportType === 'quarterly' ? '148' : '286'} claims</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase mb-2">Budget Utilization</h3>
          <div className="flex items-baseline">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">65.3%</span>
            {dateRange === 'year-to-date' && <span className="ml-2 text-sm text-green-600 font-medium">On track</span>}
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Of allocated budget</p>
        </div>
      </div>

      {/* Department Spending Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Spending by Department</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Department
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Amount
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  % of Total
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Visualization
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {departmentSpending.map((dept) => (
                <tr key={dept.department}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {dept.department}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    £{dept.amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {dept.percentage}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                      <div className="bg-green-600 h-2.5 rounded-full" style={{ width: `${dept.percentage}%` }}></div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expense Categories Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Expense Categories</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Category
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Amount
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  % of Total
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Visualization
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {expenseCategories.map((cat) => (
                <tr key={cat.category}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {cat.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    £{cat.amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {cat.percentage}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                      <div className="bg-green-600 h-2.5 rounded-full" style={{ width: `${cat.percentage}%` }}></div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FinanceReports;