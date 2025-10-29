from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
from models import (db, User, Department, Class, Subject, Student, Fee, Mark, 
                   Attendance, Event, EventRegistration, Announcement, Course, Notification, ChatMessage,
                   get_fee_details, get_attendance, get_upcoming_events)
from rasa_service import rasa_service
from config import config
import json
import os
from datetime import datetime, timedelta, date
from decimal import Decimal
from textblob import TextBlob
import PyPDF2
import docx
import re

app = Flask(__name__)
CORS(app, origins=['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001'])

# Load configuration
config_name = os.getenv('FLASK_ENV', 'development')
app.config.from_object(config[config_name])

# Initialize database
db.init_app(app)

def detect_admin_filters(message):
    """Detect class, roll number, or name filters from message"""
    filters = {
        'class_filter': None,
        'roll_filter': None,
        'name_filter': None,
        'target_student_id': None
    }
    
    # First check for specific roll number match
    roll_search = Student.query.filter_by(roll_no=message).first()
    if roll_search:
        filters['target_student_id'] = roll_search.student_id
        filters['roll_filter'] = message
        return filters
    
    # Check for partial roll number match
    roll_search = Student.query.filter(Student.roll_no.ilike(f'%{message}%')).first()
    if roll_search:
        filters['target_student_id'] = roll_search.student_id
        filters['roll_filter'] = message
        return filters
    
    words = message.lower().split()
    for word in words:
        # Check for class filters (TY, SY, FY, BE with optional branch like CSE, ECE, etc.)
        word_upper = word.upper()
        # Match patterns like TY, SY, FY, BE, or combination like TY-CSE, SY-CSE, etc.
        class_patterns = ['TY-CSE', 'TY-ECE', 'TY-IT', 'SY-CSE', 'SY-ECE', 'SY-IT', 'FY-CSE', 'FY-ECE', 'FY-IT']
        if any(pattern in word_upper for pattern in class_patterns) or word_upper in ['TY', 'SY', 'FY', 'BE']:
            filters['class_filter'] = word
        # Check for roll number (numbers with 2+ digits)
        elif word.isdigit() and len(word) >= 2:
            filters['roll_filter'] = word
        # Check for student name
        else:
            student_search = Student.query.join(User).filter(User.name.ilike(f'%{word}%')).first()
            if student_search:
                filters['name_filter'] = word
                filters['target_student_id'] = student_search.student_id
                break
    
    # If roll number is specified, find student by roll number
    if filters['roll_filter'] and not filters['target_student_id']:
        student_search = Student.query.filter_by(roll_no=filters['roll_filter']).first()
        if student_search:
            filters['target_student_id'] = student_search.student_id
    
    return filters

