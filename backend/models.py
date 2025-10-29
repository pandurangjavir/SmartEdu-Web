from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, date
from decimal import Decimal
import os
import mysql.connector
from typing import Any, Dict, List, Optional

db = SQLAlchemy()

# 1️⃣ USERS (Admin + Students) - Enhanced
class User(db.Model):
    __tablename__ = 'users'
    
    user_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    contact_no = db.Column(db.String(15))
    password = db.Column(db.String(100), nullable=False)
    role = db.Column(db.Enum('admin', 'student'), nullable=False, default='student')
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    chat_messages = db.relationship('ChatMessage', backref='user', lazy=True)
    student = db.relationship('Student', backref='user', uselist=False, lazy=True)
    notifications = db.relationship('Notification', backref='user', lazy=True)
    
    def to_dict(self):
        return {
            'user_id': self.user_id,
            'name': self.name,
            'email': self.email,
            'contact_no': self.contact_no,
            'role': self.role,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

# 2️⃣ DEPARTMENTS
class Department(db.Model):
    __tablename__ = 'departments'
    
    dept_id = db.Column(db.Integer, primary_key=True)
    dept_name = db.Column(db.String(100), nullable=False)
    dept_code = db.Column(db.String(10), unique=True, nullable=False)
    description = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    classes = db.relationship('Class', backref='department', lazy=True)
    
    def to_dict(self):
        return {
            'dept_id': self.dept_id,
            'dept_name': self.dept_name,
            'dept_code': self.dept_code,
            'description': self.description,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat()
        }

# 3️⃣ CLASSES
class Class(db.Model):
    __tablename__ = 'classes'
    
    class_id = db.Column(db.Integer, primary_key=True)
    dept_id = db.Column(db.Integer, db.ForeignKey('departments.dept_id'), nullable=True)
    class_name = db.Column(db.String(50), nullable=False)
    class_code = db.Column(db.String(20), unique=True, nullable=False)
    academic_year = db.Column(db.String(10))
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    subjects = db.relationship('Subject', backref='class_', lazy=True)
    students = db.relationship('Student', backref='class_', lazy=True)
    
    def to_dict(self):
        return {
            'class_id': self.class_id,
            'dept_id': self.dept_id,
            'class_name': self.class_name,
            'class_code': self.class_code,
            'academic_year': self.academic_year,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat()
        }

# 4️⃣ SUBJECTS
class Subject(db.Model):
    __tablename__ = 'subjects'
    
    subject_id = db.Column(db.Integer, primary_key=True)
    class_id = db.Column(db.Integer, db.ForeignKey('classes.class_id'), nullable=False)
    subject_name = db.Column(db.String(100), nullable=False)
    subject_code = db.Column(db.String(20), nullable=False)
    credits = db.Column(db.Integer, default=4)
    description = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    marks = db.relationship('Mark', backref='subject', lazy=True)
    attendance = db.relationship('Attendance', backref='subject', lazy=True)
    
    def to_dict(self):
        return {
            'subject_id': self.subject_id,
            'class_id': self.class_id,
            'subject_name': self.subject_name,
            'subject_code': self.subject_code,
            'credits': self.credits,
            'description': self.description,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat()
        }

# 5️⃣ STUDENTS
class Student(db.Model):
    __tablename__ = 'students'
    
    student_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), unique=True, nullable=False)
    roll_no = db.Column(db.String(20), unique=True, nullable=False)
    class_id = db.Column(db.Integer, db.ForeignKey('classes.class_id'), nullable=False)
    admission_year = db.Column(db.Integer, nullable=False)
    admission_date = db.Column(db.Date)
    guardian_name = db.Column(db.String(100))
    guardian_contact = db.Column(db.String(15))
    address = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    fees = db.relationship('Fee', backref='student', uselist=False, lazy=True)
    marks = db.relationship('Mark', backref='student', lazy=True)
    attendance = db.relationship('Attendance', backref='student', lazy=True)
    
    def to_dict(self):
        return {
            'student_id': self.student_id,
            'user_id': self.user_id,
            'roll_no': self.roll_no,
            'class_id': self.class_id,
            'admission_year': self.admission_year,
            'admission_date': self.admission_date.isoformat() if self.admission_date else None,
            'guardian_name': self.guardian_name,
            'guardian_contact': self.guardian_contact,
            'address': self.address,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat()
        }

