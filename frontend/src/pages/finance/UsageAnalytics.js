import React, { useState, useEffect } from 'react';
import { 
  Card, Row, Col, Select, DatePicker, Button, Table, Statistic, 
  Spin, Alert, Space, Radio, message 
} from 'antd';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer
} from 'recharts';
import { 
  FilterOutlined
} from '@ant-design/icons';
import moment from 'moment';
import { 
  getUsageAnalytics, getUsageSummary,
  getInsuranceCompanies 
} from '../../services/financeService';

const { Option } = Select;
const { RangePicker } = DatePicker;

const UsageAnalytics = () => {
  // State variables
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState([]);
  const [summary, setSummary] = useState({
    total_predictions: 0,
    total_billable_amount: '0.00',
    companies: [],
    date_range: {}
  });
  const [companies, setCompanies] = useState([]);
  const [filters, setFilters] = useState({
    company_id: undefined,
    time_range: 'monthly',
    from_date: undefined,
    to_date: undefined
  });
  const [error, setError] = useState(null);

  // Fetch initial data when component mounts
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch companies for filter dropdown
        const companiesResponse = await getInsuranceCompanies();
        setCompanies(companiesResponse.data);
        
        // Fetch analytics with default filters
        await fetchAnalytics();
        
        // Fetch summary
        await fetchSummary();
        
        setError(null);
      } catch (err) {
        console.error('Error fetching initial data:', err);
        setError('Failed to load usage analytics data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fetch analytics data based on filters
  const fetchAnalytics = async () => {
    try {
      const params = {
        ...filters,
        from_date: filters.from_date ? moment(filters.from_date).format('YYYY-MM-DD') : undefined,
        to_date: filters.to_date ? moment(filters.to_date).format('YYYY-MM-DD') : undefined
      };
      
      const response = await getUsageAnalytics(params);
      setAnalytics(response.data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load analytics data. Please try again.');
    }
  };

  // Fetch summary data
  const fetchSummary = async () => {
    try {
      const params = {
        from_date: filters.from_date ? moment(filters.from_date).format('YYYY-MM-DD') : undefined,
        to_date: filters.to_date ? moment(filters.to_date).format('YYYY-MM-DD') : undefined
      };
      
      const response = await getUsageSummary(params);
      setSummary(response.data);
    } catch (err) {
      console.error('Error fetching summary:', err);
      setError('Failed to load summary data. Please try again.');
    }
  };

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Apply filters
  const applyFilters = async () => {
    setLoading(true);
    try {
      await fetchAnalytics();
      await fetchSummary();
      setError(null);
    } catch (err) {
      console.error('Error applying filters:', err);
      setError('Failed to apply filters. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Table columns
  const columns = [
    {
      title: 'Company',
      dataIndex: 'company_name',
      key: 'company_name',
      sorter: (a, b) => a.company_name.localeCompare(b.company_name)
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      sorter: (a, b) => a.date.localeCompare(b.date)
    },
    {
      title: 'Predictions Count',
      dataIndex: 'predictions_count',
      key: 'predictions_count',
      sorter: (a, b) => a.predictions_count - b.predictions_count
    },
    {
      title: 'Successful',
      dataIndex: 'successful_predictions',
      key: 'successful_predictions',
      sorter: (a, b) => a.successful_predictions - b.successful_predictions
    },
    {
      title: 'Rate Per Claim (£)',
      dataIndex: 'rate_per_claim',
      key: 'rate_per_claim',
      render: (text) => `£${parseFloat(text).toFixed(2)}`,
      sorter: (a, b) => parseFloat(a.rate_per_claim) - parseFloat(b.rate_per_claim)
    },
    {
      title: 'Total Cost (£)',
      dataIndex: 'total_cost',
      key: 'total_cost',
      render: (text) => `£${parseFloat(text).toFixed(2)}`,
      sorter: (a, b) => parseFloat(a.total_cost) - parseFloat(b.total_cost)
    }
  ];

  // Summary columns for company breakdown
  const summaryColumns = [
    {
      title: 'Company',
      dataIndex: 'company_name',
      key: 'company_name'
    },
    {
      title: 'Predictions',
      dataIndex: 'predictions_count',
      key: 'predictions_count'
    },
    {
      title: 'Rate (£)',
      dataIndex: 'rate_per_claim',
      key: 'rate_per_claim',
      render: (text) => `£${parseFloat(text).toFixed(2)}`
    },
    {
      title: 'Total (£)',
      dataIndex: 'total_amount',
      key: 'total_amount',
      render: (text) => `£${parseFloat(text).toFixed(2)}`
    }
  ];

  // Prepare data for charts
  const prepareChartData = () => {
    // Group data by company or date based on current view
    if (filters.company_id) {
      // If a specific company is selected, return data grouped by date
      return analytics;
    } else {
      // If no specific company is selected, group by company
      const companyGroups = {};
      
      analytics.forEach(item => {
        if (!companyGroups[item.company_name]) {
          companyGroups[item.company_name] = {
            company_name: item.company_name,
            predictions_count: 0,
            successful_predictions: 0,
            failed_predictions: 0,
            total_cost: 0
          };
        }
        
        companyGroups[item.company_name].predictions_count += item.predictions_count;
        companyGroups[item.company_name].successful_predictions += item.successful_predictions;
        companyGroups[item.company_name].failed_predictions += item.failed_predictions;
        companyGroups[item.company_name].total_cost += parseFloat(item.total_cost);
      });
      
      return Object.values(companyGroups);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Usage Analytics Dashboard</h1>
      </div>
      
      {error && (
        <Alert message={error} type="error" showIcon closable />
      )}
      
      {/* Filters */}
      <Card title={<span><FilterOutlined /> Filters</span>} className="dark:bg-gray-800">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={24} md={6}>
            <div className="mb-2">Insurance Company</div>
            <Select
              placeholder="All Companies"
              allowClear
              style={{ width: '100%' }}
              value={filters.company_id}
              onChange={(value) => handleFilterChange('company_id', value)}
            >
              {companies.map(company => (
                <Option key={company.id} value={company.id}>{company.name}</Option>
              ))}
            </Select>
          </Col>
          
          <Col xs={24} sm={24} md={6}>
            <div className="mb-2">Time Range</div>
            <Select
              style={{ width: '100%' }}
              value={filters.time_range}
              onChange={(value) => handleFilterChange('time_range', value)}
            >
              <Option value="weekly">Weekly</Option>
              <Option value="monthly">Monthly</Option>
              <Option value="yearly">Yearly</Option>
            </Select>
          </Col>
          
          <Col xs={24} sm={24} md={8}>
            <div className="mb-2">Date Range</div>
            <RangePicker
              style={{ width: '100%' }}
              value={[
                filters.from_date ? moment(filters.from_date) : null,
                filters.to_date ? moment(filters.to_date) : null
              ]}
              onChange={(dates) => {
                handleFilterChange('from_date', dates ? dates[0] : null);
                handleFilterChange('to_date', dates ? dates[1] : null);
              }}
            />
          </Col>
          
          <Col xs={24} sm={24} md={4} className="flex justify-end">
            <Button
              type="primary"
              onClick={applyFilters}
              loading={loading}
            >
              Apply Filters
            </Button>
          </Col>
        </Row>
      </Card>
      
      {/* Summary Statistics */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8}>
          <Card className="dark:bg-gray-800">
            <Statistic
              title="Total Predictions"
              value={summary.total_predictions}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={8}>
          <Card className="dark:bg-gray-800">
            <Statistic
              title="Total Billable Amount"
              value={parseFloat(summary.total_billable_amount).toFixed(2)}
              prefix="£"
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={8}>
          <Card className="dark:bg-gray-800">
            <Statistic
              title="Insurance Companies"
              value={summary.companies.length}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
      </Row>
      
      {/* Chart */}
      <Card className="dark:bg-gray-800">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Usage Trends</h2>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Spin size="large" />
          </div>
        ) : prepareChartData().length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={prepareChartData()}
              margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey={filters.company_id ? "date" : "company_name"} 
                angle={-45} 
                textAnchor="end"
                height={80}
              />
              <YAxis />
              <Tooltip formatter={(value) => value.toLocaleString()} />
              <Legend />
              <Bar dataKey="predictions_count" name="Total Predictions" fill="#0088FE" />
              <Bar dataKey="successful_predictions" name="Successful" fill="#00C49F" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center p-8 text-gray-500 dark:text-gray-400">
            No data available for the selected filters.
          </div>
        )}
      </Card>
      
      {/* Companies Breakdown */}
      <Card title="Company Breakdown" className="dark:bg-gray-800">
        <Table
          columns={summaryColumns}
          dataSource={summary.companies}
          rowKey="company_id"
          loading={loading}
          pagination={false}
          summary={() => (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0}>
                  <strong>Total</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1}>
                  <strong>{summary.total_predictions}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2}>
                  <strong>-</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3}>
                  <strong>£{parseFloat(summary.total_billable_amount).toFixed(2)}</strong>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />
      </Card>
      
      {/* Detailed Analytics */}
      <Card title="Detailed Analytics" className="dark:bg-gray-800">
        <Table
          columns={columns}
          dataSource={analytics}
          rowKey={(record) => `${record.company_id}-${record.date}`}
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 'max-content' }}
        />
      </Card>
    </div>
  );
};

export default UsageAnalytics;