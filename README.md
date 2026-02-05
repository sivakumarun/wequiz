# TrainerPoll - Live Quiz and Poll Platform

A comprehensive platform for engaging trainers with live polls, Q&A, quizzes, and word clouds. Built with Node.js, Express, MongoDB, and Vanilla JavaScript.

## Features

- ✅ **Real-time Live Quizzes**: Launch questions instantly to all connected users
- ✅ **Multiple Question Types**: MCQ, True/False, Polls, Word Clouds
- ✅ **User Authentication**: Login with 9-digit Employee ID
- ✅ **Admin Dashboard**: Manage questions, sessions, and view analytics
- ✅ **Leaderboard**: Live points tracking and gamification
- ✅ **Response Tracking**: View all user responses with time-based scoring
- ✅ **Reporting Manager Integration**: Organize users by reporting managers
- ✅ **Real-time Polling**: Users receive questions instantly when released

## Project Structure

```
trainerpoll/
├── backend/
│   ├── models/
│   │   ├── User.js
│   │   ├── Question.js
│   │   ├── Session.js
│   │   ├── Response.js
│   │   └── ReportingManager.js
│   ├── server.js
│   ├── seed.js
│   ├── package.json
│   └── .env
└── frontend/
    ├── index.html
    ├── app.js
    └── package.json
```

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (running locally or connection string)
- npm or yarn

## Installation

### Backend Setup

```bash
cd backend
npm install
```

### Frontend Setup

```bash
cd frontend
npm install
```

## Configuration

### Backend (.env file)

Create a `.env` file in the `backend` directory:

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/trainerpoll
JWT_SECRET=your_super_secret_jwt_key
ADMIN_PASSWORD=admin123
```

## Running the Application

### Start MongoDB
Make sure MongoDB is running on your system.

### Terminal 1: Start Backend Server

```bash
cd backend
npm start
```

The server will run on `http://localhost:5000`

### Terminal 2: Start Frontend Server

```bash
cd frontend
npm start
```

The frontend will run on `http://localhost:3000`

### Initialize Sample Data (Optional)

```bash
cd backend
node seed.js
```

This will create sample reporting managers in the database.

## Usage

### For Users

1. Navigate to `http://localhost:3000`
2. Enter your 9-digit Employee ID
3. Enter your full name
4. Select your Reporting Manager from the dropdown
5. Click "Enter Quiz"
6. Wait for questions to appear on your screen
7. Answer questions as they're released by the admin
8. View your ranking on the leaderboard

### For Admin

1. Navigate to `http://localhost:3000`
2. Click "Admin Login →"
3. Enter the admin password (default: `admin123`)
4. Use the dashboard to:
   - **Add Question**: Create new MCQ, True/False, or Poll questions
   - **Session Control**: Launch questions to all users
   - **View Leaderboard**: See real-time rankings
   - **End Question**: Stop accepting responses for current question

## API Endpoints

### User Routes
- `POST /api/user/login` - User login
- `GET /api/reporting-managers` - Get list of reporting managers

### Admin Routes
- `POST /api/admin/login` - Admin login
- `POST /api/questions` - Create a question (requires auth)
- `GET /api/questions` - Get all questions

### Session Routes
- `GET /api/session` - Get current session status
- `POST /api/session/start-question` - Launch a question (requires auth)
- `POST /api/session/end-question` - End current question (requires auth)

### Response Routes
- `POST /api/responses` - Submit user response
- `GET /api/responses/:questionId` - Get responses for a question

### Leaderboard
- `GET /api/leaderboard` - Get leaderboard with user rankings

## Database Models

### User
- `employeeId` (String, unique)
- `name` (String)
- `reportingManager` (String)
- `points` (Number)
- `badges` (Array)

### Question
- `text` (String)
- `type` (MCQ, True/False, Poll, WordCloud)
- `options` (Array)
- `correctAnswer` (String)
- `points` (Number)

### Session
- `activeQuestionId` (ObjectId)
- `isActive` (Boolean)
- `startTime` (Date)
- `currentQuestionStartTime` (Date)

### Response
- `userId` (ObjectId)
- `questionId` (ObjectId)
- `answer` (String)
- `responseTime` (Number in milliseconds)
- `isCorrect` (Boolean)
- `pointsEarned` (Number)

### ReportingManager
- `name` (String, unique)

## Scoring System

- **Time-based**: Faster responses earn more points
- **Correctness**: Correct answers earn full points
- **Badges**: Achievements for milestones

## Future Enhancements

- [ ] CSV export for reports
- [ ] Word cloud visualization
- [ ] Advanced analytics dashboard
- [ ] Email notifications
- [ ] Performance analytics by reporting manager
- [ ] Question history and statistics
- [ ] Mobile app version
- [ ] WebSocket for real-time updates
- [ ] Multiple session management
- [ ] Custom branding/themes

## Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB is running: `mongod`
- Check connection string in `.env`

### Frontend not connecting to backend
- Ensure backend is running on port 5000
- Check browser console for CORS errors
- Verify API_BASE_URL in `app.js`

### Admin login not working
- Default password is `admin123`
- Check JWT_SECRET in `.env`

## License

MIT License