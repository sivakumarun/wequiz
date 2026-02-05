# TrainerPoll Setup Instructions

## Quick Start Guide

### Prerequisites
- Node.js (v14+)
- MongoDB (local or cloud)
- npm/yarn

### Step 1: Start MongoDB

**Option A: Local MongoDB**
```bash
# On Windows, if MongoDB is installed
mongod
```

**Option B: MongoDB Atlas (Cloud)**
1. Create a free account at https://www.mongodb.com/cloud/atlas
2. Create a cluster
3. Copy your connection string
4. Update MONGODB_URI in `backend/.env`

### Step 2: Install Dependencies

From the root directory:
```bash
npm install
cd backend && npm install
cd ../frontend && npm install
cd ..
```

### Step 3: Configure Backend

Create `backend/.env`:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/trainerpoll
JWT_SECRET=your_super_secret_jwt_key
ADMIN_PASSWORD=admin123
```

### Step 4: Initialize Database (Optional)

If MongoDB is running:
```bash
cd backend
node seed.js
cd ..
```

### Step 5: Start Both Servers

```bash
npm start
```

This will start:
- Backend: http://localhost:5000
- Frontend: http://localhost:3000

OR start them separately:

**Terminal 1 (Backend):**
```bash
cd backend
npm start
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm start
```

### Step 6: Access the Application

- **User Login**: http://localhost:3000
  - Enter 9-digit Employee ID
  - Enter your name
  - Select Reporting Manager
  
- **Admin Login**: http://localhost:3000
  - Click "Admin Login →"
  - Enter password: `admin123`

## Features

### User Side
- Real-time question delivery
- Multiple choice questions
- True/False questions
- Polls
- Live leaderboard
- Points and badges

### Admin Side
- Create questions (MCQ, True/False, Poll)
- Launch questions to all users
- View responses in real-time
- Monitor leaderboard
- End questions

## API Quick Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/user/login | User login |
| POST | /api/admin/login | Admin login |
| POST | /api/questions | Create question |
| GET | /api/questions | Get all questions |
| GET | /api/session | Get current session |
| POST | /api/session/start-question | Launch question |
| POST | /api/session/end-question | End question |
| POST | /api/responses | Submit response |
| GET | /api/responses/:questionId | Get question responses |
| GET | /api/leaderboard | Get leaderboard |

## Troubleshooting

### "Cannot connect to MongoDB"
- Check if MongoDB is running
- Verify connection string in `.env`
- Try MongoDB Atlas if local doesn't work

### "Admin login not working"
- Default password: `admin123`
- Update ADMIN_PASSWORD in `.env` to change it

### "Frontend can't reach backend"
- Ensure backend is running on port 5000
- Check browser console for CORS errors
- Verify API_BASE_URL in `frontend/app.js`

### "Reporting managers not showing"
- Run `node seed.js` in backend folder
- Or manually add them via API calls

## Default Credentials

- **Admin Password**: `admin123`
- **MongoDB**: `mongodb://localhost:27017/trainerpoll`

## Next Steps

After getting it working:
1. Create sample questions as admin
2. Launch a question to test end-to-end flow
3. Check responses on admin dashboard
4. View leaderboard in real-time
