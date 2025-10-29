import React, { useState, useEffect } from 'react';
import { 
  AcademicCapIcon, 
  CurrencyDollarIcon, 
  PhoneIcon, 
  CalendarIcon,
  DocumentTextIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

const AdmissionInfo = () => {
  const [admissionData, setAdmissionData] = useState(null);
  const [feeData, setFeeData] = useState(null);
  const [contactData, setContactData] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState('CSE');
  const [includeHostel, setIncludeHostel] = useState(false);
  const [includeTransport, setIncludeTransport] = useState(false);
  const [calculatedFees, setCalculatedFees] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdmissionData();
    fetchFeeData();
    fetchContactData();
  }, []);

  const fetchAdmissionData = async () => {
    try {
      const response = await fetch('/api/admission/info');
      const data = await response.json();
      if (data.success) {
        setAdmissionData(data.data);
      }
    } catch (error) {
      console.error('Error fetching admission data:', error);
      toast.error('Failed to load admission information');
    }
  };

  const fetchFeeData = async () => {
    try {
      const response = await fetch('/api/admission/fees');
      const data = await response.json();
      if (data.success) {
        setFeeData(data.data);
      }
    } catch (error) {
      console.error('Error fetching fee data:', error);
      toast.error('Failed to load fee structure');
    }
  };

  const fetchContactData = async () => {
    try {
      const response = await fetch('/api/admission/contacts');
      const data = await response.json();
      if (data.success) {
        setContactData(data.data);
      }
    } catch (error) {
      console.error('Error fetching contact data:', error);
      toast.error('Failed to load contact information');
    } finally {
      setLoading(false);
    }
  };

  const calculateFees = async () => {
    try {
      const params = new URLSearchParams({
        branch: selectedBranch,
        year: '1',
        includeHostel: includeHostel.toString(),
        includeTransport: includeTransport.toString()
      });

      const response = await fetch(`/api/admission/fees/calculate?${params}`);
      const data = await response.json();
      if (data.success) {
        setCalculatedFees(data.calculation);
        toast.success('Fee calculation completed');
      }
    } catch (error) {
      console.error('Error calculating fees:', error);
      toast.error('Failed to calculate fees');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          SKN Sinhgad College of Engineering
        </h1>
        <p className="text-xl text-gray-700 font-semibold mb-1">
          Korti, Pandharpur
        </p>
        <p className="text-sm text-gray-600 mb-2">
          Affiliated to: Punyashlok Ahilyadevi Holkar Solapur University | Approved by: AICTE, New Delhi
        </p>
        <p className="text-lg text-gray-600">
          Complete Admission Information for 2025-26
        </p>
      </div>

      {/* College Information */}
      {admissionData && (
        <div className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">College Details</h3>
              <div className="space-y-2 text-sm text-gray-700">
                <p><strong>Established:</strong> {admissionData.established_year}</p>
                <p><strong>Type:</strong> {admissionData.institute_type}</p>
                <p><strong>Campus Area:</strong> {admissionData.campus_area_acres} acres</p>
                <p><strong>Contact:</strong> {admissionData.contact.phone}</p>
                <p><strong>Email:</strong> {admissionData.contact.email}</p>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Placements</h3>
              <div className="space-y-2 text-sm text-gray-700">
                <p><strong>Average Package:</strong> ₹{admissionData.placement.averagePackage} LPA</p>
                <p><strong>Highest Package:</strong> ₹{admissionData.placement.highestPackage} LPA</p>
                <p className="mt-2"><strong>Top Recruiters:</strong></p>
                <p className="text-xs text-gray-600">{admissionData.placement.topRecruiters.join(', ')}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Branches Overview */}
      {admissionData && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <AcademicCapIcon className="h-8 w-8 mr-3 text-blue-500" />
            Available Branches
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {admissionData.branches.map((branch) => (
              <div key={branch.code} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {branch.name}
                </h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p><strong>Duration:</strong> {branch.duration}</p>
                  <p><strong>Intake:</strong> {branch.intake} students</p>
                  <p><strong>Entrance Exam:</strong> {branch.entranceExam}</p>
                  <p className="mt-3 text-gray-700">{branch.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Admission Process */}
      {admissionData && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <CalendarIcon className="h-8 w-8 mr-3 text-green-500" />
            Admission Process
          </h2>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="space-y-4">
              {admissionData.admissionProcess.map((step, index) => (
                <div key={index} className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-semibold">
                    {step.step}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{step.title}</h3>
                    <p className="text-gray-600">{step.description}</p>
                    <p className="text-sm text-blue-600 font-medium">{step.deadline}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Fee Calculator */}
      {feeData && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <CurrencyDollarIcon className="h-8 w-8 mr-3 text-yellow-500" />
            Fee Calculator
          </h2>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Calculate Your Fees</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Branch
                    </label>
                    <select
                      value={selectedBranch}
                      onChange={(e) => setSelectedBranch(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {Object.keys(feeData.feeStructure).map((branch) => (
                        <option key={branch} value={branch}>
                          {feeData.feeStructure[branch].branch}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={includeHostel}
                        onChange={(e) => setIncludeHostel(e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Include Hostel Fees</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={includeTransport}
                        onChange={(e) => setIncludeTransport(e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Include Transport Fees</span>
                    </label>
                  </div>
                  
                  <button
                    onClick={calculateFees}
                    className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors duration-200"
                  >
                    Calculate Fees
                  </button>
                </div>
              </div>
              
              {calculatedFees && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Fee Breakdown</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="space-y-2">
                      {Object.entries(calculatedFees.breakdown).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-sm text-gray-600 capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}:
                          </span>
                          <span className="text-sm font-medium">
                            ₹{value.toLocaleString()}
                          </span>
                        </div>
                      ))}
                      <hr className="my-2" />
                      <div className="flex justify-between font-semibold text-lg">
                        <span>Total Fees:</span>
                        <span>₹{calculatedFees.totalFees.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Required Documents */}
      {admissionData && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <DocumentTextIcon className="h-8 w-8 mr-3 text-purple-500" />
            Required Documents
          </h2>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {admissionData.requiredDocuments.map((doc, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">{doc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Contact Information */}
      {contactData && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <PhoneIcon className="h-8 w-8 mr-3 text-red-500" />
            Contact Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Admission Office</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p><strong>Phone:</strong> {contactData.admissionOffice.phone}</p>
                <p><strong>Email:</strong> {contactData.admissionOffice.email}</p>
                <p><strong>Address:</strong> {contactData.admissionOffice.address}</p>
                <p><strong>Working Hours:</strong> {contactData.admissionOffice.workingHours}</p>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Branch Coordinators</h3>
              <div className="space-y-3">
                {Object.entries(contactData.branchCoordinators).map(([branch, coordinator]) => (
                  <div key={branch} className="border-l-4 border-blue-500 pl-3">
                    <h4 className="font-medium text-gray-900">{branch}</h4>
                    <p className="text-sm text-gray-600">{coordinator.name}</p>
                    <p className="text-sm text-gray-600">{coordinator.phone}</p>
                    <p className="text-sm text-gray-600">{coordinator.email}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdmissionInfo;
