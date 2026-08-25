import { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const email = localStorage.getItem("email");
    const user_id = localStorage.getItem("user_id");

    if (token && email && user_id) {
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
      setUser({ email, user_id });
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const res = await api.post("/login", { email, password });
    const token = res.data.access_token;
    const user_id = res.data.user_id;

    localStorage.setItem("token", token);
    localStorage.setItem("email", email);
    localStorage.setItem("user_id", user_id);
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    setUser({ email, user_id });
  };

  const register = async (email, password) => {
    await api.post("/register", { email, password });
    await login(email, password);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("email");
    localStorage.removeItem("user_id");
    delete api.defaults.headers.common.Authorization;
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (ctx === null) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
};
