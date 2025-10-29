import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  BellIcon, 
  CalendarIcon, 
  AcademicCapIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  PencilIcon
} from '@heroicons/react/24/outline';
import MarksManagement from '../components/MarksManagement';
import AdminStudentEditor from '../components/AdminStudentEditor';
import toast from 'react-hot-toast';
import axios from 'axios';

const StudentServices = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('notifications');
  const [loading, setLoading] = useState(false);
  const [studentInfo, setStudentInfo] = useState(null);
  const [data, setData] = useState({
    notifications: [],
    events: [],
    marks: [],
    attendance: [],
    fees: [],
    attendanceDefaulters: [],
    feesDefaulters: []
  });
  
  useEffect(() => {
    // Fetch student info if user is a student
    if (isStudent() && user?.user_id) {
      fetchStudentInfo();
    }
  }, [user]);
  
  const fetchStudentInfo = async () => {
    try {
      const res = await axios.get(`/api/students`);
      const students = res.data || [];
      // Find the current student by matching user_id
      const currentStudent = students.find(s => s.user_id === user.user_id);
      setStudentInfo(currentStudent);
    } catch (error) {
      console.error('Failed to fetch student info:', error);
    }
  };
  const [defaultersView, setDefaultersView] = useState('attendance'); // 'attendance' | 'fees'
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMarks, setEditingMarks] = useState(null);
  const [editingAttendance, setEditingAttendance] = useState(null);
  const [editingFees, setEditingFees] = useState(null);
  const [selectedYear, setSelectedYear] = useState('SY');
  const [selectedBranch, setSelectedBranch] = useState('CSE');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch only what is needed for the active tab to keep it fast and reliable
      if (activeTab === 'events') {
        const res = await axios.get('/events');
        const events = Array.isArray(res?.data) ? res.data : [];
        setData(prev => ({ ...prev, events }));
      } else if (activeTab === 'notifications') {
        const res = await axios.get('/api/announcements');
        const notifications = Array.isArray(res?.data) ? res.data : [];
        setData(prev => ({ ...prev, notifications }));
      } else if (activeTab === 'marks') {
        // Fetch marks data grouped by class
        const res = await axios.get('/api/student-services/marks');
        const marks = Array.isArray(res?.data) ? res.data : [];
        setData(prev => ({ ...prev, marks }));
      } else if (activeTab === 'attendance') {
        // Fetch attendance data grouped by class
        const res = await axios.get('/api/student-services/attendance');
        const attendance = Array.isArray(res?.data) ? res.data : [];
        setData(prev => ({ ...prev, attendance }));
      } else if (activeTab === 'fees') {
        // Fetch fees data grouped by class
        const res = await axios.get('/api/student-services/fees');
        const fees = Array.isArray(res?.data) ? res.data : [];
        setData(prev => ({ ...prev, fees }));
      } else if (activeTab === 'defaulters' && isAdmin()) {
        // For now, show empty defaulters - we'll implement this later
        setData(prev => ({ ...prev, attendanceDefaulters: [], feesDefaulters: [] }));
      } else {
        // Fallback: hydrate everything for the first load or unknown tab
        try {
          const [eventsRes, notificationsRes] = await Promise.all([
            axios.get('/events'),
            axios.get('/api/announcements')
          ]);
          
          const events = Array.isArray(eventsRes?.data) ? eventsRes.data : [];
          const notifications = Array.isArray(notificationsRes?.data) ? notificationsRes.data : [];
          
          setData(prev => ({ ...prev, events, notifications }));
        } catch (error) {
          console.error('Error fetching initial data:', error);
        }
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to fetch data');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEventRegistration = async (eventId) => {
    try {
      await axios.post(`/api/events/${eventId}/register`);
      toast.success('Successfully registered for event!');
      fetchData();
    } catch (error) {
      toast.error('Failed to register for event');
    }
  };

  // HOD-only: manage announcements
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', body: '', type: 'general', target_audience: 'all', target_year: '' });
  const createAnnouncement = async () => {
    try {
      await axios.post('/api/announcements', newAnnouncement);
      toast.success('Announcement created');
      setNewAnnouncement({ title: '', body: '', type: 'general', target_audience: 'all', target_year: '' });
      if (activeTab === 'notifications') fetchData();
    } catch (e) {
      toast.error(e?.response?.data?.msg || 'Failed to create announcement');
    }
  };
  const deleteAnnouncement = async (id) => {
    if (!confirm('Delete this announcement?')) return;
    try {
      await axios.delete(`/api/announcements/${id}`);
      toast.success('Announcement deleted');
      if (activeTab === 'notifications') fetchData();
    } catch (e) { toast.error(e?.response?.data?.msg || 'Failed to delete'); }
  };

  // HOD-only: manage events
  const [newEvent, setNewEvent] = useState({ 
    title: '', 
    description: '', 
    event_date: '', 
    event_time: '',
    location: '',
    event_type: 'academic',
    organized_by: '',
    registration_link: ''
  });
  
  const createEvent = async () => {
    try {
      await axios.post('/api/events', newEvent);
      toast.success('Event created');
      setNewEvent({ 
        title: '', 
        description: '', 
        event_date: '', 
        event_time: '',
        location: '',
        event_type: 'academic',
        organized_by: '',
        registration_link: ''
      });
      if (activeTab === 'events') fetchData();
    } catch (e) {
      toast.error(e?.response?.data?.msg || 'Failed to create event');
    }
  };

  const deleteEvent = async (eventId) => {
    if (!confirm('Delete this event?')) return;
    try {
      await axios.delete(`/api/events/${eventId}`);
      toast.success('Event deleted successfully!');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete event');
      console.error('Error deleting event:', error);
    }
  };

  // Notification management
  const [newNotification, setNewNotification] = useState({ 
    title: '', 
    message: '', 
    user_id: 1
  });
  
  const createNotification = async () => {
    try {
      // Add default type
      const notificationData = { ...newNotification, type: 'info' };
      await axios.post('/api/notifications', notificationData);
      toast.success('Notification created');
      setNewNotification({ 
        title: '', 
        message: '', 
        user_id: 1
      });
      if (activeTab === 'notifications') fetchData();
    } catch (e) {
      toast.error(e?.response?.data?.msg || 'Failed to create notification');
    }
  };

  const deleteNotification = async (notificationId) => {
    if (!confirm('Delete this notification?')) return;
    try {
      await axios.delete(`/api/notifications/${notificationId}`);
      toast.success('Notification deleted successfully!');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete notification');
      console.error('Error deleting notification:', error);
    }
  };

  // Helper functions for role-based access
  const isStudent = () => user?.role === 'student';
  const isAdmin = () => user?.role === 'admin';

  // Admin-specific edit functions
  const handleEdit = (item, type) => {
    if (!isAdmin()) return;
    setEditingItem({ ...item, type });
    setEditForm({ ...item });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!isAdmin()) return;
    
    try {
      let endpoint = '';
      if (activeTab === 'marks') {
        endpoint = `/api/hod/marks/${selectedBranch}/${selectedYear}/${editingItem.id}`;
      } else if (activeTab === 'attendance') {
        endpoint = `/api/hod/attendance/${selectedBranch}/${selectedYear}/${editingItem.id}`;
      } else if (activeTab === 'fees') {
        endpoint = `/api/fees/${editingItem.id}`;
      }

      if (!endpoint) {
        toast.error('Invalid operation for this data type');
        return;
      }

      await axios.put(endpoint, editForm);
      toast.success(`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} updated successfully`);
      setShowEditModal(false);
      setEditingItem(null);
      setEditForm({});
      fetchData();
    } catch (error) {
      console.error(`Error updating ${activeTab}:`, error);
      toast.error(`Failed to update ${activeTab}`);
    }
  };

  const handleDelete = async (id, type) => {
    if (!isAdmin()) return;
    if (!window.confirm(`Are you sure you want to delete this ${type}?`)) return;

    try {
      let endpoint = '';
      if (type === 'marks') {
        endpoint = `/api/hod/marks/${selectedBranch}/${selectedYear}/${id}`;
      } else if (type === 'attendance') {
        endpoint = `/api/hod/attendance/${selectedBranch}/${selectedYear}/${id}`;
      }

      await axios.delete(endpoint);
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully`);
      fetchData();
    } catch (error) {
      console.error(`Error deleting ${type}:`, error);
      toast.error(`Failed to delete ${type}`);
    }
  };

  const handleCancelEdit = () => {
    setShowEditModal(false);
    setEditingItem(null);
    setEditForm({});
  };
  const canEdit = () => isAdmin();

  // Group helpers for admin views
  const groupBy = (arr, keyFn) => arr.reduce((acc, item) => {
    const key = keyFn(item);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const tabs = [
    {
      id: 'notifications',
      name: 'Notifications',
      icon: BellIcon,
      description: 'View your notifications and announcements'
    },
    {
      id: 'events',
      name: 'Events',
      icon: CalendarIcon,
      description: 'Browse and register for upcoming events'
    },
    {
      id: 'marks',
      name: 'Marks',
      icon: AcademicCapIcon,
      description: 'View your academic performance'
    },
    {
      id: 'attendance',
      name: 'Attendance',
      icon: ChartBarIcon,
      description: 'Track your attendance records'
    },
    {
      id: 'fees',
      name: 'Fees',
      icon: CurrencyDollarIcon,
      description: 'View your fee payment status'
    }
  ];

  // UI helpers for standardized cards
  const formatDate = (d) => {
    try {
      return new Date(d).toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  const typeBadgeClass = (type) => {
    if (type === 'exam') return 'bg-red-100 text-red-800';
    if (type === 'project') return 'bg-purple-100 text-purple-800';
    if (type === 'event') return 'bg-blue-100 text-blue-800';
    if (type === 'academic') return 'bg-green-100 text-green-800';
    return 'bg-gray-100 text-gray-800';
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      );
    }

    switch (activeTab) {
      case 'notifications':
        return (
          <div className="space-y-4">
            {isAdmin() && (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="px-6 py-4 border-b bg-gray-50 text-sm font-medium text-gray-700">Create Notification</div>
                <div className="px-6 py-4 space-y-4">
                  <input className="w-full border border-gray-300 rounded px-3 py-2 text-sm" placeholder="Notification Title" value={newNotification.title} onChange={(e)=>setNewNotification(v=>({ ...v, title: e.target.value }))} />
                  <textarea className="w-full border border-gray-300 rounded px-3 py-2 text-sm" placeholder="Notification Message" rows="4" value={newNotification.message} onChange={(e)=>setNewNotification(v=>({ ...v, message: e.target.value }))} />
                  <div className="flex justify-end">
                    <button onClick={createNotification} disabled={!newNotification.title || !newNotification.message} className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm">Create Notification</button>
                  </div>
                </div>
              </div>
            )}
            {data.notifications.length === 0 ? (
              <div className="text-center py-12">
                <BellIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No notifications</h3>
                <p className="mt-1 text-sm text-gray-500">You don't have any notifications yet.</p>
              </div>
            ) : (
              data.notifications.map((n) => (
                <div key={n.id} className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <BellIcon className="h-5 w-5 text-primary-600" />
                      <h3 className="text-base font-semibold text-gray-900">{n.title}</h3>
                      {n.type && (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeBadgeClass(n.type)}`}>{n.type}</span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="text-xs text-gray-500">{formatDate(n.created_at)}</div>
                      {isAdmin() && (
                        <button
                          onClick={() => deleteNotification(n.notification_id || n.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="px-6 py-4 flex items-start justify-between">
                    <div className="pr-4">
                      <p className="text-gray-700 leading-relaxed">{n.message || n.body}</p>
                      {(n.target_audience || n.target_year) && (
                        <div className="mt-3 flex items-center space-x-2 text-xs text-gray-500">
                          {n.target_audience && <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded">Audience: {n.target_audience}</span>}
                          {n.target_year && <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded">Year: {n.target_year}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        );

      case 'events':
        return (
          <div className="space-y-4">
            {isAdmin() && (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="px-6 py-4 border-b bg-gray-50 text-sm font-medium text-gray-700">Create Event</div>
                <div className="px-6 py-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input className="border border-gray-300 rounded px-3 py-2 text-sm" placeholder="Event Title" value={newEvent.title} onChange={(e)=>setNewEvent(v=>({ ...v, title: e.target.value }))} />
                    <input className="border border-gray-300 rounded px-3 py-2 text-sm" placeholder="Location" value={newEvent.location} onChange={(e)=>setNewEvent(v=>({ ...v, location: e.target.value }))} />
                    <input type="date" className="border border-gray-300 rounded px-3 py-2 text-sm" value={newEvent.event_date} onChange={(e)=>setNewEvent(v=>({ ...v, event_date: e.target.value }))} />
                    <input type="time" className="border border-gray-300 rounded px-3 py-2 text-sm" value={newEvent.event_time} onChange={(e)=>setNewEvent(v=>({ ...v, event_time: e.target.value }))} />
                    <select className="border border-gray-300 rounded px-3 py-2 text-sm" value={newEvent.event_type} onChange={(e)=>setNewEvent(v=>({ ...v, event_type: e.target.value }))}>
                      <option value="academic">Academic</option>
                      <option value="workshop">Workshop</option>
                      <option value="seminar">Seminar</option>
                      <option value="conference">Conference</option>
                      <option value="cultural">Cultural</option>
                      <option value="sports">Sports</option>
                    </select>
                  </div>
                  <textarea className="w-full border border-gray-300 rounded px-3 py-2 text-sm" placeholder="Event Description" rows="3" value={newEvent.description} onChange={(e)=>setNewEvent(v=>({ ...v, description: e.target.value }))} />
                  <input className="w-full border border-gray-300 rounded px-3 py-2 text-sm" placeholder="Organized By" value={newEvent.organized_by} onChange={(e)=>setNewEvent(v=>({ ...v, organized_by: e.target.value }))} />
                  <input className="w-full border border-gray-300 rounded px-3 py-2 text-sm" placeholder="Registration Link (e.g., https://example.com/register)" value={newEvent.registration_link} onChange={(e)=>setNewEvent(v=>({ ...v, registration_link: e.target.value }))} />
                  <div className="flex justify-end">
                    <button onClick={createEvent} disabled={!newEvent.title || !newEvent.event_date} className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm">Create Event</button>
                  </div>
                </div>
              </div>
            )}
            {data.events.length === 0 ? (
              <div className="text-center py-12">
                <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No upcoming events</h3>
                <p className="mt-1 text-sm text-gray-500">Check back later for new events.</p>
              </div>
            ) : (
              data.events.map((e) => (
                <div key={e.event_id || e.id} className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CalendarIcon className="h-5 w-5 text-primary-600" />
                      <h3 className="text-base font-semibold text-gray-900">{e.title}</h3>
                      {e.branch && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{e.branch}</span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="text-xs text-gray-500">{formatDate(e.event_date)}</div>
                      {isAdmin() && (
                        <button
                          onClick={() => deleteEvent(e.event_id || e.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="px-6 py-4 space-y-3">
                    {/* Description */}
                    <p className="text-gray-700 leading-relaxed">{e.description}</p>
                    
                    {/* Event Details Grid */}
                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-200">
                      {e.event_time && (
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">Time:</span>
                          <span className="text-sm font-medium text-gray-900">{e.event_time}</span>
                        </div>
                      )}
                      {e.location && (
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">Location:</span>
                          <span className="text-sm font-medium text-gray-900">{e.location}</span>
                        </div>
                      )}
                      {e.event_type && (
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">Type:</span>
                          <span className="text-sm font-medium text-gray-900 capitalize">{e.event_type}</span>
                        </div>
                      )}
                      {e.organized_by && (
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">Organized By:</span>
                          <span className="text-sm font-medium text-gray-900">{e.organized_by}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Registration Link */}
                    {e.registration_link && (
                      <div className="pt-3">
                        <a 
                          href={e.registration_link} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm transition-colors"
                        >
                          Register for Event →
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        );

      case 'marks':
        return (
          <div className="space-y-6">
            {data.marks?.length === 0 ? (
              <div className="text-center py-12">
                <AcademicCapIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No marks records</h3>
                <p className="mt-1 text-sm text-gray-500">Marks records will appear here.</p>
              </div>
            ) : (
              data.marks.map((classData, index) => {
                // Filter students for student role
                let studentsToShow = classData.students || [];
                if (isStudent() && studentInfo?.roll_no) {
                  studentsToShow = studentsToShow.filter(s => s.roll_number === studentInfo.roll_no);
                  if (studentsToShow.length === 0) return null; // Skip class if no matching student
                }
                
                return (
                <div key={`marks-${index}`} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
                  <div className="px-4 py-3 border-b bg-gray-50 text-sm font-medium text-gray-700">
                    {classData.class_name} - Marks Table
                  </div>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roll No</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name of Student</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {classData.students[0]?.sub1_name || 'Subject 1'}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {classData.students[0]?.sub2_name || 'Subject 2'}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {classData.students[0]?.sub3_name || 'Subject 3'}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {classData.students[0]?.sub4_name || 'Subject 4'}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {classData.students[0]?.sub5_name || 'Subject 5'}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Percentage</th>
                        {user?.role === 'admin' && (
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {studentsToShow.map((student, studentIndex) => (
                        <tr key={`student-${studentIndex}`} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">{student.roll_number}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{student.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{student.sub1 || 0}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{student.sub2 || 0}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{student.sub3 || 0}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{student.sub4 || 0}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{student.sub5 || 0}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">{student.total}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">{student.percentage}%</td>
                          {user?.role === 'admin' && (
                            <td className="px-4 py-3 text-sm">
                              <button
                                onClick={() => setEditingMarks(student.student_id || studentIndex + 1)}
                                className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 mr-1"
                              >
                                Marks
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                );
              })
            )}
          </div>
        );

      case 'attendance':
        return (
          <div className="space-y-6">
            {data.attendance?.length === 0 ? (
              <div className="text-center py-12">
                <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No attendance records</h3>
                <p className="mt-1 text-sm text-gray-500">Attendance records will appear here.</p>
              </div>
            ) : (
              data.attendance.map((classData, index) => {
                // Filter students for student role
                let studentsToShow = classData.students || [];
                if (isStudent() && studentInfo?.roll_no) {
                  studentsToShow = studentsToShow.filter(s => s.roll_number === studentInfo.roll_no);
                  if (studentsToShow.length === 0) return null; // Skip class if no matching student
                }
                
                return (
                <div key={`attendance-${index}`} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
                  <div className="px-4 py-3 border-b bg-gray-50 text-sm font-medium text-gray-700">
                    {classData.class_name} - Attendance Table
                  </div>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roll No</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name of Student</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {classData.students[0]?.sub1_name || 'Subject 1'}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {classData.students[0]?.sub2_name || 'Subject 2'}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {classData.students[0]?.sub3_name || 'Subject 3'}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {classData.students[0]?.sub4_name || 'Subject 4'}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {classData.students[0]?.sub5_name || 'Subject 5'}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Percentage</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        {user?.role === 'admin' && (
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {studentsToShow.map((student, studentIndex) => (
                        <tr key={`student-${studentIndex}`} className={`hover:bg-gray-50 ${student.is_defaulter ? 'bg-red-50' : ''}`}>
                          <td className="px-4 py-3 text-sm text-gray-900">{student.roll_number}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{student.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{student.sub1}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{student.sub2}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{student.sub3}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{student.sub4}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{student.sub5}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">{student.total}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">{student.total_percentage}%</td>
                          <td className="px-4 py-3 text-sm">
                            {student.is_defaulter ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                Defaulter
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Good
                              </span>
                            )}
                          </td>
                          {user?.role === 'admin' && (
                            <td className="px-4 py-3 text-sm">
                              <button
                                onClick={() => setEditingAttendance(student.student_id || studentIndex + 1)}
                                className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 mr-1"
                              >
                                Attendance
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                );
              })
            )}
          </div>
        );

      case 'fees':
        return (
          <div className="space-y-6">
            {data.fees?.length === 0 ? (
              <div className="text-center py-12">
                <CurrencyDollarIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No fees records</h3>
                <p className="mt-1 text-sm text-gray-500">Fee records will appear here.</p>
              </div>
            ) : (
              data.fees.map((classData, index) => {
                // Filter students for student role
                let studentsToShow = classData.students || [];
                if (isStudent() && studentInfo?.roll_no) {
                  studentsToShow = studentsToShow.filter(s => s.roll_number === studentInfo.roll_no);
                  if (studentsToShow.length === 0) return null; // Skip class if no matching student
                }
                
                return (
                <div key={`fees-${index}`} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
                  <div className="px-4 py-3 border-b bg-gray-50 text-sm font-medium text-gray-700">
                    {classData.class_name} - Fees Table
                  </div>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roll Number</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Fees</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid Fees</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining Fees</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        {user?.role === 'admin' && (
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {studentsToShow.map((student, studentIndex) => (
                        <tr key={`student-${studentIndex}`} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">{student.roll_number}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{student.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">₹{student.total_fees.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-green-600">₹{student.paid_fees.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-red-600">₹{student.remaining_fees.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              student.payment_status === 'Paid' ? 'bg-green-100 text-green-800' :
                              student.payment_status === 'Partial' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {student.payment_status}
                            </span>
                          </td>
                          {user?.role === 'admin' && (
                            <td className="px-4 py-3 text-sm">
                              <button
                                onClick={() => setEditingFees(student.student_id || studentIndex + 1)}
                                className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 mr-1"
                              >
                                Fees
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                );
              })
            )}
          </div>
        );

      case 'defaulters':
        return (
          <div className="space-y-4">
            {/* Toggle */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setDefaultersView('attendance')}
                className={`px-3 py-1 rounded-md text-sm ${defaultersView === 'attendance' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              >Attendance</button>
              <button
                onClick={() => setDefaultersView('fees')}
                className={`px-3 py-1 rounded-md text-sm ${defaultersView === 'fees' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              >Fees</button>
            </div>

            {defaultersView === 'attendance' ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roll No</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
                      
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Academic Year</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total %</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.attendanceDefaulters.length === 0 ? (
                      <tr><td className="px-4 py-6 text-center text-sm text-gray-500" colSpan={6}>No attendance defaulters</td></tr>
                    ) : (
                      data.attendanceDefaulters.map((r) => (
                        <tr key={`attdef-${r.id}-${r.year}`} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">{r.student_roll_no || r.roll_no}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{r.student_name || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{r.year}</td>
                          
                          <td className="px-4 py-3 text-sm text-gray-900">{r.academic_year}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-red-600">{Number(r.total_percentage).toFixed(2)}%</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roll No</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
                      
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Academic Year</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.feesDefaulters.length === 0 ? (
                      <tr><td className="px-4 py-6 text-center text-sm text-gray-500" colSpan={6}>No fees defaulters</td></tr>
                    ) : (
                      data.feesDefaulters.map((r) => (
                        <tr key={`feedef-${r.id}-${r.year}`} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">{r.student_roll_no || r.roll_no}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{r.student_name || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{r.year}</td>
                          
                          <td className="px-4 py-3 text-sm text-gray-900">{r.academic_year}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-red-600">₹{Number(r.remaining_fees).toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const getPageTitle = () => {
    if (isStudent()) return 'Student Services';
    if (isAdmin()) return 'Student Management';
    return 'Student Services';
  };

  const getPageDescription = () => {
    if (isStudent()) return 'Access your academic information, events, and notifications';
    if (isAdmin()) return 'View and manage students\' academic information';
    return 'Access academic information, events, and notifications';
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900">{getPageTitle()}</h1>
        <p className="text-gray-600 mt-2">
          {getPageDescription()}
        </p>
        {!isStudent() && (
          <div className="mt-2 text-sm text-blue-600">
            {canEdit() ? 'You can edit student data by clicking the Edit button on each record.' : 'You can view all student data across all classes.'}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-5 w-5 inline mr-2" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {renderContent()}
        </div>
      </div>

      {/* Edit Modals */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                Edit {editingItem.type ? editingItem.type.charAt(0).toUpperCase() + editingItem.type.slice(1) : 'Record'}
              </h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingItem(null);
                  setEditForm({});
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              {editingItem.type === 'marks' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Exam Type</label>
                      <input
                        type="text"
                        value={editForm.examType || ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, examType: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4, 5].map(num => (
                      <div key={num} className="space-y-2">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Subject {num}</label>
                          <input
                            type="text"
                            value={editForm[`subject${num}`] || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, [`subject${num}`]: e.target.value }))}
                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                            placeholder="Subject name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Marks</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={editForm[`subject${num}Marks`] || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, [`subject${num}Marks`]: Number(e.target.value) }))}
                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                            placeholder="0-100"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-md">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Total Marks: </span>
                        <span className="text-primary-600 font-semibold">
                          {[editForm.subject1Marks, editForm.subject2Marks, editForm.subject3Marks, editForm.subject4Marks, editForm.subject5Marks]
                            .filter(m => m != null && !isNaN(m))
                            .reduce((sum, m) => sum + (Number(m) || 0), 0)}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Percentage: </span>
                        <span className="text-primary-600 font-semibold">
                          {(() => {
                            const marks = [editForm.subject1Marks, editForm.subject2Marks, editForm.subject3Marks, editForm.subject4Marks, editForm.subject5Marks]
                              .filter(m => m != null && !isNaN(m));
                            const total = marks.reduce((sum, m) => sum + (Number(m) || 0), 0);
                            const maxMarks = marks.length * 100;
                            return maxMarks > 0 ? ((total / maxMarks) * 100).toFixed(2) : 0;
                          })()}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {editingItem.type === 'attendance' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4, 5].map(num => (
                      <div key={num} className="space-y-2 border border-gray-200 p-3 rounded-md">
                        <h4 className="font-medium text-gray-700">Subject {num}</h4>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Theory</label>
                            <input
                              type="text"
                              value={editForm[`subject${num}Theory`] || ''}
                              onChange={(e) => setEditForm(prev => ({ ...prev, [`subject${num}Theory`]: e.target.value }))}
                              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                              placeholder="Subject name"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Present</label>
                            <input
                              type="number"
                              min="0"
                              value={editForm[`subject${num}TheoryPresent`] || ''}
                              onChange={(e) => setEditForm(prev => ({ ...prev, [`subject${num}TheoryPresent`]: Number(e.target.value) }))}
                              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Practical</label>
                            <input
                              type="text"
                              value={editForm[`subject${num}Practical`] || ''}
                              onChange={(e) => setEditForm(prev => ({ ...prev, [`subject${num}Practical`]: e.target.value }))}
                              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                              placeholder="Subject name"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Present</label>
                            <input
                              type="number"
                              min="0"
                              value={editForm[`subject${num}PracticalPresent`] || ''}
                              onChange={(e) => setEditForm(prev => ({ ...prev, [`subject${num}PracticalPresent`]: Number(e.target.value) }))}
                              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-md">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Total Present: </span>
                        <span className="text-primary-600 font-semibold">
                          {[
                            editForm.subject1TheoryPresent, editForm.subject1PracticalPresent,
                            editForm.subject2TheoryPresent, editForm.subject2PracticalPresent,
                            editForm.subject3TheoryPresent, editForm.subject3PracticalPresent,
                            editForm.subject4TheoryPresent, editForm.subject4PracticalPresent,
                            editForm.subject5TheoryPresent, editForm.subject5PracticalPresent
                          ].filter(c => c != null && !isNaN(c))
                           .reduce((sum, c) => sum + (Number(c) || 0), 0)}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Total Classes: </span>
                        <span className="text-primary-600 font-semibold">
                          {[
                            editForm.subject1TheoryPresent, editForm.subject1PracticalPresent,
                            editForm.subject2TheoryPresent, editForm.subject2PracticalPresent,
                            editForm.subject3TheoryPresent, editForm.subject3PracticalPresent,
                            editForm.subject4TheoryPresent, editForm.subject4PracticalPresent,
                            editForm.subject5TheoryPresent, editForm.subject5PracticalPresent
                          ].filter(c => c != null && !isNaN(c)).length * 25}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Percentage: </span>
                        <span className="text-primary-600 font-semibold">
                          {(() => {
                            const presentCounts = [
                              editForm.subject1TheoryPresent, editForm.subject1PracticalPresent,
                              editForm.subject2TheoryPresent, editForm.subject2PracticalPresent,
                              editForm.subject3TheoryPresent, editForm.subject3PracticalPresent,
                              editForm.subject4TheoryPresent, editForm.subject4PracticalPresent,
                              editForm.subject5TheoryPresent, editForm.subject5PracticalPresent
                            ].filter(c => c != null && !isNaN(c));
                            const totalPresent = presentCounts.reduce((sum, c) => sum + (Number(c) || 0), 0);
                            const totalClasses = presentCounts.length * 25;
                            return totalClasses > 0 ? ((totalPresent / totalClasses) * 100).toFixed(2) : 0;
                          })()}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {editingItem.type === 'fees' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Total Fees</label>
                      <input
                        type="number"
                        min="0"
                        value={editForm.totalFees || ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, totalFees: Number(e.target.value) }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Paid Fees</label>
                      <input
                        type="number"
                        min="0"
                        value={editForm.paidFees || ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, paidFees: Number(e.target.value) }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Last Paid Date</label>
                      <input
                        type="date"
                        value={editForm.lastPaidDate || ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, lastPaidDate: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                      <input
                        type="date"
                        value={editForm.dueDate || ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, dueDate: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-md">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Total Fees: </span>
                        <span className="text-primary-600 font-semibold">₹{Number(editForm.totalFees || 0).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Paid Fees: </span>
                        <span className="text-primary-600 font-semibold">₹{Number(editForm.paidFees || 0).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Remaining: </span>
                        <span className="text-red-600 font-semibold">₹{Math.max(0, (Number(editForm.totalFees || 0) - Number(editForm.paidFees || 0))).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Admin Marks Editor Modal */}
      {editingMarks && (
        <AdminStudentEditor
          studentId={editingMarks}
          initialTab="marks"
          onClose={() => {
            setEditingMarks(null);
            fetchData(); // Refresh data after editing
          }}
        />
      )}

      {/* Admin Attendance Editor Modal */}
      {editingAttendance && (
        <AdminStudentEditor
          studentId={editingAttendance}
          initialTab="attendance"
          onClose={() => {
            setEditingAttendance(null);
            fetchData(); // Refresh data after editing
          }}
        />
      )}

      {/* Admin Fees Editor Modal */}
      {editingFees && (
        <AdminStudentEditor
          studentId={editingFees}
          initialTab="fees"
          onClose={() => {
            setEditingFees(null);
            fetchData(); // Refresh data after editing
          }}
        />
      )}
    </div>
  );
};

export default StudentServices; 