#!/usr/bin/env python3
"""
Database initialization script for SmartEdu
This script creates all tables and inserts sample data
"""

from app import app, db
from models import (User, Department, Class, Subject, Student, Fee, Mark, 
                   Attendance, Event, Announcement, Course, Notification, ChatMessage)

def init_database():
    """Initialize database with tables and sample data"""
    
    with app.app_context():
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
        
        # 4. Insert Subjects
        subjects_data = [
            # First Year Subjects (common)
            (first_year.class_id, 'Engineering Mathematics I'),
            (first_year.class_id, 'Engineering Physics'),
            (first_year.class_id, 'Basic Electrical Engineering'),
            (first_year.class_id, 'Engineering Chemistry'),
            (first_year.class_id, 'Engineering Graphics'),
            
            # SY-CSE Subjects
            (sy_cse.class_id, 'Data Structures'),
            (sy_cse.class_id, 'Computer Networks'),
            (sy_cse.class_id, 'Database Management Systems'),
            (sy_cse.class_id, 'Operating Systems'),
            (sy_cse.class_id, 'Discrete Mathematics'),
            
            # TY-CSE Subjects
            (ty_cse.class_id, 'Web Technologies'),
            (ty_cse.class_id, 'Software Engineering'),
            (ty_cse.class_id, 'Theory of Computation'),
            (ty_cse.class_id, 'Computer Organization'),
            (ty_cse.class_id, 'Artificial Intelligence'),
            
            # Final-CSE Subjects
            (final_cse.class_id, 'Machine Learning'),
            (final_cse.class_id, 'Big Data Analytics'),
            (final_cse.class_id, 'Cloud Computing'),
            (final_cse.class_id, 'Cyber Security'),
            (final_cse.class_id, 'Blockchain Technology'),
        ]
        
        for class_id, subject_name in subjects_data:
            subject = Subject(class_id=class_id, subject_name=subject_name)
            db.session.add(subject)
        
        # 5. Insert SY-CSE Students
        sy_students_data = [
            ('Rohan Patil', 'rohan.sy@clg.com', '9000000001', '9000000001', 'SY-CSE-001'),
            ('Sneha More', 'sneha.sy@clg.com', '9000000002', '9000000002', 'SY-CSE-002'),
            ('Amit Kale', 'amit.sy@clg.com', '9000000003', '9000000003', 'SY-CSE-003'),
            ('Priya Deshmukh', 'priya.sy@clg.com', '9000000004', '9000000004', 'SY-CSE-004'),
            ('Kiran Jadhav', 'kiran.sy@clg.com', '9000000005', '9000000005', 'SY-CSE-005'),
            ('Saurabh Shinde', 'saurabh.sy@clg.com', '9000000006', '9000000006', 'SY-CSE-006'),
            ('Anjali Pawar', 'anjali.sy@clg.com', '9000000007', '9000000007', 'SY-CSE-007'),
            ('Tejas Mane', 'tejas.sy@clg.com', '9000000008', '9000000008', 'SY-CSE-008'),
            ('Neha Gaikwad', 'neha.sy@clg.com', '9000000009', '9000000009', 'SY-CSE-009'),
            ('Aditya Chavan', 'aditya.sy@clg.com', '9000000010', '9000000010', 'SY-CSE-010'),
        ]
        
        for name, email, contact, password, roll_no in sy_students_data:
            user = User(name=name, email=email, contact_no=contact, password=password, role='student')
            db.session.add(user)
            db.session.flush()
            
            student = Student(user_id=user.user_id, roll_no=roll_no, class_id=sy_cse.class_id, admission_year=2025)
            db.session.add(student)
        
        # 6. Insert TY-CSE Students
        ty_students_data = [
            ('Rohit Patil', 'rohit.ty@clg.com', '9100000001', '9100000001', 'TY-CSE-001'),
            ('Shreya Joshi', 'shreya.ty@clg.com', '9100000002', '9100000002', 'TY-CSE-002'),
            ('Akash Pawar', 'akash.ty@clg.com', '9100000003', '9100000003', 'TY-CSE-003'),
            ('Pooja Jagtap', 'pooja.ty@clg.com', '9100000004', '9100000004', 'TY-CSE-004'),
            ('Rahul Shinde', 'rahul.ty@clg.com', '9100000005', '9100000005', 'TY-CSE-005'),
            ('Megha Gawande', 'megha.ty@clg.com', '9100000006', '9100000006', 'TY-CSE-006'),
            ('Vaibhav Desai', 'vaibhav.ty@clg.com', '9100000007', '9100000007', 'TY-CSE-007'),
            ('Rutuja Kulkarni', 'rutuja.ty@clg.com', '9100000008', '9100000008', 'TY-CSE-008'),
            ('Omkar Deshmukh', 'omkar.ty@clg.com', '9100000009', '9100000009', 'TY-CSE-009'),
            ('Divya Nikam', 'divya.ty@clg.com', '9100000010', '9100000010', 'TY-CSE-010'),
        ]
        
        for name, email, contact, password, roll_no in ty_students_data:
            user = User(name=name, email=email, contact_no=contact, password=password, role='student')
            db.session.add(user)
            db.session.flush()
            
            student = Student(user_id=user.user_id, roll_no=roll_no, class_id=ty_cse.class_id, admission_year=2024)
            db.session.add(student)
        
        # 7. Insert Final-CSE Students
        final_students_data = [
            ('Rajesh Patil', 'rajesh.final@clg.com', '9200000001', '9200000001', 'FINAL-CSE-001'),
            ('Mitali Deshmukh', 'mitali.final@clg.com', '9200000002', '9200000002', 'FINAL-CSE-002'),
            ('Pratik Mane', 'pratik.final@clg.com', '9200000003', '9200000003', 'FINAL-CSE-003'),
            ('Tanvi Kulkarni', 'tanvi.final@clg.com', '9200000004', '9200000004', 'FINAL-CSE-004'),
            ('Yash Jadhav', 'yash.final@clg.com', '9200000005', '9200000005', 'FINAL-CSE-005'),
            ('Isha Pawar', 'isha.final@clg.com', '9200000006', '9200000006', 'FINAL-CSE-006'),
            ('Nikhil Shinde', 'nikhil.final@clg.com', '9200000007', '9200000007', 'FINAL-CSE-007'),
            ('Komal Gaikwad', 'komal.final@clg.com', '9200000008', '9200000008', 'FINAL-CSE-008'),
            ('Ajay Patil', 'ajay.final@clg.com', '9200000009', '9200000009', 'FINAL-CSE-009'),
            ('Snehal Jadhav', 'snehal.final@clg.com', '9200000010', '9200000010', 'FINAL-CSE-010'),
        ]
        
        for name, email, contact, password, roll_no in final_students_data:
            user = User(name=name, email=email, contact_no=contact, password=password, role='student')
            db.session.add(user)
            db.session.flush()
            
            student = Student(user_id=user.user_id, roll_no=roll_no, class_id=final_cse.class_id, admission_year=2023)
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
