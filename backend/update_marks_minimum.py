#!/usr/bin/env python3
"""
Update all marks to ensure minimum 35 marks in all subjects
This script will:
1. Check current marks data
2. Update any marks below 35 to 35
3. Recalculate grades and percentages
"""

from app import app, db
from models import Mark, Student, Subject
from decimal import Decimal
from datetime import datetime

def update_marks_minimum():
    """Update all marks to ensure minimum 35 marks"""
    
    with app.app_context():
        print("\n" + "="*60)
        print("UPDATING MARKS TO MINIMUM 35")
        print("="*60 + "\n")
        
        # Get all marks
        all_marks = Mark.query.all()
        print(f"Found {len(all_marks)} marks in database")
        
        updated_count = 0
        unchanged_count = 0
        
        for mark in all_marks:
            original_marks = mark.obtained_marks
            total_marks = mark.total_marks
            
            # Check if marks are below 35
            if original_marks < 35:
                # Update to minimum 35
                mark.obtained_marks = 35
                
                # Recalculate percentage
                percentage = (35 / total_marks) * 100
                mark.total_percentage = Decimal(str(round(percentage, 2)))
                
                # Recalculate grade based on new marks
                if percentage >= 90:
                    grade = 'A+'
                elif percentage >= 80:
                    grade = 'A'
                elif percentage >= 70:
                    grade = 'B+'
                elif percentage >= 60:
                    grade = 'B'
                elif percentage >= 50:
                    grade = 'C+'
                elif percentage >= 40:
                    grade = 'C'
                elif percentage >= 35:
                    grade = 'D'
                else:
                    grade = 'F'
                
                mark.grade = grade
                mark.remarks = f"Updated to minimum 35 marks (was {original_marks})"
                mark.updated_at = datetime.utcnow()
                
                updated_count += 1
                print(f"   Updated Student {mark.student_id}, Subject {mark.subject_id}: {original_marks} → 35 (Grade: {grade})")
            else:
                unchanged_count += 1
        
        # Commit all changes
        try:
            db.session.commit()
            print("\n" + "="*60)
            print("MARKS UPDATE COMPLETED!")
            print("="*60 + "\n")
            print(f"✅ Updated {updated_count} marks to minimum 35")
            print(f"✅ {unchanged_count} marks were already >= 35")
            print(f"✅ Total marks processed: {len(all_marks)}")
            
            # Verify the update
            print("\nVerification:")
            marks_below_35 = Mark.query.filter(Mark.obtained_marks < 35).count()
            print(f"   Marks below 35 after update: {marks_below_35}")
            
            if marks_below_35 == 0:
                print("   ✅ All marks now meet minimum requirement!")
            else:
                print("   ❌ Some marks still below 35!")
            
        except Exception as e:
            db.session.rollback()
            print(f"\n❌ Error updating marks: {str(e)}")

def check_marks_distribution():
    """Check the distribution of marks after update"""
    
    with app.app_context():
        print("\n" + "="*60)
        print("MARKS DISTRIBUTION ANALYSIS")
        print("="*60 + "\n")
        
        # Get grade distribution
        grades = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F']
        
        for grade in grades:
            count = Mark.query.filter_by(grade=grade).count()
            print(f"   Grade {grade}: {count} students")
        
        # Get marks range distribution
        ranges = [
            (35, 40, "35-40"),
            (40, 50, "40-50"),
            (50, 60, "50-60"),
            (60, 70, "60-70"),
            (70, 80, "70-80"),
            (80, 90, "80-90"),
            (90, 100, "90-100")
        ]
        
        print("\nMarks Range Distribution:")
        for min_marks, max_marks, label in ranges:
            count = Mark.query.filter(
                Mark.obtained_marks >= min_marks,
                Mark.obtained_marks < max_marks
            ).count()
            print(f"   {label}: {count} students")

if __name__ == '__main__':
    update_marks_minimum()
    check_marks_distribution()
