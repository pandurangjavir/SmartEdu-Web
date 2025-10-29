import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import EducationalDashboard from './pages/EducationalDashboard';
import Chatbot from './pages/Chatbot';
import AIServices from './pages/AIServices';
import StudentServices from './pages/StudentServices';
import Profile from './pages/Profile';
import LoadingSpinner from './components/LoadingSpinner';
import StudentDashboard from './pages/StudentDashboard';
import AdminDashboard from './pages/HODDashboard';
import AdminMembers from './pages/HODMembers';
import AdminReports from './pages/HODReports';
import AdminAnalytics from './pages/HODAnalytics';
import AdminTasks from './pages/HODTasks';
import DepartmentDetails from './pages/DepartmentDetails';
// New enhanced features
import AdmissionInfo from './pages/AdmissionInfo';
import EventRegistration from './pages/EventRegistration';
import NotificationCenter from './components/NotificationCenter';
import Messages from './pages/Messages';
import FloatingChatbotButton from './components/FloatingChatbotButton';

const PrivateRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  const routeForRole = (role) => {
    if (role === 'admin') return '/admin';
    if (role === 'student') return '/student';
    return '/dashboard';
  };

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return <Navigate to={routeForRole(user?.role)} />;
  }

  return children;
};

const AppLayout = ({ children }) => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">
          {children}
          <FloatingChatbotButton />
        </main>
      </div>
    </div>
  );
};

function App() {
  const { loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/login" />} />
          
          {/* Protected routes */}
          <Route path="/dashboard" element={
            <PrivateRoute>
              <AppLayout>
                <EducationalDashboard />
              </AppLayout>
            </PrivateRoute>
          } />

          {/* Role-specific dashboards */}
          <Route path="/student" element={
            <PrivateRoute allowedRoles={['student']}>
              <AppLayout>
                <StudentDashboard />
              </AppLayout>
            </PrivateRoute>
          } />

          <Route path="/admin" element={
            <PrivateRoute allowedRoles={['admin']}>
              <AppLayout>
                <AdminDashboard />
              </AppLayout>
            </PrivateRoute>
          } />
          <Route path="/admin/members" element={
            <PrivateRoute allowedRoles={['admin']}>
              <AppLayout>
                <AdminMembers />
              </AppLayout>
            </PrivateRoute>
          } />
          <Route path="/admin/reports" element={
            <PrivateRoute allowedRoles={['admin']}>
              <AppLayout>
                <AdminReports />
              </AppLayout>
            </PrivateRoute>
          } />
          <Route path="/admin/analytics" element={
            <PrivateRoute allowedRoles={['admin']}>
              <AppLayout>
                <AdminAnalytics />
              </AppLayout>
            </PrivateRoute>
          } />
          <Route path="/admin/tasks" element={
            <PrivateRoute allowedRoles={['admin']}>
              <AppLayout>
                <AdminTasks />
              </AppLayout>
            </PrivateRoute>
          } />

          {/* HOD-specific routes */}
          <Route path="/hod" element={
            <PrivateRoute allowedRoles={['admin']}>
              <AppLayout>
                <AdminDashboard />
              </AppLayout>
            </PrivateRoute>
          } />
          <Route path="/hod/members" element={
            <PrivateRoute allowedRoles={['admin']}>
              <AppLayout>
                <AdminMembers />
              </AppLayout>
            </PrivateRoute>
          } />
          <Route path="/hod/reports" element={
            <PrivateRoute allowedRoles={['admin']}>
              <AppLayout>
                <AdminReports />
              </AppLayout>
            </PrivateRoute>
          } />
          <Route path="/hod/analytics" element={
            <PrivateRoute allowedRoles={['admin']}>
              <AppLayout>
                <AdminAnalytics />
              </AppLayout>
            </PrivateRoute>
          } />
          <Route path="/hod/tasks" element={
            <PrivateRoute allowedRoles={['admin']}>
              <AppLayout>
                <AdminTasks />
              </AppLayout>
            </PrivateRoute>
          } />
          
          <Route path="/chatbot" element={
            <PrivateRoute>
              <AppLayout>
                <Chatbot />
              </AppLayout>
            </PrivateRoute>
          } />

          <Route path="/messages" element={
            <PrivateRoute>
              <AppLayout>
                <Messages />
              </AppLayout>
            </PrivateRoute>
          } />
          
          <Route path="/ai-services" element={
            <PrivateRoute>
              <AppLayout>
                <AIServices />
              </AppLayout>
            </PrivateRoute>
          } />
          
          <Route path="/student-services" element={
            <PrivateRoute>
              <AppLayout>
                <StudentServices />
              </AppLayout>
            </PrivateRoute>
          } />
          
          
          <Route path="/profile" element={
            <PrivateRoute>
              <AppLayout>
                <Profile />
              </AppLayout>
            </PrivateRoute>
          } />

          
          <Route path="/admission-info" element={
            <AppLayout>
              <AdmissionInfo />
            </AppLayout>
          } />
          
          <Route path="/event-registration" element={
            <PrivateRoute>
              <AppLayout>
                <EventRegistration />
              </AppLayout>
            </PrivateRoute>
          } />
          
          {/* Default redirect */}
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App; 