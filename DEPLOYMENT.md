# Production Deployment Guide

## ✅ Pre-Deployment Checklist

- [x] API URL updated to support localhost and production
- [x] Debug logging removed from frontend
- [x] Debug logging removed from backend
- [x] CORS configured for Vercel domain
- [x] Backend includes `_id` in leaderboard response
- [ ] Update Railway URL in `frontend/app.js` line 4
- [ ] Verify `.env` is in `.gitignore`
- [ ] Test locally one more time

---

## 🚀 Deployment Steps

### Step 1: Update Railway URL

**Before deploying, you need your Railway backend URL.**

1. Go to your Railway project dashboard
2. Find your backend service URL (e.g., `https://quizamit-production.up.railway.app`)
3. Update `frontend/app.js` line 4:

```javascript
: 'https://YOUR-RAILWAY-URL.railway.app/api';  // Replace with your actual URL
```

### Step 2: Deploy Backend to Railway

```bash
# Make sure you're in the project root
cd c:\Users\sivak\IdeaProjects\quizamit

# Add all changes
git add .

# Commit with descriptive message
git commit -m "Production ready: Fixed rank calculation, removed badges, cleaned debug logs"

# Push to GitHub (Railway will auto-deploy)
git push origin main
```

**Railway Environment Variables** (set in Railway dashboard):
- `MONGODB_URI` - Your MongoDB connection string
- `JWT_SECRET` - Your JWT secret key  
- `ADMIN_PASSWORD` - Admin password

### Step 3: Deploy Frontend to Vercel

Vercel will automatically deploy from your GitHub repository.

1. Go to your Vercel dashboard
2. Select your project
3. Vercel will detect the push and start deploying
4. Wait for deployment to complete

### Step 4: Verify Deployment

1. **Test Backend API:**
   ```
   https://your-railway-url.railway.app/api/leaderboard
   ```
   Should return JSON with users including `_id` field

2. **Test Frontend:**
   - Visit `https://wequiz-one.vercel.app` (or your Vercel URL)
   - Open browser console (F12)
   - Log in as a user
   - Check that rank displays (not "-")
   - Verify no badges on leaderboard
   - Check avg response time shows in MM:SS format

---

## 🔧 If You Need to Update Railway URL Later

If your Railway URL changes:

1. Update `frontend/app.js` line 4 with new URL
2. Commit and push:
   ```bash
   git add frontend/app.js
   git commit -m "Updated Railway API URL"
   git push origin main
   ```
3. Vercel will auto-redeploy

---

## 📝 Important Notes

- **CORS**: Backend is already configured for `https://wequiz-one.vercel.app`
- **Local Development**: Code still works locally (localhost detection)
- **No Environment Variables**: Frontend doesn't need env vars (URL is in code)
- **Auto-Deploy**: Both Railway and Vercel deploy automatically on git push

---

## 🐛 Troubleshooting

**Rank shows "-" in production:**
- Check browser console for API errors
- Verify Railway URL is correct in `app.js`
- Check CORS settings in backend

**CORS errors:**
- Verify Vercel domain matches CORS origin in `backend/server.js` line 17
- Check Railway logs for CORS errors

**Backend not responding:**
- Check Railway logs
- Verify environment variables are set
- Test API endpoint directly in browser