# 6️⃣ FEES
class Fee(db.Model):
    __tablename__ = 'fees'
    
    fee_id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.student_id'), unique=True, nullable=False)
    total_amount = db.Column(db.Numeric(10, 2), default=0)
    paid_amount = db.Column(db.Numeric(10, 2), default=0)
    due_amount = db.Column(db.Numeric(10, 2), default=0)
    payment_status = db.Column(db.Enum('Paid', 'Partial', 'Unpaid'), default='Unpaid')
    last_payment_date = db.Column(db.Date)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'fee_id': self.fee_id,
            'student_id': self.student_id,
            'total_amount': float(self.total_amount),
            'paid_amount': float(self.paid_amount),
            'due_amount': float(self.due_amount),
            'payment_status': self.payment_status,
            'last_payment_date': self.last_payment_date.isoformat() if self.last_payment_date else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

# 7️⃣ MARKS
class Mark(db.Model):
    __tablename__ = 'marks'
    
    mark_id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.student_id'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.subject_id'), nullable=False)
    total_marks = db.Column(db.Integer, default=35)
    obtained_marks = db.Column(db.Integer, default=0)
    exam_date = db.Column(db.Date)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'mark_id': self.mark_id,
            'student_id': self.student_id,
            'subject_id': self.subject_id,
            'total_marks': self.total_marks,
            'obtained_marks': self.obtained_marks,
            'exam_date': self.exam_date.isoformat() if self.exam_date else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

# 8️⃣ ATTENDANCE (Aggregated Counts Only)
class Attendance(db.Model):
    __tablename__ = 'attendance'
    
    attendance_id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.student_id'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.subject_id'), nullable=False)
    present_count = db.Column(db.Integer, default=0)
    absent_count = db.Column(db.Integer, default=0)
    late_count = db.Column(db.Integer, default=0)
    total_classes = db.Column(db.Integer, default=0)
    attendance_percentage = db.Column(db.Numeric(5, 2), default=0)
    academic_year = db.Column(db.String(10))
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'attendance_id': self.attendance_id,
            'student_id': self.student_id,
            'subject_id': self.subject_id,
            'present_count': self.present_count,
            'absent_count': self.absent_count,
            'late_count': self.late_count,
            'total_classes': self.total_classes,
            'attendance_percentage': float(self.attendance_percentage) if self.attendance_percentage else 0,
            'academic_year': self.academic_year,
            'updated_at': self.updated_at.isoformat()
        }

