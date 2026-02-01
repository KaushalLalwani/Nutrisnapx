import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Share2 } from "lucide-react";
import { analyzeAPI, communityAPI } from "../services/api";
import NutritionCard from "../components/NutritionCard";
import GlassCard from "../components/GlassCard";
import SkeletonLoader from "../components/SkeletonLoader";

export default function Analyze() {
  const location = useLocation();
  const navigate = useNavigate();
  const [result, setResult] = useState(location.state?.analysis || null);
  const [mealId, setMealId] = useState(location.state?.meal_id || null);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [sharing, setSharing] = useState(false);
  const [success, setSuccess] = useState("");

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
    setResult(null);
    setMealId(null);
    setError("");
  };

  const handleAnalyze = async () => {
    if (!image) return;

    try {
      setAnalyzing(true);
      setError("");
      const formData = new FormData();
      formData.append("image", image);

      const res = await analyzeAPI.analyze(formData);
      setResult(res.data);
      setMealId(res.data.meal_id);
      setError(""); // Clear any previous errors
    } catch (err) {
      console.error("Analysis failed:", err);
      setError(
        err.response?.data?.detail || "Failed to analyze. Please try again."
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const handleShareToCommunity = async () => {
    if (!mealId || !result) return;

    try {
      setSharing(true);
      const caption = `Just analyzed a meal! ${result.analysis.items
        .map((i) => i.name)
        .join(", ")} - ${Math.round(result.analysis.total_nutrition.calories)} cal`;

      // Create community post with analysis image
      const formData = new FormData();
      // We'll need to fetch the image from the URL and convert it
      const response = await fetch(result.image_url);
      const blob = await response.blob();
      formData.append("image", blob);
      formData.append("caption", caption);
      
      // Add nutrition data
      formData.append("nutrition", JSON.stringify({
        calories: result.analysis.total_nutrition.calories,
        protein: result.analysis.total_nutrition.protein,
        carbs: result.analysis.total_nutrition.carbs,
        fat: result.analysis.total_nutrition.fat,
        fiber: result.analysis.total_nutrition.fiber,
        sugar: result.analysis.total_nutrition.sugar,
        sodium: result.analysis.total_nutrition.sodium,
      }));

      await communityAPI.createPost(formData);
      setSuccess("Shared to community! 🎉");
      setTimeout(() => navigate("/community"), 1500);
    } catch (err) {
      console.error("Share failed:", err);
      setError("Failed to share to community. Please try again.");
    } finally {
      setSharing(false);
    }
  };

  if (!result && !preview) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 relative overflow-hidden">
        {/* Ambient background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-4xl mx-auto relative z-10">
          <motion.button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 mb-12 font-medium"
          >
            <ArrowLeft size={20} />
            Back to Dashboard
          </motion.button>

          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 to-teal-300 bg-clip-text text-transparent mb-4 drop-shadow-lg">
              Analyze Your Meal
            </h1>
            <p className="text-white text-lg">
              Upload a food image and let our AI analyze its nutritional content
            </p>
          </motion.div>

          <GlassCard className="p-12">
            <label
              htmlFor="upload"
              className="flex flex-col items-center justify-center cursor-pointer py-12 px-6"
            >
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-6xl mb-4"
              >
                📸
              </motion.div>
              <h3 className="text-2xl font-semibold text-white mb-2">
                Upload Your Meal Photo
              </h3>
              <p className="text-white text-center">
                Click to select an image or drag and drop
              </p>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                id="upload"
              />
            </label>
          </GlassCard>

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700"
            >
              {error}
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 relative overflow-hidden pt-20">
      {/* Ambient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        <motion.button
          onClick={() => {
            setResult(null);
            setPreview(null);
            setImage(null);
            setMealId(null);
          }}
          className="flex items-center gap-2 text-teal-600 hover:text-teal-700 mb-8 font-medium"
        >
          <ArrowLeft size={20} />
          Analyze Another Meal
        </motion.button>

        {/* Success Message */}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 text-green-700 font-medium"
          >
            ✅ {success}
          </motion.div>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <GlassCard className="overflow-hidden h-full">
              <img
                src={preview || result?.image_url}
                alt="meal"
                className="w-full h-80 object-cover"
              />
            </GlassCard>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {analyzing ? (
              <SkeletonLoader count={2} type="card" />
            ) : result ? (
              <>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                  <h2 className="text-2xl font-bold text-white mb-4">
                    Nutrition Breakdown
                  </h2>
                  <div className="grid grid-cols-2 gap-4">
                    <NutritionCard
                      label="Calories"
                      value={Math.round(result.analysis.total_nutrition.calories)}
                      unit="kcal"
                      color="orange"
                    />
                    <NutritionCard
                      label="Protein"
                      value={Math.round(result.analysis.total_nutrition.protein)}
                      unit="g"
                      color="blue"
                    />
                    <NutritionCard
                      label="Carbs"
                      value={Math.round(result.analysis.total_nutrition.carbs)}
                      unit="g"
                      color="green"
                    />
                    <NutritionCard
                      label="Fat"
                      value={Math.round(result.analysis.total_nutrition.fat)}
                      unit="g"
                      color="red"
                    />
                  </div>
                </motion.div>

                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                  <GlassCard className="p-6">
                    <h3 className="font-semibold text-white mb-4">
                      Micronutrients
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-white">Fiber</span>
                        <span className="font-medium text-white">
                          {Math.round(result.analysis.total_nutrition.fiber)}g
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white">Sugar</span>
                        <span className="font-medium text-white">
                          {Math.round(result.analysis.total_nutrition.sugar)}g
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white">Sodium</span>
                        <span className="font-medium text-white">
                          {Math.round(result.analysis.total_nutrition.sodium)}mg
                        </span>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>

                {/* Action Buttons */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleShareToCommunity}
                    disabled={sharing}
                    className="w-full py-3 bg-blue-500 text-white font-semibold rounded-xl hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Share2 size={18} />
                    Share
                  </motion.button>
                </motion.div>
              </>
            ) : preview ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleAnalyze}
                disabled={analyzing}
                className="w-full py-3 bg-gradient-to-r from-teal-500 to-green-600 text-white font-semibold rounded-xl hover:shadow-lg disabled:opacity-50"
              >
                {analyzing ? "Analyzing..." : "Analyze with AI"}
              </motion.button>
            ) : null}
          </motion.div>
        </div>

        {/* Food Items List */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-12"
          >
            <h3 className="text-2xl font-bold text-white mb-6">
              Detected Foods
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {result.analysis.items.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                >
                  <GlassCard className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="font-bold text-white text-lg">
                          {item.name}
                        </h4>
                        <p className="text-sm text-white">
                          ~{Math.round(item.estimated_weight_g)}g
                        </p>
                      </div>
                      <div className="px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-sm font-medium">
                        {Math.round(item.confidence * 100)}%
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between text-white">
                        <span>Calories:</span>
                        <span className="font-semibold">
                          {Math.round(item.nutrition_per_portion.calories)}
                        </span>
                      </div>
                      <div className="flex justify-between text-white">
                        <span>Protein:</span>
                        <span className="font-semibold">
                          {Math.round(item.nutrition_per_portion.protein)}g
                        </span>
                      </div>
                      <div className="flex justify-between text-white">
                        <span>Carbs:</span>
                        <span className="font-semibold">
                          {Math.round(item.nutrition_per_portion.carbs)}g
                        </span>
                      </div>
                      <div className="flex justify-between text-white">
                        <span>Fat:</span>
                        <span className="font-semibold">
                          {Math.round(item.nutrition_per_portion.fat)}g
                        </span>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

