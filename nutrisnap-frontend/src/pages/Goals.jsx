import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Flame, Zap, Wheat, Droplet, CheckCircle } from "lucide-react";
import { goalsAPI } from "../services/api";
import GlassCard from "../components/GlassCard";
import SkeletonLoader from "../components/SkeletonLoader";

const GOAL_TEMPLATES = {
  balanced: {
    name: "Balanced Diet",
    daily_calories: 2000,
    protein_g: 100,
    carbs_g: 250,
    fat_g: 70,
    description: "Recommended for most adults",
  },
  highProtein: {
    name: "High Protein (Fitness)",
    daily_calories: 2200,
    protein_g: 160,
    carbs_g: 220,
    fat_g: 70,
    description: "For muscle building & athletic goals",
  },
  lowCarb: {
    name: "Low Carb Diet",
    daily_calories: 1800,
    protein_g: 120,
    carbs_g: 120,
    fat_g: 80,
    description: "Reduced carbohydrate approach",
  },
  weightLoss: {
    name: "Weight Loss",
    daily_calories: 1500,
    protein_g: 110,
    carbs_g: 150,
    fat_g: 50,
    description: "Calorie-controlled for healthy weight loss",
  },
};

export default function Goals() {
  const [goals, setGoals] = useState({
    daily_calories: 2000,
    protein_g: 100,
    carbs_g: 250,
    fat_g: 70,
  });
  const [customGoals, setCustomGoals] = useState(goals);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isCustom, setIsCustom] = useState(true);

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      setLoading(true);
      const res = await goalsAPI.getGoals();
      if (res.data) {
        setGoals(res.data);
        setCustomGoals(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch goals:", err);
      setError("Failed to load goals. Using defaults.");
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (template) => {
    setCustomGoals({
      daily_calories: template.daily_calories,
      protein_g: template.protein_g,
      carbs_g: template.carbs_g,
      fat_g: template.fat_g,
    });
    setIsCustom(false);
  };

  const handleCustomChange = (e) => {
    const { name, value } = e.target;
    setCustomGoals((prev) => ({
      ...prev,
      [name]: parseInt(value) || 0,
    }));
    setIsCustom(true);
  };

  const handleSave = async () => {
    try {
      setError("");
      await goalsAPI.setGoals(customGoals);
      setGoals(customGoals);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Failed to save goals:", err);
      setError("Failed to save goals. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900 p-8">
        <div className="max-w-6xl mx-auto">
          <SkeletonLoader count={3} type="card" />
        </div>
      </div>
    );
  }

  const macroTotal = customGoals.protein_g + customGoals.carbs_g + customGoals.fat_g;
  const proteinPct = ((customGoals.protein_g / macroTotal) * 100).toFixed(0);
  const carbsPct = ((customGoals.carbs_g / macroTotal) * 100).toFixed(0);
  const fatPct = ((customGoals.fat_g / macroTotal) * 100).toFixed(0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 to-teal-300 bg-clip-text text-transparent mb-4 drop-shadow-lg">
            Nutrition Goals
          </h1>
          <p className="text-white text-lg">
            Set your personalized nutrition targets
          </p>
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-950/30 border border-red-600/50 rounded-xl p-4 mb-8 text-red-300 backdrop-blur-md shadow-lg shadow-red-500/10"
          >
            {error}
          </motion.div>
        )}

        {/* Templates */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold text-white mb-6">
            Quick Start Templates
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(GOAL_TEMPLATES).map(([key, template], i) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
              >
                <GlassCard
                  className="p-6 cursor-pointer h-full flex flex-col"
                  onClick={() => handleTemplateSelect(template)}
                >
                  <h3 className="font-bold text-white mb-2">
                    {template.name}
                  </h3>
                  <p className="text-sm text-white mb-4 flex-1">
                    {template.description}
                  </p>
                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex justify-between">
                      <span className="text-white">Calories:</span>
                      <span className="font-semibold text-white">
                        {template.daily_calories}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white">Protein:</span>
                      <span className="font-semibold text-white">{template.protein_g}g</span>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full py-2 bg-gradient-to-r from-teal-500 to-green-600 text-white text-sm font-semibold rounded-lg"
                  >
                    Use This Template
                  </motion.button>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Custom Goals */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid lg:grid-cols-3 gap-8"
        >
          {/* Input Form */}
          <div className="lg:col-span-2">
            <GlassCard className="p-8">
              <h2 className="text-2xl font-bold text-white mb-8">
                {isCustom ? "Custom Goals" : "Review & Customize"}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Calories */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <label className="block text-sm font-medium text-white mb-2 flex items-center gap-2">
                    <Flame size={18} className="text-orange-500" />
                    Daily Calories
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      name="daily_calories"
                      value={customGoals.daily_calories}
                      onChange={handleCustomChange}
                      className="w-full px-4 py-3 border border-slate-200 rounded-lg bg-white/50 backdrop-blur focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <span className="absolute right-4 top-3 text-white">
                      kcal
                    </span>
                  </div>
                </motion.div>

                {/* Protein */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.35 }}
                >
                  <label className="block text-sm font-medium text-white mb-2 flex items-center gap-2">
                    <Zap size={18} className="text-blue-500" />
                    Protein
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      name="protein_g"
                      value={customGoals.protein_g}
                      onChange={handleCustomChange}
                      className="w-full px-4 py-3 border border-slate-200 rounded-lg bg-white/50 backdrop-blur focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <span className="absolute right-4 top-3 text-white">g</span>
                  </div>
                </motion.div>

                {/* Carbs */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <label className="block text-sm font-medium text-white mb-2 flex items-center gap-2">
                    <Wheat size={18} className="text-green-500" />
                    Carbs
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      name="carbs_g"
                      value={customGoals.carbs_g}
                      onChange={handleCustomChange}
                      className="w-full px-4 py-3 border border-slate-200 rounded-lg bg-white/50 backdrop-blur focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <span className="absolute right-4 top-3 text-white">g</span>
                  </div>
                </motion.div>

                {/* Fat */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.45 }}
                >
                  <label className="block text-sm font-medium text-white mb-2 flex items-center gap-2">
                    <Droplet size={18} className="text-red-500" />
                    Fat
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      name="fat_g"
                      value={customGoals.fat_g}
                      onChange={handleCustomChange}
                      className="w-full px-4 py-3 border border-slate-200 rounded-lg bg-white/50 backdrop-blur focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <span className="absolute right-4 top-3 text-white">g</span>
                  </div>
                </motion.div>
              </div>

              {/* Save Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSave}
                className="w-full py-3 bg-gradient-to-r from-teal-500 to-green-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle size={20} />
                Save Goals
              </motion.button>

              {saved && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 text-center font-medium"
                >
                  Goals saved successfully ✅
                </motion.div>
              )}
            </GlassCard>
          </div>

          {/* Macro Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <GlassCard className="p-8 h-full">
              <h3 className="text-xl font-bold text-white mb-6">
                Macro Breakdown
              </h3>

              <div className="space-y-6">
                {/* Protein */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-white">Protein</span>
                    <span className="text-blue-600 font-bold">
                      {proteinPct}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                    <motion.div
                      className="bg-blue-500 h-full"
                      animate={{ width: `${proteinPct}%` }}
                      transition={{ duration: 0.8 }}
                    />
                  </div>
                  <p className="text-sm text-white mt-1">
                    {customGoals.protein_g}g per day
                  </p>
                </div>

                {/* Carbs */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-white">Carbs</span>
                    <span className="text-green-600 font-bold">{carbsPct}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                    <motion.div
                      className="bg-green-500 h-full"
                      animate={{ width: `${carbsPct}%` }}
                      transition={{ duration: 0.8 }}
                    />
                  </div>
                  <p className="text-sm text-white mt-1">
                    {customGoals.carbs_g}g per day
                  </p>
                </div>

                {/* Fat */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-white">Fat</span>
                    <span className="text-red-600 font-bold">{fatPct}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                    <motion.div
                      className="bg-red-500 h-full"
                      animate={{ width: `${fatPct}%` }}
                      transition={{ duration: 0.8 }}
                    />
                  </div>
                  <p className="text-sm text-white mt-1">
                    {customGoals.fat_g}g per day
                  </p>
                </div>

                {/* Total Daily Calories */}
                <div className="mt-8 pt-8 border-t border-slate-200">
                  <p className="text-white text-sm mb-2">
                    Total Daily Calories
                  </p>
                  <p className="text-4xl font-bold text-teal-600">
                    {customGoals.daily_calories}
                  </p>
                  <p className="text-xs text-white mt-2">
                    {(customGoals.protein_g * 4 +
                      customGoals.carbs_g * 4 +
                      customGoals.fat_g * 9).toFixed(0)}{" "}
                    calories from macros
                  </p>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

