import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { 
  CalendarIcon, 
  ClockIcon, 
  MapPinIcon,
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlusIcon,
  TrashIcon,
  ArrowTopRightOnSquareIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

const EventRegistration = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchEvents();
    }
  }, [user]);

  const fetchEvents = async () => {
    try {
      const response = await axios.get('/api/events');
      
      if (response.data.success) {
        setEvents(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  // Note: Registration tracking is now handled by Google Forms
  // No need to fetch internal registrations

  // Note: Registration is now handled through Google Forms
  // The old registration logic has been removed as we're using external forms

  const deleteEvent = async (eventId) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    
    try {
      await axios.delete(`/api/events/${eventId}`);
      toast.success('Event deleted successfully!');
      fetchEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event');
    }
  };

  const isAdmin = () => {
    return user?.role === 'admin';
  };

  const getEventTypeInfo = (eventType) => {
    const typeInfo = {
      'workshop': { 
        label: 'Workshop', 
        color: 'bg-blue-100 text-blue-800', 
        icon: '🔧',
        formType: 'Workshop/Seminar Registration'
      },
      'seminar': { 
        label: 'Seminar', 
        color: 'bg-purple-100 text-purple-800', 
        icon: '🎓',
        formType: 'Workshop/Seminar Registration'
      },
      'hackathon': { 
        label: 'Hackathon', 
        color: 'bg-green-100 text-green-800', 
        icon: '💻',
        formType: 'Hackathon Event Registration'
      },
      'club_event': { 
        label: 'Club Event', 
        color: 'bg-orange-100 text-orange-800', 
        icon: '🎭',
        formType: 'Club Event Registration'
      },
      'competition': { 
        label: 'Competition', 
        color: 'bg-red-100 text-red-800', 
        icon: '🏆',
        formType: 'Competition Registration'
      },
      'conference': { 
        label: 'Conference', 
        color: 'bg-indigo-100 text-indigo-800', 
        icon: '🏛️',
        formType: 'College Event Registration'
      },
      'cultural': { 
        label: 'Cultural', 
        color: 'bg-pink-100 text-pink-800', 
        icon: '🎨',
        formType: 'College Event Registration'
      },
      'sports': { 
        label: 'Sports', 
        color: 'bg-yellow-100 text-yellow-800', 
        icon: '⚽',
        formType: 'College Event Registration'
      },
      'academic': { 
        label: 'Academic', 
        color: 'bg-gray-100 text-gray-800', 
        icon: '📚',
        formType: 'College Event Registration'
      },
      'general': { 
        label: 'General', 
        color: 'bg-gray-100 text-gray-800', 
        icon: '📅',
        formType: 'College Event Registration'
      }
    };
    return typeInfo[eventType] || typeInfo['general'];
  };

  const openGoogleForm = (event) => {
    const formLink = event.google_form_link || event.registration_link;
    if (formLink) {
      window.open(formLink, '_blank', 'noopener,noreferrer');
      toast.success('Opening registration form in new tab...');
    } else {
      toast.error('Registration form not available for this event');
    }
  };

  const getEventStatus = (eventDate) => {
    const today = new Date();
    const event = new Date(eventDate);
    const diffTime = event - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { status: 'past', color: 'gray', text: 'Past Event' };
    if (diffDays === 0) return { status: 'today', color: 'red', text: 'Today' };
    if (diffDays <= 7) return { status: 'upcoming', color: 'orange', text: 'This Week' };
    return { status: 'future', color: 'green', text: 'Upcoming' };
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredEvents = events.filter(event => {
    const eventStatus = getEventStatus(event.event_date);
    if (activeTab === 'all') return true;
    if (activeTab === 'upcoming') return eventStatus.status !== 'past';
    if (activeTab === 'past') return eventStatus.status === 'past';
    return true;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Event Registration</h1>
        <p className="text-gray-600">Discover and register for college events using our professional Google Forms</p>
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <DocumentTextIcon className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-blue-900">Professional Registration Forms</h3>
              <p className="text-sm text-blue-700 mt-1">
                Each event type uses a specialized Google Form designed for optimal data collection and user experience.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'all', label: 'All Events' },
              { key: 'upcoming', label: 'Upcoming' },
              { key: 'past', label: 'Past Events' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEvents.map((event) => {
          const eventStatus = getEventStatus(event.event_date);
          const eventTypeInfo = getEventTypeInfo(event.event_type);
          
          return (
            <div key={event.event_id} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow duration-200">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{eventTypeInfo.icon}</span>
                      <h3 className="text-lg font-semibold text-gray-900">{event.title}</h3>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${eventTypeInfo.color}`}>
                      {eventTypeInfo.label}
                    </span>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    eventStatus.color === 'green' ? 'bg-green-100 text-green-800' :
                    eventStatus.color === 'orange' ? 'bg-orange-100 text-orange-800' :
                    eventStatus.color === 'red' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {eventStatus.text}
                  </span>
                </div>

                {event.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">{event.description}</p>
                )}

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {formatDate(event.event_date)}
                  </div>
                  
                  {event.event_time && (
                    <div className="flex items-center text-sm text-gray-600">
                      <ClockIcon className="h-4 w-4 mr-2" />
                      {formatTime(event.event_time)}
                    </div>
                  )}
                  
                  {event.location && (
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPinIcon className="h-4 w-4 mr-2" />
                      {event.location}
                    </div>
                  )}
                  
                  <div className="flex items-center text-sm text-gray-600">
                    <UserGroupIcon className="h-4 w-4 mr-2" />
                    {event.registrationCount} registered
                    {event.max_participants && ` / ${event.max_participants} max`}
                  </div>
                </div>

                {/* Google Form Registration Section */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <DocumentTextIcon className="h-5 w-5 text-blue-600 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{eventTypeInfo.formType}</p>
                        <p className="text-xs text-gray-600">Professional registration form</p>
                      </div>
                    </div>
                    <button
                      onClick={() => openGoogleForm(event)}
                      disabled={eventStatus.status === 'past'}
                      className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
                    >
                      <ArrowTopRightOnSquareIcon className="h-4 w-4 mr-2" />
                      Register Now
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm text-gray-600">
                    <UserGroupIcon className="h-4 w-4 mr-2" />
                    {event.registrationCount} registered
                    {event.max_participants && ` / ${event.max_participants} max`}
                  </div>

                  <div className="flex space-x-2">
                    {isAdmin() && (
                      <button
                        onClick={() => deleteEvent(event.event_id)}
                        className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors duration-200 flex items-center"
                      >
                        <TrashIcon className="h-4 w-4 mr-1" />
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredEvents.length === 0 && (
        <div className="text-center py-12">
          <CalendarIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
          <p className="text-gray-600">There are no events available for the selected filter.</p>
        </div>
      )}

      {/* Registration Information */}
      <div className="mt-8 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Registration Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <span className="text-2xl mr-3">🔧</span>
              <h3 className="font-medium text-gray-900">Workshops & Seminars</h3>
            </div>
            <p className="text-sm text-gray-600">Technical workshops and educational seminars</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <span className="text-2xl mr-3">💻</span>
              <h3 className="font-medium text-gray-900">Hackathons</h3>
            </div>
            <p className="text-sm text-gray-600">Coding competitions and innovation challenges</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <span className="text-2xl mr-3">🎭</span>
              <h3 className="font-medium text-gray-900">Club Events</h3>
            </div>
            <p className="text-sm text-gray-600">Student club activities and social events</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <span className="text-2xl mr-3">🏆</span>
              <h3 className="font-medium text-gray-900">Competitions</h3>
            </div>
            <p className="text-sm text-gray-600">Academic and extracurricular competitions</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <span className="text-2xl mr-3">🎨</span>
              <h3 className="font-medium text-gray-900">Cultural Events</h3>
            </div>
            <p className="text-sm text-gray-600">Cultural festivals and artistic performances</p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <span className="text-2xl mr-3">⚽</span>
              <h3 className="font-medium text-gray-900">Sports Events</h3>
            </div>
            <p className="text-sm text-gray-600">Sports tournaments and athletic competitions</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventRegistration;
