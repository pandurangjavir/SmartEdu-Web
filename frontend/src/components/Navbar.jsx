import React from 'react';
import { useAuth } from '../context/AuthContext';
import NotificationCenter from './NotificationCenter';

const roleStyles = {
  admin: 'bg-red-100 text-red-700',
  hod: 'bg-purple-100 text-purple-700',
  teacher: 'bg-blue-100 text-blue-700',
  student: 'bg-green-100 text-green-700'
};

const Navbar = () => {
  const { user, logout } = useAuth();

  const role = (user?.role || 'student').toLowerCase();
  const roleClass = roleStyles[role] || roleStyles.student;

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center space-x-3">
            <span className="text-lg font-semibold text-gray-900">SmartEdu</span>
            {user && (
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleClass}`}>
                {role}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-4">
            {user && (
              <>
                <NotificationCenter />
                <span className="text-sm text-gray-700">
                  {user.first_name} {user.last_name}
                </span>
                <button onClick={logout} className="text-sm text-primary-600 hover:text-primary-700">Logout</button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 
 