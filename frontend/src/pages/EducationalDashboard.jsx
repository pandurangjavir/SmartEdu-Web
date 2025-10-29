import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  AcademicCapIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  BookOpenIcon,
  BellIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';
import toast from 'react-hot-toast';
import BackendTest from '../components/BackendTest';

const EducationalDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalClasses: 0,
    totalSubjects: 0,
    totalEvents: 0,
    upcomingEvents: 0,
    unpaidFees: 0,
    partialFees: 0
  });
  const [recentStudents, setRecentStudents] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [recentAnnouncements, setRecentAnnouncements] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch dashboard data in parallel to reduce total wait time
      const [statsRes, studentsRes, eventsRes, announcementsRes] = await Promise.all([
        axios.get('/api/dashboard/stats'),
        axios.get('/api/students', { params: { limit: 5 } }),
        axios.get('/events', { params: { active_only: true, limit: 5 } }),
        axios.get('/api/announcements', { params: { active_only: true, limit: 5 } })
      ]);

      setStats(statsRes.data);
      setRecentStudents(studentsRes.data || []);
      setUpcomingEvents(eventsRes.data || []);
      setRecentAnnouncements(announcementsRes.data || []);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getRoleBasedTitle = () => {
    switch (user?.role) {
      case 'student':
        return 'Student Dashboard';
      case 'teacher':
        return 'Teacher Dashboard';
      case 'hod':
        return 'HOD Dashboard';
      case 'principal':
        return 'Principal Dashboard';
      case 'admin':
        return 'Admin Dashboard';
      default:
        return 'Educational Dashboard';
    }
  };

  const getRoleBasedDescription = () => {
    switch (user?.role) {
      case 'student':
        return 'Your personalized academic dashboard';
      case 'teacher':
        return 'Manage your classes and students';
      case 'hod':
        return 'Oversee CSE department operations';
      case 'principal':
        return 'Monitor all department activities';
      case 'admin':
        return 'System administration and management';
      default:
        return 'Educational management system';
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
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{getRoleBasedTitle()}</h1>
            <p className="text-primary-100 mt-2">{getRoleBasedDescription()}</p>
          </div>
          <div className="hidden md:block">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <AcademicCapIcon className="h-8 w-8" />
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <UserGroupIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Students</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalStudents}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100">
              <BookOpenIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Classes</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalClasses}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100">
              <ClipboardDocumentListIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Subjects</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalSubjects}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-orange-100">
              <CalendarDaysIcon className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Upcoming Events</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.upcomingEvents}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Fee Status Cards (for admin/staff) */}
      {(user?.role === 'admin' || user?.role === 'hod' || user?.role === 'principal') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-red-100">
                <CurrencyDollarIcon className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Unpaid Fees</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.unpaidFees}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100">
                <CurrencyDollarIcon className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Partial Payments</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.partialFees}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Data Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Students */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Recent Students</h2>
            <p className="text-gray-600 mt-1">Latest student registrations</p>
          </div>
          <div className="p-6">
            {recentStudents.length === 0 ? (
              <div className="text-center py-8">
                <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No students found</h3>
                <p className="mt-1 text-sm text-gray-500">Students will appear here once they register.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentStudents.map((student) => (
                  <div key={student.student_id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-primary-600">
                          {student.roll_no?.charAt(0) || 'S'}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {student.user?.name || 'Unknown Student'}
                      </p>
                      <p className="text-sm text-gray-500">Roll: {student.roll_no}</p>
                    </div>
                    <div className="flex-shrink-0">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Active
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Upcoming Events</h2>
            <p className="text-gray-600 mt-1">Events and activities</p>
          </div>
          <div className="p-6">
            {upcomingEvents.length === 0 ? (
              <div className="text-center py-8">
                <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No upcoming events</h3>
                <p className="mt-1 text-sm text-gray-500">Events will appear here when scheduled.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingEvents.map((event) => (
                  <div key={event.event_id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <CalendarDaysIcon className="h-5 w-5 text-blue-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{event.title}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(event.event_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {event.event_type || 'Event'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Announcements */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Recent Announcements</h2>
          <p className="text-gray-600 mt-1">Latest updates and notifications</p>
        </div>
        <div className="p-6">
          {recentAnnouncements.length === 0 ? (
            <div className="text-center py-8">
              <BellIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No announcements</h3>
              <p className="mt-1 text-sm text-gray-500">Announcements will appear here when published.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentAnnouncements.map((announcement) => (
                <div key={announcement.announcement_id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900">{announcement.title}</h3>
                      <p className="mt-1 text-sm text-gray-600">{announcement.message}</p>
                      <div className="mt-2 flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          announcement.priority === 'urgent' 
                            ? 'bg-red-100 text-red-800'
                            : announcement.priority === 'high'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {announcement.priority}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(announcement.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Backend Test Component (for development) */}
      <BackendTest />
    </div>
  );
};

export default EducationalDashboard;
