import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  AcademicCapIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';
import toast from 'react-hot-toast';
import EducationalAPI from '../services/api';

const MarksManagement = () => {
  const { user } = useAuth();
  const [marks, setMarks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingMark, setEditingMark] = useState(null);
  const [editForm, setEditForm] = useState({
    obtained_marks: '',
    total_marks: 35
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMarkForm, setNewMarkForm] = useState({
    student_id: '',
    subject_id: '',
    obtained_marks: '',
    total_marks: 35
  });

  useEffect(() => {
    fetchMarks();
  }, []);

  const fetchMarks = async () => {
    setLoading(true);
    try {
      const response = await EducationalAPI.getStudentMarks(user?.user_id || 1);
      if (response.success) {
        setMarks(response.data);
      } else {
        toast.error(response.error);
      }
    } catch (error) {
      toast.error('Failed to fetch marks');
      console.error('Error fetching marks:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateMarks = (obtainedMarks, totalMarks) => {
    const errors = [];
    
    if (obtainedMarks < 0) {
      errors.push('Marks cannot be negative');
    }
    
    if (obtainedMarks > 35) {
      errors.push('Maximum marks allowed is 35');
    }
    
    if (obtainedMarks > totalMarks) {
      errors.push(`Marks cannot exceed total marks (${totalMarks})`);
    }
    
    return errors;
  };

  const calculateGrade = (obtainedMarks, totalMarks) => {
    const percentage = (obtainedMarks / totalMarks) * 100;
    
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C+';
    if (percentage >= 40) return 'C';
    if (percentage >= 35) return 'D';
    return 'F';
  };

  const handleEditMark = (mark) => {
    setEditingMark(mark);
    setEditForm({
      obtained_marks: mark.obtained_marks,
      total_marks: mark.total_marks
    });
  };

  const handleSaveEdit = async () => {
    const errors = validateMarks(parseInt(editForm.obtained_marks), parseInt(editForm.total_marks));
    
    if (errors.length > 0) {
      toast.error(errors.join(', '));
      return;
    }

    try {
      const response = await EducationalAPI.updateStudentMarks(
        editingMark.student_id,
        editingMark.mark_id,
        {
          obtained_marks: parseInt(editForm.obtained_marks),
          total_marks: parseInt(editForm.total_marks)
        }
      );

      if (response.success) {
        toast.success('Marks updated successfully');
        setEditingMark(null);
        setEditForm({ obtained_marks: '', total_marks: 35 });
        fetchMarks();
      } else {
        toast.error(response.error);
      }
    } catch (error) {
      toast.error('Failed to update marks');
      console.error('Error updating marks:', error);
    }
  };

  const handleAddMark = async () => {
    const errors = validateMarks(parseInt(newMarkForm.obtained_marks), parseInt(newMarkForm.total_marks));
    
    if (errors.length > 0) {
      toast.error(errors.join(', '));
      return;
    }

    try {
      const response = await EducationalAPI.addStudentMarks(
        parseInt(newMarkForm.student_id),
        {
          subject_id: parseInt(newMarkForm.subject_id),
          obtained_marks: parseInt(newMarkForm.obtained_marks),
          total_marks: parseInt(newMarkForm.total_marks)
        }
      );

      if (response.success) {
        toast.success('Marks added successfully');
        setNewMarkForm({
          student_id: '',
          subject_id: '',
          obtained_marks: '',
          total_marks: 35
        });
        setShowAddForm(false);
        fetchMarks();
      } else {
        toast.error(response.error);
      }
    } catch (error) {
      toast.error('Failed to add marks');
      console.error('Error adding marks:', error);
    }
  };

  const getGradeColor = (grade) => {
    switch (grade) {
      case 'A+':
      case 'A':
        return 'text-green-600 bg-green-100';
      case 'B+':
      case 'B':
        return 'text-blue-600 bg-blue-100';
      case 'C+':
      case 'C':
        return 'text-yellow-600 bg-yellow-100';
      case 'D':
        return 'text-orange-600 bg-orange-100';
      case 'F':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Marks Management</h2>
          <p className="text-gray-600">Manage student marks (maximum 35 marks out of 35)</p>
        </div>
        {user?.role === 'admin' && (
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Add Marks
          </button>
        )}
      </div>

      {/* Minimum Marks Warning */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center">
          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2" />
          <div>
            <h3 className="text-sm font-medium text-yellow-800">Minimum Marks Policy</h3>
            <p className="text-sm text-yellow-700 mt-1">
              Maximum marks allowed is 35 (out of 35). Marks above 35 will be highlighted in red.
            </p>
          </div>
        </div>
      </div>

      {/* Add Marks Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Add New Marks</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Student ID</label>
              <input
                type="number"
                value={newMarkForm.student_id}
                onChange={(e) => setNewMarkForm({ ...newMarkForm, student_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter student ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject ID</label>
              <input
                type="number"
                value={newMarkForm.subject_id}
                onChange={(e) => setNewMarkForm({ ...newMarkForm, subject_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter subject ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Obtained Marks (Max: 35)</label>
              <input
                type="number"
                min="0"
                max="35"
                value={newMarkForm.obtained_marks}
                onChange={(e) => setNewMarkForm({ ...newMarkForm, obtained_marks: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter obtained marks"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Marks</label>
              <input
                type="number"
                value={newMarkForm.total_marks}
                onChange={(e) => setNewMarkForm({ ...newMarkForm, total_marks: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter total marks"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-3 mt-4">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddMark}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Add Marks
            </button>
          </div>
        </div>
      )}

      {/* Marks Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Student Marks</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Obtained Marks</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Marks</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exam Date</th>
                {user?.role === 'admin' && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {marks.map((mark) => (
                <tr key={mark.mark_id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{mark.student_id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {mark.subject_name || `Subject ${mark.subject_id}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {editingMark?.mark_id === mark.mark_id ? (
                      <input
                        type="number"
                        min="0"
                        max="35"
                        value={editForm.obtained_marks}
                        onChange={(e) => setEditForm({ ...editForm, obtained_marks: e.target.value })}
                        className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    ) : (
                      <span className={mark.obtained_marks > 35 ? 'text-red-600 font-semibold' : ''}>
                        {mark.obtained_marks}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {editingMark?.mark_id === mark.mark_id ? (
                      <input
                        type="number"
                        value={editForm.total_marks}
                        onChange={(e) => setEditForm({ ...editForm, total_marks: e.target.value })}
                        className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    ) : (
                      mark.total_marks
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {mark.exam_date || '-'}
                  </td>
                  {user?.role === 'admin' && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {editingMark?.mark_id === mark.mark_id ? (
                        <div className="flex space-x-2">
                          <button
                            onClick={handleSaveEdit}
                            className="text-green-600 hover:text-green-900"
                          >
                            <CheckIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setEditingMark(null)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEditMark(mark)}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {marks.length === 0 && (
        <div className="text-center py-12">
          <AcademicCapIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No marks found</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by adding marks for students.</p>
        </div>
      )}
    </div>
  );
};

export default MarksManagement;
