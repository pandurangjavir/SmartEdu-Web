import React from 'react';
import { ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';

const HODReports = () => {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg shadow-lg p-6 text-white">
        <h1 className="text-2xl font-bold">Teacher Reports</h1>
        <p className="text-primary-100 mt-1">Approve or request changes to submitted reports</p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold flex items-center"><ClipboardDocumentCheckIcon className="h-5 w-5 mr-2"/> Pending Approvals</h2>
        </div>
        <div className="p-6 text-sm text-gray-600">Coming soon: list with approve/reject workflow and comments.</div>
      </div>
    </div>
  );
};

export default HODReports; 