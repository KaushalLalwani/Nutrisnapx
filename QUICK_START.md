# 🚀 NutriSnap Frontend - Quick Start Guide

## One-Command Setup

```bash
cd nutrisnap-frontend && npm install && npm run dev
```

This will:
1. Install all dependencies
2. Start dev server on `http://localhost:5173`
3. Enable HMR (hot module reload)

---

## 📋 Pre-Requirements

- **Node.js** 18+ installed
- **npm** 9+ or **yarn** 4+
- **Backend** running on `http://127.0.0.1:8000`
  ```bash
  # In separate terminal, from nutrisnap/ directory
  python -m uvicorn app.main:app --reload
  ```

---

## 🎯 5-Minute Test Walkthrough

### 1. Register New Account
- Navigate to `http://localhost:5173/register`
- Enter email: `test@example.com`
- Enter password: `password123`
- Click Register
- Redirected to login after 2s

### 2. Login
- Enter same credentials
- Click Login
- Redirected to Dashboard
- Check browser DevTools → localStorage → should see `token`

### 3. Upload Meal
- On Dashboard, click upload area
- Select any food image from your computer
- Wait for AI analysis (~2-3s)
- Redirected to Analyze page showing nutrition breakdown

### 4. Explore Features
- **History**: View all past scans with search
- **Goals**: Set daily nutrition targets (try Balanced template)
- **Community**: Share a meal with caption + image
- **Profile**: View your user stats and posts

---

## 🛠️ Development Workflow

### Add New Page
```bash
# 1. Create page file
touch src/pages/NewPage.jsx

# 2. Add route to App.jsx
import NewPage from "./pages/NewPage";
// ... in <Routes>
<Route path="/newpage" element={<ProtectedRoute><NewPage /></ProtectedRoute>} />

# 3. Add nav link
// In Navbar.jsx, add link to /newpage
```

### Add New Component
```bash
# 1. Create component
touch src/components/MyComponent.jsx

# 2. Use in pages
import MyComponent from "../components/MyComponent";

# 3. Use motion.div for animations
import { motion } from "framer-motion";
```

### Make API Call
```javascript
// In your page component
import { analyzeAPI } from "../services/api";

const result = await analyzeAPI.analyze(formData);
console.log(result.data); // Response from backend
```

---

## 🐛 Debugging Tips

### Check API Requests
Open DevTools (F12) → Network tab → Perform action
- Should see POST/GET requests to backend
- Check status codes (200 = success, 401 = auth error)
- Inspect request/response headers and body

### Enable Console Logging
```javascript
// In api.js, uncomment interceptor logging
api.interceptors.request.use((config) => {
  console.log('📤 API Request:', config.method.toUpperCase(), config.url);
  return config;
});
```

### Check Auth Token
```javascript
// In browser console
localStorage.getItem('token')  // Should return JWT string
localStorage.getItem('user')   // Should return user object JSON
```

### Clear Cache
```bash
# If you see stale code:
rm -rf node_modules package-lock.json
npm install
npm run dev
```

---

## 📁 File Structure Quick Reference

```
Pages (9 total):
  src/pages/Home.jsx            ← Landing page
  src/pages/Login.jsx           ← Auth
  src/pages/Register.jsx        ← Auth
  src/pages/Dashboard.jsx       ← Main hub
  src/pages/Analyze.jsx         ← Results
  src/pages/History.jsx         ← Meal history
  src/pages/Goals.jsx           ← Goal setting
  src/pages/Community.jsx       ← Social feed
  src/pages/Profile.jsx         ← User profile

Components (9 total):
  src/components/GlassCard.jsx       ← Base container
  src/components/NutritionCard.jsx   ← Macro display
  src/components/ProgressBar.jsx     ← Progress viz
  src/components/SkeletonLoader.jsx  ← Loading state
  src/components/AnimatedMetric.jsx  ← Metric display
  src/components/Navbar.jsx          ← Navigation
  src/components/Footer.jsx          ← Footer
  src/components/ProtectedRoute.jsx  ← Auth guard
  src/components/ErrorBoundary.jsx   ← Error fallback

Services & Context:
  src/services/api.js           ← API client (main!)
  src/context/AuthContext.jsx   ← Auth state

Root Files:
  src/App.jsx                   ← Router config
  src/main.jsx                  ← App entry point
  src/index.css                 ← Global styles
```

