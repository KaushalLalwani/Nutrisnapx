import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { UserPlus, AlertCircle, CheckCircle } from "lucide-react";
import { authAPI } from "../services/api";

export default function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    // Validation
    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await authAPI.register(email, password);
      setSuccess(true);
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Ambient background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-teal-500/15 rounded-full filter blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-500/15 rounded-full filter blur-3xl"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative backdrop-blur-xl bg-slate-900/50 border border-cyan-500/30 rounded-2xl p-8 w-full max-w-md shadow-2xl shadow-cyan-500/20 z-10"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="inline-block p-3 bg-gradient-to-br from-cyan-400 to-teal-500 rounded-full mb-4 shadow-lg shadow-cyan-500/40"
          >
            <UserPlus className="text-white" size={24} />
          </motion.div>
          <h1 className="text-3xl font-bold text-white mb-2 drop-shadow-lg">Join NutriSnap</h1>
          <p className="text-white">Create your account to start tracking nutrition</p>
        </div>

        {/* Success Message */}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-950/30 border border-green-600/50 rounded-lg p-3 mb-6 flex items-center gap-2 text-green-300 text-sm backdrop-blur-md shadow-lg shadow-green-500/10"
          >
            <CheckCircle size={16} />
            Account created! Redirecting to login...
          </motion.div>
        )}

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-950/30 border border-red-600/50 rounded-lg p-3 mb-6 flex items-center gap-2 text-red-300 text-sm backdrop-blur-md shadow-lg shadow-red-500/10"
          >
            <AlertCircle size={16} />
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <label className="block text-cyan-300 text-sm font-medium mb-2">
              Email Address
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-slate-800/50 border border-cyan-500/30 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent backdrop-blur transition-all shadow-lg shadow-cyan-500/10"
            />
          </motion.div>

          {/* Password */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <label className="block text-cyan-300 text-sm font-medium mb-2">
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 bg-slate-800/50 border border-cyan-500/30 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent backdrop-blur transition-all shadow-lg shadow-cyan-500/10"
            />
            <p className="text-white text-xs mt-1">At least 6 characters</p>
          </motion.div>

          {/* Confirm Password */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <label className="block text-cyan-300 text-sm font-medium mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-4 py-3 bg-slate-800/50 border border-cyan-500/30 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent backdrop-blur transition-all shadow-lg shadow-cyan-500/10"
            />
          </motion.div>

          {/* Submit Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={loading || success}
            className="w-full mt-8 py-3 bg-gradient-to-r from-cyan-500 to-teal-600 text-white font-semibold rounded-lg hover:shadow-2xl hover:shadow-cyan-500/40 shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-cyan-400/30"
          >
            {loading ? "Creating account..." : "Create Account"}
          </motion.button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-700/50" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-slate-900/50 text-white">Already registered?</span>
          </div>
        </div>

        {/* Login Link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <Link
            to="/login"
            className="block w-full text-center py-3 border border-cyan-500/30 rounded-lg text-cyan-300 font-semibold hover:bg-cyan-500/10 transition-all hover:border-cyan-400/50 hover:shadow-lg hover:shadow-cyan-500/20"
          >
            Sign In Instead
          </Link>
        </motion.div>

        {/* Footer */}
        <p className="text-center text-white text-xs mt-6">
          By registering, you agree to our Terms of Service
        </p>
      </motion.div>
    </div>
  );
}
