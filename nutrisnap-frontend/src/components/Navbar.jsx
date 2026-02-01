import { Link, useLocation } from "react-router-dom";
import { Menu, X, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useState } from "react";
import { motion } from "framer-motion";

export default function Navbar() {
  const { pathname } = useLocation();
  const { user, logout, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (loading) {
    return (
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-b border-slate-700/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold text-cyan-400">⚡ NUTRISNAP</div>
        </div>
      </nav>
    );
  }

  const navItems = [
    { label: "Analyze", path: "/analyze" },
    { label: "Dashboard", path: "/dashboard" },
    { label: "History", path: "/history" },
    { label: "Community", path: "/community" },
    { label: "Goals", path: "/goals" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-b border-slate-700/50 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Left - Navigation Items */}
        <div className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={pathname === item.path ? "text-cyan-400 font-bold text-sm" : "text-white hover:text-cyan-400 transition-colors font-medium text-sm"}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Center - Logo */}
        <div className="text-2xl font-bold text-cyan-400 drop-shadow-lg flex items-center gap-2 absolute left-1/2 transform -translate-x-1/2">
          
          <Link
                  to="/"
                  className="px-6 py-2 bg-cyan-500 text-black font-bold text-sm rounded-full hover:bg-cyan-400 transition-all shadow-lg shadow-cyan-500/20"
                >
                  NUTRISNAP
                </Link>
        </div>

        {/* Right - Auth Buttons */}
        <div className="flex items-center gap-4 ml-auto">
          {user ? (
            <>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  to="/profile"
                  className="px-6 py-2 bg-cyan-500 text-black font-bold text-sm rounded-full hover:bg-cyan-400 transition-all shadow-lg shadow-cyan-500/20"
                >
                  Profile
                </Link>
              </motion.div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={logout}
                className="hidden md:flex items-center gap-2 text-white hover:text-red-400 transition-colors"
              >
                <LogOut size={18} />
                <span className="text-sm font-medium">Logout</span>
              </motion.button>
            </>
          ) : (
            <>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  to="/login"
                  className="text-white hover:text-white font-semibold transition-colors text-sm"
                >
                  Login
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  to="/register"
                  className="px-6 py-2 bg-cyan-500 text-black font-bold text-sm rounded-full hover:bg-cyan-400 transition-all shadow-lg shadow-cyan-500/20"
                >
                  Register
                </Link>
              </motion.div>
            </>
          )}

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-gray-300"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="md:hidden bg-slate-900 border-t border-slate-700/50 px-6 py-4 space-y-3"
        >
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={pathname === item.path ? "block py-2 text-sm font-medium text-cyan-400" : "block py-2 text-sm font-medium text-white hover:text-cyan-400"}
              onClick={() => setMobileMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}

          {user ? (
            <>
              <Link
                to="/profile"
                className="block py-2 text-sm font-medium text-cyan-400"
                onClick={() => setMobileMenuOpen(false)}
              >
                Profile
              </Link>
              <button
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left py-2 text-sm font-medium text-red-400"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="block py-2 text-sm font-medium text-white hover:text-cyan-400"
                onClick={() => setMobileMenuOpen(false)}
              >
                Login
              </Link>
              <Link
                to="/register"
                className="block py-2 text-sm font-medium text-cyan-400"
                onClick={() => setMobileMenuOpen(false)}
              >
                Register
              </Link>
            </>
          )}
        </motion.div>
      )}
    </nav>
  );
}