---

## 🎨 Quick Design Reference

### Colors
```javascript
// Teal (Primary)
bg-teal-500, text-teal-600, border-teal-300

// Green (Secondary)
bg-green-600, text-green-500

// Orange (Accent)
bg-orange-400, text-orange-500

// Slate (Text)
text-slate-900 (dark), text-slate-600 (light), text-slate-400 (muted)
```

### Common Components
```jsx
// Glass card
<GlassCard className="p-6">Content</GlassCard>

// Animated button
<motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
  Click
</motion.button>

// Skeleton loader
<SkeletonLoader type="card" />

// Nutrition stat
<NutritionCard label="Protein" value={150} unit="g" color="teal" />
```

---

## 🔗 API Base URL

Default: `http://127.0.0.1:8000`

To change:
```bash
# Create .env file
echo "VITE_API_URL=https://api.yourdomain.com" > .env
```

Then restart dev server:
```bash
npm run dev
```

---

## 🚦 Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| "Cannot POST /register" | Backend not running on 8000 |
| "Network Error" | Check VITE_API_URL in .env |
| "Redirected to login" | Token expired, login again |
| "Blank page" | Check console (F12), error details shown |
| "Images not loading" | Cloudinary API key issue in backend |
| "Slow uploads" | Large file size, compress before sending |

---

## 💾 Saving Work

### Git Workflow
```bash
# Stage changes
git add .

# Commit
git commit -m "feat: add new feature"

# Push to GitHub
git push origin main
```

### Build for Production
```bash
npm run build
# Creates dist/ folder with optimized files
# Ready to deploy to Vercel, Netlify, etc.
```

---

## 📞 Quick Command Reference

```bash
# Development
npm run dev              # Start dev server with HMR

# Production
npm run build            # Create optimized build
npm run preview          # Preview production build locally

# Code Quality
npm run lint             # Check linting errors
npm run format           # Auto-format code (if configured)

# Dependencies
npm install              # Install all deps
npm update               # Update to latest versions
npm audit                # Check security vulnerabilities
```

---

## 🎓 Learning Path

1. **Read** `FRONTEND_IMPLEMENTATION_SUMMARY.md` for overview
2. **Read** `FRONTEND_DEPLOYMENT_GUIDE.md` for testing/deployment
3. **Explore** code in `src/pages/Dashboard.jsx` (most complete)
4. **Run** locally: `npm run dev`
5. **Test** each page manually
6. **Deploy** via Vercel or Netlify

---

## ✨ Pro Tips

1. **Keyboard Shortcuts in DevTools**:
   - F12 - Open DevTools
   - Ctrl+Shift+K - Open console
   - Ctrl+Shift+I - Inspect element
   - Ctrl+Shift+C - Toggle element picker

2. **Vite HMR is Fast**: Modify any `.jsx` or `.css` file and see instant reload

3. **Use React DevTools Browser Extension**: Better component inspection

4. **Test on Mobile**: Use DevTools Device Toggle (Ctrl+Shift+M)

5. **Check Network Throttling**: DevTools → Network → Slow 3G (simulate real conditions)

---

## 📊 Performance Checklist

- [ ] All images loaded < 1s
- [ ] API responses < 500ms
- [ ] No console errors (F12)
- [ ] Animations smooth (60 FPS)
- [ ] Mobile responsive (test at 375px width)
- [ ] Forms submit without lag
- [ ] Navigation instant between pages

---

## 🎯 Next Steps

1. **Immediate**: Run `npm run dev` and test locally
2. **Short-term**: Deploy to Vercel/Netlify
3. **Medium-term**: Add unit tests
4. **Long-term**: Add Three.js 3D features, WebSocket for real-time

---

## 🆘 Need Help?

### Check These First
1. **Backend running?** → `python -m uvicorn app.main:app --reload`
2. **Dependencies installed?** → `npm install`
3. **Port 5173 available?** → `lsof -i :5173` (kill if needed)
4. **Backend CORS enabled?** → Check `app/main.py`
5. **API URL correct?** → Check `.env` file or `api.js` default

### Debug Strategy
1. Open DevTools (F12)
2. Go to Console tab
3. Attempt action (register, upload, etc.)
4. Read error message
5. Check Network tab for API call details
6. Inspect request/response body

---

**Status**: ✅ Ready to code!

Start with: `npm run dev`
