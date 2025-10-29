# SmartEdu Educational Management System - API Documentation

## Overview
This API provides comprehensive functionality for managing an educational institution with features for students, subjects, marks, attendance, fees, events, and more.

## Base URL
```
http://localhost:5000
```

## Authentication
Currently, the API does not implement authentication. In production, implement JWT or session-based authentication.

---

## 📚 **Core Educational Management APIs**

### **1. Departments**
- `GET /api/departments` - Get all active departments

### **2. Classes**
- `GET /api/classes` - Get all active classes
  - Query params: `dept_id` (optional) - Filter by department

### **3. Subjects**
- `GET /api/subjects` - Get all active subjects
  - Query params: `class_id` (optional) - Filter by class

### **4. Students**
- `GET /api/students` - Get all active students
  - Query params: `class_id`, `roll_no` (optional) - Filter students
- `POST /api/students` - Create a new student
- `GET /api/students/{student_id}` - Get detailed student information

**Create Student Example:**
```json
POST /api/students
{
  "user_id": 2,
  "roll_no": "CSE2024003",
  "class_id": 2,
  "admission_year": 2024,
  "admission_date": "2024-07-01",
  "guardian_name": "Parent Name",
  "guardian_contact": "9876543210",
  "address": "Student Address"
}
```

### **5. Marks Management**
- `GET /api/students/{student_id}/marks` - Get student marks
  - Query params: `subject_id`, `exam_type` (optional)
- `POST /api/students/{student_id}/marks` - Add student marks

**Add Marks Example:**
```json
POST /api/students/1/marks
{
  "subject_id": 1,
  "exam_type": "Midterm",
  "total_marks": 100,
  "obtained_marks": 85,
  "remarks": "Good performance",
  "exam_date": "2024-02-15"
}
```

### **6. Attendance Management**
- `GET /api/students/{student_id}/attendance` - Get student attendance
  - Query params: `subject_id`, `start_date`, `end_date` (optional)
- `POST /api/students/{student_id}/attendance` - Mark attendance

**Mark Attendance Example:**
```json
POST /api/students/1/attendance
{
  "subject_id": 1,
  "status": "Present",
  "date": "2024-02-15",
  "remarks": "On time"
}
```

### **7. Fees Management**
- `GET /api/students/{student_id}/fees` - Get student fees information
- `PUT /api/students/{student_id}/fees` - Update fees payment

**Update Fees Example:**
```json
PUT /api/students/1/fees
{
  "paid_amount": 25000.00
}
```

---

## 🤖 **Chatbot & Sentiment Analysis APIs**

### **8. Chat with Sentiment Analysis**
- `POST /chat` - Send message to chatbot with sentiment analysis

**Chat Example:**
```json
POST /chat
{
  "message": "I'm frustrated with this assignment!",
  "user_id": 1,
  "language_code": "en"
}
```

**Response includes sentiment data:**
```json
{
  "message_id": 123,
  "response": "I understand this might be frustrating. Here's your response...",
  "intent": "help_request",
  "confidence": 0.95,
  "sentiment": {
    "polarity": -0.5,
    "sentiment": "negative",
    "has_empathetic_prefix": true
  },
  "timestamp": "2024-01-15T10:30:00"
}
```

- `GET /api/chat/{user_id}` - Get chat history for user

---

## 📢 **Communication APIs**

### **9. Events**
- `GET /events` - Get all events
  - Query params: `active_only`, `type`, `limit` (optional)

### **10. Announcements**
- `GET /api/announcements` - Get all announcements
  - Query params: `active_only`, `priority` (optional)
- `POST /admin/announce` - Create announcement (admin only)

### **11. Notifications**
- `GET /api/users/{user_id}/notifications` - Get user notifications
  - Query param: `unread_only` (optional)
- `PUT /api/notifications/{notification_id}/read` - Mark notification as read

---

## 📊 **Dashboard & Analytics**

### **12. Dashboard Statistics**
- `GET /api/dashboard/stats` - Get system statistics

**Response:**
```json
{
  "total_students": 150,
  "total_classes": 4,
  "total_subjects": 20,
  "total_events": 25,
  "upcoming_events": 5,
  "unpaid_fees": 45,
  "partial_fees": 12
}
```

---

## 🎓 **Course Management**

### **13. Courses**
- `GET /api/courses` - Get all courses (existing endpoint)

---

## 📋 **User Management**

### **14. Users**
- `GET /api/users` - Get all users
- `POST /api/users` - Create new user

---

## 🔧 **Database Schema Features**

### **Automatic Triggers:**
1. **Fees Auto-Entry**: When a student is created, a fees record is automatically created
2. **Marks Auto-Entry**: When a student is created, marks records are created for all subjects in their class
3. **Attendance Auto-Entry**: When a student is created, attendance records are created for all subjects
4. **Grade Calculation**: Grades are automatically calculated based on marks percentage
5. **Payment Status Update**: Payment status is automatically updated when fees are paid

### **Key Relationships:**
- Users → Students (1:1)
- Students → Fees (1:1)
- Students → Marks (1:many)
- Students → Attendance (1:many)
- Classes → Subjects (1:many)
- Classes → Students (1:many)
- Departments → Classes (1:many)

---

## 🚀 **Getting Started**

1. **Install Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Initialize Database:**
   ```bash
   mysql -u username -p < database/init.sql
   ```

3. **Run the Application:**
   ```bash
   python backend/app.py
   ```

4. **Test the API:**
   ```bash
   # Test basic functionality
   curl http://localhost:5000/
   
   # Test sentiment analysis
   curl -X POST http://localhost:5000/chat \
     -H "Content-Type: application/json" \
     -d '{"message": "I love this course!", "user_id": 1}'
   ```

---

## 📝 **Response Format**

All API responses follow this format:

**Success Response:**
```json
{
  "data": [...],  // or single object
  "message": "Success"  // optional
}
```

**Error Response:**
```json
{
  "error": "Error message describing what went wrong"
}
```

---

## 🔍 **Error Codes**

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `404` - Not Found
- `500` - Internal Server Error

---

## 🎯 **Use Cases**

1. **Student Registration**: Create user → Create student → Automatic fees/marks/attendance setup
2. **Academic Management**: Add marks → Automatic grade calculation
3. **Attendance Tracking**: Mark daily attendance → Generate reports
4. **Fee Management**: Track payments → Automatic status updates
5. **Communication**: Send announcements → Notify users
6. **Support**: Chat with sentiment analysis → Empathetic responses

---

## 🔮 **Future Enhancements**

- JWT Authentication
- Role-based access control
- File upload for assignments
- Email notifications
- SMS integration
- Advanced reporting
- Mobile app support
- Real-time notifications
