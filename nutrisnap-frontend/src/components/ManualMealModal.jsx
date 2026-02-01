import { useState } from "react";
import { motion } from "framer-motion";
import { X, Plus } from "lucide-react";
import { historyAPI } from "../services/api";

export default function ManualMealModal({ onClose, onSuccess }) {
  const [foodName, setFoodName] = useState("");
  const [portionGrams, setPortionGrams] = useState("");
  const [mealType, setMealType] = useState("lunch");
  const [mealDate, setMealDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [calories, setCalories] = useState("");
  const [proteinG, setProteinG] = useState("");
  const [carbsG, setCarbsG] = useState("");
  const [fatG, setFatG] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!foodName.trim() || !portionGrams) {
      setError("Please enter food name and portion size");
      return;
    }

    try {
      setLoading(true);
      setError("");
      
      await historyAPI.addManualMeal(
        foodName,
        parseFloat(portionGrams),
        mealType,
        mealDate,
        {
          calories: parseFloat(calories) || 0,
          protein_g: parseFloat(proteinG) || 0,
          carbs_g: parseFloat(carbsG) || 0,
          fat_g: parseFloat(fatG) || 0,
        }
      );

      setFoodName("");
      setPortionGrams("");
      setCalories("");
      setProteinG("");
      setCarbsG("");
      setFatG("");
      onSuccess?.();
    } catch (err) {
      console.error("Failed to add meal:", err);
      setError("Failed to add meal. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onClose}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6 z-50"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 max-w-md w-full shadow-2xl border border-slate-700/50"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Log a Meal</h2>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X size={24} />
          </motion.button>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 mb-4 text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Food Name */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2">
              Food Name
            </label>
            <input
              type="text"
              placeholder="e.g., Grilled Chicken with Rice"
              value={foodName}
              onChange={(e) => setFoodName(e.target.value)}
              className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {/* Portion Size */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2">
              Portion Size (grams)
            </label>
            <input
              type="number"
              placeholder="e.g., 200"
              value={portionGrams}
              onChange={(e) => setPortionGrams(e.target.value)}
              className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {/* Meal Type */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2">
              Meal Type
            </label>
            <select
              value={mealType}
              onChange={(e) => setMealType(e.target.value)}
              className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
              <option value="snack">Snack</option>
            </select>
          </div>

          {/* Meal Date */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2">
              Meal Date
            </label>
            <input
              type="date"
              value={mealDate}
              onChange={(e) => setMealDate(e.target.value)}
              className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {/* Nutrition Section */}
          <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
            <p className="text-sm font-semibold text-white mb-3">
              Nutrition (Optional)
            </p>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                placeholder="Calories"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-600 rounded-lg bg-slate-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <input
                type="number"
                placeholder="Protein (g)"
                value={proteinG}
                onChange={(e) => setProteinG(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-600 rounded-lg bg-slate-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <input
                type="number"
                placeholder="Carbs (g)"
                value={carbsG}
                onChange={(e) => setCarbsG(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-600 rounded-lg bg-slate-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <input
                type="number"
                placeholder="Fat (g)"
                value={fatG}
                onChange={(e) => setFatG(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-600 rounded-lg bg-slate-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSubmit}
              disabled={loading || !foodName.trim() || !portionGrams}
              className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-teal-600 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-cyan-500/30 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              {loading ? "Adding..." : "Add Meal"}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              className="flex-1 py-3 bg-slate-700 text-white font-semibold rounded-lg hover:bg-slate-600"
            >
              Cancel
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
