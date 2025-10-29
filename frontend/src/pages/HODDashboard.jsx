import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Toaster, toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import {
  UserIcon,
  DocumentTextIcon,
  AcademicCapIcon,
  ChartBarIcon,
  MegaphoneIcon,
  ClipboardDocumentListIcon,
  UsersIcon,
  CheckBadgeIcon,
  ClipboardDocumentCheckIcon,
  BriefcaseIcon,
  UserGroupIcon,
  ClockIcon,
  BuildingOfficeIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  EyeIcon,
  ChatBubbleLeftRightIcon,
  BellIcon
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

const Card = ({ icon: Icon, label, value }) => (
  <div className="bg-white rounded-lg shadow p-6">
    <div className="flex items-center">
      <div className="p-3 rounded-full bg-primary-100 mr-3">
        <Icon className="h-6 w-6 text-primary-600"/>
      </div>
      <div>
        <p className="text-sm text-gray-600">{label}</p>
        <p className="text-2xl font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  </div>
);

// DataTable Component
const DataTable = ({ data, type, onEdit, onDelete, onView }) => {
  const getColumns = () => {
    switch (type) {
      case 'students':
        return [
          { key: 'roll_no', label: 'Roll No' },
          { key: 'name', label: 'Name' },
          { key: 'email', label: 'Email' },
          { key: 'phone', label: 'Phone' },
          { key: 'admission_year', label: 'Admission Year' }
        ];
      case 'teachers':
        return [
          { key: 'name', label: 'Name' },
          { key: 'email', label: 'Email' },
          { key: 'phone', label: 'Phone' },
          { key: 'department', label: 'Department' },
          { key: 'designation', label: 'Designation' }
        ];
      case 'marks':
        return [
          { key: 'roll_no', label: 'Roll No' },
          { key: 'name', label: 'Name' },
          { key: 'total_marks', label: 'Total Marks' },
          { key: 'percentage', label: 'Percentage' },
          { key: 'grade', label: 'Grade' }
        ];
      case 'attendance':
        return [
          { key: 'roll_no', label: 'Roll No' },
          { key: 'name', label: 'Name' },
          { key: 'total_present', label: 'Present' },
          { key: 'total_classes', label: 'Total Classes' },
          { key: 'total_percentage', label: 'Percentage' }
        ];
      default:
        return [];
    }
  };

  const columns = getColumns();

  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          {columns.map((column) => (
            <th
              key={column.key}
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              {column.label}
            </th>
          ))}
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Actions
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {data.map((item, index) => (
          <tr key={item.id || index}>
            {columns.map((column) => (
              <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {item[column.key] || '-'}
              </td>
            ))}
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
              <div className="flex space-x-2">
                <button
                  onClick={() => onView(item, type)}
                  className="text-blue-600 hover:text-blue-900"
                  title="View"
                >
                  <EyeIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onEdit(item, type)}
                  className="text-indigo-600 hover:text-indigo-900"
                  title="Edit"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onDelete(item.id || item.roll_no, type)}
                  className="text-red-600 hover:text-red-900"
                  title="Delete"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// CRUD Modal Component
const CRUDModal = ({ type, modalType, data, setData, onSave, onClose }) => {
  const getFormFields = () => {
    switch (type) {
      case 'students':
        return [
          { key: 'roll_no', label: 'Roll Number', type: 'text', required: true },
          { key: 'name', label: 'Name', type: 'text', required: true },
          { key: 'email', label: 'Email', type: 'email', required: true },
          { key: 'phone', label: 'Phone', type: 'tel' },
          { key: 'address', label: 'Address', type: 'text' },
          { key: 'parent_name', label: 'Parent Name', type: 'text' },
          { key: 'parent_phone', label: 'Parent Phone', type: 'tel' },
          { key: 'admission_year', label: 'Admission Year', type: 'number' },
          { key: 'blood_group', label: 'Blood Group', type: 'text' },
          { key: 'emergency_contact', label: 'Emergency Contact', type: 'tel' },
          { key: 'username', label: 'Username', type: 'text', required: true },
          { key: 'password', label: 'Password', type: 'password', required: modalType === 'create' }
        ];
      case 'teachers':
        return [
          { key: 'name', label: 'Name', type: 'text', required: true },
          { key: 'email', label: 'Email', type: 'email', required: true },
          { key: 'phone', label: 'Phone', type: 'tel' },
          { key: 'address', label: 'Address', type: 'text' },
          { key: 'qualification', label: 'Qualification', type: 'text' },
          { key: 'experience', label: 'Experience (Years)', type: 'number' },
          { key: 'department', label: 'Department', type: 'text' },
          { key: 'designation', label: 'Designation', type: 'text' },
          { key: 'subject_expertise', label: 'Subject Expertise', type: 'text' },
          { key: 'username', label: 'Username', type: 'text', required: true },
          { key: 'password', label: 'Password', type: 'password', required: modalType === 'create' }
        ];
      case 'marks':
        return [
          { key: 'roll_no', label: 'Roll Number', type: 'text', required: true },
          { key: 'name', label: 'Name', type: 'text', required: true },
          { key: 'subject1_theory', label: 'Subject 1 Theory', type: 'number' },
          { key: 'subject1_practical', label: 'Subject 1 Practical', type: 'number' },
          { key: 'subject2_theory', label: 'Subject 2 Theory', type: 'number' },
          { key: 'subject2_practical', label: 'Subject 2 Practical', type: 'number' },
          { key: 'subject3_theory', label: 'Subject 3 Theory', type: 'number' },
          { key: 'subject3_practical', label: 'Subject 3 Practical', type: 'number' },
          { key: 'subject4_theory', label: 'Subject 4 Theory', type: 'number' },
          { key: 'subject4_practical', label: 'Subject 4 Practical', type: 'number' },
          { key: 'subject5_theory', label: 'Subject 5 Theory', type: 'number' },
          { key: 'subject5_practical', label: 'Subject 5 Practical', type: 'number' },
          { key: 'total_marks', label: 'Total Marks', type: 'number' },
          { key: 'percentage', label: 'Percentage', type: 'number' },
          { key: 'grade', label: 'Grade', type: 'text' }
        ];
      case 'attendance':
        return [
          { key: 'roll_no', label: 'Roll Number', type: 'text', required: true },
          { key: 'name', label: 'Name', type: 'text', required: true },
          { key: 'subject1_theory_present', label: 'Subject 1 Theory Present', type: 'number' },
          { key: 'subject1_theory_total', label: 'Subject 1 Theory Total', type: 'number' },
          { key: 'subject1_practical_present', label: 'Subject 1 Practical Present', type: 'number' },
          { key: 'subject1_practical_total', label: 'Subject 1 Practical Total', type: 'number' },
          { key: 'subject2_theory_present', label: 'Subject 2 Theory Present', type: 'number' },
          { key: 'subject2_theory_total', label: 'Subject 2 Theory Total', type: 'number' },
          { key: 'subject2_practical_present', label: 'Subject 2 Practical Present', type: 'number' },
          { key: 'subject2_practical_total', label: 'Subject 2 Practical Total', type: 'number' },
          { key: 'subject3_theory_present', label: 'Subject 3 Theory Present', type: 'number' },
          { key: 'subject3_theory_total', label: 'Subject 3 Theory Total', type: 'number' },
          { key: 'subject3_practical_present', label: 'Subject 3 Practical Present', type: 'number' },
          { key: 'subject3_practical_total', label: 'Subject 3 Practical Total', type: 'number' },
          { key: 'subject4_theory_present', label: 'Subject 4 Theory Present', type: 'number' },
          { key: 'subject4_theory_total', label: 'Subject 4 Theory Total', type: 'number' },
          { key: 'subject4_practical_present', label: 'Subject 4 Practical Present', type: 'number' },
          { key: 'subject4_practical_total', label: 'Subject 4 Practical Total', type: 'number' },
          { key: 'subject5_theory_present', label: 'Subject 5 Theory Present', type: 'number' },
          { key: 'subject5_theory_total', label: 'Subject 5 Theory Total', type: 'number' },
          { key: 'subject5_practical_present', label: 'Subject 5 Practical Present', type: 'number' },
          { key: 'subject5_practical_total', label: 'Subject 5 Practical Total', type: 'number' },
          { key: 'total_present', label: 'Total Present', type: 'number' },
          { key: 'total_classes', label: 'Total Classes', type: 'number' },
          { key: 'total_percentage', label: 'Total Percentage', type: 'number' }
        ];
      default:
        return [];
    }
  };

  const fields = getFormFields();
  const isReadOnly = modalType === 'view';

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {modalType === 'create' ? 'Create' : modalType === 'edit' ? 'Edit' : 'View'} {type.charAt(0).toUpperCase() + type.slice(1)}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fields.map((field) => (
                <div key={field.key} className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <input
                    type={field.type}
                    value={data[field.key] || ''}
                    onChange={(e) => setData({ ...data, [field.key]: e.target.value })}
                    disabled={isReadOnly}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 ${
                      isReadOnly ? 'bg-gray-100' : ''
                    }`}
                    required={field.required}
                  />
                </div>
              ))}
            </div>
          </div>

          {!isReadOnly && (
            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={onSave}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                {modalType === 'create' ? 'Create' : 'Update'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const HODDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    departmentName: '',
    totalTeachers: 0,
    totalStudents: 0,
    pendingReports: 0,
    totalClasses: 0,
    attendanceRate: 0,
    recentActivity: [],
    notificationsCount: 0,
    eventsCount: 0,
    averageMarks: 0,
    lowAttendanceStudents: 0
  });
  const [loading, setLoading] = useState(true);
  const [activeTab] = useState('overview');
  const [data, setData] = useState({
    students: [],
    teachers: [],
    marks: [],
    attendance: []
  });

  useEffect(() => {
    loadDashboardData();
  }, []);







  const loadDashboardData = async () => {
    try {
      // Fetch all students from database
      const studentsResponse = await axios.get('/api/students');
      const students = studentsResponse.data || [];
      const studentCount = students.length;
      
      // Fetch classes (only CSE department)
      const classesResponse = await axios.get('/api/classes?dept_id=1');
      const classes = classesResponse.data || [];
      const classCount = classes.length;
      
      // Calculate attendance rate using aggregated attendance API to avoid per-student requests
      let attendanceRate = 0;
      let lowAttendanceStudents = 0;
      try {
        const aggAttendanceRes = await axios.get('/api/student-services/attendance');
        const agg = aggAttendanceRes.data || [];
        // agg is an array grouped by class with students array containing 'total_percentage'
        let totalPercentage = 0;
        let attendStudentCount = 0;
        agg.forEach((cls) => {
          cls.students.forEach((s) => {
            const percentage = parseFloat(s.total_percentage || 0);
            if (!isNaN(percentage)) {
              totalPercentage += percentage;
              attendStudentCount++;
              // Count students with attendance < 75%
              if (percentage < 75) {
                lowAttendanceStudents++;
              }
            }
          });
        });
        attendanceRate = attendStudentCount > 0 ? Math.round(totalPercentage / attendStudentCount) : 0;
      } catch (err) {
        console.warn('Could not fetch aggregated attendance, falling back to 0', err);
        attendanceRate = 0;
      }
      
      // Fetch events for pending reports count
      const eventsResponse = await axios.get('/events');
      const events = eventsResponse.data || [];
      const upcomingEvents = events.filter(event => new Date(event.event_date) >= new Date()).length;
      
      // Fetch announcements
      let notificationsCount = 0;
      try {
        const announcementsRes = await axios.get('/api/announcements');
        const announcements = announcementsRes.data || [];
        notificationsCount = announcements.length;
      } catch (err) {
        console.warn('Could not fetch announcements', err);
      }

      // Fetch marks data for average calculation
      let averageMarks = 0;
      try {
        const marksRes = await axios.get('/api/student-services/marks');
        const marksData = marksRes.data || [];
        
        // Calculate average marks percentage across all students
        let totalPercentage = 0;
        let studentCount = 0;
        if (marksData && marksData.length > 0) {
          marksData.forEach((cls) => {
            if (cls.students && cls.students.length > 0) {
              cls.students.forEach((student) => {
                const percentage = parseFloat(student.percentage || 0);
                if (!isNaN(percentage) && percentage > 0) {
                  totalPercentage += percentage;
                  studentCount++;
                }
              });
            }
          });
        }
        averageMarks = studentCount > 0 ? Math.round(totalPercentage / studentCount) : 0;
      } catch (err) {
        console.warn('Could not fetch marks data for analysis', err);
      }
      
      setStats({
        departmentName: 'Computer Science & Engineering',
        totalTeachers: 0, // No teachers in current schema
        totalStudents: studentCount,
        pendingReports: upcomingEvents,
        totalClasses: classCount,
        attendanceRate: attendanceRate,
        notificationsCount: notificationsCount,
        eventsCount: events.length,
        averageMarks: averageMarks,
        lowAttendanceStudents: lowAttendanceStudents,
        recentActivity: [
          {
            type: 'students',
            content: `${studentCount} students enrolled in CSE`,
            timestamp: new Date().toISOString(),
            icon: UsersIcon
          },
          {
            type: 'attendance',
            content: `Overall attendance rate: ${attendanceRate}%`,
            timestamp: new Date(Date.now() - 86400000).toISOString(),
            icon: ChartBarIcon
          },
          {
            type: 'events',
            content: `${events.length} upcoming events`,
            timestamp: new Date(Date.now() - 172800000).toISOString(),
            icon: MegaphoneIcon
          }
        ]
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Fallback values
      setStats({
        departmentName: 'Computer Science & Engineering',
        totalTeachers: 0,
        totalStudents: 30,
        pendingReports: 6,
        totalClasses: 3,
        attendanceRate: 0,
        notificationsCount: 0,
        eventsCount: 0,
        averageMarks: 0,
        lowAttendanceStudents: 0,
        recentActivity: [
          {
            type: 'students',
            content: '30 students enrolled in CSE',
            timestamp: new Date().toISOString(),
            icon: UsersIcon
          }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  // Management actions are accessible on the HOD Members page

  const quickActions = [
    {
      title: 'AI Chatbot',
      description: 'Chat with AI assistant',
      icon: ChatBubbleLeftRightIcon,
      color: 'bg-blue-500',
      link: '/chatbot'
    },
    {
      title: 'Student Services',
      description: 'Access academic resources',
      icon: DocumentTextIcon,
      color: 'bg-green-500',
      link: '/student-services'
    },
    {
      title: 'Manage Members',
      description: 'Add, edit, and organize students',
      icon: UsersIcon,
      color: 'bg-purple-600',
      link: '/hod/members'
    },
    {
      title: 'Profile',
      description: 'Manage your account',
      icon: UserIcon,
      color: 'bg-gray-500',
      link: '/profile'
    }
  ];

  const features = [
    {
      title: 'Department Management',
      description: 'Centralized control over students',
      features: ['Student Directory', 'Section/Class Mapping', 'Bulk Imports', 'Role Adjustments']
    },
    {
      title: 'Quality & Reporting',
      description: 'Oversee academic quality through reports',
      features: ['Weekly Reports', 'Syllabus Progress', 'Approvals Workflow', 'Feedback Loop']
    },
    {
      title: 'Insights & Operations',
      description: 'Actionable analytics and task coordination',
      features: ['Attendance Trends', 'Result Analysis', 'Chatbot Query Stats', 'Task Assignment']
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">SmartEdu</h1>
            <p className="text-primary-100">Welcome, {user?.name || user?.first_name || user?.username} (HOD)</p>
          </div>
        </div>
      </div>


      {/* Overview Content */}
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card icon={BuildingOfficeIcon} label="Department" value={stats.departmentName} />
            <Card icon={AcademicCapIcon} label="Students" value={stats.totalStudents} />
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Quick Actions</h2>
              <p className="text-gray-600 mt-1">Access your most used features</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {quickActions.map((action, index) => {
                  const ActionComponent = action.onClick ? 'button' : Link;
                  const actionProps = action.onClick 
                    ? { onClick: action.onClick, className: "group block p-6 border border-gray-200 rounded-lg hover:border-primary-300 hover:shadow-md transition-all duration-200 w-full text-left" }
                    : { to: action.link, className: "group block p-6 border border-gray-200 rounded-lg hover:border-primary-300 hover:shadow-md transition-all duration-200" };
                  
                  return (
                    <ActionComponent key={index} {...actionProps}>
                      <div className="flex items-center space-x-3 h-full">
                        <div className={`p-3 rounded-lg ${action.color} text-white`}>
                          <action.icon className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900 group-hover:text-primary-600">{action.title}</h3>
                          <p className="text-sm text-gray-500">{action.description}</p>
                        </div>
                      </div>
                    </ActionComponent>
                  );
                })}
              </div>
            </div>
          </div>

        </>
      

      {/* Key Metrics Overview */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Department Key Metrics</h2>
          <p className="text-gray-600 mt-1">Real-time insights into your department's performance</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Average Attendance */}
            <div className="border border-gray-200 rounded-lg p-6 bg-gradient-to-br from-green-50 to-green-100">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 rounded-lg bg-green-500">
                  <ChartBarIcon className="h-6 w-6 text-white" />
                </div>
                <span className="text-2xl font-bold text-green-700">{stats.attendanceRate}%</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Average Attendance</h3>
              <p className="text-sm text-gray-600">Department average across all classes</p>
            </div>

            {/* Average Marks */}
            <div className="border border-gray-200 rounded-lg p-6 bg-gradient-to-br from-blue-50 to-blue-100">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 rounded-lg bg-blue-500">
                  <AcademicCapIcon className="h-6 w-6 text-white" />
                </div>
                <span className="text-2xl font-bold text-blue-700">{stats.averageMarks}%</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Average Marks</h3>
              <p className="text-sm text-gray-600">Overall student performance</p>
            </div>

            {/* Low Attendance Alert */}
            <div className="border border-gray-200 rounded-lg p-6 bg-gradient-to-br from-orange-50 to-orange-100">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 rounded-lg bg-orange-500">
                  <UserIcon className="h-6 w-6 text-white" />
                </div>
                <span className="text-2xl font-bold text-orange-700">{stats.lowAttendanceStudents}</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Low Attendance Students</h3>
              <p className="text-sm text-gray-600">Students below 75% attendance</p>
            </div>

            {/* Total Events */}
            <div className="border border-gray-200 rounded-lg p-6 bg-gradient-to-br from-purple-50 to-purple-100">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 rounded-lg bg-purple-500">
                  <MegaphoneIcon className="h-6 w-6 text-white" />
                </div>
                <span className="text-2xl font-bold text-purple-700">{stats.eventsCount}</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Upcoming Events</h3>
              <p className="text-sm text-gray-600">Department events scheduled</p>
            </div>
          </div>

          {/* Additional Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {/* Notifications */}
            <div className="border border-gray-200 rounded-lg p-6 bg-gradient-to-br from-indigo-50 to-indigo-100">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="p-3 rounded-lg bg-indigo-500">
                    <BellIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Published Notifications</h3>
                    <p className="text-sm text-gray-600">Total announcements created</p>
                  </div>
                </div>
                <span className="text-3xl font-bold text-indigo-700">{stats.notificationsCount}</span>
              </div>
            </div>

            {/* Total Classes */}
            <div className="border border-gray-200 rounded-lg p-6 bg-gradient-to-br from-pink-50 to-pink-100">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="p-3 rounded-lg bg-pink-500">
                    <BuildingOfficeIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Total Classes</h3>
                    <p className="text-sm text-gray-600">Department class count</p>
                  </div>
                </div>
                <span className="text-3xl font-bold text-pink-700">{stats.totalClasses}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Guidelines */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Admin Guidelines</h2>
          <p className="text-gray-600 mt-1">Best practices for effective department management</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Student Management */}
            <div className="border border-gray-200 rounded-lg p-6 bg-blue-50">
              <div className="flex items-center mb-4">
                <div className="p-3 rounded-lg bg-blue-500 mr-4">
                  <UsersIcon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Student Management</h3>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <CheckBadgeIcon className="h-5 w-5 text-green-600 mr-2 mt-0.5" />
                  <span className="text-sm text-gray-700">Regularly update student information and academic records</span>
                </li>
                <li className="flex items-start">
                  <CheckBadgeIcon className="h-5 w-5 text-green-600 mr-2 mt-0.5" />
                  <span className="text-sm text-gray-700">Monitor low attendance students and take timely action</span>
                </li>
                <li className="flex items-start">
                  <CheckBadgeIcon className="h-5 w-5 text-green-600 mr-2 mt-0.5" />
                  <span className="text-sm text-gray-700">Verify fee payments and maintain accurate financial records</span>
                </li>
                <li className="flex items-start">
                  <CheckBadgeIcon className="h-5 w-5 text-green-600 mr-2 mt-0.5" />
                  <span className="text-sm text-gray-700">Add new students with complete information including roll numbers</span>
                </li>
              </ul>
            </div>

            {/* Communication & Events */}
            <div className="border border-gray-200 rounded-lg p-6 bg-green-50">
              <div className="flex items-center mb-4">
                <div className="p-3 rounded-lg bg-green-500 mr-4">
                  <MegaphoneIcon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Communication & Events</h3>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <CheckBadgeIcon className="h-5 w-5 text-green-600 mr-2 mt-0.5" />
                  <span className="text-sm text-gray-700">Send clear and timely announcements to all students</span>
                </li>
                <li className="flex items-start">
                  <CheckBadgeIcon className="h-5 w-5 text-green-600 mr-2 mt-0.5" />
                  <span className="text-sm text-gray-700">Create and manage department events and workshops</span>
                </li>
                <li className="flex items-start">
                  <CheckBadgeIcon className="h-5 w-5 text-green-600 mr-2 mt-0.5" />
                  <span className="text-sm text-gray-700">Track event registrations and participant engagement</span>
                </li>
                <li className="flex items-start">
                  <CheckBadgeIcon className="h-5 w-5 text-green-600 mr-2 mt-0.5" />
                  <span className="text-sm text-gray-700">Use AI chatbot for student queries and support</span>
                </li>
              </ul>
            </div>

            {/* Analytics & Reporting */}
            <div className="border border-gray-200 rounded-lg p-6 bg-purple-50">
              <div className="flex items-center mb-4">
                <div className="p-3 rounded-lg bg-purple-500 mr-4">
                  <ChartBarIcon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Analytics & Reporting</h3>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <CheckBadgeIcon className="h-5 w-5 text-green-600 mr-2 mt-0.5" />
                  <span className="text-sm text-gray-700">Review department key metrics regularly</span>
                </li>
                <li className="flex items-start">
                  <CheckBadgeIcon className="h-5 w-5 text-green-600 mr-2 mt-0.5" />
                  <span className="text-sm text-gray-700">Use attendance and marks data for informed decisions</span>
                </li>
                <li className="flex items-start">
                  <CheckBadgeIcon className="h-5 w-5 text-green-600 mr-2 mt-0.5" />
                  <span className="text-sm text-gray-700">Identify at-risk students early and provide support</span>
                </li>
                <li className="flex items-start">
                  <CheckBadgeIcon className="h-5 w-5 text-green-600 mr-2 mt-0.5" />
                  <span className="text-sm text-gray-700">Generate reports for academic quality improvement</span>
                </li>
              </ul>
            </div>

            {/* Task Management */}
            <div className="border border-gray-200 rounded-lg p-6 bg-orange-50">
              <div className="flex items-center mb-4">
                <div className="p-3 rounded-lg bg-orange-500 mr-4">
                  <ClipboardDocumentListIcon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Task Management</h3>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <CheckBadgeIcon className="h-5 w-5 text-green-600 mr-2 mt-0.5" />
                  <span className="text-sm text-gray-700">Assign tasks with clear descriptions and deadlines</span>
                </li>
                <li className="flex items-start">
                  <CheckBadgeIcon className="h-5 w-5 text-green-600 mr-2 mt-0.5" />
                  <span className="text-sm text-gray-700">Monitor task progress and completion status</span>
                </li>
                <li className="flex items-start">
                  <CheckBadgeIcon className="h-5 w-5 text-green-600 mr-2 mt-0.5" />
                  <span className="text-sm text-gray-700">Provide feedback on completed tasks</span>
                </li>
                <li className="flex items-start">
                  <CheckBadgeIcon className="h-5 w-5 text-green-600 mr-2 mt-0.5" />
                  <span className="text-sm text-gray-700">Maintain organized workflow for department operations</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Management moved to HODMembers page for a cleaner experience */}

      {/* Management moved to HODMembers page for a cleaner experience */}
    </div>
  );
};

export default HODDashboard; 