# 9️⃣ EVENTS (Enhanced)
class Event(db.Model):
    __tablename__ = 'events'
    
    event_id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    event_date = db.Column(db.Date, nullable=False)
    event_time = db.Column(db.Time)
    location = db.Column(db.String(200))
    event_type = db.Column(db.Enum('workshop', 'seminar', 'conference', 'cultural', 'sports', 'academic', 'hackathon', 'competition', 'club_event', 'general'), default='general')
    max_participants = db.Column(db.Integer)
    current_participants = db.Column(db.Integer, default=0)
    organized_by = db.Column(db.String(100), default='Admin')
    registration_link = db.Column(db.String(500))
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def get_google_form_link(self):
        """Get the appropriate Google Form link based on event type"""
        form_links = {
            'workshop': 'https://forms.gle/ekED5EhxvY7xRjok6',
            'seminar': 'https://forms.gle/ekED5EhxvY7xRjok6',
            'hackathon': 'https://forms.gle/yCUZgrkt9hrG5m5e7',
            'club_event': 'https://forms.gle/zYYxKZkUQsv1aj4U8',
            'competition': 'https://forms.gle/jXupRmdY2Q4Hwcjr6',
            'conference': 'https://forms.gle/t5pJb3FZsWcSdDBL8',
            'cultural': 'https://forms.gle/t5pJb3FZsWcSdDBL8',
            'sports': 'https://forms.gle/t5pJb3FZsWcSdDBL8',
            'academic': 'https://forms.gle/t5pJb3FZsWcSdDBL8',
            'general': 'https://forms.gle/t5pJb3FZsWcSdDBL8'
        }
        return form_links.get(self.event_type, 'https://forms.gle/t5pJb3FZsWcSdDBL8')
    
    def to_dict(self):
        # Get registration count from relationship
        registration_count = len(self.registrations) if hasattr(self, 'registrations') else 0
        
        return {
            'id': self.event_id,  # Frontend expects 'id' as key
            'event_id': self.event_id,
            'title': self.title,
            'description': self.description,
            'event_date': self.event_date.isoformat(),
            'event_time': self.event_time.isoformat() if self.event_time else None,
            'location': self.location,
            'event_type': self.event_type,
            'max_participants': self.max_participants,
            'current_participants': self.current_participants or registration_count,
            'organized_by': self.organized_by,
            'registration_link': self.registration_link or self.get_google_form_link(),
            'google_form_link': self.get_google_form_link(),
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat(),
            'registrationCount': registration_count
        }

# 🔟 ANNOUNCEMENTS (Enhanced)
class Announcement(db.Model):
    __tablename__ = 'announcements'
    
    announcement_id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    target = db.Column(db.Enum('all', 'class', 'dept', 'student'), default='all')
    target_id = db.Column(db.Integer)
    priority = db.Column(db.Enum('low', 'normal', 'high', 'urgent'), default='normal')
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime)
    
    def to_dict(self):
        return {
            'id': self.announcement_id,  # Frontend expects 'id' as key
            'announcement_id': self.announcement_id,
            'title': self.title,
            'message': self.message,
            'body': self.message,  # Also include 'body' for compatibility
            'target': self.target,
            'target_audience': self.target,  # Map target to target_audience for frontend
            'target_id': self.target_id,
            'priority': self.priority,
            'type': self.priority,  # Map priority to type for frontend
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat(),
            'expires_at': self.expires_at.isoformat() if self.expires_at else None
        }

# 1️⃣1️⃣ CHAT MESSAGES (Enhanced with sentiment)
class ChatMessage(db.Model):
    __tablename__ = 'chat_messages'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    message = db.Column(db.Text, nullable=False)
    response = db.Column(db.Text)
    intent = db.Column(db.String(100))
    confidence = db.Column(db.Float)
    sentiment_polarity = db.Column(db.Float, default=0.0)
    sentiment_label = db.Column(db.String(20), default='neutral')
    has_empathetic_prefix = db.Column(db.Boolean, default=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'message': self.message,
            'response': self.response,
            'intent': self.intent,
            'confidence': self.confidence,
            'sentiment_polarity': self.sentiment_polarity,
            'sentiment_label': self.sentiment_label,
            'has_empathetic_prefix': self.has_empathetic_prefix,
            'timestamp': self.timestamp.isoformat()
        }

# 1️⃣2️⃣ COURSES (Enhanced)
class Course(db.Model):
    __tablename__ = 'courses'
    
    course_id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    duration_weeks = db.Column(db.Integer, default=12)
    difficulty_level = db.Column(db.Enum('Beginner', 'Intermediate', 'Advanced'), default='Beginner')
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'course_id': self.course_id,
            'title': self.title,
            'description': self.description,
            'duration_weeks': self.duration_weeks,
            'difficulty_level': self.difficulty_level,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat()
        }

# 1️⃣2️⃣ EVENT REGISTRATIONS
class EventRegistration(db.Model):
    __tablename__ = 'event_registrations'
    
    registration_id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(db.Integer, db.ForeignKey('events.event_id'), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey('students.student_id'), nullable=False)
    registered_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    event = db.relationship('Event', backref='registrations', lazy=True)
    student = db.relationship('Student', backref='event_registrations', lazy=True)
    
    def to_dict(self):
        return {
            'registration_id': self.registration_id,
            'event_id': self.event_id,
            'student_id': self.student_id,
            'registered_at': self.registered_at.isoformat() if self.registered_at else None
        }

