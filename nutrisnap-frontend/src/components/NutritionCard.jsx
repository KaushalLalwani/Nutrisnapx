import { motion } from "framer-motion";
import clsx from "clsx";

export default function NutritionCard({
  label,
  value,
  unit,
  color = "teal",
  max = null,
  percentage = null,
  icon: Icon = null,
}) {
  const colorMap = {
    teal: "bg-teal-50 border-teal-200 text-teal-700",
    orange: "bg-orange-50 border-orange-200 text-orange-700",
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    red: "bg-red-50 border-red-200 text-red-700",
    green: "bg-green-50 border-green-200 text-green-700",
  };

  const progressColor = {
    teal: "bg-teal-500",
    orange: "bg-orange-500",
    blue: "bg-blue-500",
    red: "bg-red-500",
    green: "bg-green-500",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={clsx(
        "p-4 rounded-xl border-2 backdrop-blur-sm transition-all hover:shadow-lg",
        colorMap[color]
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{label}</span>
        {Icon && <Icon className="w-5 h-5" />}
      </div>

      <div className="text-2xl font-bold mb-2">
        {value}
        <span className="text-sm ml-1 font-normal">{unit}</span>
      </div>

      {max && percentage !== null && (
        <div className="mt-3">
          <div className="flex justify-between text-xs mb-1">
            <span>{percentage.toFixed(0)}%</span>
            <span className="text-gray-500">{max} {unit}</span>
          </div>
          <div className="w-full bg-white rounded-full h-2 overflow-hidden">
            <motion.div
              className={clsx("h-full", progressColor[color])}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(percentage, 100)}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}