# Authentication endpoints
@app.route('/api/auth/login', methods=['POST'])
def login():
    """
    Authenticate user login
    """
    try:
        data = request.get_json()
        
        if not data or not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Email and password are required'}), 400
        
        email = data['email']
        password = data['password']
        
        # Find user by email
        user = User.query.filter_by(email=email).first()
        
        if not user:
            return jsonify({'error': 'Invalid email or password'}), 401
        
        # Check password (in production, use proper password hashing)
        if user.password != password:
            return jsonify({'error': 'Invalid email or password'}), 401
        
        # Generate token (in production, use JWT)
        token = f"token-{user.user_id}-{datetime.now().timestamp()}"
        
        # Return user data and token
        user_data = {
            'user_id': user.user_id,
            'name': user.name,
            'email': user.email,
            'role': user.role,
            'contact_no': user.contact_no
        }
        
        return jsonify({
            'success': True,
            'token': token,
            'user': user_data
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Login failed: {str(e)}'}), 500

@app.route('/api/auth/profile', methods=['GET'])
def get_profile():
    """
    Get user profile (requires authentication)
    """
    try:
        # In production, verify JWT token here
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authorization token required'}), 401
        
        token = auth_header.split(' ')[1]
        # For now, extract user_id from token (in production, verify JWT)
        if token.startswith('token-'):
            user_id = int(token.split('-')[1])
            user = db.session.get(User, user_id)
            
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            user_data = {
                'user_id': user.user_id,
                'name': user.name,
                'email': user.email,
                'role': user.role,
                'contact_no': user.contact_no
            }
            
            return jsonify({'user': user_data}), 200
        else:
            return jsonify({'error': 'Invalid token'}), 401
            
    except Exception as e:
        return jsonify({'error': f'Profile fetch failed: {str(e)}'}), 500

# Sentiment Analysis Functions
def analyze_sentiment(text):
    """
    Analyze sentiment of text using TextBlob
    Returns polarity score (-1 to 1) and sentiment label
    """
    try:
        blob = TextBlob(text)
        polarity = blob.sentiment.polarity
        
        # Determine sentiment label
        if polarity > 0.1:
            sentiment_label = "positive"
        elif polarity < -0.1:
            sentiment_label = "negative"
        else:
            sentiment_label = "neutral"
            
        return {
            'polarity': polarity,
            'sentiment': sentiment_label
        }
    except Exception as e:
        print(f"Sentiment analysis error: {str(e)}")
        return {
            'polarity': 0.0,
            'sentiment': 'neutral'
        }

def get_empathetic_prefix(sentiment_data):
    """
    Get empathetic message prefix based on sentiment
    """
    if sentiment_data['polarity'] < 0:
        empathetic_messages = [
            "I understand this might be frustrating. ",
            "I can see you're having some concerns. ",
            "I'm here to help with whatever is troubling you. ",
            "I sense you might be feeling stressed about this. ",
            "I want to make sure I address your concerns properly. "
        ]
        import random
        return random.choice(empathetic_messages)
    return ""

def get_educational_response(intent, parameters, user_message, fulfillment_text=None):
    """
    Generate educational responses based on detected intent.
    Mirrors previous behavior without Dialogflow dependency.
    """
    # Prefer fulfillment_text if provided by NLU
    if fulfillment_text and str(fulfillment_text).strip():
        base_response = fulfillment_text
    else:
        intent_responses = {
            'course_inquiry': 'I can help you with course information! We offer various programming courses including Python, JavaScript, and Web Development. Would you like to know more about any specific course?',
            'event_inquiry': 'Great! We have several upcoming events. Let me show you what\'s available.',
            'help_request': 'I\'m here to help! I can assist you with course information, event details, announcements, and general questions about our educational platform.',
            'greeting': 'Hello! Welcome to SmartEdu! I\'m your educational assistant. How can I help you today?',
            'goodbye': 'Thank you for using SmartEdu! Have a great day and feel free to come back anytime for assistance.',
            'Default Fallback Intent': 'I understand you\'re looking for help. I can assist you with course information, upcoming events, announcements, or answer general questions about our educational platform.'
        }
        base_response = intent_responses.get(intent, intent_responses['Default Fallback Intent'])

    intent_suggestions = {
        'course_inquiry': ['Python Programming', 'Web Development', 'Database Design', 'View All Courses'],
        'event_inquiry': ['View Events', 'Register for Event', 'Event Details', 'Upcoming Workshops'],
        'help_request': ['Course Information', 'Events', 'Announcements', 'Contact Support'],
        'greeting': ['Course Information', 'Events', 'Help', 'About SmartEdu'],
        'goodbye': [],
        'Default Fallback Intent': ['Course Information', 'Events', 'Announcements', 'Help']
    }
    suggestions = intent_suggestions.get(intent, intent_suggestions['Default Fallback Intent'])
    return {
        'response': base_response,
        'suggestions': suggestions
    }

# --------- College Information Response Function ---------
def get_college_info_response(message, intent):
    """Generate responses for college information queries"""
    
    # College information data
    college_data = {
        "college_name": "SKN Sinhgad College of Engineering (SKNSCOE), Korti, Pandharpur",
        "established_year": 2010,
        "affiliation": "Punyashlok Ahilyadevi Holkar Solapur University",
        "approval": "AICTE, New Delhi",
        "address": "Gat No. 664, Korti, Pandharpur, Solapur, Maharashtra 413304",
        "website": "https://www.sinhgad.edu/sinhgad-engineering-institutes/sknscoe-pandharpur/",
        "email": "principal.sknsce@sinhgad.edu",
        "phone": "+91-9822053108",
        "courses_ug": [
            {"course": "B.E. in Computer Science and Engineering", "intake": 120},
            {"course": "B.E. in Artificial Intelligence and Data Science", "intake": 60},
            {"course": "B.E. in Electrical Engineering", "intake": 60},
            {"course": "B.E. in Civil Engineering", "intake": 60},
            {"course": "B.E. in Electronics and Telecommunication Engineering", "intake": 60},
            {"course": "B.E. in Mechanical Engineering", "intake": 90}
        ],
        "courses_pg": [
            {"course": "M.E. in Computer Science and Engineering", "intake": 18},
            {"course": "M.E. in Electronics", "intake": 18},
            {"course": "M.E. in Structural Engineering", "intake": 18},
            {"course": "M.E. in Design Engineering", "intake": 18}
        ],
        "total_intake_ug": 450,
        "admission_eligibility_ug": "Passed 10+2 with Physics, Chemistry, Mathematics; minimum 45% marks (40% for reserved).",
        "admission_exams": ["MHT-CET", "JEE Main"],
        "cutoff_cse": "84.48",
        "cutoff_ai": "82.76",
        "fee_structure": {
            "open": 96000,
            "obc": 54261,
            "reserved": 12522,
            "sc_st": 0,
            "caution": 2000
        },
        "hostel_capacity": "2,400 (1,600 boys, 800 girls)",
        "hostel_fee": 36000,
        "average_package": 3.2,
        "highest_package": 8.0,
        "recruiters": ["TCS", "Infosys", "Wipro", "Capgemini", "Tech Mahindra", "Cognizant"],
        "scholarships": ["EBC", "TFWS", "Government of India Post-Matric for SC/ST", "Minority Scholarships"]
    }
    
    message_lower = message.lower()
    
    # Admission queries
    if intent == 'ask_admission':
        if any(word in message_lower for word in ['eligibility', 'criteria', 'qualification']):
            response = f"📋 **Admission Eligibility**\n{'='*60}\n\n"
            response += f"✅ **UG (B.Tech):** {college_data['admission_eligibility_ug']}\n\n"
            response += f"✅ **PG (M.Tech):** B.E./B.Tech in relevant discipline with minimum 50% (45% for reserved).\n\n"
            response += f"✅ **Entrance Exams:** {', '.join(college_data['admission_exams'])}\n\n"
            response += f"📝 **Total UG Intake:** {college_data['total_intake_ug']} seats\n"
            response += f"{'='*60}"
            return response
        
        elif any(word in message_lower for word in ['cutoff', 'merit', 'rank']):
            response = f"📊 **Cutoff Information (2025)**\n{'='*60}\n\n"
            response += f"🎓 **Computer Science:** MHT-CET: {college_data['cutoff_cse']}%, JEE: 201,109\n"
            response += f"🤖 **AI & Data Science:** MHT-CET: {college_data['cutoff_ai']}%\n"
            response += f"📡 **ENTC:** MHT-CET: 76.33%\n"
            response += f"⚙️ **Mechanical:** MHT-CET: 72.38%\n"
            response += f"🏗️ **Civil:** MHT-CET: 73.20%\n\n"
            response += f"💡 80% seats via CAP, 20% via Institute Quota\n"
            response += f"{'='*60}"
            return response
        
        elif any(word in message_lower for word in ['seat', 'intake', 'capacity']):
            response = f"📚 **Courses & Intake**\n{'='*60}\n\n"
            response += f"**Undergraduate (B.Tech):**\n"
            for course in college_data['courses_ug']:
                response += f"  • {course['course']} - {course['intake']} seats\n"
            response += f"\n**Postgraduate (M.Tech):**\n"
            for course in college_data['courses_pg']:
                response += f"  • {course['course']} - {course['intake']} seats\n"
            response += f"\n📊 Total UG: {college_data['total_intake_ug']} seats\n"
            response += f"{'='*60}"
            return response
        
        else:
            response = f"🎓 **Admission Process**\n{'='*60}\n\n"
            response += f"📍 **College:** {college_data['college_name']}\n"
            response += f"📝 **Intake:** {college_data['total_intake_ug']} UG seats\n"
            response += f"🎯 **Entrance Exams:** {', '.join(college_data['admission_exams'])}\n"
            response += f"✅ **Seats:** 80% CAP, 20% Institute Quota\n\n"
            response += f"📞 **Contact:** {college_data['phone']}\n"
            response += f"🌐 **Website:** {college_data['website']}\n"
            response += f"{'='*60}"
            return response
    
    # Fees queries
    elif intent == 'ask_fees':
        response = f"💰 **Fee Structure (2025-26)**\n{'='*60}\n\n"
        response += f"🎓 **B.Tech (Per Year):**\n"
        response += f"   Open Category:       ₹{college_data['fee_structure']['open']:,}\n"
        response += f"   OBC/EBC/SEBC:        ₹{college_data['fee_structure']['obc']:,}\n"
        response += f"   TFWS/NT/Girls:       ₹{college_data['fee_structure']['reserved']:,}\n"
        response += f"   SC/ST:               ₹{college_data['fee_structure']['sc_st']:,}\n\n"
        response += f"📚 **M.Tech:** ₹68,213 (General), ₹38,500 (Reserved)\n\n"
        response += f"🛏️ **Hostel & Mess:** ₹{college_data['hostel_fee']:,} per year\n"
        response += f"💳 **Caution Deposit:** ₹{college_data['fee_structure']['caution']:,}\n"
        response += f"{'='*60}"
        return response
    
    # Cutoff queries
    elif intent == 'ask_cutoff':
        response = f"📊 **Cutoff Information (2025)**\n{'='*60}\n\n"
        response += f"🎓 **Computer Science:** MHT-CET: {college_data['cutoff_cse']}%, JEE: 201,109 rank\n"
        response += f"🤖 **AI & Data Science:** MHT-CET: {college_data['cutoff_ai']}%\n"
        response += f"📡 **ENTC:** MHT-CET: 76.33%\n"
        response += f"⚙️ **Mechanical:** MHT-CET: 72.38%\n"
        response += f"🏗️ **Civil:** MHT-CET: 73.20%\n\n"
        response += f"💡 **Seat Distribution:** 80% CAP, 20% Institute Quota\n"
        response += f"{'='*60}"
        return response
    
    # College info queries
    elif intent == 'ask_college_info':
        response = f"🏛️ **College Information**\n{'='*60}\n\n"
        response += f"📚 **Name:** {college_data['college_name']}\n"
        response += f"📅 **Established:** {college_data['established_year']}\n"
        response += f"✅ **Approval:** {college_data['approval']}\n"
        response += f"🎓 **Affiliation:** {college_data['affiliation']}\n"
        response += f"📍 **Address:** {college_data['address']}\n"
        response += f"📞 **Phone:** {college_data['phone']}\n"
        response += f"✉️ **Email:** {college_data['email']}\n"
        response += f"🌐 **Website:** {college_data['website']}\n"
        response += f"{'='*60}"
        return response
    
    # Hostel queries
    elif intent == 'ask_hostel':
        response = f"🛏️ **Hostel Information**\n{'='*60}\n\n"
        response += f"🏠 **Total Capacity:** {college_data['hostel_capacity']}\n"
        response += f"💵 **Annual Fee:** ₹{college_data['hostel_fee']:,} (including mess)\n"
        response += f"🪑 **Room Type:** 3-4 students per room with bed, table, chair, cupboard\n"
        response += f"✨ **Facilities:** 24x7 Security, Wi-Fi, RO Water, Laundry, Recreation, Hot Water, Medical Aid\n\n"
        response += f"📋 **Allocation:** First-Come-First-Serve\n"
        response += f"🚫 **Ragging Policy:** Zero Tolerance\n"
        response += f"{'='*60}"
        return response
    
    # Transport queries
    elif intent == 'ask_transport':
        response = f"🚌 **Transport Facility**\n{'='*60}\n\n"
        response += f"✅ **Available:** Yes\n"
        response += f"📍 **Routes:** Pandharpur, Mangalwedha, Sangola, and nearby villages\n"
        response += f"📝 **Note:** Students can register during admission or at admin office\n"
        response += f"{'='*60}"
        return response
    
    # Placement queries
    elif intent == 'ask_placement':
        response = f"💼 **Placement Information**\n{'='*60}\n\n"
        response += f"📊 **Average Package:** ₹{college_data['average_package']} LPA\n"
        response += f"🏆 **Highest Package:** ₹{college_data['highest_package']} LPA\n"
        response += f"🏢 **Major Recruiters:** {', '.join(college_data['recruiters'])}\n\n"
        response += f"📚 **Training:** Soft Skills, Aptitude, Technical Interview Prep, Resume Building\n"
        response += f"🎯 **Internships:** Available for 3rd & 4th year students\n"
        response += f"{'='*60}"
        return response
    
    # Scholarship queries
    elif intent == 'ask_scholarship':
        response = f"🎓 **Scholarship Information**\n{'='*60}\n\n"
        for scholarship in college_data['scholarships']:
            response += f"• {scholarship}\n"
        response += f"\n💰 **SC/ST:** Full tuition fee waiver under government scheme\n"
        response += f"💵 **Fee Structure:**\n"
        response += f"   Open: ₹{college_data['fee_structure']['open']:,}\n"
        response += f"   OBC/EBC: ₹{college_data['fee_structure']['obc']:,}\n"
        response += f"   TFWS/NT: ₹{college_data['fee_structure']['reserved']:,}\n"
        response += f"   SC/ST: ₹{college_data['fee_structure']['sc_st']:,}\n"
        response += f"{'='*60}"
        return response
    
    # Document queries
    elif intent == 'ask_documents':
        response = f"📋 **Documents Required**\n{'='*60}\n\n"
        documents = ["10th & 12th Marksheets", "Entrance Exam Scorecard", "CAP Allotment Letter", 
                    "Caste Certificate (if applicable)", "Domicile Certificate", "Aadhaar Card", 
                    "Passport-size Photos", "Medical Fitness Certificate", "Income Certificate"]
        for i, doc in enumerate(documents, 1):
            response += f"{i}. {doc}\n"
        response += f"{'='*60}"
        return response
    
    # Guidance queries
    elif intent == 'ask_guidance':
        response = f"💡 **Student Guidance**\n{'='*60}\n\n"
        response += f"🤖 **For AI Career:** Choose Computer Science (CSE) or AI & Data Science\n"
        response += f"🎯 **Best Placements:** Computer Science Engineering\n"
        response += f"🔄 **Branch Change:** Allowed after 1st year based on merit and seat availability\n"
        response += f"📊 **Placement Rates:** CSE > AI/DS > ENTC > MECH > CIVIL\n\n"
        response += f"💡 **Tips:**\n"
        response += f"   • Choose based on interest and career goals\n"
        response += f"   • Consider placement trends and emerging technologies\n"
        response += f"   • Mechanical and Civil have good core industry prospects\n"
        response += f"{'='*60}"
        return response
    
    else:
        return "How can I help you with college information?"

# --------- Rasa Chatbot minimal endpoint (MySQL-backed) ---------
@app.route('/chatbot', methods=['GET'])
def chatbot_health():
    # Allow simple GET probes to avoid 405 noise in console
    return jsonify({"ok": True, "endpoint": "/chatbot", "method": "POST"}), 200

@app.route('/api/chatbot/voice', methods=['POST'])
def chatbot_voice():
    """Handle voice messages from the chatbot with full speech-to-text processing"""
    try:
        # Check if audio file is present
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file provided'}), 400
        
        audio_file = request.files['audio']
        if audio_file.filename == '':
            return jsonify({'error': 'No audio file selected'}), 400
        
        # Get user_id from request
        user_id = request.form.get('user_id')
        student_id = request.form.get('student_id')
        
        # Save the audio file temporarily
        import tempfile
        import os
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_file:
            audio_file.save(temp_file.name)
            temp_audio_path = temp_file.name
        
        try:
            # Convert speech to text
            import speech_recognition as sr
            from pydub import AudioSegment
            
            # Initialize recognizer
            r = sr.Recognizer()
            
            # Convert audio to WAV format if needed
            audio = AudioSegment.from_file(temp_audio_path)
            audio = audio.set_frame_rate(16000).set_channels(1)
            wav_path = temp_audio_path.replace('.wav', '_converted.wav')
            audio.export(wav_path, format="wav")
            
            # Perform speech recognition
            with sr.AudioFile(wav_path) as source:
                audio_data = r.record(source)
                try:
                    # Use Google Speech Recognition (free, no API key required)
                    text = r.recognize_google(audio_data, language='en-US')
                    print(f"Recognized text: {text}")
                except sr.UnknownValueError:
                    response_text = 'Sorry, I could not understand your voice. Please try speaking more clearly.'
                    # Generate audio response even for error cases
                    try:
                        import pyttsx3
                        engine = pyttsx3.init('sapi5')  # Use Windows SAPI5 engine
                        
                        # Configure voice settings
                        voices = engine.getProperty('voices')
                        if voices:
                            for voice in voices:
                                if 'female' in voice.name.lower() or 'zira' in voice.name.lower():
                                    engine.setProperty('voice', voice.id)
                                    break
                        
                        engine.setProperty('rate', 150)
                        engine.setProperty('volume', 0.8)
                        
                        # Generate audio file
                        audio_response_path = temp_audio_path.replace('.wav', '_response.wav')
                        engine.save_to_file(response_text, audio_response_path)
                        engine.runAndWait()
                        
                        # Read the generated audio file
                        with open(audio_response_path, 'rb') as audio_file:
                            audio_data = audio_file.read()
                        
                        # Clean up
                        os.unlink(audio_response_path)
                        
                        return jsonify({
                            'intent': 'voice_error',
                            'response': response_text,
                            'data': {},
                            'audio_response': True,
                            'audio_data': audio_data.hex()
                        })
                    except Exception as e:
                        print(f"Error generating audio for voice error: {e}")
                        return jsonify({
                            'intent': 'voice_error',
                            'response': response_text,
                            'data': {}
                        })
                except sr.RequestError as e:
                    print(f"Speech recognition error: {e}")
                    response_text = 'Sorry, there was an error with the speech recognition service. Please try again.'
                    # Generate audio response for request errors too
                    try:
                        import pyttsx3
                        engine = pyttsx3.init('sapi5')  # Use Windows SAPI5 engine
                        
                        voices = engine.getProperty('voices')
                        if voices:
                            for voice in voices:
                                if 'female' in voice.name.lower() or 'zira' in voice.name.lower():
                                    engine.setProperty('voice', voice.id)
                                    break
                        
                        engine.setProperty('rate', 150)
                        engine.setProperty('volume', 0.8)
                        
                        audio_response_path = temp_audio_path.replace('.wav', '_response.wav')
                        engine.save_to_file(response_text, audio_response_path)
                        engine.runAndWait()
                        
                        with open(audio_response_path, 'rb') as audio_file:
                            audio_data = audio_file.read()
                        
                        os.unlink(audio_response_path)
                        
                        return jsonify({
                            'intent': 'voice_error',
                            'response': response_text,
                            'data': {},
                            'audio_response': True,
                            'audio_data': audio_data.hex()
                        })
                    except Exception as e:
                        print(f"Error generating audio for request error: {e}")
                        return jsonify({
                            'intent': 'voice_error',
                            'response': response_text,
                            'data': {}
                        })
            
            # Process the recognized text through the chatbot
            chatbot_payload = {
                'message': text,
                'user_id': user_id,
                'student_id': student_id
            }
            
            # Call the main chatbot route
            from flask import g
            with app.test_request_context('/chatbot', method='POST', json=chatbot_payload):
                chatbot_response = chatbot_route()
                chatbot_data = chatbot_response.get_json()
            
            # Generate speech response
            response_text = chatbot_data.get('response', 'Sorry, I could not process your request.')
            
            # Convert text to speech
            try:
                import pyttsx3
                engine = pyttsx3.init('sapi5')  # Use Windows SAPI5 engine
                
                # Configure voice settings
                voices = engine.getProperty('voices')
                if voices:
                    # Try to use a female voice if available
                    for voice in voices:
                        if 'female' in voice.name.lower() or 'zira' in voice.name.lower():
                            engine.setProperty('voice', voice.id)
                            break
                
                # Set speech rate and volume
                engine.setProperty('rate', 150)  # Speed of speech
                engine.setProperty('volume', 0.8)  # Volume level (0.0 to 1.0)
                
                # Generate audio file
                audio_response_path = temp_audio_path.replace('.wav', '_response.wav')
                engine.save_to_file(response_text, audio_response_path)
                engine.runAndWait()
                
                # Read the generated audio file
                with open(audio_response_path, 'rb') as audio_file:
                    audio_data = audio_file.read()
                
                # Clean up temporary files
                os.unlink(temp_audio_path)
                os.unlink(wav_path)
                os.unlink(audio_response_path)
                
                # Return response with audio data
                return jsonify({
                    'intent': chatbot_data.get('intent', 'voice_message'),
                    'response': response_text,
                    'data': chatbot_data.get('data', {}),
                    'audio_response': True,
                    'audio_data': audio_data.hex()  # Convert binary to hex string for JSON
                })
                
            except Exception as e:
                print(f"Error in text-to-speech: {e}")
                # Clean up temporary files
                os.unlink(temp_audio_path)
                os.unlink(wav_path)
                
                # Return response without audio
                return jsonify({
                    'intent': chatbot_data.get('intent', 'voice_message'),
                    'response': response_text,
                    'data': chatbot_data.get('data', {}),
                    'audio_response': False
                })
            
        except Exception as e:
            print(f"Error in voice processing: {e}")
            # Clean up temporary files
            try:
                os.unlink(temp_audio_path)
                if 'wav_path' in locals():
                    os.unlink(wav_path)
                if 'audio_response_path' in locals():
                    os.unlink(audio_response_path)
            except:
                pass
            
            return jsonify({
                'intent': 'voice_error',
                'response': 'Sorry, there was an error processing your voice message. Please try again.',
                'data': {}
            })
        
    except Exception as e:
        print(f"Error processing voice message: {e}")
        return jsonify({'error': 'Failed to process voice message'}), 500

@app.route('/chatbot', methods=['POST'])
def chatbot_route():
    payload = request.get_json(silent=True) or {}
    message = (payload.get('message') or '').strip()
    student_id = payload.get('student_id')
    user_id = payload.get('user_id')
    
    # Determine user role
    user_role = None
    admin_user = None
    if user_id:
        try:
            admin_user = db.session.get(User, int(user_id))
            if admin_user:
                user_role = admin_user.role
        except:
            pass
    
    if not message:
        return jsonify({'error': 'message is required'}), 400

    # Use keyword-based intent detection for better control
    msg = message.lower()
    intent = 'unknown'
    confidence = 0.0

    # Enhanced keyword matching for all intents - order matters!
    # Check specific intents first before general ones
    
    # Farewell intent (check first to avoid conflicts)
    if any(phrase in msg for phrase in ['bye', 'goodbye', 'see you later', 'catch you later', 'talk to you soon', 'take care', 'see ya', 'good night', 'bye smartedu', 'thanks bye', 'ok bye', 'bye for now']):
        intent = 'goodbye'
    
    # How are you intent
    elif any(phrase in msg for phrase in ['how are you', 'how are you doing', 'how\'s it going', 'how\'s your day', 'how have you been', 'what\'s up smartedu', 'are you fine', 'you good']):
        intent = 'ask_howareyou'
    
    # Who are you intent
    elif any(phrase in msg for phrase in ['who are you', 'what are you', 'tell me about yourself', 'what\'s your name', 'introduce yourself', 'are you smartedu', 'who is smartedu', 'what is smartedu']):
        intent = 'ask_whoareyou'
    
    # Are you bot intent
    elif any(phrase in msg for phrase in ['are you a bot', 'are you a robot', 'are you real', 'are you human', 'are you alive', 'do you have feelings', 'are you ai', 'are you chatbot']):
        intent = 'ask_areyoubot'
    
    # Creator intent
    elif any(phrase in msg for phrase in ['who made you', 'who created you', 'who developed you', 'who built you', 'who designed you', 'tell me your developer name', 'who is your owner']):
        intent = 'ask_creator'
    
    # Help intent
    elif any(phrase in msg for phrase in ['can you help me', 'i need help', 'please help', 'what can you do', 'what services do you provide', 'how can you help me', 'help me smartedu', 'anyone here', 'are you there', 'are you online', 'smartedu can you assist me']):
        intent = 'ask_help'
    
    # General greeting intent (check last to avoid conflicts)
    elif any(phrase in msg for phrase in ['hi', 'hello', 'hey', 'heya', 'yo', 'hola', 'namaste', 'good morning', 'good afternoon', 'good evening', 'hello there', 'hi bot', 'hi smartedu', 'hello smartedu', 'hey smartedu', 'smartedu are you there']):
        intent = 'greet'
    elif any(word in msg for word in ['fee', 'fees', 'payment', 'due', 'balance', 'show my fees', 'fee details', 'fee status']):
        intent = 'fee_query'
    elif any(word in msg for word in ['attendance', 'present', 'absent', 'percentage', 'attend', 'show my attendance', 'attendance details']):
        intent = 'attendance_query'
    elif any(word in msg for word in ['event', 'events', 'upcoming', 'schedule', 'seminar', 'workshop', 'fest', 'summit', 'show events', 'list events']):
        intent = 'event_query'
    elif any(word in msg for word in ['announcement', 'announcements', 'notification', 'notifications', 'show announcements']):
        intent = 'announcement_query'
    elif any(word in msg for word in ['admission', 'admit', 'apply', 'application', 'eligibility', 'entrance', 'mht-cet', 'jee', 'seat', 'intake']):
        intent = 'ask_admission'
    elif any(word in msg for word in ['cutoff', 'merit', 'rank', 'percentile']):
        intent = 'ask_cutoff'
    elif any(word in msg for word in ['college', 'campus', 'about', 'info', 'information', 'skn', 'sinhgad', 'approved', 'affiliated', 'established']):
        intent = 'ask_college_info'
    elif any(word in msg for word in ['hostel', 'accommodation', 'boarding', 'room', 'mess', 'lodging']):
        intent = 'ask_hostel'
    elif any(word in msg for word in ['transport', 'bus', 'vehicle', 'commute', 'travel']):
        intent = 'ask_transport'
    elif any(word in msg for word in ['placement', 'recruiter', 'package', 'salary', 'company', 'career']):
        intent = 'ask_placement'
    elif any(word in msg for word in ['scholarship', 'financial aid', 'tfws', 'ebc', 'fee waiver']):
        intent = 'ask_scholarship'
    elif any(word in msg for word in ['document', 'certificate', 'marksheet', 'id proof', 'aadhaar', 'caste']):
        intent = 'ask_documents'
    elif any(word in msg for word in ['guidance', 'suggest', 'which branch', 'best branch', 'change branch']):
        intent = 'ask_guidance'
    else:
        # For other queries, provide helpful guidance
        if any(word in msg for word in ['profile', 'who am i', 'student id', 'roll number', 'department', 'class']):
            return jsonify({'intent': 'student_info', 'response': 'Please visit your Profile page to view student details.', 'data': {}})
        elif any(word in msg for word in ['mark', 'marks', 'score', 'result', 'grade', 'academic', 'performance']):
            # Handle marks query with proper API call
            # Check if admin is asking
            is_admin = user_role == 'admin' or user_role == 'HOD'
            
            if not is_admin:
                # For students, get their student_id
                if not student_id:
                    if user_id:
                        student = Student.query.filter_by(user_id=int(user_id)).first()
                        if student:
                            student_id = student.student_id
                if not student_id:
                    return jsonify({'intent': 'marks_query', 'response': 'Please log in as a student to view marks details.', 'data': {}}), 200
            
            # Detect if asking for specific subject (all subjects from database)
            subject_keywords = {
                # Core Subjects
                'data structure': ['data structure', 'ds', 'datal', 'structure'],
                'computer network': ['computer network', 'cn', 'networks', 'computer networks'],
                'database management systems': ['database', 'dbms', 'db management', 'database management'],
                'operating system': ['operating system', 'os'],
                'discrete mathematics': ['discrete math', 'discrete mathematics', 'dm'],
                'web technologies': ['web technologies', 'wt', 'web tech'],
                'software engineering': ['software engineering', 'se', 'software'],
                'theory of computation': ['theory of computation', 'toc', 'toc theory'],
                'computer organization': ['computer organization', 'co', 'org'],
                # Advanced Subjects
                'artificial intelligence': ['artificial intelligence', 'ai'],
                'machine learning': ['machine learning', 'ml'],
                'big data analytics': ['big data', 'bigdata', 'big data analytics', 'bda'],
                'cloud computing': ['cloud computing', 'cloud', 'cc'],
                'cyber security': ['cyber security', 'cybersecurity', 'security', 'cs'],
                'blockchain technology': ['blockchain', 'blockchain technology', 'bt'],
                # First Year Subjects
                'engineering mathematics': ['engineering mathematics', 'math', 'mathematics'],
                'engineering physics': ['engineering physics', 'physics', 'phy'],
                'basic electrical engineering': ['basic electrical engineering', 'basic electrical', 'eee', 'electrical'],
                'engineering chemistry': ['engineering chemistry', 'chemistry', 'chem'],
                'engineering graphics': ['engineering graphics', 'graphics', 'mech']
            }
            
            requested_subject = None
            for subject, keywords in subject_keywords.items():
                if any(kw in msg for kw in keywords):
                    requested_subject = subject
                    break
            
            # Admin handling - show all students or specific student's marks
            if is_admin:
                try:
                    import requests
                    # Use helper function to detect filters
                    filters = detect_admin_filters(msg)
                    
                    # Check if user is asking for a specific subject (enhanced detection)
                    detected_subject = None
                    if requested_subject:
                        detected_subject = requested_subject
                    else:
                        # Try to match any subject name from the database
                        all_subjects = Subject.query.all()
                        for subject in all_subjects:
                            subject_lower = subject.subject_name.lower()
                            subject_code_lower = subject.subject_code.lower() if subject.subject_code else ''
                            msg_lower = msg.lower()
                            # Normalize both message and subject name for comparison (handle plurals)
                            msg_normalized = msg_lower.replace('s ', ' ').replace('s', '')
                            subject_normalized = subject_lower.replace('s ', ' ').replace('s', '')
                            # Check multiple matching strategies
                            if (subject_lower in msg_lower or 
                                subject_lower + 's' in msg_lower or 
                                msg_normalized in subject_normalized or
                                subject_normalized in msg_normalized or
                                subject_code_lower in msg_lower or
                                msg_lower in subject_lower):
                                detected_subject = subject.subject_name
                                break
                    
                    # If subject is requested, filter results by subject
                    if detected_subject:
                        # Get all students and filter by subject
                        # For subject queries, get all students regardless of class
                        all_students = Student.query.all()
                        
                        subject_text = f" in {detected_subject.upper()}"
                        response_text = f"📊 **Students Academic Performance{subject_text}**\n"
                        response_text += f"{'='*60}\n\n"
                        
                        for student in all_students:
                            student_marks = Mark.query.filter_by(student_id=student.student_id).all()
                            if student_marks:
                                # Track if we've already shown this student
                                student_shown = False
                                for mark in student_marks:
                                    subject = db.session.get(Subject, mark.subject_id)
                                    if subject:
                                        # Normalize both detected subject and actual subject name for comparison
                                        detected_normalized = detected_subject.lower().replace('s ', ' ').replace('s', '').strip()
                                        actual_normalized = subject.subject_name.lower().replace('s ', ' ').replace('s', '').strip()
                                        # Check if they match
                                        if detected_normalized == actual_normalized or detected_subject.lower() in subject.subject_name.lower():
                                            if not student_shown:
                                                obtained = float(mark.obtained_marks)
                                                total = float(mark.total_marks)
                                                percentage = (obtained / total * 100) if total > 0 else 0
                                                status_emoji = "✅" if percentage >= 35 else "❌"
                                                response_text += f"📌 **{student.user.name}** (Roll: {student.roll_no})\n"
                                                response_text += f"   └─ {subject.subject_name}: {obtained:.0f}/{total:.0f} ({percentage:.1f}%) {status_emoji}\n\n"
                                                student_shown = True
                                                break
                        
                        return jsonify({'intent': 'marks_query', 'response': response_text, 'data': {}})
                    
                    if filters['target_student_id']:
                        # Get student object for name
                        student_obj = db.session.get(Student, filters['target_student_id'])
                        student_name = student_obj.user.name if student_obj else 'Student'
                        
                        # Fetch specific student's marks
                        api_response = requests.get(f'http://127.0.0.1:5000/api/students/{filters["target_student_id"]}/marks', timeout=5)
                        if api_response.status_code == 200:
                            marks_data = api_response.json()
                            if marks_data and len(marks_data) > 0:
                                response_text = f"📊 **Academic Performance Report for {student_name}**\n"
                                response_text += f"{'='*60}\n\n"
                                for i, mark in enumerate(marks_data[:10], 1):
                                    subject_name = mark.get('subject_name', f'Subject {i}')
                                    obtained = float(mark.get('obtained_marks', 0))
                                    total = float(mark.get('total_marks', 100))
                                    percentage = (obtained / total * 100) if total > 0 else 0
                                    status_emoji = "✅" if percentage >= 35 else "❌"
                                    status_text = "PASS" if percentage >= 35 else "FAIL"
                                    response_text += f"📌 **{subject_name}**\n"
                                    response_text += f"   └─ Marks: {obtained:.0f}/{total:.0f}  |  Percentage: {percentage:.1f}%  |  Status: {status_emoji} {status_text}\n\n"
                                response_text += f"{'='*60}"
                                return jsonify({'intent': 'marks_query', 'response': response_text, 'data': {'marks': marks_data}})
                            else:
                                return jsonify({'intent': 'marks_query', 'response': f'No marks found for {student_name}.', 'data': {}})
                        else:
                            return jsonify({'intent': 'marks_query', 'response': 'Unable to fetch marks details.', 'data': {}})
                    else:
                        # Admin wants all students' marks - query directly from database
                        # Apply class filter if specified
                        query = Student.query
                        
                        if filters['class_filter']:
                            # Filter by class name (search in class.class_name)
                            query = query.join(Class).filter(Class.class_name.ilike(f'%{filters["class_filter"]}%'))
                        
                        all_students = query.all()
                        
                        class_text = f" ({filters['class_filter']})" if filters['class_filter'] else ""
                        response_text = f"📊 **Students Academic Performance{class_text}**\n"
                        response_text += f"{'='*60}\n\n"
                        response_text += f"Total Students: {len(all_students)}\n\n"
                        
                        for student in all_students[:20]:  # Show max 20 students
                            student_marks = Mark.query.filter_by(student_id=student.student_id).all()
                            if student_marks:
                                marks_list = [m.to_dict() for m in student_marks]
                                total_marks = sum(float(m.get('total_marks', 0)) for m in marks_list)
                                total_obtained = sum(float(m.get('obtained_marks', 0)) for m in marks_list)
                                if total_marks > 0:
                                    percentage = (total_obtained / total_marks * 100)
                                    response_text += f"📌 **{student.user.name}** (Roll: {student.roll_no})\n"
                                    response_text += f"   └─ Total: {total_obtained:.0f}/{total_marks:.0f} ({percentage:.1f}%)\n\n"
                        
                        return jsonify({'intent': 'marks_query', 'response': response_text, 'data': {}})
                except Exception as e:
                    print(f"Error in admin marks query: {e}")
                    return jsonify({'intent': 'marks_query', 'response': 'Unable to fetch marks details.', 'data': {}})
            
            # Student handling - use the same API endpoint that Student Services uses
            try:
                import requests
                api_response = requests.get(f'http://127.0.0.1:5000/api/students/{student_id}/marks', timeout=5)
                if api_response.status_code == 200:
                    marks_data = api_response.json()
                    if marks_data and len(marks_data) > 0:
                        # If specific subject requested, filter results
                        if requested_subject:
                            matched_marks = []
                            seen_subjects = set()  # Track unique subjects to avoid duplicates
                            for mark in marks_data:
                                mark_subject = mark.get('subject_name', '').lower()
                                # Check if this matches our requested subject
                                matches = requested_subject in mark_subject or any(kw in mark_subject for kw in subject_keywords[requested_subject])
                                
                                # Only add if it matches AND we haven't seen this exact subject name before
                                if matches and mark_subject not in seen_subjects:
                                    matched_marks.append(mark)
                                    seen_subjects.add(mark_subject)
                            
                            if matched_marks:
                                response_text = f"📊 **Subject: {requested_subject.title()}**\n"
                                response_text += f"{'='*50}\n\n"
                                for i, mark in enumerate(matched_marks, 1):
                                    subject_name = mark.get('subject_name', 'N/A')
                                    obtained = float(mark.get('obtained_marks', 0))
                                    total = float(mark.get('total_marks', 100))
                                    percentage = (obtained / total * 100) if total > 0 else 0
                                    status_emoji = "✅" if percentage >= 35 else "❌"
                                    status_text = "PASS" if percentage >= 35 else "FAIL"
                                    exam_date = mark.get('exam_date', 'N/A')
                                    
                                    response_text += f"📌 **Subject:**     {subject_name}\n"
                                    response_text += f"🎯 **Marks:**       {obtained:.0f}/{total:.0f} ({percentage:.1f}%)\n"
                                    response_text += f"📅 **Exam Date:**   {exam_date}\n"
                                    response_text += f"🔖 **Status:**      {status_emoji} {status_text}\n"
                                    if i < len(matched_marks):
                                        response_text += f"\n{'-'*50}\n\n"
                                
                                response_text += f"{'='*50}"
                                return jsonify({'intent': 'marks_query', 'response': response_text, 'data': {'marks': matched_marks}})
                            else:
                                return jsonify({'intent': 'marks_query', 'response': f'No marks found for {requested_subject}.', 'data': {}})
                        else:
                            # Show all subjects with better formatting
                            response_text = f"📊 **Academic Performance Report**\n"
                            response_text += f"{'='*60}\n\n"
                            total_marks = 0
                            total_obtained = 0
                            
                            # Deduplicate subjects
                            seen_subjects = set()
                            unique_marks = []
                            
                            for mark in marks_data:
                                subject_name = mark.get('subject_name', 'Unknown').lower()
                                if subject_name not in seen_subjects:
                                    seen_subjects.add(subject_name)
                                    unique_marks.append(mark)
                            
                            # Display unique subjects
                            for i, mark in enumerate(unique_marks[:10], 1):  # Show max 10 subjects
                                subject_name = mark.get('subject_name', f'Subject {i}')
                                obtained = float(mark.get('obtained_marks', 0))
                                total = float(mark.get('total_marks', 100))
                                percentage = (obtained / total * 100) if total > 0 else 0
                                status_emoji = "✅" if percentage >= 35 else "❌"
                                status_text = "PASS" if percentage >= 35 else "FAIL"
                                
                                # Format as table-like structure
                                response_text += f"📌 **{subject_name}**\n"
                                response_text += f"   └─ Marks: {obtained:.0f}/{total:.0f}  |  Percentage: {percentage:.1f}%  |  Status: {status_emoji} {status_text}\n\n"
                                
                                total_obtained += obtained
                                total_marks += total
                            
                            if total_marks > 0:
                                overall_percentage = (total_obtained / total_marks * 100)
                                response_text += f"{'='*60}\n"
                                response_text += f"📈 **Overall Performance:** {total_obtained:.1f}/{total_marks:.1f} ({overall_percentage:.1f}%)\n"
                                response_text += f"{'='*60}"
                            
                            return jsonify({'intent': 'marks_query', 'response': response_text, 'data': {'marks': marks_data}})
                    else:
                        return jsonify({'intent': 'marks_query', 'response': 'No marks details found for your account.', 'data': {}})
                else:
                    return jsonify({'intent': 'marks_query', 'response': 'Unable to fetch marks details at the moment.', 'data': {}})
            except Exception as e:
                return jsonify({'intent': 'marks_query', 'response': 'Unable to fetch marks details at the moment.', 'data': {}})
        elif any(word in msg for word in ['help', 'what can you do', 'features', 'how to use', 'assistance']):
            return jsonify({'intent': 'help_query', 'response': 'I can help with fees, attendance, and events. For other features, please explore the dashboard.', 'data': {}})
        else:
            intent = 'unknown'

    data = {}
    if intent == 'greet':
        # Detect greeting type and respond accordingly
        greeting_keywords = {
            'simple': ['hi', 'hello', 'hey', 'heya', 'yo', 'hola', 'namaste'],
            'polite': ['good morning', 'good afternoon', 'good evening'],
            'friendly': ['what\'s up', 'how\'s it going', 'how are you', 'how are you doing', 'how\'s your day', 'how are things', 'what\'s new'],
            'introductory': ['who are you', 'what\'s your name', 'are you a bot', 'are you real', 'are you human', 'who made you'],
            'return': ['nice to meet you', 'glad to see you', 'good to see you again', 'long time no see'],
            'checking': ['are you there', 'you there', 'can you help me', 'anyone here', 'are you online']
        }
        
        msg_lower = msg.lower()
        greeting_type = None
        
        # Detect greeting type
        if any(word in msg_lower for word in greeting_keywords['polite']):
            greeting_type = 'polite'
        elif any(word in msg_lower for word in greeting_keywords['friendly']):
            greeting_type = 'friendly'
        elif any(word in msg_lower for word in greeting_keywords['introductory']):
            greeting_type = 'introductory'
        elif any(word in msg_lower for word in greeting_keywords['return']):
            greeting_type = 'return'
        elif any(word in msg_lower for word in greeting_keywords['checking']):
            greeting_type = 'checking'
        else:
            greeting_type = 'simple'
        
        # Personalized responses based on greeting type
        if greeting_type == 'polite':
            time_of_day = datetime.now().hour
            if time_of_day < 12:
                response_text = "Good morning! 🌅 I'm SmartEdu, your friendly college assistant. I'm here to help you with admission information, fees, hostels, placements, and more. How can I assist you today?"
            elif time_of_day < 17:
                response_text = "Good afternoon! ☀️ I'm SmartEdu, your college information assistant. Ask me about SKN Sinhgad College's admissions, courses, fees, or anything else you'd like to know!"
            else:
                response_text = "Good evening! 🌙 I'm SmartEdu, here to help you with college information. I can provide details about admissions, hostels, placements, and more. What would you like to know?"
        elif greeting_type == 'friendly':
            if any(word in msg_lower for word in ['how are you', 'how are you doing']):
                response_text = "I'm doing great, thanks for asking! 😊 I'm SmartEdu, your college assistant. I'm here and ready to help you with admission information for SKN Sinhgad College. What can I help you with today?"
            else:
                response_text = "Hey there! 👋 I'm SmartEdu, your college information buddy! I'm doing great and excited to help you. Want to know about admissions, fees, hostels, or placements at SKN Sinhgad College?"
        elif greeting_type == 'introductory':
            if 'name' in msg_lower:
                response_text = "Hi! My name is SmartEdu 🤖 - your smart college assistant! I was created to help students and visitors get information about SKN Sinhgad College of Engineering. I can answer questions about admissions, courses, fees, hostels, and more. Nice to meet you!"
            elif 'bot' in msg_lower or 'human' in msg_lower or 'real' in msg_lower:
                response_text = "Yes, I'm SmartEdu! 🤖 I'm an AI chatbot created to help you with college information. While I'm not human, I'm here 24/7 to assist you with everything about SKN Sinhgad College - admissions, courses, fees, placements, and more. How can I help you?"
            else:
                response_text = "I'm SmartEdu! 🤖 Your smart college information assistant at SKN Sinhgad College. I'm designed to help you with admissions, courses, fees, hostels, placements, and more. I'm here to make your college journey easier!"
        elif greeting_type == 'return':
            response_text = "Welcome back! 🙌 Good to see you again! I'm SmartEdu, and I'm always here to help you with college information. Ready to assist you with admissions, fees, or anything else you need. What would you like to know?"
        elif greeting_type == 'checking':
            response_text = "Yes, I'm here! 👋 Hello! I'm SmartEdu, your college assistant, and I'm online and ready to help. I can assist you with admission information, fees, hostels, placements, or any questions about SKN Sinhgad College. How can I help you today?"
        else:  # simple greeting
            response_text = "Hello! 👋 I'm SmartEdu, your college information assistant. Nice to meet you! I can help you with admissions, courses, fees, hostels, placements, and more at SKN Sinhgad College. What would you like to know?"
    
    elif intent == 'goodbye':
        import random
        goodbye_responses = [
            "Goodbye 👋! Have a great day ahead!",
            "Bye for now! 😊 Don't forget to study smart!",
            "See you soon! 📚 SmartEdu is always here when you need help.",
            "Take care! 🌟 Come back anytime for more info.",
            "Goodbye from SmartEdu 🤖 — wishing you success ahead!"
        ]
        response_text = random.choice(goodbye_responses)
    
    elif intent == 'ask_howareyou':
        import random
        howareyou_responses = [
            "I'm doing great! 🤖 Ready to help you with college info. How about you?",
            "Feeling smart as always 😎! What brings you here today?",
            "All systems go! 🚀 How can I assist you today?",
            "I'm always good when students come to chat with me! 😊"
        ]
        response_text = random.choice(howareyou_responses)
    
    elif intent == 'ask_whoareyou':
        import random
        whoareyou_responses = [
            "I'm **SmartEdu**, your AI-powered college assistant chatbot. I can help you with admissions, fees, results, and more!",
            "I'm SmartEdu 🤖 — your digital academic buddy built to guide students and answer queries.",
            "I'm SmartEdu, developed to make your campus life easier and smarter! 🎓"
        ]
        response_text = random.choice(whoareyou_responses)
    
    elif intent == 'ask_areyoubot':
        import random
        areyoubot_responses = [
            "Yes, I'm a chatbot 🤖 — built smart to help students like you!",
            "Absolutely! I'm a virtual assistant designed to answer all your college-related queries.",
            "Yup! I'm your friendly digital assistant — SmartEdu at your service. 💬"
        ]
        response_text = random.choice(areyoubot_responses)
    
    elif intent == 'ask_creator':
        import random
        creator_responses = [
            "I was created by the SmartEdu development team 💻 — guided by talented computer science students!",
            "SmartEdu was developed by passionate tech minds from your college. 🎓",
            "I was built with love ❤️ and code 💻 by the SmartEdu team!"
        ]
        response_text = random.choice(creator_responses)
    
    elif intent == 'ask_help':
        import random
        help_responses = [
            "Sure! 😊 I can help you with admissions, fees, courses, results, events, and more. What do you want to know?",
            "I'm here to assist! 🎓 You can ask about academics, hostel, placement, or any campus info.",
            "Of course! 🤖 Tell me your question — admissions, attendance, marks, or events?",
            "Always ready to help you! 💬 What's your query today?"
        ]
        response_text = random.choice(help_responses)
    
    elif intent == 'fee_query':
        # Check if admin is asking
        is_admin_fee = user_role == 'admin' or user_role == 'HOD'
        
        if not is_admin_fee:
            # For students, get their student_id
            if not student_id:
                # fallback: derive student_id from user_id if provided
                if user_id:
                    student = Student.query.filter_by(user_id=int(user_id)).first()
                    if student:
                        student_id = student.student_id
            if not student_id:
                return jsonify({'intent': 'fee_query', 'response': 'Please log in as a student to view fee details.', 'data': {}}), 200
        
        # Admin handling for fees
        if is_admin_fee:
            try:
                import requests
                # Use helper function to detect filters
                filters = detect_admin_filters(msg)
                
                if filters['target_student_id']:
                    # Get student object for name
                    student_obj = db.session.get(Student, filters['target_student_id'])
                    student_name = student_obj.user.name if student_obj else 'Student'
                    
                    # Fetch specific student's fees
                    api_response = requests.get(f'http://127.0.0.1:5000/api/students/{filters["target_student_id"]}/fees', timeout=5)
                    if api_response.status_code == 200:
                        fee_data = api_response.json()
                        if fee_data and 'total_amount' in fee_data:
                            total = fee_data.get('total_amount', 0)
                            paid = fee_data.get('paid_amount', 0)
                            due = fee_data.get('due_amount', 0)
                            
                            response_text = f"💳 **Fee Payment Details for {student_name}**\n"
                            response_text += f"{'='*50}\n"
                            response_text += f"\n📌 **Total Fee:**      ₹{total:,.2f}\n"
                            response_text += f"✅ **Paid Amount:**   ₹{paid:,.2f}\n"
                            response_text += f"⏳ **Due Amount:**    ₹{due:,.2f}\n"
                            response_text += f"\n📋 **Status:**         {fee_data.get('payment_status', 'N/A')}"
                            if fee_data.get('last_payment_date'):
                                response_text += f"\n📅 **Last Payment:**   {fee_data.get('last_payment_date')}"
                            response_text += f"\n{'='*50}"
                            return jsonify({'intent': 'fee_query', 'response': response_text, 'data': fee_data})
                        else:
                            return jsonify({'intent': 'fee_query', 'response': f'No fee details found for {student_name}.', 'data': {}})
                else:
                    # Admin wants all students' fees - query directly from database
                    # Apply class filter if specified
                    query = Student.query
                    
                    if filters['class_filter']:
                        query = query.join(Class).filter(Class.class_name.ilike(f'%{filters["class_filter"]}%'))
                    
                    all_students = query.all()
                    
                    class_text = f" ({filters['class_filter']})" if filters['class_filter'] else ""
                    response_text = f"💳 **Students Fee Status{class_text}**\n"
                    response_text += f"{'='*60}\n\n"
                    response_text += f"Total Students: {len(all_students)}\n\n"
                    
                    for student in all_students[:20]:  # Show max 20 students
                        student_fees = Fee.query.filter_by(student_id=student.student_id).first()
                        if student_fees:
                            fee_data = student_fees.to_dict()
                            status_emoji = "✅" if fee_data.get('due_amount', 0) == 0 else "⚠️"
                            response_text += f"📌 **{student.user.name}** (Roll: {student.roll_no})\n"
                            response_text += f"   └─ Paid: ₹{fee_data.get('paid_amount', 0):,.0f} / Total: ₹{fee_data.get('total_amount', 0):,.0f}  |  Status: {status_emoji} {fee_data.get('payment_status', 'N/A')}\n\n"
                    
                    return jsonify({'intent': 'fee_query', 'response': response_text, 'data': {}})
            except Exception as e:
                print(f"Error in admin fee query: {e}")
                return jsonify({'intent': 'fee_query', 'response': 'Unable to fetch fee details.', 'data': {}})
        
        # Student handling
        try:
            import requests
            api_response = requests.get(f'http://127.0.0.1:5000/api/students/{student_id}/fees', timeout=5)
            if api_response.status_code == 200:
                fee_data = api_response.json()
                if fee_data and 'total_amount' in fee_data:
                    # Format currency with thousands separator
                    total = fee_data.get('total_amount', 0)
                    paid = fee_data.get('paid_amount', 0)
                    due = fee_data.get('due_amount', 0)
                    
                    response_text = f"💳 **Fee Payment Details**\n"
                    response_text += f"{'='*50}\n"
                    response_text += f"\n📌 **Total Fee:**      ₹{total:,.2f}\n"
                    response_text += f"✅ **Paid Amount:**   ₹{paid:,.2f}\n"
                    response_text += f"⏳ **Due Amount:**    ₹{due:,.2f}\n"
                    response_text += f"\n📋 **Status:**         {fee_data.get('payment_status', 'N/A')}"
                    if fee_data.get('last_payment_date'):
                        response_text += f"\n📅 **Last Payment:**   {fee_data.get('last_payment_date')}"
                    response_text += f"\n{'='*50}"
                    data = fee_data
                else:
                    response_text = "No fee details found for your account."
                    data = {}
            else:
                response_text = "Unable to fetch fee details at the moment."
                data = {}
        except Exception as e:
            response_text = "Unable to fetch fee details at the moment."
            data = {}
    elif intent == 'attendance_query':
        # Check if admin is asking
        is_admin_attendance = user_role == 'admin' or user_role == 'HOD'
        
        if not is_admin_attendance:
            if not student_id:
                user_id = payload.get('user_id')
                if user_id:
                    student = Student.query.filter_by(user_id=int(user_id)).first()
                    if student:
                        student_id = student.student_id
            if not student_id:
                return jsonify({'intent': 'attendance_query', 'response': 'Please log in as a student to view attendance details.', 'data': {}}), 200
        
        # Detect if asking for specific subject
        subject_keywords = {
            'data structure': ['data structure', 'ds', 'datal', 'structure'],
            'computer network': ['computer network', 'cn', 'networks'],
            'database': ['database', 'dbms', 'db management'],
            'operating system': ['operating system', 'os'],
            'discrete math': ['discrete math', 'discrete mathematics', 'dm']
        }
        
        msg = payload.get('message', '').lower()
        requested_subject = None
        for subject, keywords in subject_keywords.items():
            if any(kw in msg for kw in keywords):
                requested_subject = subject
                break
        
        # Admin handling for attendance
        if is_admin_attendance:
            try:
                import requests
                # Use helper function to detect filters
                filters = detect_admin_filters(msg)
                
                if filters['target_student_id']:
                    # Get student object for name
                    student_obj = db.session.get(Student, filters['target_student_id'])
                    student_name = student_obj.user.name if student_obj else 'Student'
                    
                    # Fetch specific student's attendance
                    api_response = requests.get(f'http://127.0.0.1:5000/api/students/{filters["target_student_id"]}/attendance-summary', timeout=5)
                    if api_response.status_code == 200:
                        attendance_data = api_response.json()
                        if attendance_data and len(attendance_data) > 0:
                            total_present = sum(record.get('present_count', 0) for record in attendance_data)
                            total_classes = sum(record.get('total_classes', 0) for record in attendance_data)
                            attendance_percentage = (total_present / total_classes * 100) if total_classes > 0 else 0
                            
                            response_text = f"📈 **Attendance for {student_name}**\n"
                            response_text += f"{'='*50}\n\n"
                            response_text += f"📊 **Overall:** {attendance_percentage:.1f}% ({total_present}/{total_classes})\n\n"
                            
                            for record in attendance_data[:5]:
                                subject_name = record.get('subject_name', 'N/A')
                                attended = record.get('present_count', 0)
                                total = record.get('total_classes', 0)
                                percentage = (attended / total * 100) if total > 0 else 0
                                response_text += f"📌 **{subject_name}:** {attended}/{total} ({percentage:.1f}%)\n"
                            
                            response_text += f"\n{'='*50}"
                            return jsonify({'intent': 'attendance_query', 'response': response_text, 'data': {'attendance': attendance_data}})
                        else:
                            return jsonify({'intent': 'attendance_query', 'response': f'No attendance found for {student_name}.', 'data': {}})
                else:
                    # Admin wants all students' attendance summary - query directly from database
                    # Apply class filter if specified
                    query = Student.query
                    
                    if filters['class_filter']:
                        query = query.join(Class).filter(Class.class_name.ilike(f'%{filters["class_filter"]}%'))
                    
                    all_students = query.all()
                    
                    class_text = f" ({filters['class_filter']})" if filters['class_filter'] else ""
                    response_text = f"📈 **Students Attendance Summary{class_text}**\n"
                    response_text += f"{'='*60}\n\n"
                    response_text += f"Total Students: {len(all_students)}\n\n"
                    
                    for student in all_students[:20]:  # Show max 20 students
                        attendance_records = Attendance.query.filter_by(student_id=student.student_id).all()
                        if attendance_records:
                            total_present = sum(record.present_count for record in attendance_records)
                            total_classes = sum(record.total_classes for record in attendance_records)
                            percentage = (total_present / total_classes * 100) if total_classes > 0 else 0
                            status_emoji = "✅" if percentage >= 75 else "⚠️" if percentage >= 60 else "❌"
                            response_text += f"📌 **{student.user.name}** (Roll: {student.roll_no})\n"
                            response_text += f"   └─ Attendance: {total_present}/{total_classes} ({percentage:.1f}%) {status_emoji}\n\n"
                    
                    return jsonify({'intent': 'attendance_query', 'response': response_text, 'data': {}})
            except Exception as e:
                print(f"Error in admin attendance query: {e}")
                return jsonify({'intent': 'attendance_query', 'response': 'Unable to fetch attendance details.', 'data': {}})
        
        # Use the same API endpoint that Student Services uses
        try:
            import requests
            api_response = requests.get(f'http://127.0.0.1:5000/api/students/{student_id}/attendance-summary', timeout=5)
            if api_response.status_code == 200:
                attendance_data = api_response.json()
                if attendance_data and len(attendance_data) > 0:
                    # If specific subject requested, filter results
                    if requested_subject:
                        matched_attendance = []
                        seen_subjects = set()  # Track unique subjects to avoid duplicates
                        for record in attendance_data:
                            subject_name = record.get('subject_name', '').lower()
                            # Check if this matches our requested subject
                            matches = requested_subject in subject_name or any(kw in subject_name for kw in subject_keywords[requested_subject])
                            
                            # Only add if it matches AND we haven't seen this exact subject name before
                            if matches and subject_name not in seen_subjects:
                                matched_attendance.append(record)
                                seen_subjects.add(subject_name)
                        
                        if matched_attendance:
                            response_text = f"📈 **Attendance: {requested_subject.title()}**\n"
                            response_text += f"{'='*50}\n\n"
                            for record in matched_attendance:
                                subject_name = record.get('subject_name', 'N/A')
                                attended = record.get('present_count', 0)
                                absent = record.get('absent_count', 0)
                                total = record.get('total_classes', 0)
                                percentage = (attended / total * 100) if total > 0 else 0
                                status_emoji = "✅" if percentage >= 75 else "⚠️" if percentage >= 60 else "❌"
                                status_text = "Good" if percentage >= 75 else "Moderate" if percentage >= 60 else "Low"
                                
                                response_text += f"📌 **Subject:**     {subject_name}\n"
                                response_text += f"📊 **Classes:**     {total} (Present: {attended} | Absent: {absent})\n"
                                response_text += f"📈 **Percentage:**  {percentage:.1f}%\n"
                                response_text += f"🔖 **Status:**      {status_emoji} {status_text} Attendance\n"
                            
                            response_text += f"\n{'='*50}"
                            data = {'attendance': matched_attendance}
                        else:
                            response_text = f"No attendance found for {requested_subject}."
                            data = {}
                    else:
                        # Calculate overall attendance from summary data
                        total_present = sum(record.get('present_count', 0) for record in attendance_data)
                        total_classes = sum(record.get('total_classes', 0) for record in attendance_data)
                        attendance_percentage = (total_present / total_classes * 100) if total_classes > 0 else 0
                        
                        # Format as clean report
                        response_text = f"📈 **Attendance Summary Report**\n"
                        response_text += f"{'='*60}\n\n"
                        response_text += f"📊 **Overall Statistics:**\n"
                        response_text += f"   └─ Total Classes:   {total_classes}\n"
                        response_text += f"   └─ Present:         {total_present}\n"
                        response_text += f"   └─ Absent:          {total_classes - total_present}\n"
                        response_text += f"   └─ Overall:          {attendance_percentage:.1f}%\n\n"
                        
                        # Add subject-wise breakdown (deduplicate subjects)
                        response_text += f"📚 **Subject-wise Attendance:**\n\n"
                        seen_subjects = set()
                        unique_attendance = []
                        
                        # Deduplicate subjects - keep only first occurrence
                        for record in attendance_data:
                            subject_name = record.get('subject_name', 'Unknown').lower()
                            if subject_name not in seen_subjects:
                                seen_subjects.add(subject_name)
                                unique_attendance.append(record)
                        
                        # Display unique subjects
                        for i, record in enumerate(unique_attendance[:8], 1):  # Show max 8 subjects
                            subject_name = record.get('subject_name', f'Subject {i}')
                            attended = record.get('present_count', 0)
                            total = record.get('total_classes', 0)
                            percentage = (attended / total * 100) if total > 0 else 0
                            status_emoji = "✅" if percentage >= 75 else "⚠️" if percentage >= 60 else "❌"
                            status_text = "Good" if percentage >= 75 else "Moderate" if percentage >= 60 else "Low"
                            
                            response_text += f"📌 **{subject_name}**\n"
                            response_text += f"   └─ {attended}/{total} ({percentage:.1f}%)  |  Status: {status_emoji} {status_text}\n\n"
                        
                        if len(unique_attendance) > 8:
                            response_text += f"... and {len(unique_attendance) - 8} more subjects\n\n"
                        
                        # Overall status
                        status_emoji = "✅" if attendance_percentage >= 75 else "⚠️" if attendance_percentage >= 60 else "❌"
                        status_text = "Good" if attendance_percentage >= 75 else "Moderate" if attendance_percentage >= 60 else "Low - Please improve"
                        response_text += f"{'='*60}\n"
                        response_text += f"🔖 **Overall Status:** {status_emoji} {status_text} Attendance\n"
                        response_text += f"{'='*60}"
                        
                        data = {'attendance_summary': attendance_data, 'overall_percentage': attendance_percentage}
                else:
                    response_text = "No attendance details found for your account."
                    data = {}
            else:
                response_text = "Unable to fetch attendance details at the moment."
                data = {}
        except Exception as e:
            response_text = "Unable to fetch attendance details at the moment."
            data = {}
    elif intent == 'event_query':
        events = get_upcoming_events()
        data = {'events': events}
        if events:
            response_text = f"📅 **Upcoming Events ({len(events)} total)**\n"
            response_text += f"{'='*60}\n\n"
            
            # Event type information
            event_type_info = {
                'workshop': {'icon': '🔧', 'form': 'Workshop/Seminar Registration'},
                'seminar': {'icon': '🎓', 'form': 'Workshop/Seminar Registration'},
                'hackathon': {'icon': '💻', 'form': 'Hackathon Event Registration'},
                'club_event': {'icon': '🎭', 'form': 'Club Event Registration'},
                'competition': {'icon': '🏆', 'form': 'Competition Registration'},
                'conference': {'icon': '🏛️', 'form': 'College Event Registration'},
                'cultural': {'icon': '🎨', 'form': 'College Event Registration'},
                'sports': {'icon': '⚽', 'form': 'College Event Registration'},
                'academic': {'icon': '📚', 'form': 'College Event Registration'},
                'general': {'icon': '📅', 'form': 'College Event Registration'}
            }
            
            for i, event in enumerate(events[:8], 1):  # Show max 8 events
                title = event.get('title', 'Untitled Event')
                date = event.get('event_date', 'TBD')
                time = event.get('event_time', 'TBD')
                location = event.get('location', 'TBD')
                event_type = event.get('event_type', 'general')
                type_info = event_type_info.get(event_type, event_type_info['general'])
                desc = event.get('description', '')
                if len(desc) > 100:
                    desc = desc[:100] + '...'
                
                response_text += f"📍 **{title}**\n"
                response_text += f"   └─ {type_info['icon']} Type:       {event_type.title()}\n"
                response_text += f"   └─ 📅 Date:       {date}\n"
                response_text += f"   └─ 🕐 Time:       {time}\n"
                response_text += f"   └─ 📍 Location:   {location}\n"
                response_text += f"   └─ 📝 Form:       {type_info['form']}\n"
                if desc:
                    response_text += f"   └─ 📄 About:      {desc}\n"
                response_text += "\n"
            
            if len(events) > 8:
                response_text += f"... and {len(events) - 8} more events\n"
            
            response_text += f"{'='*60}\n"
            response_text += f"💡 **Registration:** Each event uses a specialized Google Form for professional registration.\n"
            response_text += f"🔗 **Forms Available:** Workshop, Hackathon, Club Events, Competitions, and General Events.\n"
            response_text += f"{'='*60}"
        else:
            response_text = "No upcoming events found."
    elif intent == 'announcement_query':
        # Get announcements from notifications table
        try:
            user_id = payload.get('user_id')
            if not user_id:
                return jsonify({'intent': 'announcement_query', 'response': 'Please log in to view announcements.', 'data': {}})
            
            import requests
            api_response = requests.get(f'http://127.0.0.1:5000/api/users/{user_id}/notifications', timeout=5)
            if api_response.status_code == 200:
                notifications = api_response.json()
                if notifications and len(notifications) > 0:
                    response_text = f"📢 **Announcements ({len(notifications)} total)**\n"
                    response_text += f"{'='*60}\n\n"
                    for i, notif in enumerate(notifications[:10], 1):  # Show max 10 announcements
                        notif_type = notif.get('type', 'info')
                        type_emoji = {'success': '✅', 'warning': '⚠️', 'error': '❌', 'info': 'ℹ️'}.get(notif_type, 'ℹ️')
                        is_read = '✓ Read' if notif.get('is_read', False) else '🆕 NEW'
                        
                        title = notif.get('title', 'Untitled')
                        msg = notif.get('message', '')
                        if len(msg) > 150:
                            msg = msg[:150] + '...'
                        date = notif.get('created_at', 'N/A')
                        
                        response_text += f"{type_emoji} **{title}** [{is_read}]\n"
                        response_text += f"   └─ 📝 Message:  {msg}\n"
                        response_text += f"   └─ 🕐 Date:     {date}\n"
                        if i < len(notifications[:10]):
                            response_text += "\n"
                    
                    response_text += f"\n{'='*60}"
                    data = {'notifications': notifications}
                else:
                    response_text = "No announcements found."
                    data = {}
            else:
                response_text = "Unable to fetch announcements at the moment."
                data = {}
        except Exception as e:
            response_text = "Unable to fetch announcements at the moment."
            data = {}
    elif intent in ['ask_admission', 'ask_fees', 'ask_cutoff', 'ask_college_info', 'ask_hostel', 'ask_transport', 'ask_placement', 'ask_scholarship', 'ask_documents', 'ask_guidance']:
        # Handle college information queries using provided data
        response_text = get_college_info_response(msg, intent)
        data = {}
    else:
        response_text = "I can help with fees, attendance, marks, events, admissions, college information, and more. What would you like to know?"
        data = {}

    return jsonify({'intent': intent or 'unknown', 'response': response_text, 'data': data})

def get_marks_data(user_id, user_role, user):
    """Get marks data based on user role - admin sees all classes, student sees only their marks"""
    try:
        if user_role == 'admin':
            # Admin sees all classes marks
            marks_response = get_class_marks()
            data = json.loads(marks_response.get_data())
            return {'table': format_marks_table_for_admin(data)}
        else:
            # Student sees only their marks
            student = Student.query.filter_by(user_id=user_id).first()
            if student:
                marks = Mark.query.filter_by(student_id=student.student_id).all()
                return {'table': format_marks_table_for_student(student, marks)}
    except Exception as e:
        print(f"Error getting marks data: {str(e)}")
    return None

def get_attendance_data(user_id, user_role, user):
    """Get attendance data based on user role - admin sees all, student sees only their attendance"""
    try:
        if user_role == 'admin':
            # Admin sees all classes attendance
            attendance_response = get_class_attendance()
            data = json.loads(attendance_response.get_data())
            return {'table': format_attendance_table_for_admin(data)}
        else:
            # Student sees only their attendance
            student = Student.query.filter_by(user_id=user_id).first()
            if student:
                attendance = Attendance.query.filter_by(student_id=student.student_id).all()
                return {'table': format_attendance_table_for_student(student, attendance)}
    except Exception as e:
        print(f"Error getting attendance data: {str(e)}")
    return None

def get_fees_data(user_id, user_role, user):
    """Get fees data based on user role - admin sees all, student sees only their fees"""
    try:
        if user_role == 'admin':
            # Admin sees all students fees
            fees_response = get_class_fees()
            data = json.loads(fees_response.get_data())
            return {'table': format_fees_table_for_admin(data)}
        else:
            # Student sees only their fees
            student = Student.query.filter_by(user_id=user_id).first()
            if student and student.fees:
                return {'table': format_fees_table_for_student(student)}
    except Exception as e:
        print(f"Error getting fees data: {str(e)}")
    return None

def get_students_data(user_role):
    """Get students data - only admin can see all students"""
    if user_role == 'admin':
        try:
            students = Student.query.join(User).all()
            return {'table': format_students_table(students)}
        except Exception as e:
            print(f"Error getting students data: {str(e)}")
    return None

def format_marks_table_for_admin(class_data):
    """Format marks data for admin showing all classes"""
    if not class_data or len(class_data) == 0:
        return None
    table = {'title': 'Marks Overview - All Classes', 'columns': [
        {'key': 'class_name', 'label': 'Class'},
        {'key': 'roll_no', 'label': 'Roll No'},
        {'key': 'name', 'label': 'Name'},
        {'key': 'marks', 'label': 'Marks'},
        {'key': 'percentage', 'label': '%'}
    ], 'rows': []}
    for cls in class_data:
        for student in cls.get('students', []):
            table['rows'].append({
                'class_name': cls.get('class_name', ''),
                'roll_no': student.get('roll_number', ''),
                'name': student.get('name', ''),
                'marks': f"{student.get('total', 0)}/{student.get('total', 0)}",
                'percentage': f"{student.get('percentage', 0)}%"
            })
    return table

def format_marks_table_for_student(student, marks):
    """Format marks data for student showing only their marks"""
    if not marks:
        return None
    subjects = Subject.query.filter_by(class_id=student.class_id).all()
    table = {'title': 'Your Marks Overview', 'columns': [
        {'key': 'subject', 'label': 'Subject'},
        {'key': 'marks', 'label': 'Marks Obtained'},
        {'key': 'percentage', 'label': 'Percentage'}
    ], 'rows': []}
    for mark in marks:
        subject = Subject.query.get(mark.subject_id)
        if subject:
            table['rows'].append({
                'subject': subject.subject_name,
                'marks': f"{mark.obtained_marks}/35",
                'percentage': f"{(mark.obtained_marks / 35) * 100:.1f}%"
            })
    return table

def format_attendance_table_for_admin(class_data):
    """Format attendance data for admin showing all classes"""
    if not class_data or len(class_data) == 0:
        return None
    table = {'title': 'Attendance Overview - All Classes', 'columns': [
        {'key': 'class_name', 'label': 'Class'},
        {'key': 'roll_no', 'label': 'Roll No'},
        {'key': 'name', 'label': 'Name'},
        {'key': 'attendance', 'label': 'Attendance'},
        {'key': 'percentage', 'label': '%'}
    ], 'rows': []}
    for cls in class_data:
        for student in cls.get('students', []):
            table['rows'].append({
                'class_name': cls.get('class_name', ''),
                'roll_no': student.get('roll_number', ''),
                'name': student.get('name', ''),
                'attendance': f"{student.get('total', 0)}",
                'percentage': f"{student.get('total_percentage', 0)}%"
            })
    return table

def format_attendance_table_for_student(student, attendance):
    """Format attendance data for student showing only their attendance"""
    if not attendance:
        return None
    table = {'title': 'Your Attendance Overview', 'columns': [
        {'key': 'subject', 'label': 'Subject'},
        {'key': 'present', 'label': 'Present'},
        {'key': 'percentage', 'label': 'Attendance %'}
    ], 'rows': []}
    for att in attendance:
        subject = Subject.query.get(att.subject_id)
        if subject:
            percentage = (att.present_count / 50) * 100 if att.present_count else 0
            table['rows'].append({
                'subject': subject.subject_name,
                'present': f"{att.present_count}/50",
                'percentage': f"{percentage:.1f}%"
            })
    return table

def format_fees_table_for_admin(class_data):
    """Format fees data for admin showing all students"""
    if not class_data or len(class_data) == 0:
        return None
    table = {'title': 'Fees Overview - All Students', 'columns': [
        {'key': 'class_name', 'label': 'Class'},
        {'key': 'roll_no', 'label': 'Roll No'},
        {'key': 'name', 'label': 'Name'},
        {'key': 'total', 'label': 'Total Fees'},
        {'key': 'paid', 'label': 'Paid'},
        {'key': 'remaining', 'label': 'Remaining'},
        {'key': 'status', 'label': 'Status'}
    ], 'rows': []}
    for cls in class_data:
        for student in cls.get('students', []):
            table['rows'].append({
                'class_name': cls.get('class_name', ''),
                'roll_no': student.get('roll_number', ''),
                'name': student.get('name', ''),
                'total': f"₹{student.get('total_fees', 0)}",
                'paid': f"₹{student.get('paid_fees', 0)}",
                'remaining': f"₹{student.get('remaining_fees', 0)}",
                'status': student.get('payment_status', 'Unpaid')
            })
    return table

def format_fees_table_for_student(student):
    """Format fees data for student showing only their fees"""
    if not student.fees:
        return None
    table = {'title': 'Your Fee Details', 'columns': [
        {'key': 'fee_type', 'label': 'Fee Type'},
        {'key': 'total', 'label': 'Total Amount'},
        {'key': 'paid', 'label': 'Paid Amount'},
        {'key': 'remaining', 'label': 'Remaining'},
        {'key': 'status', 'label': 'Status'}
    ], 'rows': [{
        'fee_type': 'Total Fees',
        'total': f"₹{student.fees.total_amount}",
        'paid': f"₹{student.fees.paid_amount}",
        'remaining': f"₹{student.fees.due_amount}",
        'status': student.fees.payment_status
    }]}
    return table

def format_students_table(students):
    """Format students list for admin"""
    if not students:
        return None
    table = {'title': 'All Students', 'columns': [
        {'key': 'roll_no', 'label': 'Roll No'},
        {'key': 'name', 'label': 'Name'},
        {'key': 'email', 'label': 'Email'},
        {'key': 'contact', 'label': 'Contact'},
        {'key': 'class', 'label': 'Class'}
    ], 'rows': []}
    for student in students:
        table['rows'].append({
            'roll_no': student.roll_no,
            'name': student.user.name,
            'email': student.user.email,
            'contact': student.user.contact_no or '-',
            'class': student.class_.class_name
        })
    return table

# Routes
@app.route('/')
def home():
    return jsonify({'message': 'SmartEdu Chatbot API is running!'})

@app.route('/api/users', methods=['GET'])
def get_users():
    users = User.query.all()
    return jsonify([user.to_dict() for user in users])

@app.route('/api/users', methods=['POST'])
def create_user():
    data = request.get_json()
    
    if not data or not data.get('username') or not data.get('email'):
        return jsonify({'error': 'Username and email are required'}), 400
    
    user = User(username=data['username'], email=data['email'])
    db.session.add(user)
    db.session.commit()
    
    return jsonify(user.to_dict()), 201

@app.route('/chat', methods=['POST'])
def chat():
    """
    Process user message with Dialogflow intent detection and sentiment analysis
    Uses the detect_intent_texts function as requested
    Enhanced to support role-based data access
    """
    try:
        data = request.get_json()
        
        if not data or not data.get('message'):
            return jsonify({'error': 'Message is required'}), 400
        
        user_message = data['message']
        user_id = data.get('user_id', 1)  # Default user if not provided
        language_code = data.get('language_code', 'en')  # Default to English
        
        # Get user details to determine role
        # Use SQLAlchemy 2.0 style Session.get
        user = db.session.get(User, user_id)
        user_role = user.role if user else 'student'
        
        # Analyze sentiment of user message
        sentiment_data = analyze_sentiment(user_message)
        
        # Get project_id and session_id from request or use defaults
        project_id = data.get('project_id', dialogflow_service.project_id)
        session_id = data.get('session_id', f'smartedu-session-{user_id}')
        
        # Use Rasa NLU for intent detection
        dialogflow_result = rasa_service.detect_intent_texts(
            text=user_message,
            language_code=language_code
        )
        
        # Get educational response based on intent
        # Build educational response via local helper (no Dialogflow dependency)
        educational_response = get_educational_response(
            dialogflow_result['intent'],
            dialogflow_result['parameters'],
            user_message,
            dialogflow_result['fulfillment_text']
        )
        
        # Enhance response with role-based data based on intent
        data_response = None
        if 'marks' in dialogflow_result['intent'].lower():
            data_response = get_marks_data(user_id, user_role, user)
        elif 'attendance' in dialogflow_result['intent'].lower():
            data_response = get_attendance_data(user_id, user_role, user)
        elif 'fees' in dialogflow_result['intent'].lower():
            data_response = get_fees_data(user_id, user_role, user)
        elif 'student' in dialogflow_result['intent'].lower():
            data_response = get_students_data(user_role)
        
        # Add empathetic prefix if sentiment is negative
        empathetic_prefix = get_empathetic_prefix(sentiment_data)
        final_response = empathetic_prefix + educational_response['response']
        
        # Create chat message record
        chat_message = ChatMessage(
            user_id=user_id,
            message=user_message,
            response=final_response,
            intent=dialogflow_result['intent'],
            confidence=dialogflow_result['confidence']
        )
        
        db.session.add(chat_message)
        db.session.commit()
        
        # Prepare comprehensive response for frontend
        response_data = {
            'message_id': chat_message.id,
            'response': final_response,
            'intent': dialogflow_result['intent'],
            'confidence': dialogflow_result['confidence'],
            'suggestions': educational_response.get('suggestions', []),
            'parameters': dialogflow_result.get('parameters', {}),
            'action': dialogflow_result.get('action', ''),
            'all_required_params_present': dialogflow_result.get('all_required_params_present', False),
            'query_text': dialogflow_result.get('query_text', user_message),
            'timestamp': chat_message.timestamp.isoformat(),
            'session_id': session_id,
            'project_id': project_id,
            'sentiment': {
                'polarity': sentiment_data['polarity'],
                'sentiment': sentiment_data['sentiment'],
                'has_empathetic_prefix': bool(empathetic_prefix)
            }
        }
        
        # Add table data if available
        if data_response and data_response.get('table'):
            response_data['table'] = data_response['table']
        
        return jsonify(response_data), 200
        
    except Exception as e:
        return jsonify({'error': f'Chat processing failed: {str(e)}'}), 500

@app.route('/events', methods=['GET'])
def get_events():
    """
    Fetch event list from database
    """
    try:
        # Get query parameters
        active_only = request.args.get('active_only', 'true').lower() == 'true'
        event_type = request.args.get('type')
        limit = request.args.get('limit', type=int)
        
        # Build query
        query = Event.query
        
        if active_only:
            query = query.filter(Event.is_active == True)
            # Also filter out past events
            today = datetime.utcnow().date()
            query = query.filter(Event.event_date >= today)
        
        if event_type:
            query = query.filter(Event.event_type == event_type)
        
        # Order by event date
        query = query.order_by(Event.event_date.asc())
        
        if limit:
            query = query.limit(limit)
        
        events = query.all()
        
        return jsonify([event.to_dict() for event in events]), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to fetch events: {str(e)}'}), 500

@app.route('/admin/announce', methods=['POST'])
def create_announcement():
    """
    Add new announcement (admin only)
    """
    try:
        data = request.get_json()
        
        if not data or not data.get('title') or not data.get('message'):
            return jsonify({'error': 'Title and message are required'}), 400
        
        # Parse optional fields
        priority = data.get('priority', 'normal')
        expires_at = data.get('expires_at')
        
        if expires_at:
            try:
                expires_at = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
            except ValueError:
                return jsonify({'error': 'Invalid expires_at format. Use ISO format.'}), 400
        
        # Create announcement
        announcement = Announcement(
            title=data['title'],
            message=data['message'],
            priority=priority,
            expires_at=expires_at
        )
        
        db.session.add(announcement)
        db.session.commit()
        
        return jsonify(announcement.to_dict()), 201
        
    except Exception as e:
        return jsonify({'error': f'Failed to create announcement: {str(e)}'}), 500

@app.route('/api/announcements', methods=['GET', 'POST'])
def get_announcements():
    """
    Get active announcements or create new announcement
    """
    if request.method == 'POST':
        try:
            data = request.get_json()
            
            if not data or not data.get('title') or not data.get('body'):
                return jsonify({'error': 'Title and body are required'}), 400
            
            # Create announcement
            announcement = Announcement(
                title=data.get('title'),
                message=data.get('body'),  # Use 'body' from frontend
                priority=data.get('type', 'normal'),  # Use 'type' from frontend
                target=data.get('target_audience', 'all'),
                is_active=True,
                created_at=datetime.utcnow()
            )
            
            db.session.add(announcement)
            db.session.commit()
            
            return jsonify(announcement.to_dict()), 201
            
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': f'Failed to create announcement: {str(e)}'}), 500
    else:
        # GET request
        try:
            active_only = request.args.get('active_only', 'true').lower() == 'true'
            priority = request.args.get('priority')
            
            query = Announcement.query
            
            if active_only:
                query = query.filter(Announcement.is_active == True)
                # Filter out expired announcements
                query = query.filter(
                    (Announcement.expires_at.is_(None)) | 
                    (Announcement.expires_at > datetime.utcnow())
                )
            
            if priority:
                query = query.filter(Announcement.priority == priority)
            
            query = query.order_by(Announcement.created_at.desc())
            
            announcements = query.all()
            
            return jsonify([announcement.to_dict() for announcement in announcements]), 200
            
        except Exception as e:
            return jsonify({'error': f'Failed to fetch announcements: {str(e)}'}), 500

@app.route('/api/chat/<int:user_id>', methods=['GET'])
def get_user_chats(user_id):
    chats = ChatMessage.query.filter_by(user_id=user_id).order_by(ChatMessage.timestamp.desc()).all()
    return jsonify([chat.to_dict() for chat in chats])

# ==================== NEW API ENDPOINTS ====================

# DEPARTMENTS
@app.route('/api/departments', methods=['GET'])
def get_departments():
    """Get all departments"""
    try:
        departments = Department.query.filter_by(is_active=True).all()
        return jsonify([dept.to_dict() for dept in departments]), 200
    except Exception as e:
        return jsonify({'error': f'Failed to fetch departments: {str(e)}'}), 500

# CLASSES
@app.route('/api/classes', methods=['GET'])
def get_classes():
    """Get all classes with optional department filter"""
    try:
        dept_id = request.args.get('dept_id', type=int)
        query = Class.query.filter_by(is_active=True)
        
        if dept_id:
            query = query.filter_by(dept_id=dept_id)
        
        classes = query.all()
        return jsonify([cls.to_dict() for cls in classes]), 200
    except Exception as e:
        return jsonify({'error': f'Failed to fetch classes: {str(e)}'}), 500

# SUBJECTS
@app.route('/api/subjects', methods=['GET'])
def get_subjects():
    """Get all subjects with optional class filter"""
    try:
        class_id = request.args.get('class_id', type=int)
        query = Subject.query.filter_by(is_active=True)
        
        if class_id:
            query = query.filter_by(class_id=class_id)
        
        subjects = query.all()
        return jsonify([subject.to_dict() for subject in subjects]), 200
    except Exception as e:
        return jsonify({'error': f'Failed to fetch subjects: {str(e)}'}), 500

# STUDENTS
@app.route('/api/students', methods=['GET'])
def get_students():
    """Get all students with optional filters"""
    try:
        class_id = request.args.get('class_id', type=int)
        roll_no = request.args.get('roll_no')
        limit = request.args.get('limit', type=int)
        query = Student.query.filter_by(is_active=True)
        
        if class_id:
            query = query.filter_by(class_id=class_id)
        if roll_no:
            query = query.filter_by(roll_no=roll_no)

        # Apply limit if provided to avoid returning very large result sets
        if limit and limit > 0:
            query = query.limit(limit)
        
        students = query.all()
        return jsonify([student.to_dict() for student in students]), 200
    except Exception as e:
        return jsonify({'error': f'Failed to fetch students: {str(e)}'}), 500

@app.route('/api/students', methods=['POST'])
def create_student():
    """Create a new student"""
    try:
        data = request.get_json()
        
        required_fields = ['user_id', 'roll_no', 'class_id', 'admission_year']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Check if user exists and is a student
        user = db.session.get(User, data['user_id'])
        if not user or user.role != 'student':
            return jsonify({'error': 'Invalid user or user is not a student'}), 400
        
        # Check if roll number already exists
        if Student.query.filter_by(roll_no=data['roll_no']).first():
            return jsonify({'error': 'Roll number already exists'}), 400
        
        student = Student(
            user_id=data['user_id'],
            roll_no=data['roll_no'],
            class_id=data['class_id'],
            admission_year=data['admission_year'],
            admission_date=datetime.strptime(data.get('admission_date', datetime.now().strftime('%Y-%m-%d')), '%Y-%m-%d').date() if data.get('admission_date') else None,
            guardian_name=data.get('guardian_name'),
            guardian_contact=data.get('guardian_contact'),
            address=data.get('address')
        )
        
        db.session.add(student)
        db.session.commit()
        
        return jsonify(student.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to create student: {str(e)}'}), 500

@app.route('/api/students/<int:student_id>', methods=['GET'])
def get_student(student_id):
    """Get student by ID with detailed information"""
    try:
        student = Student.query.get_or_404(student_id)
        student_data = student.to_dict()
        
        # Add user information
        student_data['user'] = student.user.to_dict()
        
        # Add class information
        student_data['class'] = student.class_.to_dict()
        
        # Add fees information
        if student.fees:
            student_data['fees'] = student.fees.to_dict()
        
        return jsonify(student_data), 200
    except Exception as e:
        return jsonify({'error': f'Failed to fetch student: {str(e)}'}), 500

# MARKS
@app.route('/api/students/<int:student_id>/marks', methods=['GET'])
def get_student_marks(student_id):
    """Get marks for a specific student with subject names"""
    try:
        student = Student.query.get_or_404(student_id)
        subject_id = request.args.get('subject_id', type=int)
        
        query = Mark.query.filter_by(student_id=student_id)
        
        if subject_id:
            query = query.filter_by(subject_id=subject_id)
        
        marks = query.all()
        
        # Enhance marks data with subject information
        marks_data = []
        for mark in marks:
            mark_dict = mark.to_dict()
            # Add subject information
            subject = db.session.get(Subject, mark.subject_id)
            if subject:
                mark_dict['subject_name'] = subject.subject_name
                mark_dict['subject_code'] = subject.subject_code
                mark_dict['credits'] = subject.credits
            marks_data.append(mark_dict)
        
        return jsonify(marks_data), 200
    except Exception as e:
        return jsonify({'error': f'Failed to fetch marks: {str(e)}'}), 500

@app.route('/api/students/<int:student_id>/marks', methods=['POST'])
def add_student_marks(student_id):
    """Add marks for a student"""
    try:
        data = request.get_json()
        
        required_fields = ['subject_id', 'obtained_marks']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Check if student exists
        student = Student.query.get_or_404(student_id)
        
        # Check if subject exists
        subject = Subject.query.get_or_404(data['subject_id'])
        
        # Check if marks already exist for this student-subject combination
        existing_mark = Mark.query.filter_by(
            student_id=student_id,
            subject_id=data['subject_id']
        ).first()
        
        if existing_mark:
            return jsonify({'error': 'Marks already exist for this subject'}), 400
        
        obtained_marks = data['obtained_marks']
        total_marks = data.get('total_marks', 35)
        
        # Validate marks range
        if obtained_marks < 0 or obtained_marks > 35:
            return jsonify({'error': 'Marks must be between 0 and 35.'}), 400
        
        # Validate maximum marks
        if obtained_marks > total_marks:
            return jsonify({'error': f'Marks cannot exceed total marks ({total_marks})'}), 400
        
        # Create mark record
        mark = Mark(
            student_id=student_id,
            subject_id=data['subject_id'],
            total_marks=total_marks,
            obtained_marks=obtained_marks,
            exam_date=datetime.strptime(data.get('exam_date', datetime.now().strftime('%Y-%m-%d')), '%Y-%m-%d').date() if data.get('exam_date') else None
        )
        
        db.session.add(mark)
        db.session.commit()
        
        return jsonify(mark.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to add marks: {str(e)}'}), 500

@app.route('/api/students/<int:student_id>/marks/<int:mark_id>', methods=['PUT'])
def update_student_marks(student_id, mark_id):
    """Update marks for a student"""
    try:
        data = request.get_json()
        
        # Check if mark exists
        mark = Mark.query.filter_by(mark_id=mark_id, student_id=student_id).first()
        if not mark:
            return jsonify({'error': 'Mark not found'}), 404
        
        # Validate minimum marks requirement
        if 'obtained_marks' in data:
            obtained_marks = data['obtained_marks']
            total_marks = data.get('total_marks', mark.total_marks)
            
            if obtained_marks < 0 or obtained_marks > 35:
                return jsonify({'error': 'Marks must be between 0 and 35.'}), 400
            
            if obtained_marks > total_marks:
                return jsonify({'error': f'Marks cannot exceed total marks ({total_marks})'}), 400
            
            # Update marks
            mark.obtained_marks = obtained_marks
            mark.total_marks = total_marks
        
        # Update other fields if provided
        if 'exam_date' in data:
            mark.exam_date = datetime.strptime(data['exam_date'], '%Y-%m-%d').date()
        
        mark.updated_at = datetime.utcnow()
        
        db.session.commit()
        return jsonify(mark.to_dict()), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to update marks: {str(e)}'}), 500


# ATTENDANCE
@app.route('/api/students/<int:student_id>/attendance', methods=['GET'])
def get_student_attendance(student_id):
    """Get attendance for a specific student"""
    try:
        student = Student.query.get_or_404(student_id)
        summary = request.args.get('summary', 'false').lower() == 'true'
        subject_id = request.args.get('subject_id', type=int)
        # Note: Attendance model stores aggregated counts (present_count, total_classes, etc.)
        # so detailed date-range filtering isn't supported by the current schema.
        # Ignore start_date/end_date to avoid referencing non-existent columns.
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        if summary:
            # Return attendance summary grouped by subject
            query = Attendance.query.filter_by(student_id=student_id)
            
            if start_date:
                query = query.filter(Attendance.date >= datetime.strptime(start_date, '%Y-%m-%d').date())
            if end_date:
                query = query.filter(Attendance.date <= datetime.strptime(end_date, '%Y-%m-%d').date())
            
            attendance_records = query.all()
            
            # Group by subject and calculate summary
            subject_summary = {}
            for att in attendance_records:
                if att.subject_id not in subject_summary:
                    subject_summary[att.subject_id] = {
                        'subject_id': att.subject_id,
                        'total_classes': 0,
                        'present_count': 0,
                        'absent_count': 0
                    }
                
                subject_summary[att.subject_id]['total_classes'] += 1
                if att.status == 'Present':
                    subject_summary[att.subject_id]['present_count'] += 1
                else:
                    subject_summary[att.subject_id]['absent_count'] += 1
            
            # Fetch subject details and format response
            summary_list = []
            for subj_id, summary_data in subject_summary.items():
                subject = db.session.get(Subject, subj_id)
                if subject:
                    summary_list.append({
                        'subject_id': subj_id,
                        'subject_name': subject.subject_name,
                        'subject_code': subject.subject_code,
                        'present_count': summary_data['present_count'],
                        'absent_count': summary_data['absent_count'],
                        'total_classes': summary_data['total_classes'],
                        'attendance_percentage': round((summary_data['present_count'] / summary_data['total_classes']) * 100, 2) if summary_data['total_classes'] > 0 else 0
                    })
            
            return jsonify(summary_list), 200
        else:
            # Return aggregated attendance records for the student (no per-date records)
            query = Attendance.query.filter_by(student_id=student_id)

            if subject_id:
                query = query.filter_by(subject_id=subject_id)

            attendance = query.order_by(Attendance.updated_at.desc()).all()
            return jsonify([att.to_dict() for att in attendance]), 200
    except Exception as e:
        return jsonify({'error': f'Failed to fetch attendance: {str(e)}'}), 500

@app.route('/api/students/<int:student_id>/attendance', methods=['POST'])
def mark_attendance(student_id):
    """Mark attendance for a student"""
    try:
        data = request.get_json()
        
        required_fields = ['subject_id', 'status']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Check if student exists
        student = Student.query.get_or_404(student_id)
        
        # Check if subject exists
        subject = Subject.query.get_or_404(data['subject_id'])
        
        attendance_date = datetime.strptime(data.get('date', datetime.now().strftime('%Y-%m-%d')), '%Y-%m-%d').date()
        
        # Check if attendance already marked for this date
        existing_attendance = Attendance.query.filter_by(
            student_id=student_id,
            subject_id=data['subject_id'],
            date=attendance_date
        ).first()
        
        if existing_attendance:
            # Update existing attendance
            existing_attendance.status = data['status']
            existing_attendance.remarks = data.get('remarks')
            db.session.commit()
            return jsonify(existing_attendance.to_dict()), 200
        else:
            # Create new attendance record
            attendance = Attendance(
                student_id=student_id,
                subject_id=data['subject_id'],
                date=attendance_date,
                status=data['status'],
                remarks=data.get('remarks')
            )
            
            db.session.add(attendance)
            db.session.commit()
            
            return jsonify(attendance.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to mark attendance: {str(e)}'}), 500

# FEES
@app.route('/api/students/<int:student_id>/attendance-summary', methods=['GET'])
def get_student_attendance_summary(student_id):
    """Get attendance summary for a student (aggregated counts)"""
    try:
        student = Student.query.get_or_404(student_id)
        
        summaries = Attendance.query.filter_by(student_id=student_id).all()
        
        # Get subject details for each summary
        summary_list = []
        for summary in summaries:
            subject = db.session.get(Subject, summary.subject_id)
            if subject:
                summary_list.append({
                    'attendance_id': summary.attendance_id,
                    'subject_id': subject.subject_id,
                    'subject_name': subject.subject_name,
                    'subject_code': subject.subject_code,
                    'present_count': summary.present_count,
                    'absent_count': summary.absent_count,
                    'late_count': summary.late_count,
                    'total_classes': summary.total_classes,
                    'attendance_percentage': float(summary.attendance_percentage),
                    'academic_year': summary.academic_year
                })
        
        return jsonify(summary_list), 200
    except Exception as e:
        return jsonify({'error': f'Failed to fetch attendance summary: {str(e)}'}), 500

@app.route('/api/students/<int:student_id>/fees', methods=['GET'])
def get_student_fees(student_id):
    """Get fees information for a student"""
    try:
        student = Student.query.get_or_404(student_id)
        
        if not student.fees:
            return jsonify({'error': 'No fees record found for this student'}), 404
        
        return jsonify(student.fees.to_dict()), 200
    except Exception as e:
        return jsonify({'error': f'Failed to fetch fees: {str(e)}'}), 500

@app.route('/api/students/<int:student_id>/fees', methods=['PUT'])
def update_student_fees(student_id):
    """Update fees payment for a student"""
    try:
        data = request.get_json()
        
        student = Student.query.get_or_404(student_id)
        
        if not student.fees:
            return jsonify({'error': 'No fees record found for this student'}), 404
        
        if 'paid_amount' in data:
            student.fees.paid_amount = data['paid_amount']
            student.fees.due_amount = student.fees.total_amount - student.fees.paid_amount
            student.fees.last_payment_date = date.today()
            
            # Update payment status
            if student.fees.paid_amount == 0:
                student.fees.payment_status = 'Unpaid'
            elif student.fees.paid_amount >= student.fees.total_amount:
                student.fees.payment_status = 'Paid'
            else:
                student.fees.payment_status = 'Partial'
        
        db.session.commit()
        return jsonify(student.fees.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to update fees: {str(e)}'}), 500

# NOTIFICATIONS
@app.route('/api/users/<int:user_id>/notifications', methods=['GET'])
def get_user_notifications(user_id):
    """Get notifications for a user"""
    try:
        user = User.query.get_or_404(user_id)
        unread_only = request.args.get('unread_only', 'false').lower() == 'true'
        
        query = Notification.query.filter_by(user_id=user_id)
        
        if unread_only:
            query = query.filter_by(is_read=False)
        
        notifications = query.order_by(Notification.created_at.desc()).all()
        return jsonify([notif.to_dict() for notif in notifications]), 200
    except Exception as e:
        return jsonify({'error': f'Failed to fetch notifications: {str(e)}'}), 500

@app.route('/api/notifications', methods=['GET'])
def get_notifications():
    """Get notifications for current user (requires authentication)"""
    try:
        # In production, verify JWT token here
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authorization token required'}), 401
        
        token = auth_header.split(' ')[1]
        # For now, extract user_id from token (in production, verify JWT)
        if token.startswith('token-'):
            user_id = int(token.split('-')[1])
            user = db.session.get(User, user_id)
            
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            unread_only = request.args.get('unread_only', 'false').lower() == 'true'
            
            query = Notification.query.filter_by(user_id=user_id)
            
            if unread_only:
                query = query.filter_by(is_read=False)
            
            notifications = query.order_by(Notification.created_at.desc()).all()
            return jsonify([notif.to_dict() for notif in notifications]), 200
        else:
            return jsonify({'error': 'Invalid token'}), 401
            
    except Exception as e:
        return jsonify({'error': f'Failed to fetch notifications: {str(e)}'}), 500

@app.route('/api/notifications/unread-count', methods=['GET'])
def get_unread_notifications_count():
    """Get unread notifications count for current user"""
    try:
        # In production, verify JWT token here
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authorization token required'}), 401
        
        token = auth_header.split(' ')[1]
        # For now, extract user_id from token (in production, verify JWT)
        if token.startswith('token-'):
            user_id = int(token.split('-')[1])
            user = db.session.get(User, user_id)
            
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            unread_count = Notification.query.filter_by(user_id=user_id, is_read=False).count()
            return jsonify({'unread_count': unread_count}), 200
        else:
            return jsonify({'error': 'Invalid token'}), 401
            
    except Exception as e:
        return jsonify({'error': f'Failed to fetch unread count: {str(e)}'}), 500

@app.route('/api/notifications/<int:notification_id>/read', methods=['PUT'])
def mark_notification_read(notification_id):
    """Mark a notification as read"""
    try:
        notification = Notification.query.get_or_404(notification_id)
        notification.is_read = True
        db.session.commit()
        
        return jsonify(notification.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to mark notification as read: {str(e)}'}), 500

# DASHBOARD STATS
@app.route('/api/dashboard/stats', methods=['GET'])
def get_dashboard_stats():
    """Get dashboard statistics"""
    try:
        stats = {
            'total_students': Student.query.filter_by(is_active=True).count(),
            'total_classes': Class.query.filter_by(is_active=True).count(),
            'total_subjects': Subject.query.filter_by(is_active=True).count(),
            'total_events': Event.query.filter_by(is_active=True).count(),
            'upcoming_events': Event.query.filter(
                Event.event_date >= date.today(),
                Event.is_active == True
            ).count(),
            'unpaid_fees': Fee.query.filter_by(payment_status='Unpaid').count(),
            'partial_fees': Fee.query.filter_by(payment_status='Partial').count()
        }
        
        return jsonify(stats), 200
    except Exception as e:
        return jsonify({'error': f'Failed to fetch dashboard stats: {str(e)}'}), 500

# STUDENT SERVICES - CLASS-BASED DATA ENDPOINTS

@app.route('/api/student-services/marks', methods=['GET'])
def get_class_marks():
    """Get marks data grouped by class for student services"""
    try:
        # Get all students with their class information
        students = Student.query.join(Class).join(User).all()
        
        # Group students by class
        class_data = {}
        for student in students:
            class_name = student.class_.class_name
            if class_name not in class_data:
                class_data[class_name] = {
                    'class_name': class_name,
                    'students': []
                }
            
            # Get marks for this student
            marks = Mark.query.filter_by(student_id=student.student_id).all()
            
            # Get subjects for this class (to ensure unique subject names)
            subjects = Subject.query.filter_by(class_id=student.class_id).limit(5).all()
            
            # Organize marks by subject
            student_marks = {
                'roll_number': student.roll_no,
                'name': student.user.name,
                'sub1': 0, 'sub2': 0, 'sub3': 0, 'sub4': 0, 'sub5': 0,
                'total': 0,
                'percentage': 0.0
            }
            
            # Create a map of subject_id -> marks for quick lookup
            marks_map = {mark.subject_id: mark.obtained_marks for mark in marks}
            
            # Map marks to unique subjects
            for idx, subject in enumerate(subjects[:5]):
                subject_num = idx + 1
                student_marks[f'sub{subject_num}_name'] = subject.subject_name
                student_marks[f'sub{subject_num}'] = marks_map.get(subject.subject_id, 0)
            
            # Fill remaining subjects if less than 5
            for idx in range(len(subjects), 5):
                subject_num = idx + 1
                student_marks[f'sub{subject_num}_name'] = f'Subject {subject_num}'
                student_marks[f'sub{subject_num}'] = 0
            
            # Calculate total and percentage
            student_marks['total'] = sum([
                student_marks['sub1'], student_marks['sub2'], 
                student_marks['sub3'], student_marks['sub4'], 
                student_marks['sub5']
            ])
            
            # Calculate percentage (max marks per subject is 35)
            num_subjects = min(len(subjects), 5)
            max_total = num_subjects * 35
            if max_total > 0:
                student_marks['percentage'] = round((student_marks['total'] / max_total) * 100, 1)
            
            class_data[class_name]['students'].append(student_marks)
        
        return jsonify(list(class_data.values())), 200
    except Exception as e:
        return jsonify({'error': f'Failed to fetch marks data: {str(e)}'}), 500

@app.route('/api/student-services/attendance', methods=['GET'])
def get_class_attendance():
    """Get attendance data grouped by class for student services"""
    try:
        # Get all students with their class information
        students = Student.query.join(Class).join(User).all()
        
        # Group students by class
        class_data = {}
        for student in students:
            class_name = student.class_.class_name
            if class_name not in class_data:
                class_data[class_name] = {
                    'class_name': class_name,
                    'students': []
                }
            
            # Get attendance for this student
            attendance_records = Attendance.query.filter_by(student_id=student.student_id).all()
            
            # Organize attendance by subject
            student_attendance = {
                'roll_number': student.roll_no,
                'name': student.user.name,
                'sub1': 0, 'sub2': 0, 'sub3': 0, 'sub4': 0, 'sub5': 0,
                'total': 0,
                'total_percentage': 0.0,
                'is_defaulter': False
            }
            
            # Map attendance to subjects (assuming 5 subjects max)
            subject_count = 0
            total_present = 0
            
            for attendance in attendance_records:
                if subject_count < 5:
                    present = attendance.present_count
                    student_attendance[f'sub{subject_count + 1}'] = present
                    
                    # Get subject name from database
                    subject = db.session.get(Subject, attendance.subject_id)
                    if subject:
                        student_attendance[f'sub{subject_count + 1}_name'] = subject.subject_name
                    
                    total_present += present
                    subject_count += 1
            
            student_attendance['total'] = total_present
            
            # Calculate total percentage and defaulter status (assuming 50 total lectures per subject)
            max_total = subject_count * 50
            if max_total > 0:
                total_percentage = (total_present / max_total) * 100
                student_attendance['total_percentage'] = round(total_percentage, 1)
                student_attendance['is_defaulter'] = total_percentage < 75.0
            class_data[class_name]['students'].append(student_attendance)
        
        return jsonify(list(class_data.values())), 200
    except Exception as e:
        return jsonify({'error': f'Failed to fetch attendance data: {str(e)}'}), 500

@app.route('/api/student-services/fees', methods=['GET'])
def get_class_fees():
    """Get fees data grouped by class for student services"""
    try:
        # Get all students with their class information
        students = Student.query.join(Class).join(User).all()
        
        # Group students by class
        class_data = {}
        for student in students:
            class_name = student.class_.class_name
            if class_name not in class_data:
                class_data[class_name] = {
                    'class_name': class_name,
                    'students': []
                }
            
            # Get fees for this student
            fees = Fee.query.filter_by(student_id=student.student_id).first()
            
            # Organize fees with paid, remaining, and total
            student_fees = {
                'roll_number': student.roll_no,
                'name': student.user.name,
                'total_fees': 0,
                'paid_fees': 0,
                'remaining_fees': 0,
                'payment_status': 'Unpaid'
            }
            
            if fees:
                student_fees['total_fees'] = float(fees.total_amount)
                student_fees['paid_fees'] = float(fees.paid_amount)
                student_fees['remaining_fees'] = float(fees.due_amount)
                student_fees['payment_status'] = fees.payment_status
            
            class_data[class_name]['students'].append(student_fees)
        
        return jsonify(list(class_data.values())), 200
    except Exception as e:
        return jsonify({'error': f'Failed to fetch fees data: {str(e)}'}), 500

@app.route('/api/student-services/announcements', methods=['GET'])
def get_student_services_announcements():
    """Get announcements for student services"""
    try:
        announcements = Announcement.query.filter_by(is_active=True).order_by(Announcement.created_at.desc()).all()
        return jsonify([announcement.to_dict() for announcement in announcements]), 200
    except Exception as e:
        return jsonify({'error': f'Failed to fetch announcements: {str(e)}'}), 500

@app.route('/api/student-services/events', methods=['GET'])
def get_student_services_events():
    """Get events for student services"""
    try:
        events = Event.query.filter_by(is_active=True).order_by(Event.event_date.desc()).all()
        return jsonify([event.to_dict() for event in events]), 200
    except Exception as e:
        return jsonify({'error': f'Failed to fetch events: {str(e)}'}), 500

@app.route('/api/student-services/notifications', methods=['GET'])
def get_student_services_notifications():
    """Get notifications for student services"""
    try:
        # In production, verify JWT token here
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authorization token required'}), 401
        
        token = auth_header.split(' ')[1]
        # For now, extract user_id from token (in production, verify JWT)
        if token.startswith('token-'):
            user_id = int(token.split('-')[1])
            user = db.session.get(User, user_id)
            
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            notifications = Notification.query.filter_by(user_id=user_id).order_by(Notification.created_at.desc()).all()
            return jsonify([notif.to_dict() for notif in notifications]), 200
        else:
            return jsonify({'error': 'Invalid token'}), 401
            
    except Exception as e:
        return jsonify({'error': f'Failed to fetch notifications: {str(e)}'}), 500

@app.route('/api/student-services/dashboard', methods=['GET'])
def get_student_services_dashboard():
    """Get comprehensive dashboard data for student services"""
    try:
        # Get basic statistics
        total_students = Student.query.filter_by(is_active=True).count()
        total_classes = Class.query.filter_by(is_active=True).count()
        total_subjects = Subject.query.filter_by(is_active=True).count()
        
        # Get recent announcements
        recent_announcements = Announcement.query.filter_by(is_active=True).order_by(Announcement.created_at.desc()).limit(5).all()
        
        # Get upcoming events
        upcoming_events = Event.query.filter_by(is_active=True).filter(Event.event_date >= date.today()).order_by(Event.event_date.asc()).limit(5).all()
        
        # Get marks statistics
        total_marks = Mark.query.count()
        avg_marks = db.session.query(db.func.avg(Mark.obtained_marks)).scalar()
        
        # Get attendance statistics
        total_attendance_records = Attendance.query.count()
        avg_attendance = db.session.query(db.func.avg(Attendance.attendance_percentage)).scalar()
        
        # Get fees statistics
        total_fees_records = Fee.query.count()
        paid_fees = Fee.query.filter_by(payment_status='Paid').count()
        unpaid_fees = Fee.query.filter_by(payment_status='Unpaid').count()
        partial_fees = Fee.query.filter_by(payment_status='Partial').count()
        
        dashboard_data = {
            'statistics': {
                'total_students': total_students,
                'total_classes': total_classes,
                'total_subjects': total_subjects,
                'total_marks_records': total_marks,
                'average_marks': round(avg_marks, 2) if avg_marks else 0,
                'total_attendance_records': total_attendance_records,
                'average_attendance': round(float(avg_attendance), 2) if avg_attendance else 0,
                'total_fees_records': total_fees_records,
                'paid_fees': paid_fees,
                'unpaid_fees': unpaid_fees,
                'partial_fees': partial_fees
            },
            'recent_announcements': [announcement.to_dict() for announcement in recent_announcements],
            'upcoming_events': [event.to_dict() for event in upcoming_events]
        }
        
        return jsonify(dashboard_data), 200
    except Exception as e:
        return jsonify({'error': f'Failed to fetch dashboard data: {str(e)}'}), 500

# Admin-only endpoints for editing student data
@app.route('/api/admin/students/<int:student_id>/marks', methods=['PUT'])
def admin_update_student_marks(student_id):
    try:
        # Check if user is admin (you can add proper authentication here)
        data = request.get_json()
        
        if not data or 'marks' not in data:
            return jsonify({'error': 'Marks data is required'}), 400
        
        student = db.session.get(Student, student_id)
        if not student:
            return jsonify({'error': 'Student not found'}), 404
        
        # Update marks for each subject
        for mark_data in data['marks']:
            if 'subject_id' not in mark_data or 'obtained_marks' not in mark_data:
                continue
                
            subject_id = mark_data['subject_id']
            obtained_marks = mark_data['obtained_marks']
            total_marks = mark_data.get('total_marks', 35)
            
            # Validate marks range
            if obtained_marks < 0 or obtained_marks > 35:
                return jsonify({'error': f'Marks must be between 0 and 35 for subject {subject_id}'}), 400
            
            # Find existing mark or create new one
            mark = Mark.query.filter_by(student_id=student_id, subject_id=subject_id).first()
            if mark:
                mark.obtained_marks = obtained_marks
                mark.total_marks = total_marks
                mark.updated_at = datetime.utcnow()
            else:
                mark = Mark(
                    student_id=student_id,
                    subject_id=subject_id,
                    total_marks=total_marks,
                    obtained_marks=obtained_marks,
                    exam_date=datetime.now().date()
                )
                db.session.add(mark)
        
        db.session.commit()
        return jsonify({'message': 'Marks updated successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to update marks: {str(e)}'}), 500

@app.route('/api/admin/students/<int:student_id>/attendance', methods=['PUT'])
def admin_update_student_attendance(student_id):
    try:
        data = request.get_json()
        
        if not data or 'attendance' not in data:
            return jsonify({'error': 'Attendance data is required'}), 400
        
        student = db.session.get(Student, student_id)
        if not student:
            return jsonify({'error': 'Student not found'}), 404
        
        # Update attendance for each subject
        for attendance_data in data['attendance']:
            if 'subject_id' not in attendance_data:
                continue
                
            subject_id = attendance_data['subject_id']
            present_count = attendance_data.get('present_count', 0)
            total_classes = attendance_data.get('total_classes', 50)
            
            # Validate attendance data
            if present_count < 0 or present_count > total_classes:
                return jsonify({'error': f'Present count cannot exceed total classes for subject {subject_id}'}), 400
            
            # Find existing attendance or create new one
            attendance = Attendance.query.filter_by(student_id=student_id, subject_id=subject_id).first()
            if attendance:
                attendance.present_count = present_count
                attendance.total_classes = total_classes
                attendance.attendance_percentage = round((present_count / total_classes) * 100, 2) if total_classes > 0 else 0
                attendance.updated_at = datetime.utcnow()
            else:
                attendance = Attendance(
                    student_id=student_id,
                    subject_id=subject_id,
                    present_count=present_count,
                    total_classes=total_classes,
                    attendance_percentage=round((present_count / total_classes) * 100, 2) if total_classes > 0 else 0,
                    academic_year=str(datetime.now().year),
                    updated_at=datetime.utcnow()
                )
                db.session.add(attendance)
        
        db.session.commit()
        return jsonify({'message': 'Attendance updated successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to update attendance: {str(e)}'}), 500

@app.route('/api/admin/students/<int:student_id>/fees', methods=['PUT'])
def admin_update_student_fees(student_id):
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Fees data is required'}), 400
        
        student = db.session.get(Student, student_id)
        if not student:
            return jsonify({'error': 'Student not found'}), 404
        
        total_amount = data.get('total_amount', 0)
        paid_amount = data.get('paid_amount', 0)
        
        if paid_amount > total_amount:
            return jsonify({'error': 'Paid amount cannot exceed total amount'}), 400
        
        due_amount = total_amount - paid_amount
        
        if paid_amount == total_amount:
            payment_status = 'Paid'
        elif paid_amount == 0:
            payment_status = 'Unpaid'
        else:
            payment_status = 'Partial'
        
        # Find existing fee or create new one
        fee = Fee.query.filter_by(student_id=student_id).first()
        if fee:
            fee.total_amount = total_amount
            fee.paid_amount = paid_amount
            fee.due_amount = due_amount
            fee.payment_status = payment_status
            fee.updated_at = datetime.utcnow()
        else:
            fee = Fee(
                student_id=student_id,
                total_amount=total_amount,
                paid_amount=paid_amount,
                due_amount=due_amount,
                payment_status=payment_status,
                last_payment_date=datetime.now().date() if paid_amount > 0 else None,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.session.add(fee)
        
        db.session.commit()
        return jsonify({'message': 'Fees updated successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to update fees: {str(e)}'}), 500

@app.route('/api/admin/students/<int:student_id>/data', methods=['GET'])
def admin_get_student_data(student_id):
    try:
        student = db.session.get(Student, student_id)
        if not student:
            return jsonify({'error': 'Student not found'}), 404
        
        # Get student basic info
        student_data = {
            'student_id': student.student_id,
            'roll_no': student.roll_no,
            'name': student.user.name,
            'class_name': student.class_.class_name,
            'marks': [],
            'attendance': [],
            'fees': {}
        }
        
        # Get marks
        marks = Mark.query.filter_by(student_id=student_id).all()
        for mark in marks:
            subject = db.session.get(Subject, mark.subject_id)
            student_data['marks'].append({
                'subject_id': mark.subject_id,
                'subject_name': subject.subject_name if subject else 'Unknown',
                'obtained_marks': mark.obtained_marks,
                'total_marks': mark.total_marks,
                'exam_date': mark.exam_date.isoformat() if mark.exam_date else None
            })
        
        # Get attendance
        attendance_records = Attendance.query.filter_by(student_id=student_id).all()
        for attendance in attendance_records:
            subject = db.session.get(Subject, attendance.subject_id)
            student_data['attendance'].append({
                'subject_id': attendance.subject_id,
                'subject_name': subject.subject_name if subject else 'Unknown',
                'present_count': attendance.present_count,
                'total_classes': attendance.total_classes,
                'attendance_percentage': float(attendance.attendance_percentage) if attendance.attendance_percentage else 0
            })
        
        # Get fees
        fee = Fee.query.filter_by(student_id=student_id).first()
        if fee:
            student_data['fees'] = {
                'total_amount': float(fee.total_amount),
                'paid_amount': float(fee.paid_amount),
                'due_amount': float(fee.due_amount),
                'payment_status': fee.payment_status,
                'last_payment_date': fee.last_payment_date.isoformat() if fee.last_payment_date else None
            }
        
        return jsonify(student_data), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to fetch student data: {str(e)}'}), 500

# Event management endpoints
@app.route('/api/events', methods=['POST'])
def create_event():
    try:
        data = request.get_json()
        
        if not data or 'title' not in data:
            return jsonify({'error': 'Event title is required'}), 400
        
        event_type = data.get('event_type', 'general')
        
        # Get the appropriate Google Form link based on event type
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
        
        # Use provided registration_link or default to Google Form
        registration_link = data.get('registration_link', '') or form_links.get(event_type, form_links['general'])
        
        event = Event(
            title=data['title'],
            description=data.get('description', ''),
            event_date=datetime.strptime(data.get('event_date', datetime.now().strftime('%Y-%m-%d')), '%Y-%m-%d').date(),
            event_time=datetime.strptime(data.get('event_time', '10:00'), '%H:%M').time() if data.get('event_time') else None,
            location=data.get('location', ''),
            event_type=event_type,
            organized_by=data.get('organized_by', ''),
            registration_link=registration_link,
            is_active=True,
            created_at=datetime.utcnow()
        )
        
        db.session.add(event)
        db.session.commit()
        
        return jsonify(event.to_dict()), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to create event: {str(e)}'}), 500

@app.route('/api/events/<int:event_id>', methods=['DELETE'])
def delete_event(event_id):
    try:
        event = db.session.get(Event, event_id)
        if not event:
            return jsonify({'error': 'Event not found'}), 404
        
        db.session.delete(event)
        db.session.commit()
        
        return jsonify({'message': 'Event deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to delete event: {str(e)}'}), 500

# Event Registration Endpoints
@app.route('/api/events', methods=['GET'])
def get_all_events():
    """Get all events with registration counts"""
    try:
        events = Event.query.filter_by(is_active=True).order_by(Event.event_date.desc()).all()
        
        # Get registration counts for each event
        events_data = []
        for event in events:
            event_dict = event.to_dict()
            events_data.append(event_dict)
        
        return jsonify({'success': True, 'data': events_data}), 200
    except Exception as e:
        return jsonify({'error': f'Failed to fetch events: {str(e)}'}), 500

@app.route('/api/events/<int:event_id>/register', methods=['POST'])
def register_for_event(event_id):
    """Register a student for an event"""
    try:
        # Get current user from token (you'll need to implement this based on your auth system)
        # For now, assuming user_id is passed in the request
        data = request.get_json()
        user_id = data.get('user_id') or request.headers.get('user_id')
        
        if not user_id:
            return jsonify({'error': 'User ID is required'}), 400
        
        # Get student by user_id
        student = Student.query.filter_by(user_id=user_id).first()
        if not student:
            return jsonify({'error': 'Student not found'}), 404
        
        # Check if event exists
        event = db.session.get(Event, event_id)
        if not event:
            return jsonify({'error': 'Event not found'}), 404
        
        # Check if already registered
        existing_registration = EventRegistration.query.filter_by(
            event_id=event_id,
            student_id=student.student_id
        ).first()
        
        if existing_registration:
            return jsonify({'error': 'Already registered for this event'}), 400
        
        # Check if event has reached max participants
        if event.max_participants:
            registration_count = EventRegistration.query.filter_by(event_id=event_id).count()
            if registration_count >= event.max_participants:
                return jsonify({'error': 'Event is full'}), 400
        
        # Create registration
        registration = EventRegistration(
            event_id=event_id,
            student_id=student.student_id,
            registered_at=datetime.utcnow()
        )
        
        db.session.add(registration)
        
        # Update event current participants
        event.current_participants = EventRegistration.query.filter_by(event_id=event_id).count() + 1
        
        db.session.commit()
        
        return jsonify({'success': True, 'data': registration.to_dict()}), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to register for event: {str(e)}'}), 500

@app.route('/api/events/<int:event_id>/register', methods=['DELETE'])
def cancel_event_registration(event_id):
    """Cancel event registration"""
    try:
        data = request.get_json()
        user_id = data.get('user_id') or request.headers.get('user_id')
        
        if not user_id:
            return jsonify({'error': 'User ID is required'}), 400
        
        # Get student by user_id
        student = Student.query.filter_by(user_id=user_id).first()
        if not student:
            return jsonify({'error': 'Student not found'}), 404
        
        # Find registration
        registration = EventRegistration.query.filter_by(
            event_id=event_id,
            student_id=student.student_id
        ).first()
        
        if not registration:
            return jsonify({'error': 'Registration not found'}), 404
        
        # Delete registration
        db.session.delete(registration)
        
        # Update event current participants
        event = db.session.get(Event, event_id)
        if event:
            event.current_participants = EventRegistration.query.filter_by(event_id=event_id).count()
        
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Registration cancelled successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to cancel registration: {str(e)}'}), 500

@app.route('/api/events/my-registrations', methods=['GET'])
def get_my_registrations():
    """Get current user's event registrations"""
    try:
        user_id = request.headers.get('user_id') or request.args.get('user_id')
        
        if not user_id:
            return jsonify({'error': 'User ID is required'}), 400
        
        # Get student by user_id
        student = Student.query.filter_by(user_id=user_id).first()
        if not student:
            return jsonify({'success': True, 'data': []}), 200
        
        # Get all registrations for this student
        registrations = EventRegistration.query.filter_by(student_id=student.student_id).all()
        
        # Get event details for each registration
        registrations_data = []
        for registration in registrations:
            event = db.session.get(Event, registration.event_id)
            if event:
                registrations_data.append({
                    'id': registration.registration_id,
                    'event_id': registration.event_id,
                    'title': event.title,
                    'event_date': event.event_date.isoformat(),
                    'event_time': event.event_time.isoformat() if event.event_time else None,
                    'location': event.location,
                    'registered_at': registration.registered_at.isoformat()
                })
        
        return jsonify({'success': True, 'data': registrations_data}), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to fetch registrations: {str(e)}'}), 500

# Notification management endpoints
@app.route('/api/notifications', methods=['POST'])
def create_notification():
    try:
        data = request.get_json()
        
        if not data or 'title' not in data or 'message' not in data:
            return jsonify({'error': 'Notification title and message are required'}), 400
        
        # Create announcement instead of notification
        priority_map = {
            'info': 'normal',
            'warning': 'high', 
            'success': 'normal',
            'error': 'urgent'
        }
        
        announcement = Announcement(
            title=data['title'],
            message=data['message'],
            priority=priority_map.get(data.get('type', 'info'), 'normal'),
            target='all',
            is_active=True,
            created_at=datetime.utcnow()
        )
        
        db.session.add(announcement)
        db.session.commit()
        
        return jsonify(announcement.to_dict()), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to create notification: {str(e)}'}), 500

@app.route('/api/notifications/<int:notification_id>', methods=['DELETE'])
def delete_notification(notification_id):
    try:
        # Delete from announcements table instead
        announcement = db.session.get(Announcement, notification_id)
        if not announcement:
            return jsonify({'error': 'Notification not found'}), 404
        
        db.session.delete(announcement)
        db.session.commit()
        
        return jsonify({'message': 'Notification deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to delete notification: {str(e)}'}), 500


# HOD Management Endpoints
@app.route('/api/hod/students/<branch>/<year>', methods=['GET'])
def get_hod_students(branch, year):
    """Get students for HOD by branch and year"""
    try:
        # Find the department and class
        dept = Department.query.filter_by(dept_name=branch).first()
        if not dept:
            return jsonify({'error': 'Department not found'}), 404
        
        class_name = f"{year}-{branch}"
        class_obj = Class.query.filter_by(class_name=class_name, dept_id=dept.dept_id).first()
        if not class_obj:
            return jsonify({'error': 'Class not found'}), 404
        
        students = Student.query.join(User).filter(Student.class_id == class_obj.class_id).all()
        
        student_data = []
        for student in students:
            student_info = {
                'roll_no': student.roll_no,
                'name': student.user.name,
                'email': student.user.email,
                'contact': student.user.contact_no,
                'username': student.user.email.split('@')[0],  # Use email prefix as username
                'admission_year': student.admission_year
            }
            student_data.append(student_info)
        
        return jsonify(student_data), 200
    except Exception as e:
        return jsonify({'error': f'Failed to fetch students: {str(e)}'}), 500

@app.route('/api/hod/students/<branch>/<year>', methods=['POST'])
def create_hod_student(branch, year):
    """Create a new student for HOD"""
    try:
        data = request.get_json()
        
        if not data or not data.get('roll_no') or not data.get('name') or not data.get('email'):
            return jsonify({'error': 'Roll number, name, and email are required'}), 400
        
        # Find the department and class
        dept = Department.query.filter_by(dept_name=branch).first()
        if not dept:
            return jsonify({'error': 'Department not found'}), 404
        
        class_name = f"{year}-{branch}"
        class_obj = Class.query.filter_by(class_name=class_name, dept_id=dept.dept_id).first()
        if not class_obj:
            return jsonify({'error': 'Class not found'}), 404
        
        # Check if roll number already exists
        if Student.query.filter_by(roll_no=data['roll_no']).first():
            return jsonify({'error': 'Roll number already exists'}), 400
        
        # Check if email already exists
        if User.query.filter_by(email=data['email']).first():
            return jsonify({'error': 'Email already exists'}), 400
        
        # Create user first
        user = User(
            name=data['name'],
            email=data['email'],
            contact_no=data.get('contact', ''),
            password='default123',  # Default password
            role='student',
            is_active=True
        )
        
        db.session.add(user)
        db.session.flush()  # Get the user_id
        
        # Create student
        student = Student(
            user_id=user.user_id,
            roll_no=data['roll_no'],
            class_id=class_obj.class_id,
            admission_year=data.get('admission_year', datetime.now().year),
            admission_date=datetime.now().date(),
            guardian_name=data.get('guardian_name'),
            guardian_contact=data.get('guardian_contact'),
            address=data.get('address')
        )
        
        db.session.add(student)
        db.session.flush()  # Get the student_id
        
        # Create default marks for all subjects in the class
        subjects = Subject.query.filter_by(class_id=class_obj.class_id).all()
        for subject in subjects:
            mark = Mark(
                student_id=student.student_id,
                subject_id=subject.subject_id,
                total_marks=35,
                obtained_marks=0,
                exam_date=datetime.now().date()
            )
            db.session.add(mark)
        
        # Create default attendance for all subjects
        for subject in subjects:
            attendance = Attendance(
                student_id=student.student_id,
                subject_id=subject.subject_id,
                present_count=0,
                absent_count=0,
                late_count=0,
                total_classes=50,
                attendance_percentage=0.0,
                academic_year=str(datetime.now().year)
            )
            db.session.add(attendance)
        
        # Create default fees
        fee = Fee(
            student_id=student.student_id,
            total_amount=50000.00,  # Default total fees
            paid_amount=0.00,
            due_amount=50000.00,
            payment_status='Unpaid'
        )
        db.session.add(fee)
        
        db.session.commit()
        
        return jsonify({
            'roll_no': student.roll_no,
            'name': user.name,
            'email': user.email,
            'contact': user.contact_no,
            'username': user.email.split('@')[0],
            'admission_year': student.admission_year
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to create student: {str(e)}'}), 500

@app.route('/api/hod/students/<branch>/<year>/<roll_no>', methods=['PUT'])
def update_hod_student(branch, year, roll_no):
    """Update a student for HOD"""
    try:
        data = request.get_json()
        
        # Find the student
        student = Student.query.filter_by(roll_no=roll_no).first()
        if not student:
            return jsonify({'error': 'Student not found'}), 404
        
        # Update user information
        user = student.user
        if data.get('name'):
            user.name = data['name']
        if data.get('email'):
            user.email = data['email']
        if data.get('contact'):
            user.contact_no = data['contact']
        if data.get('admission_year'):
            student.admission_year = data['admission_year']
        
        db.session.commit()
        
        return jsonify({
            'roll_no': student.roll_no,
            'name': user.name,
            'email': user.email,
            'contact': user.contact_no,
            'username': user.email.split('@')[0],
            'admission_year': student.admission_year
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to update student: {str(e)}'}), 500

@app.route('/api/hod/students/<branch>/<year>/<roll_no>', methods=['DELETE'])
def delete_hod_student(branch, year, roll_no):
    """Delete a student for HOD"""
    try:
        # Find the student
        student = Student.query.filter_by(roll_no=roll_no).first()
        if not student:
            return jsonify({'error': 'Student not found'}), 404
        
        # Delete related data first
        Mark.query.filter_by(student_id=student.student_id).delete()
        Attendance.query.filter_by(student_id=student.student_id).delete()
        Fee.query.filter_by(student_id=student.student_id).delete()
        
        # Delete student and user
        user_id = student.user_id
        db.session.delete(student)
        User.query.filter_by(user_id=user_id).delete()
        
        db.session.commit()
        
        return jsonify({'message': 'Student deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to delete student: {str(e)}'}), 500


# ============ AI SERVICES HELPER FUNCTIONS ============
ALLOWED_EXTENSIONS = {'txt', 'pdf', 'docx', 'doc'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def extract_text_from_file(file):
    filename = secure_filename(file.filename)
    ext = filename.rsplit('.', 1)[1].lower()
    try:
        if ext == "pdf":
            reader = PyPDF2.PdfReader(file)
            return "\n".join([page.extract_text() or "" for page in reader.pages])
        elif ext in ["docx", "doc"]:
            document = docx.Document(file)
            return "\n".join([p.text for p in document.paragraphs])
        elif ext == "txt":
            return file.read().decode('utf-8')
    except Exception as e:
        print("File extraction error:", e)
        return None

def clean_text(text):
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def generate_notes(content, num_sentences=12):
    content = clean_text(content)
    if not content:
        return {"error": "No content provided."}

    # Simple note generation: extract sentences and create bullet points
    sentences = content.split('.')
    notes = []
    
    # Get key sentences (first N sentences)
    key_sentences = [s.strip() for s in sentences if len(s.strip()) > 20][:num_sentences]
    
    for i, sentence in enumerate(key_sentences):
        if sentence:
            notes.append(f"{i+1}. {sentence}")

    return {"notes": "\n".join(notes)}

# ============ AI SERVICES ENDPOINTS ============
@app.route('/api/ai/notes', methods=['POST'])
def ai_notes():
    """Generate notes from text or file"""
    content = ""
    
    # File upload
    if 'file' in request.files and request.files['file'].filename != "":
        file = request.files['file']
        if not allowed_file(file.filename):
            return jsonify({"error": "Invalid file type"}), 400
        content = extract_text_from_file(file)
        if not content:
            return jsonify({"error": "Failed to extract text from file"}), 400

    # Text input
    elif request.form.get("content"):
        content = request.form["content"]
    elif request.json and request.json.get("content"):
        content = request.json["content"]
    else:
        return jsonify({"error": "File or content is required"}), 400

    notes_result = generate_notes(content)
    return jsonify(notes_result), 200

@app.route('/api/ai/quiz', methods=['POST'])
def ai_quiz():
    """Generate quiz questions from text or file"""
    content = ""
    num_questions = 5

    # File upload
    if 'file' in request.files and request.files['file'].filename != "":
        file = request.files['file']
        if not allowed_file(file.filename):
            return jsonify({"error": "Invalid file type"}), 400
        content = extract_text_from_file(file)
        if not content:
            return jsonify({"error": "Failed to extract text from file"}), 400

    # Text input
    elif request.form.get("content"):
        content = request.form["content"]
        num_questions = int(request.form.get('num_questions', 5))
    elif request.json and request.json.get("content"):
        content = request.json["content"]
        num_questions = int(request.json.get('num_questions', 5))
    else:
        return jsonify({"error": "File or content is required"}), 400

    # Simple quiz generation
    sentences = content.split(".")
    questions = []
    
    for i in range(min(num_questions, len(sentences))):
        sentence = sentences[i].strip()
        if len(sentence) > 10:
            q = {
                "question": f"Q{i+1}: {sentence}?",
                "options": ["Option A", "Option B", "Option C", "Option D"],
                "correct_answer": "Option A",
                "type": "multiple_choice"
            }
            questions.append(q)

    return jsonify({"questions": questions}), 200

@app.route('/api/ai/health', methods=['GET'])
def ai_health():
    """Health check for AI services"""
    return jsonify({"ok": True}), 200

# ============ ADMISSION INFO API ============
@app.route('/api/admission/info', methods=['GET'])
def get_admission_info():
    """Get SKNSCOE admission information"""
    info = {
        "college_name": "SKN Sinhgad College of Engineering (SKNSCOE), Korti, Pandharpur",
        "established_year": 2010,
        "affiliation": "Punyashlok Ahilyadevi Holkar Solapur University",
        "approval": "AICTE, New Delhi",
        "institute_type": "Private Unaided",
        "address": "Gat No. 664, Korti, Pandharpur, Solapur, Maharashtra 413304",
        "campus_area_acres": 20,
        "contact": {
            "website": "https://www.sinhgad.edu/sinhgad-engineering-institutes/sknscoe-pandharpur/",
            "email": "principal.sknsce@sinhgad.edu",
            "phone": "+91-9822053108"
        },
        "branches": [
            {
                "name": "Computer Science and Engineering",
                "code": "CSE",
                "intake": 120,
                "description": "Cutting-edge curriculum in software development, AI/ML, and computer systems"
            },
            {
                "name": "Artificial Intelligence and Data Science",
                "code": "AI_DS",
                "intake": 60,
                "description": "Focus on AI algorithms, machine learning, and big data analytics"
            },
            {
                "name": "Electrical Engineering",
                "code": "EE",
                "intake": 60,
                "description": "Power systems, electrical machines, and control systems"
            },
            {
                "name": "Civil Engineering",
                "code": "CE",
                "intake": 60,
                "description": "Structural engineering, construction management, and infrastructure"
            },
            {
                "name": "Electronics and Telecommunication Engineering",
                "code": "ENTC",
                "intake": 60,
                "description": "Communication systems, signal processing, and embedded systems"
            },
            {
                "name": "Mechanical Engineering",
                "code": "MECH",
                "intake": 90,
                "description": "Thermodynamics, manufacturing processes, and machine design"
            }
        ],
        "admissionProcess": [
            {
                "step": "1",
                "title": "Check Eligibility",
                "description": "Passed 10+2 with Physics, Chemistry, Mathematics with minimum 45% marks (40% for reserved categories)",
                "deadline": "Before application deadline"
            },
            {
                "step": "2",
                "title": "Register for Entrance Exam",
                "description": "MHT-CET or JEE Main",
                "deadline": "As per exam schedule"
            },
            {
                "step": "3",
                "title": "CAP Round Counselling",
                "description": "Participate in Maharashtra CAP (Centralized Admission Process) - 80% seats",
                "deadline": "After MHT-CET results"
            },
            {
                "step": "4",
                "title": "Document Verification",
                "description": "Submit all required documents for verification",
                "deadline": "As per counselling schedule"
            },
            {
                "step": "5",
                "title": "Fee Payment",
                "description": "Pay admission fee and complete enrollment",
                "deadline": "Within specified timeframe"
            }
        ],
        "requiredDocuments": [
            "10th Marksheet",
            "12th Marksheet",
            "Entrance Exam Scorecard (MHT-CET/JEE Main)",
            "CET Allotment Letter",
            "Caste Certificate (if applicable)",
            "Domicile Certificate",
            "Aadhaar Card",
            "Passport-size Photos (4 copies)",
            "Medical Fitness Certificate",
            "Income Certificate (for fee concessions)",
            "Transfer Certificate",
            "Migration Certificate (if applicable)"
        ],
        "cutoffData": {
            "CSE": {
                "mht_cet_percentile": "84.48",
                "jee_main_rank": "201109"
            },
            "AI_DS": {
                "mht_cet_percentile": "82.76"
            },
            "ENTC": {
                "mht_cet_percentile": "76.33"
            },
            "MECH": {
                "mht_cet_percentile": "72.38"
            },
            "CE": {
                "mht_cet_percentile": "73.20"
            }
        },
        "hostelFacility": {
            "available": True,
            "totalCapacity": 2400,
            "boysCapacity": 1600,
            "girlsCapacity": 800,
            "roomType": "3-4 students per room with bed, table, chair, cupboard",
            "annualFees": 18000,
            "messFees": 24000,
            "combinedFees": 36000,
            "facilities": [
                "24x7 Security",
                "Wi-Fi Internet",
                "RO Drinking Water",
                "Laundry",
                "Recreation Room",
                "Hot Water Supply",
                "Medical Aid"
            ]
        },
        "transportFacility": {
            "available": True,
            "details": "College provides bus facility from nearby towns and villages including Pandharpur, Mangalwedha, and Sangola."
        },
        "facilities": [
            "Library and Digital Learning Center",
            "Wi-Fi Campus",
            "Canteen and Mess",
            "Gymnasium",
            "Computer Labs",
            "Language Lab",
            "Bank/ATM",
            "Sports Complex",
            "Anti-ragging Cell",
            "Student Clubs and NSS"
        ],
        "placement": {
            "averagePackage": 3.2,
            "highestPackage": 8.0,
            "topRecruiters": ["TCS", "Infosys", "Wipro", "Capgemini", "Tech Mahindra", "Cognizant", "Persistent Systems"]
        },
        "scholarships": [
            "EBC (Economically Backward Class) Scholarship",
            "Government of India Post-Matric Scholarship for SC/ST",
            "Minority Scholarship",
            "TFWS (Tuition Fee Waiver Scheme)"
        ]
    }
    return jsonify({'success': True, 'data': info}), 200

@app.route('/api/admission/fees', methods=['GET'])
def get_admission_fees():
    """Get SKNSCOE fee structure"""
    fees = {
        "feeStructure": {
            "CSE": {
                "branch": "Computer Science and Engineering (CSE)",
                "tuitionFee": 96000,
                "developmentFee": 10000,
                "libraryFee": 2000,
                "laboratoryFee": 3000,
                "examinationFee": 2000,
                "sportsFee": 1000,
                "total": 122000
            },
            "AI_DS": {
                "branch": "Artificial Intelligence and Data Science (AI & DS)",
                "tuitionFee": 96000,
                "developmentFee": 10000,
                "libraryFee": 2000,
                "laboratoryFee": 3000,
                "examinationFee": 2000,
                "sportsFee": 1000,
                "total": 122000
            },
            "EE": {
                "branch": "Electrical Engineering",
                "tuitionFee": 90000,
                "developmentFee": 10000,
                "libraryFee": 2000,
                "laboratoryFee": 3000,
                "examinationFee": 2000,
                "sportsFee": 1000,
                "total": 118000
            },
            "CE": {
                "branch": "Civil Engineering",
                "tuitionFee": 85000,
                "developmentFee": 10000,
                "libraryFee": 2000,
                "laboratoryFee": 3000,
                "examinationFee": 2000,
                "sportsFee": 1000,
                "total": 108000
            },
            "ENTC": {
                "branch": "Electronics and Telecommunication Engineering",
                "tuitionFee": 90000,
                "developmentFee": 10000,
                "libraryFee": 2000,
                "laboratoryFee": 3000,
                "examinationFee": 2000,
                "sportsFee": 1000,
                "total": 118000
            },
            "MECH": {
                "branch": "Mechanical Engineering",
                "tuitionFee": 85000,
                "developmentFee": 10000,
                "libraryFee": 2000,
                "laboratoryFee": 3000,
                "examinationFee": 2000,
                "sportsFee": 1000,
                "total": 108000
            }
        },
        "categoryConcessions": {
            "open": {
                "tuitionFee": 96000,
                "concession": 0
            },
            "obc_ebc_sebc": {
                "tuitionFee": 54261,
                "concession": 41739
            },
            "nt_sbc_tfws_girls": {
                "tuitionFee": 12522,
                "concession": 83478
            },
            "sc_st": {
                "tuitionFee": 0,
                "concession": 96000
            }
        },
        "hostelFees": {
            "annualHostel": 18000,
            "messFees": 24000,
            "combinedFees": 36000,
            "cautionDeposit": 2000
        }
    }
    return jsonify({'success': True, 'data': fees}), 200

@app.route('/api/admission/contacts', methods=['GET'])
def get_admission_contacts():
    """Get SKNSCOE contact information"""
    contacts = {
        "admissionOffice": {
            "phone": "+91-9822053108",
            "email": "principal.sknsce@sinhgad.edu",
            "address": "Gat No. 664, Korti, Pandharpur, Solapur, Maharashtra 413304",
            "workingHours": "Monday to Saturday, 9:00 AM - 5:00 PM"
        },
        "website": "https://www.sinhgad.edu/sinhgad-engineering-institutes/sknscoe-pandharpur/",
        "branchCoordinators": {
            "CSE": {
                "name": "Prof. [HOD Name]",
                "phone": "+91-9822053108",
                "email": "hod.cs@sinhgad.edu"
            },
            "AI_DS": {
                "name": "Prof. [HOD Name]",
                "phone": "+91-9822053108",
                "email": "hod.aids@sinhgad.edu"
            },
            "EE": {
                "name": "Prof. [HOD Name]",
                "phone": "+91-9822053108",
                "email": "hod.ee@sinhgad.edu"
            }
        }
    }
    return jsonify({'success': True, 'data': contacts}), 200

@app.route('/api/admission/fees/calculate', methods=['GET'])
def calculate_fees():
    """Calculate total fees based on selections"""
    branch = request.args.get('branch', 'CSE')
    include_hostel = request.args.get('includeHostel', 'false').lower() == 'true'
    include_transport = request.args.get('includeTransport', 'false').lower() == 'true'
    
    # Fee structure
    fee_structure = {
        "CSE": 122000,
        "AI_DS": 122000,
        "EE": 118000,
        "CE": 108000,
        "ENTC": 118000,
        "MECH": 108000
    }
    
    base_fee = fee_structure.get(branch, 122000)
    hostel_fee = 36000 if include_hostel else 0
    transport_fee = 5000 if include_transport else 0
    
    total = base_fee + hostel_fee + transport_fee
    
    calculation = {
        "baseFees": base_fee,
        "hostelFees": hostel_fee,
        "transportFees": transport_fee,
        "breakdown": {
            "tuitionFee": base_fee * 0.8,
            "developmentFee": base_fee * 0.08,
            "libraryFee": 2000,
            "laboratoryFee": 3000,
            "examinationFee": 2000,
            "sportsFee": 1000
        },
        "totalFees": total
    }
    
    return jsonify({'success': True, 'calculation': calculation}), 200

# ============ PROFILE UPDATE API ============
@app.route('/api/users/<int:user_id>', methods=['PUT'])
def update_user_profile(user_id):
    """Update user profile"""
    try:
        data = request.get_json()
        
        user = db.session.get(User, user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Update allowed fields
        if 'name' in data:
            user.name = data['name']
        if 'email' in data:
            user.email = data['email']
        if 'contact_no' in data:
            user.contact_no = data['contact_no']
        
        # Update password if provided
        if 'password' in data and data['password']:
            # In a real application, hash the password before storing
            user.password = data['password']
        
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Profile updated successfully', 'user': user.to_dict()}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to update profile: {str(e)}'}), 500

if __name__ == '__main__':
    # For local development only: create tables if they don't exist and run the app.
    # In production, use proper migrations and a WSGI server.
    with app.app_context():
        try:
            db.create_all()
            print('Database tables ensured (db.create_all)')
        except Exception as e:
            print(f'Warning: could not create tables automatically: {e}')

    # Start Flask development server
    app.run(host='127.0.0.1', port=5000, debug=app.config.get('DEBUG', False))
