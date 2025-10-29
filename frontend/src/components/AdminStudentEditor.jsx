import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AdminStudentEditor = ({ studentId, onClose, initialTab = 'marks' }) => {
  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    fetchStudentData();
  }, [studentId]);

  const fetchStudentData = async () => {
    try {
      const response = await axios.get(`/api/admin/students/${studentId}/data`);
      setStudentData(response.data);
    } catch (error) {
      toast.error('Failed to fetch student data');
      console.error('Error fetching student data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarksUpdate = async () => {
    if (!studentData) return;
    
    setSaving(true);
    try {
      await axios.put(`/api/admin/students/${studentId}/marks`, {
        marks: studentData.marks
      });
      toast.success('Marks updated successfully');
    } catch (error) {
      toast.error('Failed to update marks');
      console.error('Error updating marks:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleAttendanceUpdate = async () => {
    if (!studentData) return;
    
    setSaving(true);
    try {
      await axios.put(`/api/admin/students/${studentId}/attendance`, {
        attendance: studentData.attendance
      });
      toast.success('Attendance updated successfully');
    } catch (error) {
      toast.error('Failed to update attendance');
      console.error('Error updating attendance:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleFeesUpdate = async () => {
    if (!studentData) return;
    
    setSaving(true);
    try {
      await axios.put(`/api/admin/students/${studentId}/fees`, studentData.fees);
      toast.success('Fees updated successfully');
    } catch (error) {
      toast.error('Failed to update fees');
      console.error('Error updating fees:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateMark = (index, field, value) => {
    const updatedMarks = [...studentData.marks];
    updatedMarks[index] = { ...updatedMarks[index], [field]: value };
    setStudentData({ ...studentData, marks: updatedMarks });
  };

  const updateAttendance = (index, field, value) => {
    const updatedAttendance = [...studentData.attendance];
    updatedAttendance[index] = { ...updatedAttendance[index], [field]: value };
    setStudentData({ ...studentData, attendance: updatedAttendance });
  };

  const updateFees = (field, value) => {
    setStudentData({
      ...studentData,
      fees: { ...studentData.fees, [field]: value }
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading student data...</p>
        </div>
      </div>
    );
  }

  if (!studentData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <p className="text-red-600">Failed to load student data</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Edit Student Data - {studentData.name}
              </h2>
              <p className="text-sm text-gray-600">
                Roll No: {studentData.roll_no} | Class: {studentData.class_name}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 py-3 border-b">
          <div className="flex space-x-1">
            {[
              { id: 'marks', label: 'Marks', count: studentData.marks.length },
              { id: 'attendance', label: 'Attendance', count: studentData.attendance.length },
              { id: 'fees', label: 'Fees', count: 1 }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'marks' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Marks (Max: 35 per subject)</h3>
                <button
                  onClick={handleMarksUpdate}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Marks'}
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Obtained Marks</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Marks</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Exam Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {studentData.marks.map((mark, index) => (
                      <tr key={mark.subject_id}>
                        <td className="px-4 py-3 text-sm text-gray-900">{mark.subject_name}</td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            max="35"
                            value={mark.obtained_marks}
                            onChange={(e) => updateMark(index, 'obtained_marks', parseInt(e.target.value) || 0)}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="1"
                            max="35"
                            value={mark.total_marks}
                            onChange={(e) => updateMark(index, 'total_marks', parseInt(e.target.value) || 35)}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {mark.exam_date ? new Date(mark.exam_date).toLocaleDateString() : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'attendance' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Attendance</h3>
                <button
                  onClick={handleAttendanceUpdate}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Attendance'}
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Present</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Classes</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Percentage</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {studentData.attendance.map((attendance, index) => (
                      <tr key={attendance.subject_id}>
                        <td className="px-4 py-3 text-sm text-gray-900">{attendance.subject_name}</td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            max={attendance.total_classes}
                            value={attendance.present_count}
                            onChange={(e) => updateAttendance(index, 'present_count', parseInt(e.target.value) || 0)}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="1"
                            value={attendance.total_classes}
                            onChange={(e) => updateAttendance(index, 'total_classes', parseInt(e.target.value) || 50)}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {attendance.attendance_percentage.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'fees' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Fees</h3>
                <button
                  onClick={handleFeesUpdate}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Fees'}
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={studentData.fees.total_amount || 0}
                    onChange={(e) => updateFees('total_amount', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Paid Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={studentData.fees.total_amount || 0}
                    value={studentData.fees.paid_amount || 0}
                    onChange={(e) => updateFees('paid_amount', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Due Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={studentData.fees.due_amount || 0}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Status
                  </label>
                  <select
                    value={studentData.fees.payment_status || 'Unpaid'}
                    onChange={(e) => updateFees('payment_status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Unpaid">Unpaid</option>
                    <option value="Partial">Partial</option>
                    <option value="Paid">Paid</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminStudentEditor;
