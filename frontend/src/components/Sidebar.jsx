import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ChatBubbleLeftRightIcon,
  AcademicCapIcon,
  UserGroupIcon,
  UserIcon,
  BriefcaseIcon,
  ArrowLeftOnRectangleIcon,
  MicrophoneIcon,
  InformationCircleIcon,
  ChartBarIcon,
  CalendarDaysIcon,
  SpeakerWaveIcon
} from '@heroicons/react/24/outline';

const Sidebar = () => {
  const { user, isAdmin, isStudent, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      name: 'Student Dashboard',
      href: '/student',
      icon: AcademicCapIcon,
      roles: ['student']
    },
    {
      name: 'Admin Dashboard',
      href: '/admin',
      icon: BriefcaseIcon,
      roles: ['admin']
    },
    {
      name: 'AI Chat Assistant',
      href: '/chatbot',
      icon: ChatBubbleLeftRightIcon,
      roles: ['student', 'admin']
    },
    {
      name: 'Event Registration',
      href: '/event-registration',
      icon: CalendarDaysIcon,
      roles: ['student', 'admin']
    },
    {
      name: 'Admission Info',
      href: '/admission-info',
      icon: InformationCircleIcon,
      roles: ['student', 'admin']
    },
    {
      name: 'Student Services',
      href: '/student-services',
      icon: AcademicCapIcon,
      roles: ['student', 'admin']
    },
    {
      name: 'Admin Panel',
      href: '/admin',
      icon: UserGroupIcon,
      roles: ['admin']
    },
    {
      name: 'Profile',
      href: '/profile',
      icon: UserIcon,
      roles: ['student', 'admin']
    }
  ];

  let filteredMenuItems = menuItems.filter(item => 
    item.roles.includes(user?.role)
  );

  // Admin-specific sidebar
  if (user?.role === 'admin') {
    filteredMenuItems = [
      { name: 'Admin Dashboard', href: '/admin', icon: BriefcaseIcon },
      { name: 'AI Chat Assistant', href: '/chatbot', icon: ChatBubbleLeftRightIcon },
      { name: 'Event Registration', href: '/event-registration', icon: CalendarDaysIcon },
      { name: 'Admission Info', href: '/admission-info', icon: InformationCircleIcon },
      { name: 'Student Services', href: '/student-services', icon: AcademicCapIcon },
      { name: 'Profile', href: '/profile', icon: UserIcon }
    ];
  }

  return (
    <div className="w-64 bg-white shadow-sm border-r border-gray-200 min-h-screen">
      <div className="p-6">
        <nav className="space-y-2">
          {filteredMenuItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? 'bg-primary-100 text-primary-700 border-r-2 border-primary-500'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <item.icon className="h-5 w-5 mr-3" />
                {item.name}
              </Link>
            );
          })}
        </nav>
        {user?.role === 'admin' && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            >
              <ArrowLeftOnRectangleIcon className="h-5 w-5 mr-3" />
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar; 