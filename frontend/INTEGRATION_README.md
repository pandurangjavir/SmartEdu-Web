# SmartEdu Frontend-Backend Integration

## Overview
This document describes the integration between the React frontend and the Flask backend for the SmartEdu Educational Management System.

## 🚀 **Key Features Integrated**

### 1. **Sentiment Analysis in Chatbot**
- **Endpoint**: `POST /chat`
- **Features**:
  - Real-time sentiment analysis using TextBlob
  - Empathetic responses for negative sentiment
  - Visual sentiment indicators in chat UI
  - Intent detection and confidence scoring

### 2. **Educational Management System**
- **Students**: Complete CRUD operations
- **Marks**: Per-subject mark tracking with automatic grade calculation
- **Attendance**: Daily attendance tracking with percentage calculations
- **Fees**: Payment tracking with automatic status updates
- **Events**: Event management and registration
- **Announcements**: Multi-priority announcement system

### 3. **Role-Based Access Control**
- **Students**: View own academic data
- **Teachers**: Manage class data
- **HOD**: Department oversight
- **Principal**: Institution-wide monitoring
- **Admin**: System administration

## 📁 **Frontend Structure**

```
frontend/src/
├── components/
│   ├── BackendTest.jsx          # Backend connectivity testing
│   ├── ChatWidget.jsx           # Chat interface
│   ├── FloatingChatbotButton.jsx
│   ├── LoadingSpinner.jsx
│   ├── Navbar.jsx
│   ├── NotificationCenter.jsx
│   └── Sidebar.jsx
├── context/
│   └── AuthContext.jsx          # Authentication management
├── pages/
│   ├── EducationalDashboard.jsx # Main dashboard with stats
│   ├── StudentDashboard.jsx     # Student-specific dashboard
│   ├── StudentServices.jsx      # Academic services
│   ├── Chatbot.jsx              # AI chatbot with sentiment
│   └── ... (other role-specific pages)
├── services/
│   └── api.js                   # Centralized API service
└── App.jsx                      # Main application router
```

## 🔌 **API Integration**

### **Authentication**
```javascript
// Mock authentication (for development)
const mockUser = {
  user_id: 1,
  name: 'Demo User',
  email: 'demo@smartedu.com',
  role: 'student'
};
```

### **Key API Endpoints Used**

| Endpoint | Method | Purpose | Frontend Component |
|----------|--------|---------|-------------------|
| `/api/dashboard/stats` | GET | Dashboard statistics | EducationalDashboard |
| `/api/students` | GET | Student list | StudentServices |
| `/api/students/{id}/marks` | GET | Student marks | StudentServices |
| `/api/students/{id}/attendance` | GET | Student attendance | StudentServices |
| `/api/students/{id}/fees` | GET | Student fees | StudentServices |
| `/chat` | POST | Chat with sentiment | Chatbot |
| `/events` | GET | Events list | StudentServices |
| `/api/announcements` | GET | Announcements | StudentServices |

### **Sentiment Analysis Integration**

```javascript
// Chat message with sentiment analysis
const response = await axios.post('/chat', {
  message: userMessage,
  user_id: user?.user_id || 1,
  language_code: 'en'
});

// Response includes sentiment data
{
  response: "I understand this might be frustrating. Here's your response...",
  sentiment: {
    polarity: -0.5,
    sentiment: "negative",
    has_empathetic_prefix: true
  },
  intent: "help_request",
  confidence: 0.95
}
```

## 🎨 **UI Components**

