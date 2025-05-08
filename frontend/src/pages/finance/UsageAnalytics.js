import React, { useState, useEffect } from 'react';
import { 
  Card, Row, Col, Select, DatePicker, Button, Table, Statistic, 
  Spin, Alert, Space, Radio, Typography, Calendar, Badge, Tag, Empty
} from 'antd';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { 
  FilterOutlined, CalendarOutlined, BarChartOutlined, 
  LineChartOutlined, TrophyOutlined, FileTextOutlined
} from '@ant-design/icons';
import moment from 'moment';
import { 
  getUsageAnalytics, getUsageSummary, getInsuranceCompanies
} from '../../services/financeService';

const { Option } = Select;
const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

// Color constants for charts
const CHART_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const UsageAnalytics = () => {
  // State variables 
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState([]);
  const [summary, setSummary] = useState({
    total_claims: 0,
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
  
  // Additional state for enhanced features
  const [timeSeriesData, setTimeSeriesData] = useState([]);
  const [topClients, setTopClients] = useState([]);
  const [calendarData, setCalendarData] = useState({});
  const [viewMode, setViewMode] = useState('overview'); // 'overview', 'timeseries', 'topcompanies', 'calendar'
  const [hasData, setHasData] = useState(false);

  // Fetch initial data when component mounts
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch companies for filter dropdown
        const companiesResponse = await getInsuranceCompanies();
        console.log('Companies API response:', companiesResponse.data);
        setCompanies(companiesResponse.data || []);
        
        // Fetch analytics with default filters
        await fetchAnalytics();
        
        // Fetch summary
        await fetchSummary();
        
        // Prepare time series data
        prepareTimeSeriesData();
        
        // Calculate top clients
        calculateTopClients();
        
        // Prepare calendar view data
        prepareCalendarData();
        
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
  
  // Process derived data whenever analytics, summary or companies change
  useEffect(() => {
    if (analytics.length > 0) {
      console.log('Reprocessing derived data due to changed dependencies');
      prepareTimeSeriesData();
      prepareCalendarData();
      
      if (summary.companies && summary.companies.length > 0) {
        calculateTopClients();
      }
    }
  }, [analytics, companies, summary.companies]);

  // Fetch analytics data based on filters
  const fetchAnalytics = async () => {
    try {
      const params = {
        ...filters,
        from_date: filters.from_date ? moment(filters.from_date).format('YYYY-MM-DD') : undefined,
        to_date: filters.to_date ? moment(filters.to_date).format('YYYY-MM-DD') : undefined
      };
      
      const response = await getUsageAnalytics(params);
      console.log('Analytics API response:', response.data);
      
      const analyticsData = response.data || [];
      setAnalytics(analyticsData);
      setHasData(analyticsData.length > 0);
      return analyticsData;
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load analytics data. Please try again.');
      setHasData(false);
      return [];
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
      console.log('Summary API response:', response.data);
      
      // Ensure we have valid data, use empty values if not
      const validData = response.data || {
        total_claims: 0,
        total_billable_amount: '0.00',
        companies: [],
        date_range: {}
      };
      
      setSummary(validData);
      setHasData(validData.companies && validData.companies.length > 0);
      return validData;
    } catch (err) {
      console.error('Error fetching summary:', err);
      setError('Failed to load summary data. Please try again.');
      setHasData(false);
      return {
        total_claims: 0,
        total_billable_amount: '0.00',
        companies: [],
        date_range: {}
      };
    }
  };

  // Prepare calendar data for heatmap view
  const prepareCalendarData = () => {
    // Group analytics by date for calendar/heatmap view
    const calendarMap = {};
    
    if (!analytics || analytics.length === 0) {
      console.log('No analytics data available for calendar preparation');
      return;
    }
    
    analytics.forEach(item => {
      if (!calendarMap[item.date]) {
        calendarMap[item.date] = {
          date: item.date,
          count: 0,
          companies: {}
        };
      }
      
      calendarMap[item.date].count += item.claims_count;
      
      if (!calendarMap[item.date].companies[item.company_name]) {
        calendarMap[item.date].companies[item.company_name] = 0;
      }
      
      calendarMap[item.date].companies[item.company_name] += item.claims_count;
    });
    
    console.log('Prepared calendar data:', Object.keys(calendarMap).length, 'dates');
    setCalendarData(calendarMap);
  };

  // Prepare time series data from analytics data
  const prepareTimeSeriesData = () => {
    // Group analytics by date and count claims for time series chart
    const groupedByDate = {};
    
    if (!analytics || analytics.length === 0) {
      console.log('No analytics data available for time series preparation');
      return;
    }
    
    analytics.forEach(item => {
      if (!groupedByDate[item.date]) {
        groupedByDate[item.date] = {
          date: item.date,
          total: 0,
          companies: {}
        };
      }
      
      groupedByDate[item.date].total += item.claims_count;
      
      if (!groupedByDate[item.date].companies[item.company_name]) {
        groupedByDate[item.date].companies[item.company_name] = 0;
      }
      
      groupedByDate[item.date].companies[item.company_name] += item.claims_count;
    });
    
    // Convert grouped data to array and sort by date
    const timeSeriesArray = Object.values(groupedByDate);
    timeSeriesArray.sort((a, b) => a.date.localeCompare(b.date));
    
    // Add company-specific counts as separate properties
    timeSeriesArray.forEach(item => {
      if (companies && companies.length > 0) {
        companies.forEach(company => {
          const companyName = company.name || '';
          item[companyName] = (item.companies[companyName] || 0);
        });
      }
    });
    
    console.log('Prepared time series data:', timeSeriesArray);
    setTimeSeriesData(timeSeriesArray);
  };

  // Calculate top clients based on usage and revenue
  const calculateTopClients = () => {
    if (summary.companies && summary.companies.length > 0) {
      // Sort companies by claims count or total amount
      const sortedByUsage = [...summary.companies].sort((a, b) => 
        b.claims_count - a.claims_count
      );
      
      const sortedByRevenue = [...summary.companies].sort((a, b) => 
        parseFloat(b.total_amount) - parseFloat(a.total_amount)
      );
      
      // Get top 5 for each category
      const topByUsage = sortedByUsage.slice(0, 5).map((company, index) => ({
        ...company,
        rank: index + 1,
        type: 'usage'
      }));
      
      const topByRevenue = sortedByRevenue.slice(0, 5).map((company, index) => ({
        ...company,
        rank: index + 1,
        type: 'revenue'
      }));
      
      setTopClients({
        byUsage: topByUsage,
        byRevenue: topByRevenue
      });
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
      const analyticsData = await fetchAnalytics();
      const summaryData = await fetchSummary();
      
      // Update derivative data
      prepareTimeSeriesData();
      calculateTopClients();
      prepareCalendarData();
      
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
      title: 'Claims Count',
      dataIndex: 'claims_count',
      key: 'claims_count',
      sorter: (a, b) => a.claims_count - b.claims_count
    },
    {
      title: 'Approved',
      dataIndex: 'approved_claims',
      key: 'approved_claims',
      sorter: (a, b) => a.approved_claims - b.approved_claims
    },
    {
      title: 'Rejected',
      dataIndex: 'rejected_claims',
      key: 'rejected_claims',
      sorter: (a, b) => a.rejected_claims - b.rejected_claims
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
      title: 'Claims',
      dataIndex: 'claims_count',
      key: 'claims_count'
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

  // No billing rate columns as per requirements

  // Top clients columns
  const topClientsColumns = [
    {
      title: 'Rank',
      dataIndex: 'rank',
      key: 'rank',
      render: (text) => <Tag color="gold">{text}</Tag>
    },
    {
      title: 'Company',
      dataIndex: 'company_name',
      key: 'company_name'
    },
    {
      title: 'Claims',
      dataIndex: 'claims_count',
      key: 'claims_count'
    },
    {
      title: 'Total Revenue (£)',
      dataIndex: 'total_amount',
      key: 'total_amount',
      render: (text) => `£${parseFloat(text).toFixed(2)}`
    }
  ];

  // No billing rate editing functions - dashboard is read-only per requirements

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
            claims_count: 0,
            approved_claims: 0,
            rejected_claims: 0,
            total_cost: 0
          };
        }
        
        companyGroups[item.company_name].claims_count += item.claims_count;
        companyGroups[item.company_name].approved_claims += item.approved_claims;
        companyGroups[item.company_name].rejected_claims += item.rejected_claims;
        companyGroups[item.company_name].total_cost += parseFloat(item.total_cost);
      });
      
      return Object.values(companyGroups);
    }
  };

  // Function to get color intensity based on claim count
  const getColorIntensity = (count) => {
    // Define thresholds for different colors
    if (count === 0) return '#f0f0f0'; // No claims
    if (count < 5) return '#e6f7ff';   // Few claims
    if (count < 10) return '#91d5ff';  // Some claims
    if (count < 20) return '#40a9ff';  // Moderate claims
    if (count < 50) return '#1890ff';  // Many claims
    return '#096dd9';                  // Lots of claims
  };
  
  // Format date for calendar display
  const formatCalendarData = (date) => {
    const dateString = date.format('YYYY-MM-DD');
    const data = calendarData[dateString];
    
    if (!data || data.count === 0) {
      return null;
    }
    
    return (
      <div>
        <Badge 
          count={data.count} 
          style={{ 
            backgroundColor: getColorIntensity(data.count)
          }} 
        />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Title level={2} className="text-gray-900 dark:text-white m-0">Usage Analytics Dashboard</Title>
        <Space>
          <Radio.Group 
            value={viewMode} 
            onChange={(e) => setViewMode(e.target.value)}
            buttonStyle="solid"
          >
            <Radio.Button value="overview"><BarChartOutlined /> Overview</Radio.Button>
            <Radio.Button value="timeseries"><LineChartOutlined /> Time Series</Radio.Button>
            <Radio.Button value="topcompanies"><TrophyOutlined /> Top Companies</Radio.Button>
            <Radio.Button value="calendar"><CalendarOutlined /> Calendar View</Radio.Button>
          </Radio.Group>
        </Space>
      </div>
      
      {error && (
        <Alert message={error} type="error" showIcon closable />
      )}
      
      {/* Filters */}
      <Card title={<span><FilterOutlined /> Filters</span>} className="dark:bg-gray-800 mb-4">
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
      
      {/* Overview View */}
      {viewMode === 'overview' && (
        <>
          {/* Summary Statistics */}
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8}>
              <Card className="dark:bg-gray-800">
                <Statistic
                  title="Total Claims"
                  value={summary.total_claims || 0}
                  valueStyle={{ color: '#3f8600' }}
                />
              </Card>
            </Col>
            
            <Col xs={24} sm={12} md={8}>
              <Card className="dark:bg-gray-800">
                <Statistic
                  title="Total Billable Amount"
                  value={parseFloat(summary.total_billable_amount || 0).toFixed(2)}
                  prefix="£"
                  valueStyle={{ color: '#3f8600' }}
                />
              </Card>
            </Col>
            
            <Col xs={24} sm={12} md={8}>
              <Card className="dark:bg-gray-800">
                <Statistic
                  title="Insurance Companies"
                  value={(summary.companies && summary.companies.length) || 0}
                  valueStyle={{ color: '#3f8600' }}
                />
              </Card>
            </Col>
          </Row>
          
          {/* Total Claims per Insurance Company */}
          <Card title={<span>Total Claims per Insurance Company</span>} className="dark:bg-gray-800 mt-4">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <Spin size="large" />
              </div>
            ) : hasData ? (
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                  <Table
                    columns={summaryColumns.filter(col => col.key !== 'rate_per_claim')}
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
                            <strong>{summary.total_claims}</strong>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={2}>
                            <strong>£{parseFloat(summary.total_billable_amount).toFixed(2)}</strong>
                          </Table.Summary.Cell>
                        </Table.Summary.Row>
                      </Table.Summary>
                    )}
                  />
                </Col>
                
                <Col xs={24} lg={12}>
                  {summary.companies && summary.companies.length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart
                        data={summary.companies}
                        margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="company_name" 
                          angle={-45} 
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis />
                        <Tooltip 
                          formatter={(value, name) => {
                            if (name === 'claims_count') {
                              return [value, 'Claims'];
                            }
                            return [value, 'Claims'];
                          }} 
                        />
                        <Legend />
                        <Bar dataKey="claims_count" name="Claims" fill="#0088FE" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center p-8 text-gray-500 dark:text-gray-400">
                      No data available for the selected filters. Please adjust your filters or check that there is data in the system.
                    </div>
                  )}
                </Col>
              </Row>
            ) : (
              <Empty 
                description={
                  <span>
                    No claims found for this time period. Only real claims submitted by users will appear here.
                  </span>
                }
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </Card>
          
          {/* Detailed Analytics */}
          <Card title="Detailed Analytics" className="dark:bg-gray-800 mt-4">
            {hasData ? (
              <Table
                columns={columns}
                dataSource={analytics}
                rowKey={(record) => `${record.company_id}-${record.date}`}
                loading={loading}
                pagination={{ pageSize: 10 }}
                scroll={{ x: 'max-content' }}
              />
            ) : (
              <Empty 
                description={
                  <span>
                    No claims found for this time period. Only real claims submitted by users will appear here.
                  </span>
                }
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </Card>
        </>
      )}
      
      {/* Time Series View */}
      {viewMode === 'timeseries' && (
        <Card title={<span>Claims Over Time</span>} className="dark:bg-gray-800 mt-4">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Spin size="large" />
            </div>
          ) : timeSeriesData.length > 0 ? (
            <>
              <div className="mb-4">
                <Text>This visualization shows the trend of claims submitted by insurance companies over time. Use the filters above to adjust the time period.</Text>
              </div>
              <ResponsiveContainer width="100%" height={500}>
                <AreaChart
                  data={timeSeriesData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    angle={-45} 
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    name="Total Claims" 
                    stroke="#8884d8" 
                    fill="#8884d8" 
                    fillOpacity={0.3}
                  />
                  
                  {/* Add lines for each company if no specific company is selected */}
                  {!filters.company_id && companies.slice(0, 5).map((company, index) => (
                    <Area
                      key={company.id}
                      type="monotone"
                      dataKey={company.name}
                      name={company.name}
                      stroke={CHART_COLORS[index % CHART_COLORS.length]}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                      fillOpacity={0.1}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </>
          ) : (
            <Empty 
              description={
                <span>
                  No claims found for this time period. Only real claims submitted by users will appear here.
                </span>
              }
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
        </Card>
      )}
      
      {/* Top Companies View */}
      {viewMode === 'topcompanies' && (
        <Card 
          title={<span><TrophyOutlined /> Top Insurance Companies by Claim Volume</span>} 
          className="dark:bg-gray-800 mt-4"
        >
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Spin size="large" />
            </div>
          ) : hasData && topClients && topClients.byUsage ? (
            <>
              <div className="mb-4">
                <Text>This shows the ranking of insurance companies by total number of claims submitted within the selected time period.</Text>
              </div>
              <Table
                columns={[
                  {
                    title: 'Rank',
                    dataIndex: 'rank',
                    key: 'rank',
                    render: (text) => <Tag color="gold">{text}</Tag>
                  },
                  {
                    title: 'Company',
                    dataIndex: 'company_name',
                    key: 'company_name'
                  },
                  {
                    title: 'Claims Count',
                    dataIndex: 'claims_count',
                    key: 'claims_count',
                    sorter: (a, b) => a.claims_count - b.claims_count,
                    defaultSortOrder: 'descend'
                  },
                  {
                    title: 'Percentage of Total',
                    key: 'percentage',
                    render: (_, record) => {
                      const percentage = (record.claims_count / summary.total_claims * 100).toFixed(1);
                      return `${percentage}%`;
                    }
                  }
                ]}
                dataSource={topClients.byUsage.map((item, index) => ({
                  ...item,
                  key: index
                }))}
                pagination={false}
              />
              
              <div className="mt-8">
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart
                    data={topClients.byUsage}
                    margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis 
                      type="category" 
                      dataKey="company_name" 
                      width={150}
                    />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="claims_count" name="Claims" fill="#0088FE" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <Empty 
              description={
                <span>
                  No claims found for this time period. Only real claims submitted by users will appear here.
                </span>
              }
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
        </Card>
      )}
      
      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <Card title={<span><CalendarOutlined /> Claim Submission Calendar</span>} className="dark:bg-gray-800 mt-4">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Spin size="large" />
            </div>
          ) : hasData && Object.keys(calendarData).length > 0 ? (
            <>
              <div className="mb-4">
                <Text>This calendar heat map shows real claim submission frequency by day. Darker color indicates more claims.</Text>
              </div>
              <Calendar 
                fullscreen={true}
                dateCellRender={formatCalendarData}
                className="usage-calendar"
              />
              <div className="mt-4 flex justify-center">
                <div className="flex items-center">
                  <span className="mr-2">Legend:</span>
                  <span className="px-2 py-1 mr-2" style={{ backgroundColor: '#e6f7ff' }}>1-4 claims</span>
                  <span className="px-2 py-1 mr-2" style={{ backgroundColor: '#91d5ff' }}>5-9 claims</span>
                  <span className="px-2 py-1 mr-2" style={{ backgroundColor: '#40a9ff' }}>10-19 claims</span>
                  <span className="px-2 py-1 mr-2" style={{ backgroundColor: '#1890ff' }}>20-49 claims</span>
                  <span className="px-2 py-1" style={{ backgroundColor: '#096dd9', color: 'white' }}>50+ claims</span>
                </div>
              </div>
            </>
          ) : (
            <Empty 
              description={
                <span>
                  No claims found for this time period. Only real claims submitted by users will appear here.
                </span>
              }
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
        </Card>
      )}
    </div>
  );
};

export default UsageAnalytics;