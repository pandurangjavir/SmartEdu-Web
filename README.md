# SmartEdu Chatbot

A full-stack educational chatbot application built with React.js frontend and Flask backend, using MySQL database for data persistence.

## Project Structure

```
SmartEduChatbot/
├── frontend/          # React.js frontend (Vite)
├── backend/           # Flask backend (Python 3.10)
├── database/          # MySQL database scripts
├── requirements.txt   # Python dependencies
└── README.md         # This file
```

## Features

- **Frontend**: Modern React.js application with Vite for fast development
- **Backend**: RESTful API built with Flask
- **Database**: MySQL with SQLAlchemy ORM
- **CORS**: Cross-origin resource sharing enabled
- **User Management**: User registration and authentication
- **Chat System**: Real-time messaging with chatbot responses

## Prerequisites

- Node.js (v16 or higher)
- Python 3.10
- MySQL Server
- npm or yarn

## Installation

### 1. Clone the repository
```bash
git clone <repository-url>
cd SmartEduChatbot
```

### 2. Backend Setup

1. Create a virtual environment:
```bash
python -m venv venv
```

2. Activate the virtual environment:
```bash
# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
```

3. Install Python dependencies:
```bash
pip install -r requirements.txt
```

4. Set up MySQL database:
   - Create a MySQL database named `smartedu_chatbot`
   - Update the database connection string in `backend/config.py`
   - Run the initialization script:
   ```bash
   mysql -u your_username -p < database/init.sql
   ```

### 3. Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

## Running the Application

### Backend
```bash
cd backend
python app.py
```
The backend will run on `http://localhost:5000`

### Frontend
```bash
cd frontend
npm run dev
```
The frontend will run on `http://localhost:5173`

## API Endpoints

### Users
- `GET /api/users` - Get all users
- `POST /api/users` - Create a new user

### Chat
- `POST /api/chat` - Send a message to the chatbot
- `GET /api/chat/<user_id>` - Get chat history for a user

## Database Schema

### Users Table
- `id` (Primary Key)
- `username` (Unique)
- `email` (Unique)
- `created_at` (Timestamp)

### Chat Messages Table
- `id` (Primary Key)
- `user_id` (Foreign Key)
- `message` (Text)
- `response` (Text)
- `timestamp` (Timestamp)

### Courses Table
- `id` (Primary Key)
- `title` (String)
- `description` (Text)
- `created_at` (Timestamp)

## Environment Variables

Create a `.env` file in the backend directory:

```env
SECRET_KEY=your-secret-key-here
DATABASE_URL=mysql://username:password@localhost/smartedu_chatbot
```

## Development

### Backend Development
- The Flask app runs in debug mode by default
- SQLAlchemy provides database ORM functionality
- Flask-CORS enables cross-origin requests

### Frontend Development
- Built with Vite for fast development and hot reloading
- React.js for component-based UI
- Modern ES6+ JavaScript features

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please open an issue in the repository.