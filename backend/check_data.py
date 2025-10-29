#!/usr/bin/env python3
"""
Check database data
"""

from app import app, db
from models import User, Department, Class, Subject, Student

def check_data():
    with app.app_context():
        print('=== DATABASE SUMMARY ===')
        print(f'Users: {User.query.count()}')
        print(f'Departments: {Department.query.count()}')
        print(f'Classes: {Class.query.count()}')
        print(f'Subjects: {Subject.query.count()}')
        print(f'Students: {Student.query.count()}')
        
        print('\n=== USERS ===')
        for u in User.query.all():
            print(f'{u.user_id}: {u.name} ({u.email}) - {u.role}')
        
        print('\n=== STUDENTS ===')
        for s in Student.query.all():
            print(f'{s.roll_no}: {s.user.name} - Class ID: {s.class_id}')
        
        print('\n=== DEPARTMENTS ===')
        for d in Department.query.all():
            print(f'{d.dept_id}: {d.dept_name} ({d.dept_code})')
        
        print('\n=== CLASSES ===')
        for c in Class.query.all():
            print(f'{c.class_id}: {c.class_name} ({c.class_code})')

if __name__ == '__main__':
    check_data()
