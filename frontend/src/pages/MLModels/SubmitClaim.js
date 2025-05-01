import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { DatePicker, Select, Upload, Input, Form, message, Steps, Button, Radio, InputNumber, Checkbox, Divider } from 'antd';
import { UploadOutlined, CheckCircleOutlined, FileDoneOutlined, FileTextOutlined, InfoCircleOutlined, CarOutlined, MedicineBoxOutlined, DollarOutlined } from '@ant-design/icons';
import { ThemeContext } from '../../context/ThemeContext';
import { apiClient } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';

const { TextArea } = Input;
const { Option } = Select;
const { Step } = Steps;

const SubmitClaim = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [formValues, setFormValues] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const { darkMode } = useContext(ThemeContext);
  const { user } = useAuth();

  const steps = [
    {
      title: 'Incident Details',
      icon: <InfoCircleOutlined />,
      description: 'Accident information',
    },
    {
      title: 'Vehicle & Conditions',
      icon: <CarOutlined />,
      description: 'Vehicle details',
    },
    {
      title: 'Injury Information',
      icon: <MedicineBoxOutlined />,
      description: 'Health impact',
    },
    {
      title: 'Financial Impact',
      icon: <DollarOutlined />,
      description: 'Expenses & losses',
    },
    {
      title: 'Review & Submit',
      icon: <CheckCircleOutlined />,
      description: 'Finalize claim',
    }
  ];

  const goToNextStep = async () => {
    try {
      const values = await form.validateFields();
      setFormValues({ ...formValues, ...values });
      setCurrentStep(currentStep + 1);
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const goToPreviousStep = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    
    try {
      const allValues = { ...formValues, ...await form.validateFields() };
      
      // Convert Moment.js objects to formatted strings for API submission
      const claimData = {
        title: `${allValues.AccidentType} Claim - ${allValues.AccidentDate?.format('MMM D, YYYY')}`,
        description: allValues.AccidentDescription || "Single Vehicle Incident",
        amount: allValues.TotalClaimEstimate || 0,
        user: user?.id,
        claim_data: {
          // Personal & General Info
          Gender: allValues.Gender,
          DriverAge: allValues.DriverAge,
          NumberOfPassengers: allValues.NumberOfPassengers,
          
          // Accident Info
          AccidentType: allValues.AccidentType,
          AccidentDate: allValues.AccidentDate ? allValues.AccidentDate.format('YYYY-MM-DD') : null,
          ClaimDate: allValues.ClaimDate ? allValues.ClaimDate.format('YYYY-MM-DD') : null,
          AccidentDescription: allValues.AccidentDescription,
          PoliceReportFiled: allValues.PoliceReportFiled,
          WitnessPresent: allValues.WitnessPresent,
          WeatherConditions: allValues.WeatherConditions,
          
          // Vehicle Info
          VehicleType: allValues.VehicleType,
          VehicleAge: allValues.VehicleAge,
          
          // Injury Details
          DominantInjury: allValues.DominantInjury,
          InjuryDescription: allValues.InjuryDescription,
          InjuryPrognosis: allValues.Injury_Prognosis,
          Whiplash: allValues.Whiplash,
          MinorPsychologicalInjury: allValues.Minor_Psychological_Injury,
          
          // Special Damages
          SpecialHealthExpenses: allValues.SpecialHealthExpenses || 0,
          SpecialMedications: allValues.SpecialMedications || 0,
          SpecialRehabilitation: allValues.SpecialRehabilitation || 0,
          SpecialTherapy: allValues.SpecialTherapy || 0,
          SpecialEarningsLoss: allValues.SpecialEarningsLoss || 0,
          SpecialUsageLoss: allValues.SpecialUsageLoss || 0,
          SpecialAssetDamage: allValues.SpecialAssetDamage || 0,
          SpecialLoanerVehicle: allValues.SpecialLoanerVehicle || 0,
          SpecialTripCosts: allValues.SpecialTripCosts || 0,
          SpecialJourneyExpenses: allValues.SpecialJourneyExpenses || 0,
          SpecialAdditionalInjury: allValues.SpecialAdditionalInjury || "",
          SpecialFixes: allValues.SpecialFixes || 0,
          
          // Adjustments
          SpecialReduction: allValues.SpecialReduction || 0,
          SpecialOverage: allValues.SpecialOverage || 0,
          
          // General Damages
          GeneralRest: allValues.GeneralRest || 0,
          GeneralFixed: allValues.GeneralFixed || 0,
          GeneralUplift: allValues.GeneralUplift || 0,
          
          // Other
          ExceptionalCircumstances: allValues.Exceptional_Circumstances || ""
        }
      };

      const response = await apiClient.post('/claims/', claimData);
      
      if (response.data) {
        message.success('Insurance claim submitted successfully!');
        setSubmitted(true);
        
        // Delay navigation to show success message
        setTimeout(() => {
          form.resetFields();
          navigate('/predictions');
        }, 2000);
      } else {
        throw new Error('Failed to submit claim: No response data');
      }
    } catch (error) {
      console.error('Failed to submit claim:', error);
      message.error(error.response?.data?.detail || error.response?.data?.message || error.message || 'Failed to submit claim');
    } finally {
      setLoading(false);
    }
  };

  // Render current step form fields
  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Incident Details
        return (
          <div className="text-gray-800 dark:text-gray-100">
            <Form.Item
              name="AccidentType"
              label="Accident Type"
              rules={[{ required: true, message: 'Please select accident type' }]}
            >
              <Select placeholder="Select accident type" className="text-gray-800 dark:text-gray-100">
                <Option value="Rear end">Rear End</Option>
                <Option value="Rear end - Clt pushed into next vehicle">Rear End - Client Pushed into Next Vehicle</Option>
                <Option value="Rear end - 3 car - Clt at front">Rear End - 3 Car - Client at Front</Option>
                <Option value="Other side pulled out of side road">Other Side Pulled Out of Side Road</Option>
                <Option value="Other side turned across Clt's path">Other Side Turned Across Client's Path</Option>
                <Option value="Other side changed lanes and collided with clt's vehicle">Other Side Changed Lanes and Collided</Option>
                <Option value="Other side reversed into Clt's vehicle">Other Side Reversed into Client's Vehicle</Option>
                <Option value="Other side pulled on to roundabout">Other Side Pulled onto Roundabout</Option>
                <Option value="Other side drove on wrong side of the road">Other Side Drove on Wrong Side</Option>
                <Option value="Other">Other</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="AccidentDate"
              label="Date of Accident"
              rules={[{ required: true, message: 'Please provide the accident date' }]}
            >
              <DatePicker className="w-full dark:bg-gray-700 dark:text-gray-100" />
            </Form.Item>

            <Form.Item
              name="ClaimDate"
              label="Date of Claim Filing"
              rules={[{ required: true, message: 'Please provide the claim filing date' }]}
            >
              <DatePicker className="w-full dark:bg-gray-700 dark:text-gray-100" />
            </Form.Item>

            <Form.Item
              name="DriverAge"
              label="Driver Age"
              rules={[{ required: true, message: 'Please enter driver age' }]}
            >
              <InputNumber min={16} max={100} className="w-full dark:bg-gray-700 dark:text-gray-100" />
            </Form.Item>

            <Form.Item
              name="Gender"
              label="Gender"
              rules={[{ required: true, message: 'Please select gender' }]}
            >
              <Radio.Group className="dark:text-gray-100">
                <Radio value="Male">Male</Radio>
                <Radio value="Female">Female</Radio>
                <Radio value="Other">Other</Radio>
                <Radio value="PreferNotToSay">Prefer not to say</Radio>
              </Radio.Group>
            </Form.Item>

            <Form.Item
              name="NumberOfPassengers"
              label="Number of Passengers"
              rules={[{ required: true, message: 'Please enter number of passengers' }]}
            >
              <InputNumber min={0} max={20} className="w-full dark:bg-gray-700 dark:text-gray-100" />
            </Form.Item>

            <Form.Item
              name="AccidentDescription"
              label="Accident Description"
              rules={[{ required: true, message: 'Please provide a description of what happened' }]}
            >
              <TextArea 
                rows={4} 
                placeholder="Provide a detailed description of how the accident occurred"
                className="dark:bg-gray-700 dark:text-gray-100"
              />
            </Form.Item>

            <Form.Item
              name="PoliceReportFiled"
              label="Police Report Filed"
              rules={[{ required: true, message: 'Please indicate if a police report was filed' }]}
            >
              <Radio.Group className="dark:text-gray-100">
                <Radio value={true}>Yes</Radio>
                <Radio value={false}>No</Radio>
              </Radio.Group>
            </Form.Item>

            <Form.Item
              name="WitnessPresent"
              label="Witnesses Present"
              rules={[{ required: true, message: 'Please indicate if witnesses were present' }]}
            >
              <Radio.Group className="dark:text-gray-100">
                <Radio value={true}>Yes</Radio>
                <Radio value={false}>No</Radio>
              </Radio.Group>
            </Form.Item>
          </div>
        );
      case 1: // Vehicle & Conditions
        return (
          <div className="text-gray-800 dark:text-gray-100">
            <Form.Item
              name="Vehicle_Type"
              label="Vehicle Type"
              rules={[{ required: true, message: 'Please select vehicle type' }]}
            >
              <Select placeholder="Select vehicle type">
                <Option value="Car">Car</Option>
                <Option value="Motorcycle">Motorcycle</Option>
                <Option value="Truck">Truck</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="VehicleAge"
              label="Vehicle Age (Years)"
              rules={[{ required: true, message: 'Please enter vehicle age' }]}
            >
              <InputNumber min={0} max={50} className="w-full dark:bg-gray-700 dark:text-gray-100" />
            </Form.Item>

            <Form.Item
              name="Weather_Conditions"
              label="Weather Conditions"
              rules={[{ required: true, message: 'Please select weather conditions' }]}
            >
              <Select placeholder="Select weather conditions">
                <Option value="Sunny">Sunny</Option>
                <Option value="Rainy">Rainy</Option>
                <Option value="Snowy">Snowy</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="SpecialAssetDamage"
              label="Value of Vehicle Damage (£)"
              rules={[{ required: true, message: 'Please estimate vehicle damage value' }]}
            >
              <InputNumber 
                min={0}
                step={100}
                prefix="£"
                className="w-full dark:bg-gray-700 dark:text-gray-100"
              />
            </Form.Item>

            <Form.Item
              name="SpecialFixes"
              label="Estimated Repair Costs (£)"
            >
              <InputNumber 
                min={0}
                step={100}
                prefix="£"
                className="w-full dark:bg-gray-700 dark:text-gray-100"
              />
            </Form.Item>

            <Form.Item
              name="SpecialLoanerVehicle"
              label="Rental/Loaner Vehicle Costs (£)"
            >
              <InputNumber 
                min={0}
                step={10}
                prefix="£"
                className="w-full dark:bg-gray-700 dark:text-gray-100"
              />
            </Form.Item>

            <Form.Item
              name="Exceptional_Circumstances"
              label="Exceptional Circumstances"
              rules={[{ required: true }]}
            >
              <Select placeholder="Select yes/no">
                <Option value="Yes">Yes</Option>
                <Option value="No">No</Option>
              </Select>
            </Form.Item>
          </div>
        );
      case 2: // Injury Information
        return (
          <div className="text-gray-800 dark:text-gray-100">
            <Form.Item
              name="Dominant_injury"
              label="Dominant Injury Location"
              rules={[{ required: true, message: 'Please select dominant injury location' }]}
            >
              <Select placeholder="Select injury location">
                <Option value="Arms">Arms</Option>
                <Option value="Legs">Legs</Option>
                <Option value="Hips">Hips</Option>
                <Option value="Multiple">Multiple</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="InjuryDescription"
              label="Injury Description"
              rules={[{ required: true, message: 'Please describe the injuries' }]}
            >
              <TextArea 
                rows={4} 
                placeholder="Provide a detailed description of all injuries sustained"
                className="dark:bg-gray-700 dark:text-gray-100"
              />
            </Form.Item>

            <Form.Item
              name="Injury_Prognosis"
              label="Injury Prognosis"
              rules={[{ required: true, message: 'Please select injury prognosis' }]}
            >
              <Select placeholder="Select prognosis" className="text-gray-800 dark:text-gray-100">
                <Option value="A. 1 month">1 month</Option>
                <Option value="B. 2 months">2 months</Option>
                <Option value="C. 3 months">3 months</Option>
                <Option value="D. 4 months">4 months</Option>
                <Option value="E. 5 months">5 months</Option>
                <Option value="F. 6 months">6 months</Option>
                <Option value="G. 7 months">7 months</Option>
                <Option value="H. 8 months">8 months</Option>
                <Option value="I. 9 months">9 months</Option>
                <Option value="J. 10 months">10 months</Option>
                <Option value="K. 11 months">11 months</Option>
                <Option value="L. 12 months">12 months</Option>
                <Option value="O. 15 months">15 months</Option>
                <Option value="R. 18 months">18 months</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="Whiplash"
              label="Whiplash"
              rules={[{ required: true }]}
            >
              <Select placeholder="Select yes/no">
                <Option value="Yes">Yes</Option>
                <Option value="No">No</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="Minor_Psychological_Injury"
              label="Minor Psychological Injury"
              rules={[{ required: true }]}
            >
              <Select placeholder="Select yes/no">
                <Option value="Yes">Yes</Option>
                <Option value="No">No</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="SpecialAdditionalInjury"
              label="Additional Injury Details"
            >
              <TextArea 
                rows={3} 
                placeholder="Any additional details about injuries or complications"
                className="dark:bg-gray-700 dark:text-gray-100"
              />
            </Form.Item>
          </div>
        );
      case 3: // Financial Impact
        return (
          <div className="text-gray-800 dark:text-gray-100">
            <Divider orientation="left">Medical Expenses</Divider>
            
            <Form.Item
              name="SpecialHealthExpenses"
              label="Medical Treatment Costs (£)"
              rules={[{ required: true, message: 'Please enter medical treatment costs' }]}
            >
              <InputNumber 
                min={0}
                step={100}
                prefix="£"
                className="w-full dark:bg-gray-700 dark:text-gray-100"
              />
            </Form.Item>

            <Form.Item
              name="SpecialMedications"
              label="Medication Costs (£)"
            >
              <InputNumber 
                min={0}
                step={10}
                prefix="£"
                className="w-full dark:bg-gray-700 dark:text-gray-100"
              />
            </Form.Item>

            <Form.Item
              name="SpecialRehabilitation"
              label="Rehabilitation Costs (£)"
            >
              <InputNumber 
                min={0}
                step={100}
                prefix="£"
                className="w-full dark:bg-gray-700 dark:text-gray-100"
              />
            </Form.Item>

            <Form.Item
              name="SpecialTherapy"
              label="Therapy Costs (£)"
            >
              <InputNumber 
                min={0}
                step={100}
                prefix="£"
                className="w-full dark:bg-gray-700 dark:text-gray-100"
              />
            </Form.Item>

            <Divider orientation="left">Income & Usage Loss</Divider>

            <Form.Item
              name="SpecialEarningsLoss"
              label="Lost Earnings (£)"
            >
              <InputNumber 
                min={0}
                step={100}
                prefix="£"
                className="w-full dark:bg-gray-700 dark:text-gray-100"
              />
            </Form.Item>

            <Form.Item
              name="SpecialUsageLoss"
              label="Usage Loss (£)"
              tooltip="Value of inability to use property or vehicle"
            >
              <InputNumber 
                min={0}
                step={100}
                prefix="£"
                className="w-full dark:bg-gray-700 dark:text-gray-100"
              />
            </Form.Item>

            <Divider orientation="left">Travel & Additional Expenses</Divider>

            <Form.Item
              name="SpecialTripCosts"
              label="Trip Cancellation Costs (£)"
            >
              <InputNumber 
                min={0}
                step={100}
                prefix="£"
                className="w-full dark:bg-gray-700 dark:text-gray-100"
              />
            </Form.Item>

            <Form.Item
              name="SpecialJourneyExpenses"
              label="Travel Expenses for Medical Treatment (£)"
            >
              <InputNumber 
                min={0}
                step={10}
                prefix="£"
                className="w-full dark:bg-gray-700 dark:text-gray-100"
              />
            </Form.Item>

            <Divider orientation="left">Adjustments & General Damages</Divider>

            <Form.Item
              name="SpecialReduction"
              label="Cost Reductions/Deductions (£)"
              tooltip="Amount that should be deducted from total claim (e.g., covered by other insurance)"
            >
              <InputNumber 
                min={0}
                step={100}
                prefix="£"
                className="w-full dark:bg-gray-700 dark:text-gray-100"
              />
            </Form.Item>

            <Form.Item
              name="SpecialOverage"
              label="Additional Costs Not Listed (£)"
            >
              <InputNumber 
                min={0}
                step={100}
                prefix="£"
                className="w-full dark:bg-gray-700 dark:text-gray-100"
              />
            </Form.Item>

            <Form.Item
              name="GeneralRest"
              label="Pain and Suffering Estimate (£)"
              tooltip="Non-economic damages for pain, suffering, and emotional distress"
            >
              <InputNumber 
                min={0}
                step={1000}
                prefix="£"
                className="w-full dark:bg-gray-700 dark:text-gray-100"
              />
            </Form.Item>

            <Form.Item
              name="GeneralFixed"
              label="Fixed Compensation Claim (£)"
              tooltip="Standard compensation amount for your type of claim (if applicable)"
            >
              <InputNumber 
                min={0}
                step={1000}
                prefix="£"
                className="w-full dark:bg-gray-700 dark:text-gray-100"
              />
            </Form.Item>

            <Form.Item
              name="GeneralUplift"
              label="General Damages Uplift (£)"
              tooltip="Additional compensation for exceptional circumstances"
            >
              <InputNumber 
                min={0}
                step={500}
                prefix="£"
                className="w-full dark:bg-gray-700 dark:text-gray-100"
              />
            </Form.Item>

            <Form.Item
              name="TotalClaimEstimate"
              label="Total Claim Estimate (£)"
              rules={[{ required: true, message: 'Please enter the total claim estimate' }]}
            >
              <InputNumber 
                min={0}
                step={1000}
                prefix="£"
                className="w-full dark:bg-gray-700 dark:text-gray-100"
              />
            </Form.Item>
          </div>
        );
      case 4: // Review
        return (
          <div className="space-y-6">
            <div className="bg-blue-50 dark:bg-gray-700 p-6 rounded-lg border dark:border-gray-600">
              <h3 className="text-lg font-medium text-blue-800 dark:text-blue-300 mb-3">Accident Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Accident Type</p>
                  <p className="text-gray-900 dark:text-white">{formValues.AccidentType || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Accident Date</p>
                  <p className="text-gray-900 dark:text-white">{formValues.AccidentDate?.format('MMMM D, YYYY') || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Driver Age</p>
                  <p className="text-gray-900 dark:text-white">{formValues.DriverAge || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Vehicle Type</p>
                  <p className="text-gray-900 dark:text-white">{formValues.VehicleType || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Weather Conditions</p>
                  <p className="text-gray-900 dark:text-white">{formValues.WeatherConditions || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Police Report Filed</p>
                  <p className="text-gray-900 dark:text-white">{formValues.PoliceReportFiled ? 'Yes' : 'No'}</p>
                </div>
              </div>
              
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Accident Description</p>
                <p className="text-gray-900 dark:text-white whitespace-pre-line">{formValues.AccidentDescription || 'Not provided'}</p>
              </div>
            </div>
            
            <div className="bg-blue-50 dark:bg-gray-700 p-6 rounded-lg border dark:border-gray-600">
              <h3 className="text-lg font-medium text-blue-800 dark:text-blue-300 mb-3">Injury Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Dominant Injury</p>
                  <p className="text-gray-900 dark:text-white">{formValues.DominantInjury || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Whiplash</p>
                  <p className="text-gray-900 dark:text-white">{formValues.Whiplash ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Psychological Injury</p>
                  <p className="text-gray-900 dark:text-white">{formValues.Minor_Psychological_Injury ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Prognosis</p>
                  <p className="text-gray-900 dark:text-white">{formValues.Injury_Prognosis || 'Not provided'}</p>
                </div>
              </div>
              
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Injury Description</p>
                <p className="text-gray-900 dark:text-white whitespace-pre-line">{formValues.InjuryDescription || 'Not provided'}</p>
              </div>
            </div>
            
            <div className="bg-blue-50 dark:bg-gray-700 p-6 rounded-lg border dark:border-gray-600">
              <h3 className="text-lg font-medium text-blue-800 dark:text-blue-300 mb-3">Financial Summary</h3>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Medical Expenses:</span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    £{((formValues.SpecialHealthExpenses || 0) + 
                       (formValues.SpecialMedications || 0) + 
                       (formValues.SpecialRehabilitation || 0) + 
                       (formValues.SpecialTherapy || 0)).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Vehicle Damage:</span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    £{((formValues.SpecialAssetDamage || 0) + 
                       (formValues.SpecialFixes || 0)).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Lost Income:</span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    £{(formValues.SpecialEarningsLoss || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Other Expenses:</span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    £{((formValues.SpecialLoanerVehicle || 0) + 
                       (formValues.SpecialJourneyExpenses || 0) + 
                       (formValues.SpecialTripCosts || 0) + 
                       (formValues.SpecialUsageLoss || 0) + 
                       (formValues.SpecialOverage || 0)).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">General Damages:</span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    £{((formValues.GeneralRest || 0) + 
                       (formValues.GeneralFixed || 0) + 
                       (formValues.GeneralUplift || 0)).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Reductions:</span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    £{(formValues.SpecialReduction || 0).toLocaleString()}
                  </span>
                </div>
                <Divider className="my-2" />
                <div className="flex justify-between text-base font-bold">
                  <span className="text-gray-700 dark:text-gray-300">TOTAL CLAIM:</span>
                  <span className="text-green-600 dark:text-green-400">
                    £{(formValues.TotalClaimEstimate || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="bg-yellow-50 dark:bg-gray-800 p-6 rounded-lg border border-yellow-200 dark:border-yellow-900">
              <h3 className="text-lg font-medium text-yellow-800 dark:text-yellow-500 flex items-center">
                <InfoCircleOutlined className="mr-2" /> Legal Declaration
              </h3>
              <p className="mt-2 text-gray-700 dark:text-gray-300">
                By submitting this claim, you confirm that all information provided is true and accurate to the best of your knowledge.
                Submitting a fraudulent claim may result in denial of coverage and potential legal consequences.
              </p>
              <Form.Item 
                name="agreement" 
                valuePropName="checked"
                rules={[{ 
                  validator: (_, value) => 
                    value ? Promise.resolve() : Promise.reject(new Error('You must agree to the declaration before submitting')) 
                }]}
                className="mt-2 mb-0"
              >
                <div className="flex items-start mt-3">
                  <input
                    id="agreement"
                    name="agreement"
                    type="checkbox"
                    className="h-4 w-4 mt-1 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    onChange={e => form.setFieldsValue({ agreement: e.target.checked })}
                  />
                  <label htmlFor="agreement" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    I confirm that the information I've provided is accurate and complete
                  </label>
                </div>
              </Form.Item>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // Handle status after submission
  if (submitted) {
    return (
      <div className="max-w-5xl mx-auto my-12 bg-white dark:bg-gray-800 shadow-md rounded-xl overflow-hidden">
        <div className="bg-green-500 px-6 py-8 text-center">
          <CheckCircleOutlined className="text-6xl text-white animate-bounce" />
          <h1 className="text-2xl font-bold text-white mt-4">Claim Submitted Successfully!</h1>
          <p className="text-green-100 mt-2">Your claim has been received and is being processed</p>
        </div>
        <div className="p-6 text-center">
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            You will be redirected to the claims history page shortly...
          </p>
          <button
            onClick={() => navigate('/predictions')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            View Claims History
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`max-w-6xl mx-auto space-y-10 px-4 sm:px-6 lg:px-8 py-8 ${darkMode ? 'dark' : ''}`}>
      {/* Progress tracker */}
      <Steps 
        current={currentStep} 
        className="custom-steps py-8"
        responsive={true}
        size="large"
      >
        {steps.map(item => (
          <Step 
            key={item.title} 
            title={<span className="text-base font-medium dark:text-white">{item.title}</span>} 
            description={<span className="dark:text-gray-300">{item.description}</span>} 
            icon={<span className="flex items-center justify-center h-full w-full">{item.icon}</span>}
          />
        ))}
      </Steps>

      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden transition-all duration-300">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-5">
          <h1 className="text-2xl font-bold text-white">{steps[currentStep].title}</h1>
          <p className="text-blue-100 mt-2 text-lg">{steps[currentStep].description}</p>
        </div>
        
        <div className="p-8">
          <Form 
            form={form}
            layout="vertical"
            initialValues={formValues}
            className="space-y-8"
          >
            {renderStepContent()}
            
            <div className="flex justify-between mt-10">
              {currentStep > 0 && (
                <button
                  type="button"
                  onClick={goToPreviousStep}
                  className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 shadow-sm text-base font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Previous
                </button>
              )}
              
              {currentStep < steps.length - 1 ? (
                <button
                  type="button"
                  onClick={goToNextStep}
                  className="ml-auto px-6 py-2.5 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  {currentStep === steps.length - 2 ? 'Review Claim' : 'Next'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="ml-auto inline-flex items-center px-6 py-2.5 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    'Submit Claim'
                  )}
                </button>
              )}
            </div>
          </Form>
        </div>
      </div>
      
      {/* Tips panel - show only on first 4 steps, not on review page */}
      {currentStep < 4 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-8 mb-10">
          <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-5">Tips for This Step</h2>
          <ul className="space-y-4 text-gray-500 dark:text-gray-300">
            {currentStep === 0 && (
              <>
                <li className="flex">
                  <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Be as specific as possible about the accident circumstances</span>
                </li>
                <li className="flex">
                  <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>If police were involved, mention report numbers in your description</span>
                </li>
              </>
            )}
            {currentStep === 1 && (
              <>
                <li className="flex">
                  <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Include clear details about your vehicle's condition before and after the accident</span>
                </li>
                <li className="flex">
                  <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Weather conditions can significantly impact your claim evaluation</span>
                </li>
              </>
            )}
            {currentStep === 2 && (
              <>
                <li className="flex">
                  <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Include all injuries, even minor ones that developed after the accident</span>
                </li>
                <li className="flex">
                  <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Mention any medical diagnosis, treatment received, and ongoing care needs</span>
                </li>
              </>
            )}
            {currentStep === 3 && (
              <>
                <li className="flex">
                  <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Save receipts and documentation for all expenses related to your claim</span>
                </li>
                <li className="flex">
                  <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Include both current expenses and reasonable estimates for future costs</span>
                </li>
              </>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SubmitClaim;
