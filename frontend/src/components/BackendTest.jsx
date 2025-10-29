import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const BackendTest = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({});

  const testEndpoints = async () => {
    setLoading(true);
    const testResults = {};

    const endpoints = [
      { name: 'Dashboard Stats', url: '/api/dashboard/stats', method: 'GET' },
      { name: 'Departments', url: '/api/departments', method: 'GET' },
      { name: 'Classes', url: '/api/classes', method: 'GET' },
      { name: 'Subjects', url: '/api/subjects', method: 'GET' },
      { name: 'Students', url: '/api/students', method: 'GET' },
      { name: 'Events', url: '/events', method: 'GET' },
      { name: 'Announcements', url: '/api/announcements', method: 'GET' },
      { name: 'Chat (with sentiment)', url: '/chat', method: 'POST', data: { message: 'Hello!', user_id: 1, language_code: 'en' } }
    ];

    for (const endpoint of endpoints) {
      try {
        const response = endpoint.method === 'POST' 
          ? await axios.post(endpoint.url, endpoint.data)
          : await axios.get(endpoint.url);
        
        testResults[endpoint.name] = {
          status: 'success',
          statusCode: response.status,
          dataLength: Array.isArray(response.data) ? response.data.length : 1,
          message: 'Success'
        };
      } catch (error) {
        testResults[endpoint.name] = {
          status: 'error',
          statusCode: error.response?.status || 'No response',
          message: error.response?.data?.error || error.message
        };
      }
    }

    setResults(testResults);
    setLoading(false);
    toast.success('Backend test completed!');
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Backend Integration Test</h2>
      
      <button
        onClick={testEndpoints}
        disabled={loading}
        className="mb-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Test Backend Endpoints'}
      </button>

      <div className="space-y-2">
        {Object.entries(results).map(([name, result]) => (
          <div
            key={name}
            className={`p-3 rounded-lg border ${
              result.status === 'success'
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-900">{name}</span>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  result.status === 'success'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {result.statusCode}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {result.status === 'success' 
                ? `Data: ${result.dataLength} items`
                : result.message
              }
            </p>
          </div>
        ))}
      </div>

      {Object.keys(results).length === 0 && (
        <p className="text-gray-500 text-sm">Click the button above to test backend connectivity.</p>
      )}
    </div>
  );
};

export default BackendTest;