# 1️⃣3️⃣ NOTIFICATIONS (New)
class Notification(db.Model):
    __tablename__ = 'notifications'
    
    notification_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    type = db.Column(db.Enum('info', 'warning', 'success', 'error'), default='info')
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.notification_id,  # Frontend expects 'id' as key
            'notification_id': self.notification_id,
            'user_id': self.user_id,
            'title': self.title,
            'message': self.message,
            'body': self.message,  # Also include 'body' for compatibility
            'type': self.type,
            'is_read': self.is_read,
            'created_at': self.created_at.isoformat()
        }


# ---------- Raw MySQL helpers for chatbot ----------
def _get_mysql_connection():
    """Create a short-lived MySQL connection using env vars.
    Falls back to sensible defaults for local dev.
    """
    host = os.getenv('MYSQL_HOST', 'localhost')
    user = os.getenv('MYSQL_USER', 'root')
    password = os.getenv('MYSQL_PASSWORD', '')
    database = os.getenv('MYSQL_DB', 'college_system_cse')
    return mysql.connector.connect(
        host=host,
        user=user,
        password=password,
        database=database,
        auth_plugin=os.getenv('MYSQL_AUTH_PLUGIN', 'mysql_native_password')
    )


def get_fee_details(student_id: int) -> Dict[str, Any]:
    conn = None
    try:
        conn = _get_mysql_connection()
        cur = conn.cursor(dictionary=True)
        cur.execute(
            """
            SELECT fee_id, student_id, total_amount, paid_amount, due_amount, payment_status, last_payment_date
            FROM fees
            WHERE student_id = %s
            """,
            (student_id,)
        )
        row = cur.fetchone()
        return row or {}
    except Exception:
        return {}
    finally:
        try:
            if cur:
                cur.close()
        except Exception:
            pass
        if conn:
            conn.close()


def get_attendance(student_id: int) -> Dict[str, Any]:
    conn = None
    try:
        conn = _get_mysql_connection()
        cur = conn.cursor(dictionary=True)
        cur.execute(
            """
            SELECT student_id,
                   SUM(present_count) AS present_count,
                   SUM(absent_count) AS absent_count,
                   SUM(total_classes) AS total_classes,
                   ROUND(100 * SUM(present_count) / NULLIF(SUM(total_classes), 0), 2) AS attendance_percentage
            FROM attendance
            WHERE student_id = %s
            GROUP BY student_id
            """,
            (student_id,)
        )
        row = cur.fetchone()
        return row or {}
    except Exception:
        return {}
    finally:
        try:
            if cur:
                cur.close()
        except Exception:
            pass
        if conn:
            conn.close()


def get_upcoming_events(limit: int = 5) -> List[Dict[str, Any]]:
    conn = None
    try:
        conn = _get_mysql_connection()
        cur = conn.cursor(dictionary=True)
        cur.execute(
            """
            SELECT event_id, title, description, event_date, event_time, location
            FROM events
            WHERE is_active = 1 AND event_date >= CURDATE()
            ORDER BY event_date ASC
            LIMIT %s
            """,
            (limit,)
        )
        rows = cur.fetchall() or []
        # Ensure JSON-serializable values
        safe_rows: List[Dict[str, Any]] = []
        for r in rows:
            if 'event_date' in r and r['event_date'] is not None:
                try:
                    r['event_date'] = r['event_date'].isoformat()
                except Exception:
                    r['event_date'] = str(r['event_date'])
            if 'event_time' in r and r['event_time'] is not None:
                try:
                    r['event_time'] = r['event_time'].isoformat()
                except Exception:
                    r['event_time'] = str(r['event_time'])
            safe_rows.append(r)
        return safe_rows
    except Exception:
        return []
    finally:
        try:
            if cur:
                cur.close()
        except Exception:
            pass
        if conn:
            conn.close()