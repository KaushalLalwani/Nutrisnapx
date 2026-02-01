import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Search, Filter } from "lucide-react";
import { historyAPI } from "../services/api";
import GlassCard from "../components/GlassCard";
import SkeletonLoader from "../components/SkeletonLoader";
import { useNavigate } from "react-router-dom";

export default function History() {
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const navigate = useNavigate();

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await historyAPI.getHistory(100);
      setMeals(res.data.meals || []);
    } catch (err) {
      console.error("History fetch failed:", err);
      setError("Failed to load history. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const filteredMeals = meals
    .filter((meal) => {
      const foodNames = meal.analysis.items
        .map((item) => item.name.toLowerCase())
        .join(" ");
      return foodNames.includes(searchTerm.toLowerCase());
    })
    .sort((a, b) => {
      if (sortBy === "date") {
        return (
          new Date(b.timestamp || 0).getTime() -
          new Date(a.timestamp || 0).getTime()
        );
      } else if (sortBy === "calories") {
        return (
          (b.analysis?.total_nutrition?.calories || 0) -
          (a.analysis?.total_nutrition?.calories || 0)
        );
      }
      return 0;
    });

  const totalCalories = filteredMeals.reduce(
    (sum, meal) => sum + (meal.analysis?.total_nutrition?.calories || 0),
    0
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900 p-8">
        <div className="max-w-6xl mx-auto">
          <SkeletonLoader count={5} type="card" />
        </div>
      </div>
    );
  }

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
            Food History
          </h1>
          <p className="text-white text-lg">
            Track all your meals and nutrition insights over time
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
        >
          <GlassCard className="p-6">
            <div className="text-center">
              <p className="text-white text-sm">Total Meals</p>
              <p className="text-4xl font-bold text-teal-600 mt-2">
                {filteredMeals.length}
              </p>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="text-center">
              <p className="text-white text-sm">Total Calories</p>
              <p className="text-4xl font-bold text-orange-600 mt-2">
                {Math.round(totalCalories)}
              </p>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="text-center">
              <p className="text-white text-sm">Avg Per Meal</p>
              <p className="text-4xl font-bold text-green-600 mt-2">
                {filteredMeals.length > 0
                  ? Math.round(totalCalories / filteredMeals.length)
                  : 0}
              </p>
            </div>
          </GlassCard>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <GlassCard className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-3 text-white" size={20} />
                <input
                  type="text"
                  placeholder="Search foods..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg bg-white/50 backdrop-blur focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Sort */}
              <div className="relative">
                <Filter className="absolute left-3 top-3 text-white" size={20} />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg bg-white/50 backdrop-blur focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="date">Sort by Date</option>
                  <option value="calories">Sort by Calories</option>
                </select>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8 text-red-700"
          >
            {error}
          </motion.div>
        )}

        {/* Meals List */}
        {filteredMeals.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="space-y-6"
          >
            {filteredMeals.map((meal, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.05 }}
              >
                <GlassCard className="p-6 overflow-hidden hover:shadow-xl">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {/* Image */}
                    {meal.image_url && (
                      <div className="md:col-span-1">
                        <img
                          src={meal.image_url}
                          alt="Meal"
                          className="w-full h-40 object-cover rounded-lg"
                        />
                      </div>
                    )}

                    {/* Content */}
                    <div className={`${meal.image_url ? "md:col-span-3" : "md:col-span-4"}`}>
                      {/* Date */}
                      <div className="flex items-center gap-2 text-white text-sm mb-3">
                        <Calendar size={16} />
                        {new Date(meal.timestamp || "").toLocaleString("en-US", {
                          weekday: "short",
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>

                      {/* Food Items */}
                      <h3 className="font-bold text-white mb-4 text-lg">
                        {meal.analysis.items
                          .map((item) => item.name)
                          .join(", ")}
                      </h3>

                      {/* Nutrition Summary */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-white">Calories</p>
                          <p className="font-bold text-lg text-orange-600">
                            {Math.round(meal.analysis.total_nutrition.calories)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-white">Protein</p>
                          <p className="font-bold text-lg text-blue-600">
                            {Math.round(meal.analysis.total_nutrition.protein)}g
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-white">Carbs</p>
                          <p className="font-bold text-lg text-green-600">
                            {Math.round(meal.analysis.total_nutrition.carbs)}g
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-white">Fat</p>
                          <p className="font-bold text-lg text-red-600">
                            {Math.round(meal.analysis.total_nutrition.fat)}g
                          </p>
                        </div>
                      </div>

                      {/* View Details Button */}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() =>
                          navigate("/analyze", { state: { analysis: meal } })
                        }
                        className="text-teal-600 font-medium hover:text-teal-700 transition-colors"
                      >
                        View Details →
                      </motion.button>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <p className="text-white text-lg mb-4">
              No meals found in your history
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/dashboard")}
              className="px-6 py-3 bg-gradient-to-r from-teal-500 to-green-600 text-white font-semibold rounded-xl"
            >
              Start Analyzing Meals
            </motion.button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
