#!/usr/bin/env python3
"""
Simple database initialization script for SmartEdu
This script creates all tables and inserts basic sample data
"""

from app import app, db
from models import (User, Department, Class, Subject, Student, Fee, Mark, 
                   Attendance, Event, Announcement, Course, Notification, ChatMessage)

def init_database():
    """Initialize database with tables and sample data"""
    
    with app.app_context():
        # Drop all tables first (for development)
        print("Dropping existing tables...")
        db.drop_all()
        
        # Create all tables
        print("Creating database tables...")
        db.create_all()
        print("Database tables created successfully!")
        
        # Insert sample data
        print("\nInserting sample data...")
        
        # 1. Insert Admin user
        admin_user = User(
            name='Admin',
            email='admin@clg.com',
            contact_no='9999999999',
            password='9999999999',
            role='admin'
        )
        db.session.add(admin_user)
        
        # 2. Insert Departments
        cse_dept = Department(dept_name='CSE', dept_code='CSE', description='Computer Science and Engineering')
        db.session.add(cse_dept)
        db.session.flush()  # Get the ID
        
        # 3. Insert Classes
        first_year = Class(dept_id=None, class_name='First Year', class_code='FY', academic_year='2025-26')
        sy_cse = Class(dept_id=cse_dept.dept_id, class_name='SY-CSE', class_code='SY-CSE', academic_year='2025-26')
        ty_cse = Class(dept_id=cse_dept.dept_id, class_name='TY-CSE', class_code='TY-CSE', academic_year='2024-25')
        final_cse = Class(dept_id=cse_dept.dept_id, class_name='Final-CSE', class_code='FINAL-CSE', academic_year='2023-24')
        
        db.session.add_all([first_year, sy_cse, ty_cse, final_cse])
        db.session.flush()
        
        # 4. Insert a few sample subjects
        subjects_data = [
            (sy_cse.class_id, 'Data Structures', 'DS', 4),
            (sy_cse.class_id, 'Computer Networks', 'CN', 4),
            (ty_cse.class_id, 'Web Technologies', 'WT', 4),
            (ty_cse.class_id, 'Software Engineering', 'SE', 4),
            (final_cse.class_id, 'Machine Learning', 'ML', 4),
            (final_cse.class_id, 'Cloud Computing', 'CC', 4),
        ]
        
        for class_id, subject_name, subject_code, credits in subjects_data:
            subject = Subject(
                class_id=class_id, 
                subject_name=subject_name, 
                subject_code=subject_code,
                credits=credits,
                description=f'{subject_name} course'
            )
            db.session.add(subject)
        
        # 5. Insert a few sample students
        students_data = [
            ('Rohan Patil', 'rohan.sy@clg.com', '9000000001', '9000000001', 'SY-CSE-001', sy_cse.class_id, 2025),
            ('Sneha More', 'sneha.sy@clg.com', '9000000002', '9000000002', 'SY-CSE-002', sy_cse.class_id, 2025),
            ('Rohit Patil', 'rohit.ty@clg.com', '9100000001', '9100000001', 'TY-CSE-001', ty_cse.class_id, 2024),
            ('Shreya Joshi', 'shreya.ty@clg.com', '9100000002', '9100000002', 'TY-CSE-002', ty_cse.class_id, 2024),
            ('Rajesh Patil', 'rajesh.final@clg.com', '9200000001', '9200000001', 'FINAL-CSE-001', final_cse.class_id, 2023),
            ('Mitali Deshmukh', 'mitali.final@clg.com', '9200000002', '9200000002', 'FINAL-CSE-002', final_cse.class_id, 2023),
        ]
        
        for name, email, contact, password, roll_no, class_id, admission_year in students_data:
            user = User(name=name, email=email, contact_no=contact, password=password, role='student')
            db.session.add(user)
            db.session.flush()
            
            student = Student(user_id=user.user_id, roll_no=roll_no, class_id=class_id, admission_year=admission_year)
            db.session.add(student)
        
        # Commit all changes
        db.session.commit()
        print("Sample data inserted successfully!")
        
        # Print summary
        print(f"\nDatabase Summary:")
        print(f"   Users: {User.query.count()}")
        print(f"   Departments: {Department.query.count()}")
        print(f"   Classes: {Class.query.count()}")
        print(f"   Subjects: {Subject.query.count()}")
        print(f"   Students: {Student.query.count()}")

if __name__ == '__main__':
    init_database()
