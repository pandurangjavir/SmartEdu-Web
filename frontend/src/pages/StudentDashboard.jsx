import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import {
  ChatBubbleLeftRightIcon,
  AcademicCapIcon,
  CalendarDaysIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  BellIcon,
  ChartBarIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';

const StudentDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    notifications: 0,
    upcomingEvents: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        // Fetch announcements for notifications
        try {
          const announcementsRes = await axios.get('/api/announcements');
          const announcements = announcementsRes.data || [];
          setStats((s) => ({ ...s, notifications: announcements.length }));
        } catch {}

        // Fetch upcoming events
        try {
          const eventsRes = await axios.get('/api/events');
          const events = eventsRes.data?.data || eventsRes.data || [];
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const upcoming = events.filter(event => {
            const eventDate = new Date(event.event_date);
            eventDate.setHours(0, 0, 0, 0);
            return eventDate >= today;
          });
          setStats((s) => ({ ...s, upcomingEvents: upcoming.length }));
        } catch {}
      } finally {
        setLoading(false);
      }
    };
    if (user) {
      load();
    }
  }, [user]);

  const quickActions = [
    {
      title: 'AI Chatbot',
      description: 'Ask questions and get help',
      icon: ChatBubbleLeftRightIcon,
      color: 'bg-blue-500',
      link: '/chatbot'
    },
    {
      title: 'AI Services',
      description: 'Generate notes and quizzes',
      icon: DocumentTextIcon,
      color: 'bg-green-500',
      link: '/ai-services'
    },
    {
      title: 'Student Services',
      description: 'Courses, attendance, grades',
      icon: AcademicCapIcon,
      color: 'bg-purple-500',
      link: '/student-services'
    },
    {
      title: 'Event Registration',
      description: 'Join campus activities',
      icon: CalendarDaysIcon,
      color: 'bg-orange-500',
      link: '/event-registration'
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
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Welcome, {user?.first_name || user?.username}!</h1>
            <p className="text-primary-100 mt-2">Your personalized student dashboard</p>
          </div>
          <div className="hidden md:block">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <AcademicCapIcon className="h-8 w-8" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <BellIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Notifications</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.notifications}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100">
              <CalendarDaysIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Upcoming Events</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.upcomingEvents}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Quick Actions</h2>
          <p className="text-gray-600 mt-1">Access your most used features</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <Link
                key={index}
                to={action.link}
                className="group block p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${action.color} text-white`}>
                    <action.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 group-hover:text-primary-600">{action.title}</h3>
                    <p className="text-sm text-gray-500">{action.description}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Student Dashboard Features */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Dashboard Features</h2>
          <p className="text-gray-600 mt-1">Explore all available features and services</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Academic Services */}
            <div className="space-y-4">
              <h4 className="text-md font-semibold text-gray-800 flex items-center">
                <AcademicCapIcon className="h-5 w-5 mr-2 text-blue-600" />
                Academic Services
              </h4>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <ClipboardDocumentListIcon className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">View Marks & Results</p>
                    <p className="text-xs text-gray-600">Check your academic performance</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <ChartBarIcon className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Attendance Tracking</p>
                    <p className="text-xs text-gray-600">Monitor your attendance records</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <DocumentTextIcon className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Fee Management</p>
                    <p className="text-xs text-gray-600">View and manage fee payments</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Communication & Events */}
            <div className="space-y-4">
              <h4 className="text-md font-semibold text-gray-800 flex items-center">
                <CalendarDaysIcon className="h-5 w-5 mr-2 text-green-600" />
                Communication & Events
              </h4>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 bg-orange-50 rounded-lg">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <BellIcon className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Notifications</p>
                    <p className="text-xs text-gray-600">Stay updated with announcements</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-indigo-50 rounded-lg">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <CalendarDaysIcon className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Events & Workshops</p>
                    <p className="text-xs text-gray-600">Register for college events</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-pink-50 rounded-lg">
                  <div className="p-2 bg-pink-100 rounded-lg">
                    <ChatBubbleLeftRightIcon className="h-4 w-4 text-pink-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">AI Chat Assistant</p>
                    <p className="text-xs text-gray-600">Get instant help and support</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-md font-semibold text-gray-800 mb-4">Quick Actions</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link to="/student-services" className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg text-center transition-colors">
                <UserIcon className="h-6 w-6 mx-auto text-gray-600 mb-2" />
                <p className="text-sm font-medium text-gray-900">Student Services</p>
              </Link>
              <Link to="/chatbot" className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg text-center transition-colors">
                <ChatBubbleLeftRightIcon className="h-6 w-6 mx-auto text-gray-600 mb-2" />
                <p className="text-sm font-medium text-gray-900">AI Assistant</p>
              </Link>
              <Link to="/profile" className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg text-center transition-colors">
                <UserIcon className="h-6 w-6 mx-auto text-gray-600 mb-2" />
                <p className="text-sm font-medium text-gray-900">Profile</p>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;


