# 🍽️ NutriSnap – AI-Powered Food Nutrition Analyzer

NutriSnap is a full-stack AI application that analyzes food images, estimates nutrition, and provides personalized health advice using **Google Gemini**, **Cloudinary**, and **MongoDB**.

Built with ❤️ using **FastAPI + React + TailwindCSS**.

---

## 🚀 Features

### 🔐 Authentication
- JWT-based Login & Registration
- Secure password hashing (bcrypt)
- Protected routes (backend + frontend)

### 📸 Food Analysis
- Upload food image
- AI detects food items & portion size
- Calculates calories, protein, carbs, fat, fiber, sodium
- AI-generated health advice & rating

### ☁ Image Storage
- Cloudinary integration
- Optimized image delivery
- Images shown on dashboard cards

### 📊 Dashboard
- Calories Today
- Weekly Streak
- Goal Progress
- Achievements
- Daily Macro Progress Bars
- Meal cards with images
- Dark / Light mode (auto)

### 🧠 AI Stack
- Google Gemini Vision + Text
- Nutrition estimation without external APIs
- Advice & rating layer

---

## 🏗️ Tech Stack

### Backend
- FastAPI
- MongoDB (PyMongo)
- Google Gemini API
- Cloudinary
- JWT (python-jose)
- Passlib + bcrypt

### Frontend
- React (Vite)
- TailwindCSS
- Axios
- React Router

---

## 📂 Project Structure

```bash
nutrisnap/
├── backend/
│   ├── app.py
│   ├── .env
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   └── Analysis.jsx
│   │   ├── api.js
│   │   └── main.jsx
│   └── package.json
│
└── README.md




