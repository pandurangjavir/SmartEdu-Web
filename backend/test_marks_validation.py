#!/usr/bin/env python3
"""
Test script to verify marks validation with minimum 35 marks requirement
"""

import requests
import json

BASE_URL = "http://localhost:5000"

def test_marks_validation():
    """Test marks validation endpoints"""
    print("🧪 Testing Marks Validation System")
    print("=" * 50)
    
    # Test 1: Try to add marks below 35 (should fail)
    print("\n1. Testing marks below 35 (should fail):")
    test_data_below_35 = {
        "subject_id": 1,
        "obtained_marks": 25,  # Below minimum
        "total_marks": 100,
        "remarks": "Test marks below minimum"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/students/1/marks", json=test_data_below_35)
        if response.status_code == 400:
            print("✅ Correctly rejected marks below 35")
            print(f"   Error: {response.json()['error']}")
        else:
            print(f"❌ Unexpected response: {response.status_code}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Test 2: Try to add marks exactly 35 (should pass)
    print("\n2. Testing marks exactly 35 (should pass):")
    test_data_exactly_35 = {
        "subject_id": 2,
        "obtained_marks": 35,  # Exactly minimum
        "total_marks": 100,
        "remarks": "Test marks at minimum"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/students/1/marks", json=test_data_exactly_35)
        if response.status_code == 201:
            print("✅ Correctly accepted marks at 35")
            mark_data = response.json()
            print(f"   Grade: {mark_data['grade']}")
        else:
            print(f"❌ Unexpected response: {response.status_code}")
            print(f"   Error: {response.json().get('error', 'Unknown error')}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Test 3: Try to add marks above 35 (should pass)
    print("\n3. Testing marks above 35 (should pass):")
    test_data_above_35 = {
        "subject_id": 3,
        "obtained_marks": 75,  # Above minimum
        "total_marks": 100,
        "remarks": "Test marks above minimum"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/students/1/marks", json=test_data_above_35)
        if response.status_code == 201:
            print("✅ Correctly accepted marks above 35")
            mark_data = response.json()
            print(f"   Grade: {mark_data['grade']}")
        else:
            print(f"❌ Unexpected response: {response.status_code}")
            print(f"   Error: {response.json().get('error', 'Unknown error')}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Test 4: Try to update existing marks to below 35 (should fail)
    print("\n4. Testing update marks below 35 (should fail):")
    update_data_below_35 = {
        "obtained_marks": 20,  # Below minimum
        "remarks": "Updated to below minimum"
    }
    
    try:
        # First get existing marks to find a mark_id
        response = requests.get(f"{BASE_URL}/api/students/1/marks")
        if response.status_code == 200:
            marks = response.json()
            if marks:
                mark_id = marks[0]['mark_id']
                update_response = requests.put(f"{BASE_URL}/api/students/1/marks/{mark_id}", json=update_data_below_35)
                if update_response.status_code == 400:
                    print("✅ Correctly rejected update to marks below 35")
                    print(f"   Error: {update_response.json()['error']}")
                else:
                    print(f"❌ Unexpected response: {update_response.status_code}")
            else:
                print("❌ No existing marks found for testing")
        else:
            print(f"❌ Could not fetch existing marks: {response.status_code}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Test 5: Verify all marks in database are >= 35
    print("\n5. Verifying all marks in database are >= 35:")
    try:
        response = requests.get(f"{BASE_URL}/api/students/1/marks")
        if response.status_code == 200:
            marks = response.json()
            marks_below_35 = [mark for mark in marks if mark['obtained_marks'] < 35]
            if len(marks_below_35) == 0:
                print("✅ All marks in database are >= 35")
                print(f"   Total marks checked: {len(marks)}")
            else:
                print(f"❌ Found {len(marks_below_35)} marks below 35")
                for mark in marks_below_35:
                    print(f"   Student {mark['student_id']}, Subject {mark['subject_id']}: {mark['obtained_marks']}")
        else:
            print(f"❌ Could not fetch marks: {response.status_code}")
    except Exception as e:
        print(f"❌ Error: {e}")

def test_server_connection():
    """Test if server is running"""
    try:
        response = requests.get(f"{BASE_URL}/")
        if response.status_code == 200:
            print("✅ Server is running")
            return True
        else:
            print("❌ Server is not responding correctly")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to server. Make sure Flask app is running on http://localhost:5000")
        return False

if __name__ == "__main__":
    print("🚀 Testing SmartEdu Marks Validation System")
    print("=" * 60)
    
    if test_server_connection():
        test_marks_validation()
        print("\n" + "=" * 60)
        print("🎉 Marks validation testing completed!")
    else:
        print("\n❌ Cannot proceed without server connection")
