import os
import random
from datetime import date, datetime, timedelta

from dotenv import load_dotenv

# Ensure Flask app context and models are available
from app import app, db
from models import Student, Subject, Mark, Attendance, Fee, Class, User


def choose_subjects_for_class(class_id: int, max_subjects: int = 5):
    subjects = Subject.query.filter_by(class_id=class_id, is_active=1).order_by(Subject.subject_id.asc()).all()
    # Keep the first N subjects (stable order) to match UI expectation of 5 subjects
    return subjects[:max_subjects]


def seed_marks_for_student(student: Student, subjects: list[Subject]):
    # Remove existing marks for selected subjects to avoid duplicates
    existing = Mark.query.filter(Mark.student_id == student.student_id, Mark.subject_id.in_([s.subject_id for s in subjects])).all()
    for m in existing:
        db.session.delete(m)
    db.session.flush()

    exam_base_date = date.today() - timedelta(days=30)
    for subject in subjects:
        total_marks = 35
        obtained = random.randint(15, 35)  # realistic range, capped at 35
        mark = Mark(
            student_id=student.student_id,
            subject_id=subject.subject_id,
            total_marks=total_marks,
            obtained_marks=obtained,
            exam_date=exam_base_date + timedelta(days=random.randint(0, 20))
        )
        db.session.add(mark)


def seed_attendance_for_student(student: Student, subjects: list[Subject]):
    # Remove existing attendance for selected subjects
    existing = Attendance.query.filter(Attendance.student_id == student.student_id, Attendance.subject_id.in_([s.subject_id for s in subjects])).all()
    for a in existing:
        db.session.delete(a)
    db.session.flush()

    total_classes = 50
    for subject in subjects:
        present = random.randint(20, 48)  # realistic distribution
        absent = max(0, random.randint(0, 10))
        late = max(0, random.randint(0, 5))
        attendance_percentage = round((present / total_classes) * 100, 2)
        attendance = Attendance(
            student_id=student.student_id,
            subject_id=subject.subject_id,
            present_count=present,
            absent_count=absent,
            late_count=late,
            total_classes=total_classes,
            attendance_percentage=attendance_percentage,
            academic_year=str(date.today().year),
            updated_at=datetime.utcnow(),
        )
        db.session.add(attendance)


def seed_fees_for_student(student: Student):
    # One fee row per student
    fee = Fee.query.filter_by(student_id=student.student_id).first()
    total_amount = random.choice([60000, 65000, 70000])
    paid_amount = random.choice([total_amount, int(total_amount * 0.7), int(total_amount * 0.4), 0])
    due_amount = total_amount - paid_amount
    if paid_amount == total_amount:
        status = 'Paid'
    elif paid_amount == 0:
        status = 'Unpaid'
    else:
        status = 'Partial'

    if fee is None:
        fee = Fee(
            student_id=student.student_id,
            total_amount=total_amount,
            paid_amount=paid_amount,
            due_amount=due_amount,
            payment_status=status,
            last_payment_date=date.today() - timedelta(days=random.randint(0, 45)),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.session.add(fee)
    else:
        fee.total_amount = total_amount
        fee.paid_amount = paid_amount
        fee.due_amount = due_amount
        fee.payment_status = status
        fee.last_payment_date = date.today() - timedelta(days=random.randint(0, 45))
        fee.updated_at = datetime.utcnow()


def main():
    load_dotenv()
    with app.app_context():
        students = Student.query.join(Class).join(User).filter(User.is_active.in_([None, 1])).all()
        if not students:
            print('No students found. Aborting seeding.')
            return

        count = 0
        for student in students:
            subjects = choose_subjects_for_class(student.class_id, max_subjects=5)
            if not subjects:
                # Skip students without subjects
                continue
            seed_marks_for_student(student, subjects)
            seed_attendance_for_student(student, subjects)
            seed_fees_for_student(student)
            count += 1

        db.session.commit()
        print(f'Seeded marks, attendance, and fees for {count} students with 5 subjects each.')


if __name__ == '__main__':
    main()


