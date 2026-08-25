import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// Add token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const authAPI = {
  register: (email, password) => api.post("/register", { email, password }),
  login: (email, password) => api.post("/login", { email, password }),
};

// Analyze endpoints
export const analyzeAPI = {
  analyze: (formData) =>
    api.post("/analyze", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
};

// History endpoints
export const historyAPI = {
  getHistory: (limit = 50) => api.get("/history", { params: { limit } }),
  getPendingMeals: () => api.get("/pending-meals"),
  confirmMeal: (mealId, mealDate, mealType, portionMultiplier = 1.0) =>
    api.post(`/meal/${mealId}/confirm`, {
      meal_date: mealDate,
      meal_type: mealType,
      portion_multiplier: portionMultiplier,
    }),
  discardMeal: (mealId) => api.post(`/meal/${mealId}/discard`),
  addManualMeal: (foodName, portionGrams, mealType, mealDate, nutrition = {}) =>
    api.post("/meal/manual/add", {
      food_name: foodName,
      portion_grams: portionGrams,
      meal_type: mealType,
      meal_date: mealDate,
      calories: nutrition.calories || 0,
      protein_g: nutrition.protein_g || 0,
      carbs_g: nutrition.carbs_g || 0,
      fat_g: nutrition.fat_g || 0,
    }),
};

// Summary endpoints
export const summaryAPI = {
  getDailySummary: (date = null) =>
    api.get("/summary", { params: { summary_date: date } }),
};

// Goals endpoints
export const goalsAPI = {
  setGoals: (goals) => api.post("/goals", goals),
  getGoals: () => api.get("/goals"),
};

// Community endpoints
export const communityAPI = {
  createPost: (formData) =>
    api.post("/community/post", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  getFeed: (page = 1, limit = 10, search = null) =>
    api.get("/community/feed", { params: { page, limit, search } }),
  likePost: (postId) => api.post(`/community/like/${postId}`),
  unlikePost: (postId) => api.delete(`/community/like/${postId}`),
  commentPost: (postId, data) =>
    api.post(`/community/comment/${postId}`, data),
  getComments: (postId) => api.get(`/community/comments/${postId}`),
  deleteComment: (commentId) => api.delete(`/community/comment/${commentId}`),
};

// Profile endpoints
export const profileAPI = {
  getProfile: (userId) => api.get(`/profile/${userId}`),
  getMyProfile: () => api.get("/profile/me"),
  getMyPosts: (page = 1, limit = 10) =>
    api.get("/profile/me/posts", { params: { page, limit } }),
  getUserPosts: (userId, page = 1, limit = 10) =>
    api.get(`/profile/${userId}/posts`, { params: { page, limit } }),
};

// Health check
export const healthAPI = {
  check: () => api.get("/health"),
};

export default api;

