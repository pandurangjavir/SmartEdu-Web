"""
Test script for the SmartEdu Chatbot API routes
Run this script to test the API endpoints
"""

import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:5000"

def test_chat_endpoint():
    """Test the /chat endpoint"""
    print("Testing /chat endpoint...")
    
    test_messages = [
        "Hello, I need help with courses",
        "What events are available?",
        "Tell me about Python programming",
        "I want to register for a workshop",
        "Goodbye"
    ]
    
    for message in test_messages:
        response = requests.post(f"{BASE_URL}/chat", json={
            "message": message,
            "user_id": 1
        })
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Message: '{message}'")
            print(f"   Response: {data['response']}")
            print(f"   Intent: {data['intent']} (confidence: {data['confidence']:.2f})")
            print(f"   Suggestions: {data['suggestions']}")
            print()
        else:
            print(f"❌ Error: {response.status_code} - {response.text}")

def test_events_endpoint():
    """Test the /events endpoint"""
    print("Testing /events endpoint...")
    
    # Test basic events fetch
    response = requests.get(f"{BASE_URL}/events")
    if response.status_code == 200:
        events = response.json()
        print(f"✅ Found {len(events)} events")
        for event in events:
            print(f"   - {event['title']} ({event['event_type']}) on {event['event_date']}")
    else:
        print(f"❌ Error: {response.status_code} - {response.text}")
    
    # Test with filters
    print("\nTesting events with filters...")
    response = requests.get(f"{BASE_URL}/events?type=workshop&limit=2")
    if response.status_code == 200:
        events = response.json()
        print(f"✅ Found {len(events)} workshop events (limited to 2)")
    else:
        print(f"❌ Error: {response.status_code} - {response.text}")

def test_announcements_endpoint():
    """Test the /admin/announce endpoint"""
    print("Testing /admin/announce endpoint...")
    
    # Create a test announcement
    announcement_data = {
        "title": "Test Announcement",
        "content": "This is a test announcement created via API",
        "priority": "normal",
        "expires_at": (datetime.now() + timedelta(days=7)).isoformat()
    }
    
    response = requests.post(f"{BASE_URL}/admin/announce", json=announcement_data)
    if response.status_code == 201:
        data = response.json()
        print(f"✅ Created announcement: {data['title']}")
        print(f"   Priority: {data['priority']}")
        print(f"   Expires: {data['expires_at']}")
    else:
        print(f"❌ Error: {response.status_code} - {response.text}")
    
    # Test getting announcements
    print("\nTesting /api/announcements endpoint...")
    response = requests.get(f"{BASE_URL}/api/announcements")
    if response.status_code == 200:
        announcements = response.json()
        print(f"✅ Found {len(announcements)} announcements")
        for announcement in announcements:
            print(f"   - {announcement['title']} ({announcement['priority']})")
    else:
        print(f"❌ Error: {response.status_code} - {response.text}")

def test_users_endpoint():
    """Test the users endpoints"""
    print("Testing users endpoints...")
    
    # Get users
    response = requests.get(f"{BASE_URL}/api/users")
    if response.status_code == 200:
        users = response.json()
        print(f"✅ Found {len(users)} users")
    else:
        print(f"❌ Error: {response.status_code} - {response.text}")
    
    # Create a test user
    user_data = {
        "username": "test_user",
        "email": "test@example.com"
    }
    
    response = requests.post(f"{BASE_URL}/api/users", json=user_data)
    if response.status_code == 201:
        data = response.json()
        print(f"✅ Created user: {data['username']}")
    else:
        print(f"❌ Error: {response.status_code} - {response.text}")

if __name__ == "__main__":
    print("🚀 Testing SmartEdu Chatbot API")
    print("=" * 50)
    
    try:
        # Test if server is running
        response = requests.get(f"{BASE_URL}/")
        if response.status_code == 200:
            print("✅ Server is running")
            print()
        else:
            print("❌ Server is not responding")
            exit(1)
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to server. Make sure Flask app is running on http://localhost:5000")
        exit(1)
    
    # Run tests
    test_chat_endpoint()
    print("=" * 50)
    test_events_endpoint()
    print("=" * 50)
    test_announcements_endpoint()
    print("=" * 50)
    test_users_endpoint()
    
    print("\n🎉 All tests completed!")