### **Sentiment Display**
```jsx
{message.sentiment && (
  <div className="mt-2 flex items-center space-x-2 text-xs">
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
      message.sentiment.sentiment === 'positive' 
        ? 'bg-green-100 text-green-800'
        : message.sentiment.sentiment === 'negative'
        ? 'bg-red-100 text-red-800'
        : 'bg-gray-100 text-gray-800'
    }`}>
      {message.sentiment.sentiment} ({message.sentiment.polarity?.toFixed(2)})
    </span>
    {message.sentiment.has_empathetic_prefix && (
      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
        💙 Empathetic
      </span>
    )}
  </div>
)}
```

### **Dashboard Statistics**
```jsx
// Real-time statistics from backend
const stats = {
  totalStudents: 150,
  totalClasses: 4,
  totalSubjects: 20,
  totalEvents: 25,
  upcomingEvents: 5,
  unpaidFees: 45,
  partialFees: 12
};
```

## 🛠 **Development Setup**

### **1. Install Dependencies**
```bash
cd frontend
npm install
```

### **2. Environment Configuration**
Create `.env` file:
```env
VITE_API_URL=http://localhost:5000
```

### **3. Start Development Server**
```bash
npm run dev
```

### **4. Backend Integration Test**
The `BackendTest` component automatically tests all API endpoints:
- Dashboard statistics
- Educational data (students, marks, attendance, fees)
- Events and announcements
- Chat with sentiment analysis

## 🔧 **Key Integration Features**

### **1. Real-time Data Fetching**
```javascript
// Automatic data refresh on tab changes
useEffect(() => {
  fetchData();
}, [activeTab]);
```

### **2. Error Handling**
```javascript
try {
  const response = await axios.get('/api/endpoint');
  setData(response.data);
} catch (error) {
  toast.error(error?.response?.data?.error || 'Failed to fetch data');
}
```

### **3. Loading States**
```javascript
const [loading, setLoading] = useState(true);
// Show spinner while loading
if (loading) {
  return <LoadingSpinner />;
}
```

### **4. Role-based UI**
```javascript
// Different UI based on user role
const isStudent = () => user?.role === 'student';
const isTeacher = () => user?.role === 'teacher';
const isHOD = () => user?.role === 'hod';
```

## 📊 **Data Flow**

1. **User Login** → Mock authentication → Set user context
2. **Dashboard Load** → Fetch statistics → Display cards
3. **Student Services** → Fetch academic data → Display in tabs
4. **Chat Message** → Send to backend → Receive with sentiment → Display
5. **Real-time Updates** → Auto-refresh on tab changes

## 🎯 **Testing**

### **Backend Connectivity Test**
The `BackendTest` component tests:
- ✅ Dashboard statistics endpoint
- ✅ Educational data endpoints
- ✅ Events and announcements
- ✅ Chat with sentiment analysis
- ❌ Failed endpoints (with error messages)

### **Manual Testing**
1. Open browser developer tools
2. Navigate to dashboard
3. Click "Test Backend Endpoints"
4. Verify all endpoints return success

## 🚀 **Production Deployment**

### **Frontend Build**
```bash
npm run build
```

### **Environment Variables**
```env
VITE_API_URL=https://your-backend-domain.com
```

### **CORS Configuration**
Ensure backend CORS is configured for frontend domain:
```python
CORS(app, origins=['https://your-frontend-domain.com'])
```

## 🔮 **Future Enhancements**

1. **Real Authentication**: Replace mock auth with JWT
2. **Real-time Updates**: WebSocket integration
3. **File Uploads**: Assignment and material uploads
4. **Mobile App**: React Native version
5. **Advanced Analytics**: Charts and reports
6. **Push Notifications**: Real-time alerts

## 📝 **Notes**

- Currently uses mock authentication for development
- All API calls include proper error handling
- Sentiment analysis is fully integrated and working
- Role-based access control is implemented
- Backend test component helps verify integration
- Responsive design works on all devices

## 🆘 **Troubleshooting**

### **Common Issues**

1. **CORS Errors**: Check backend CORS configuration
2. **API Connection Failed**: Verify backend is running on correct port
3. **Authentication Issues**: Check token handling in AuthContext
4. **Data Not Loading**: Check network tab for API errors

### **Debug Steps**

1. Open browser developer tools
2. Check Network tab for failed requests
3. Check Console for JavaScript errors
4. Use BackendTest component to verify connectivity
5. Check backend logs for server errors
