import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Camera,
  Activity,
  Users,
  BarChart3,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import GlassCard from "../components/GlassCard";
import AnimatedMetric from "../components/AnimatedMetric";

export default function Home() {
  const { user } = useAuth();

  return (
    <>
      {/* Main Content */}
      <MainAppContent user={user} />
    </>
  );
}

function MainAppContent({ user }) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 perspective relative overflow-hidden pt-20">
      {/* Ambient background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-teal-500/15 rounded-full mix-blend-multiply filter blur-3xl"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/15 rounded-full mix-blend-multiply filter blur-3xl"></div>
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-purple-500/10 rounded-full mix-blend-multiply filter blur-3xl"></div>
      </div>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center overflow-hidden z-10">
        {/* Background Elements */}

        <div className="relative max-w-7xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-12 items-center">
          {/* Left Side */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-8"
          >
            <motion.div variants={itemVariants}>
              <div className="inline-flex items-center gap-2 bg-slate-800/50 backdrop-blur px-4 py-2 rounded-full border border-cyan-500/30 mb-6">
                <Sparkles className="text-cyan-400" size={16} />
                <span className="text-sm font-medium text-cyan-300">
                  AI-Powered Nutrition Analysis
                </span>
              </div>

              <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-cyan-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent leading-tight drop-shadow-lg">
                Snap. Analyze. Eat Smarter.
              </h1>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row gap-4"
            >
              {user ? (
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-teal-600 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-2xl hover:shadow-cyan-500/40 shadow-lg shadow-cyan-500/20 transition-all border border-cyan-400/30"
                  >
                    Go to Dashboard
                    <ChevronRight size={20} />
                  </Link>
                </motion.div>
              ) : (
                <>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Link
                      to="/register"
                      className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-teal-600 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-2xl hover:shadow-cyan-500/40 shadow-lg shadow-cyan-500/20 transition-all border border-cyan-400/30"
                    >
                      Get Started Free
                      <ChevronRight size={20} />
                    </Link>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Link
                      to="/login"
                      className="inline-flex items-center gap-2 border-2 border-cyan-400 text-cyan-400 px-8 py-4 rounded-xl font-semibold hover:bg-cyan-950/30 transition-all hover:shadow-lg hover:shadow-cyan-500/30"
                    >
                      Sign In
                      <ChevronRight size={20} />
                    </Link>
                  </motion.div>
                </>
              )}
            </motion.div>

            {/* Stats */}
            <motion.div
              variants={itemVariants}
              className="flex gap-8 pt-8 border-t border-slate-700/50"
            >
              <AnimatedMetric label="Foods Detected" value="10K+" delay={0} />
              <AnimatedMetric
                label="Nutrition Data"
                value="Instant"
                delay={0.1}
              />
            </motion.div>
          </motion.div>

          {/* Right Side - Visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="hidden md:block relative group"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-2xl blur-2xl opacity-30 group-hover:opacity-50 transition duration-500"></div>
            <GlassCard className="relative p-8 text-center shadow-2xl shadow-cyan-500/20 border border-slate-700/50 backdrop-blur-xl">
              <motion.div
                animate={{ y: [0, -20, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="text-7xl mb-6"
              >
                📱
              </motion.div>
              <h3 className="text-2xl font-bold text-white mb-2">
                Upload Your Meal
              </h3>
              <p className="text-white">
                Take a photo with your phone, and our AI instantly analyzes the
                nutrition
              </p>
            </GlassCard>
          </motion.div>
        </div>
      </section>
      <section className="max-w-7xl mx-auto px-6 py-20 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 to-teal-300 bg-clip-text text-transparent mb-6 drop-shadow-lg">
            Powerful Features
          </h2>
          <p className="text-white text-xl max-w-2xl mx-auto">
            Everything you need to take control of your nutrition
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          <FeatureCard
            icon={<Camera className="w-8 h-8" />}
            title="AI Meal Scan"
            desc="Analyze food photos instantly with advanced AI"
          />
          <FeatureCard
            icon={<BarChart3 className="w-8 h-8" />}
            title="Nutrition Tracking"
            desc="Track calories, macros, and micronutrients"
          />
          <FeatureCard
            icon={<Activity className="w-8 h-8" />}
            title="Health Insights"
            desc="Get personalized recommendations and trends"
          />
          <FeatureCard
            icon={<Users className="w-8 h-8" />}
            title="Community"
            desc="Share meals and learn from others"
          />
        </motion.div>
      </section>

      {/* How it Works */}
      <section className="py-20 bg-slate-900/40 backdrop-blur relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 to-teal-300 bg-clip-text text-transparent mb-6 drop-shadow-lg">
              How It Works
            </h2>
            <p className="text-white text-xl max-w-2xl mx-auto">
              Three simple steps to better nutrition
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-3 gap-8"
          >
            <ProcessStep
              number="1"
              title="Snap Your Meal"
              desc="Take a photo of your food or upload an existing image"
              icon="📸"
            />
            <ProcessStep
              number="2"
              title="AI Analyzes"
              desc="Our AI instantly identifies foods and calculates nutrition"
              icon="🤖"
            />
            <ProcessStep
              number="3"
              title="Track & Improve"
              desc="View detailed nutrition and track your daily progress"
              icon="📊"
            />
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-slate-900 via-cyan-900/30 to-slate-900 text-white relative z-10 border-t border-slate-700/50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto px-6 text-center space-y-8"
        >
          <div>
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 to-teal-300 bg-clip-text text-transparent mb-6 drop-shadow-lg">
              Ready to Eat Smarter?
            </h2>
            <p className="text-white text-xl mb-8">
              Join thousands of users taking control of their nutrition today
            </p>
          </div>

          {!user && (
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link
                to="/register"
                className="inline-block bg-gradient-to-r from-cyan-500 to-teal-600 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-2xl hover:shadow-cyan-500/40 shadow-lg shadow-cyan-500/20 transition-all border border-cyan-400/30"
              >
                Get Started for Free
              </Link>
            </motion.div>
          )}

          <p className="text-white">
            No credit card required • Free forever plan available
          </p>
        </motion.div>
      </section>
    </div>
  );
}

