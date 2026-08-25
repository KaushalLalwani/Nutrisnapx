import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Camera, Loader } from "lucide-react";
import { summaryAPI, historyAPI, goalsAPI, analyzeAPI } from "../services/api";
import NutritionCard from "../components/NutritionCard";
import ProgressBar from "../components/ProgressBar";
import GlassCard from "../components/GlassCard";
import SkeletonLoader from "../components/SkeletonLoader";
import AnimatedMetric from "../components/AnimatedMetric";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [meals, setMeals] = useState([]);
  const [pendingMeals, setPendingMeals] = useState([]);
  const [goals, setGoals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const [summaryRes, historyRes, goalsRes, pendingRes] = await Promise.all([
        summaryAPI.getDailySummary(),
        historyAPI.getHistory(10),
        goalsAPI.getGoals(),
        historyAPI.getPendingMeals(),
      ]);

      setSummary(summaryRes.data);
      setMeals(historyRes.data.meals || []);
      setPendingMeals(pendingRes.data.meals || []);
      setGoals(goalsRes.data);
    } catch (err) {
      console.error("Dashboard fetch failed:", err);
      setError("Failed to load dashboard. Please refresh.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setAnalyzing(true);
      const formData = new FormData();
      formData.append("image", file);

      const res = await analyzeAPI.analyze(formData);

      // Navigate to results page with analysis data
      navigate("/analyze", { state: { analysis: res.data } });
    } catch (err) {
      console.error("Analysis failed:", err);
      setError("Failed to analyze food. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900 p-8">
        <div className="max-w-7xl mx-auto">
          <SkeletonLoader count={3} type="card" />
        </div>
      </div>
    );
  }

  const progressData = summary ? {
    calories: {
      value: summary.totals.calories,
      max: goals?.daily_calories || 2000,
    },
    protein: {
      value: summary.totals.protein,
      max: goals?.protein_g || 100,
    },
    carbs: {
      value: summary.totals.carbs,
      max: goals?.carbs_g || 250,
    },
    fat: {
      value: summary.totals.fat,
      max: goals?.fat_g || 70,
    },
  } : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 to-teal-300 bg-clip-text text-transparent mb-2 drop-shadow-lg">
            Welcome Back
          </h1>
          <p className="text-white">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </motion.div>

        {/* Upload Section */}
        <GlassCard className="p-8 mb-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Snap Your Meal
              </h2>
              <p className="text-white mb-6">
                Upload or capture a food image for instant AI nutrition analysis
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="flex gap-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={analyzing}
                  className="px-6 py-3 bg-gradient-to-r from-teal-500 to-green-600 text-white font-semibold rounded-xl flex items-center gap-2 hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {analyzing ? (
                    <>
                      <Loader className="animate-spin" size={20} />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Camera size={20} />
                      Upload Food Image
                    </>
                  )}
                </motion.button>
              </div>
            </div>

            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="hidden md:block text-6xl opacity-20"
            >
              📸
            </motion.div>
          </div>
        </GlassCard>

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8 text-red-700 text-sm"
          >
            {error}
          </motion.div>
        )}

        {/* Summary Section */}
        {summary && goals && (
          <>
            {/* Daily Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-12"
            >
              <h3 className="text-2xl font-bold text-white mb-6">
                Today's Summary
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <NutritionCard
                  label="Calories"
                  value={Math.round(summary.totals.calories)}
                  unit="kcal"
                  color="orange"
                  max={goals.daily_calories}
                  percentage={(summary.totals.calories / goals.daily_calories) * 100}
                />
                <NutritionCard
                  label="Protein"
                  value={Math.round(summary.totals.protein)}
                  unit="g"
                  color="blue"
                  max={goals.protein_g}
                  percentage={(summary.totals.protein / goals.protein_g) * 100}
                />
                <NutritionCard
                  label="Carbs"
                  value={Math.round(summary.totals.carbs)}
                  unit="g"
                  color="green"
                  max={goals.carbs_g}
                  percentage={(summary.totals.carbs / goals.carbs_g) * 100}
                />
                <NutritionCard
                  label="Fat"
                  value={Math.round(summary.totals.fat)}
                  unit="g"
                  color="red"
                  max={goals.fat_g}
                  percentage={(summary.totals.fat / goals.fat_g) * 100}
                />
              </div>
            </motion.div>

            {/* Progress Bars */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-12"
            >
              <GlassCard className="p-8">
                <h3 className="text-xl font-bold text-white mb-8">
                  Daily Progress
                </h3>
                <div className="space-y-6 text-white ">
                  <ProgressBar
                    label="Calories"
                    value={summary.totals.calories}
                    max={goals.daily_calories}
                    color="orange"
                  />
                  <ProgressBar
                    label="Protein"
                    value={summary.totals.protein}
                    max={goals.protein_g}
                    color="blue"
                  />
                  <ProgressBar
                    label="Carbs"
                    value={summary.totals.carbs}
                    max={goals.carbs_g}
                    color="green"
                  />
                  <ProgressBar
                    label="Fat"
                    value={summary.totals.fat}
                    max={goals.fat_g}
                    color="red"
                  />
                </div>
              </GlassCard>
            </motion.div>
          </>
        )}

        {/* Pending Meals Section */}
        {pendingMeals.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mb-12"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">
                Awaiting Confirmation ⏳
              </h3>
              <span className="text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full font-medium">
                {pendingMeals.length} pending
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pendingMeals.map((meal, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 + i * 0.05 }}
                >
                  <GlassCard className="overflow-hidden h-full flex flex-col hover:shadow-xl border-2 border-yellow-200 bg-yellow-50/30">
                    {meal.image_url && (
                      <div className="relative h-40 overflow-hidden">
                        <img
                          src={meal.image_url}
                          alt="Meal"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="p-5 flex-1 flex flex-col">
                      <div className="mb-3">
                        <p className="text-xs font-medium text-yellow-700 uppercase tracking-wide">
                          Pending Review
                        </p>
                        <h4 className="font-semibold text-white mt-1">
                          {meal.analysis.items
                            .map((item) => item.name)
                            .join(", ")}
                        </h4>
                      </div>
                      <div className="space-y-2 text-sm mb-4 flex-1">
                        <div className="flex justify-between text-white">
                          <span>Calories:</span>
                          <span className="font-semibold">
                            {Math.round(meal.analysis.total_nutrition.calories)}{" "}
                            kcal
                          </span>
                        </div>
                        <div className="flex justify-between text-white">
                          <span>Protein:</span>
                          <span className="font-semibold">
                            {Math.round(meal.analysis.total_nutrition.protein)}g
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-4 border-t border-yellow-200">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() =>
                            navigate("/analyze", {
                              state: {
                                analysis: meal,
                                meal_id: meal._id,
                              },
                            })
                          }
                          className="flex-1 text-teal-600 font-medium text-sm hover:text-teal-700 hover:bg-teal-50 py-2 rounded"
                        >
                          Review →
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            historyAPI.discardMeal(meal._id);
                            setPendingMeals(
                              pendingMeals.filter((m) => m._id !== meal._id)
                            );
                          }}
                          className="flex-1 text-red-600 font-medium text-sm hover:text-red-700 hover:bg-red-50 py-2 rounded"
                        >
                          Discard
                        </motion.button>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Recent Meals */}
        {meals.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h3 className="text-2xl font-bold text-white mb-6">
              Recent Meals ({meals.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {meals.slice(0, 6).map((meal, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                >
                  <GlassCard className="overflow-hidden h-full flex flex-col hover:shadow-xl">
                    {meal.image_url && (
                      <div className="relative h-40 overflow-hidden">
                        <img
                          src={meal.image_url}
                          alt="Meal"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="p-5 flex-1 flex flex-col">
                      <h4 className="font-semibold text-white mb-3">
                        {meal.analysis.items
                          .map((item) => item.name)
                          .join(", ")}
                      </h4>
                      <div className="space-y-2 text-sm mb-4 flex-1">
                        <div className="flex justify-between text-white">
                          <span>Calories:</span>
                          <span className="font-semibold">
                            {Math.round(meal.analysis.total_nutrition.calories)}{" "}
                            kcal
                          </span>
                        </div>
                        <div className="flex justify-between text-white">
                          <span>Protein:</span>
                          <span className="font-semibold">
                            {Math.round(meal.analysis.total_nutrition.protein)}g
                          </span>
                        </div>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="text-teal-600 font-medium text-sm hover:text-teal-700"
                        onClick={() =>
                          navigate("/analyze", { state: { analysis: meal } })
                        }
                      >
                        View Details →
                      </motion.button>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {meals.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <p className="text-white text-lg">
              No meals logged yet. Start by uploading your first food image!
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

