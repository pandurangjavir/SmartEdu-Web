#!/usr/bin/env python3
"""
Seed all remaining tables with complete data for 30 students
This script adds Fees, Marks, Attendance, Events, Announcements, and Courses data
"""

from app import app, db
from models import (User, Department, Class, Subject, Student, Fee, Mark, 
                   Attendance, Event, Announcement, Course, Notification, ChatMessage)
from datetime import datetime, timedelta
import random

def seed_all_data():
    """Seed all tables with complete data for 30 students"""
    
    with app.app_context():
        print("\n" + "="*60)
        print("SEEDING ALL TABLES WITH DATA")
        print("="*60 + "\n")
        
        # Get existing data
        cse_dept = Department.query.filter_by(dept_code='CSE').first()
        if not cse_dept:
            print("ERROR: CSE department not found!")
            return
        
        sy_cse = Class.query.filter_by(class_code='SY-CSE').first()
        ty_cse = Class.query.filter_by(class_code='TY-CSE').first()
        final_cse = Class.query.filter_by(class_code='FINAL-CSE').first()
        
        if not sy_cse or not ty_cse or not final_cse:
            print("ERROR: Classes not found!")
            return
        
        all_students = Student.query.all()
        print(f"Found {len(all_students)} students in database")
        
        # 1. SEED FEES DATA
        print("\n[1/6] Seeding Fees...")
        fee_count = 0
        for student in all_students:
            # Get the class object
            class_obj = Class.query.get(student.class_id)
            class_code = class_obj.class_code if class_obj else ''
            
            # Get academic year based on class
            if 'SY' in class_code:
                fee_amount = 50000
            elif 'TY' in class_code:
                fee_amount = 45000
            else:
                fee_amount = 40000
            
            # Create fee record
            paid_amount = fee_amount - random.randint(0, fee_amount // 10)
            due_amount = fee_amount - paid_amount
            
            fee = Fee(
                student_id=student.student_id,
                total_amount=fee_amount,
                paid_amount=paid_amount,
                due_amount=due_amount,
                payment_status='Paid' if due_amount == 0 else 'Unpaid',
                last_payment_date=datetime.now() - timedelta(days=random.randint(1, 30))
            )
            db.session.add(fee)
            fee_count += 1
        
        print(f"   Created {fee_count} fee records")
        
        # 2. SEED MARKS DATA
        print("\n[2/6] Seeding Marks...")
        mark_count = 0
        all_subjects = Subject.query.all()
        
        for student in all_students:
            # Get subjects for this student's class
            subjects_for_class = [s for s in all_subjects if s.class_id == student.class_id]
            
            for subject in subjects_for_class:
                # Generate random marks (between 40 and 95)
                obtained_marks = random.randint(40, 95)
                total_marks = 100
                
                # Determine grade based on marks
                if obtained_marks >= 85:
                    grade = 'A+'
                elif obtained_marks >= 75:
                    grade = 'A'
                elif obtained_marks >= 65:
                    grade = 'B+'
                elif obtained_marks >= 55:
                    grade = 'B'
                elif obtained_marks >= 45:
                    grade = 'C'
                else:
                    grade = 'D'
                
                mark = Mark(
                    student_id=student.student_id,
                    subject_id=subject.subject_id,
                    exam_type=random.choice(['Midterm', 'Final', 'Assignment']),
                    total_marks=total_marks,
                    obtained_marks=obtained_marks,
                    grade=grade,
                    remarks=f'Good performance in {subject.subject_name}',
                    exam_date=datetime.now() - timedelta(days=random.randint(1, 90))
                )
                db.session.add(mark)
                mark_count += 1
        
        print(f"   Created {mark_count} mark records")
        
        # 3. SEED ATTENDANCE DATA
        print("\n[3/6] Seeding Attendance...")
        attendance_count = 0
        
        # Generate attendance for the last 30 days for each subject
        for student in all_students:
            subjects_for_class = [s for s in all_subjects if s.class_id == student.class_id]
            
            for subject in subjects_for_class:
                for i in range(30):  # Last 30 days
                    date = datetime.now() - timedelta(days=i)
                    
                    # Skip weekends
                    if date.weekday() >= 5:
                        continue
                    
                    # Random attendance (90% chance present)
                    status = 'Present' if random.random() > 0.1 else 'Absent'
                    
                    attendance = Attendance(
                        student_id=student.student_id,
                        subject_id=subject.subject_id,
                        date=date,
                        status=status,
                        remarks='Regular attendance' if status == 'Present' else 'Absent'
                    )
                    db.session.add(attendance)
                    attendance_count += 1
        
        print(f"   Created {attendance_count} attendance records")
        
        # 4. SEED EVENTS DATA
        print("\n[4/6] Seeding Events...")
        events_data = [
            ('College Annual Day', 'Annual cultural and technical fest', datetime.now() + timedelta(days=30), 'Main Auditorium', 'cultural'),
            ('Technical Symposium', 'Tech competition and workshops', datetime.now() + timedelta(days=15), 'CSE Department', 'workshop'),
            ('Sports Meet', 'Inter-college sports competition', datetime.now() + timedelta(days=45), 'Sports Ground', 'sports'),
            ('Placement Drive', 'Campus recruitment by top companies', datetime.now() + timedelta(days=60), 'Auditorium', 'academic'),
            ('Guest Lecture - AI & ML', 'Industry expert session', datetime.now() + timedelta(days=7), 'Seminar Hall', 'seminar'),
            ('Hackathon', 'Coding competition', datetime.now() + timedelta(days=20), 'Computer Lab', 'workshop'),
        ]
        
        event_count = 0
        for title, description, event_date, location, event_type in events_data:
            event = Event(
                title=title,
                description=description,
                event_date=event_date,
                location=location,
                event_type=event_type,
                max_participants=random.randint(50, 200),
                current_participants=random.randint(10, 50),
                is_active=True
            )
            db.session.add(event)
            event_count += 1
        
        print(f"   Created {event_count} events")
        
        # 5. SEED ANNOUNCEMENTS DATA
        print("\n[5/6] Seeding Announcements...")
        announcements_data = [
            ('Mid-Semester Exams', 'Mid-semester exams starting from next week. Check your exam schedule.', datetime.now() - timedelta(days=5)),
            ('Fee Payment Deadline', 'Last date for fee payment is extended. Kindly complete payment before deadline.', datetime.now() - timedelta(days=10)),
            ('Library Book Return', 'Return all issued library books before exams. Avoid late fee charges.', datetime.now() - timedelta(days=3)),
            ('Project Submission', 'Final year project submission deadline is approaching. Complete your documentation.', datetime.now() - timedelta(days=15)),
            ('Scholarship Application', 'Merit-based scholarship applications are open. Apply before the deadline.', datetime.now() - timedelta(days=1)),
            ('College Carnival', 'Annual college carnival coming soon. Register for events and competitions.', datetime.now() - timedelta(days=7)),
        ]
        
        ann_count = 0
        for title, message, created_at in announcements_data:
            announcement = Announcement(
                title=title,
                message=message,
                target='all',
                priority=random.choice(['low', 'normal', 'high']),
                is_active=True,
                created_at=created_at,
                expires_at=created_at + timedelta(days=30)
            )
            db.session.add(announcement)
            ann_count += 1
        
        print(f"   Created {ann_count} announcements")
        
        # 6. SEED COURSES DATA (Educational courses)
        print("\n[6/6] Seeding Courses...")
        courses_data = [
            ('Python Programming Basics', 'Introduction to Python programming language'),
            ('Web Development Fundamentals', 'HTML, CSS, and JavaScript essentials'),
            ('Database Design and SQL', 'Relational database concepts and SQL queries'),
            ('Data Structures and Algorithms', 'Core computer science algorithms'),
            ('Machine Learning Basics', 'Introduction to ML concepts and models'),
        ]
        
        course_count = 0
        for title, description in courses_data:
            course = Course(
                title=title,
                description=description,
                duration_weeks=random.randint(8, 16),
                difficulty_level=random.choice(['Beginner', 'Intermediate', 'Advanced']),
                is_active=True
            )
            db.session.add(course)
            course_count += 1
        
        print(f"   Created {course_count} courses")
        
        # Commit all changes
        try:
            db.session.commit()
            print("\n" + "="*60)
            print("ALL DATA SUCCESSFULLY SEEDED!")
            print("="*60 + "\n")
            
            # Print final summary
            print("DATABASE SUMMARY:")
            print(f"   Users: {User.query.count()}")
            print(f"   Departments: {Department.query.count()}")
            print(f"   Classes: {Class.query.count()}")
            print(f"   Subjects: {Subject.query.count()}")
            print(f"   Students: {Student.query.count()}")
            print(f"   Fees: {Fee.query.count()}")
            print(f"   Marks: {Mark.query.count()}")
            print(f"   Attendance: {Attendance.query.count()}")
            print(f"   Events: {Event.query.count()}")
            print(f"   Announcements: {Announcement.query.count()}")
            print(f"   Courses: {Course.query.count()}")
            
            print("\nStudents by Class:")
            print(f"   SY-CSE: {Student.query.filter_by(class_id=sy_cse.class_id).count()}")
            print(f"   TY-CSE: {Student.query.filter_by(class_id=ty_cse.class_id).count()}")
            print(f"   Final-CSE: {Student.query.filter_by(class_id=final_cse.class_id).count()}")
            
            print("\n" + "="*60)
            print("[SUCCESS] Database fully populated with all data!")
            print("="*60 + "\n")
            
        except Exception as e:
            db.session.rollback()
            print(f"\n[ERROR] Failed to commit data: {str(e)}")

if __name__ == '__main__':
    seed_all_data()