/* ---- COMPONENTS ---- */

function FeatureCard({ icon, title, desc }) {
  return (
    <motion.div
      whileHover={{ y: -10, scale: 1.02 }}
      className="group relative"
      style={{
        perspective: "1000px",
      }}
    >
      <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-xl blur opacity-20 group-hover:opacity-50 transition duration-500"></div>
      <GlassCard className="relative p-8 shadow-2xl shadow-cyan-500/10 border border-slate-700/50 backdrop-blur-xl group-hover:shadow-cyan-500/30 group-hover:border-cyan-500/30 transition-all duration-300 h-full">
        <motion.div
          whileHover={{ scale: 1.1, rotate: 5 }}
          className="text-cyan-400 mb-4 inline-block p-3 bg-cyan-500/20 rounded-lg border border-cyan-500/30 shadow-lg shadow-cyan-500/20"
        >
          {icon}
        </motion.div>
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-white">{desc}</p>
      </GlassCard>
    </motion.div>
  );
}

function ProcessStep({ number, title, desc, icon }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ y: -5 }}
      className="group relative"
      style={{
        perspective: "1000px",
      }}
    >
      <div className="absolute -inset-1 bg-gradient-to-r from-teal-500/50 to-cyan-500/50 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
      <GlassCard className="relative p-8 h-full shadow-2xl shadow-teal-500/10 border border-slate-700/50 backdrop-blur-xl group-hover:shadow-teal-500/30 group-hover:border-teal-500/30 transition-all duration-300">
        <div className="text-5xl mb-4">{icon}</div>
        <div className="inline-block px-4 py-2 bg-teal-950/50 text-teal-300 rounded-full font-bold mb-4 border border-teal-500/30">
          Step {number}
        </div>
        <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
        <p className="text-white">{desc}</p>
      </GlassCard>
    </motion.div>
  );
}

