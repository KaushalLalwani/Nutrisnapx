import { motion } from "framer-motion";
import clsx from "clsx";

export default function ProgressBar({
  label,
  value,
  max,
  color = "teal",
  showPercentage = true,
  animated = true,
}) {
  const colorMap = {
    teal: "bg-teal-500",
    orange: "bg-orange-500",
    blue: "bg-blue-500",
    red: "bg-red-500",
    green: "bg-green-500",
  };

  const percentage = (value / max) * 100;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-2"
    >
      <div className="flex justify-between items-center">
        <span className="font-semibold text-slate-700">{label}</span>
        {showPercentage && (
          <span className="text-sm text-slate-600">
            {percentage.toFixed(0)}%
          </span>
        )}
      </div>

      <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
        <motion.div
          className={clsx("h-full rounded-full", colorMap[color])}
          initial={{ width: 0 }}
          animate={{ width: `${animated ? percentage : percentage}%` }}
          transition={{
            duration: animated ? 1 : 0,
            ease: "easeOut",
          }}
        />
      </div>
    </motion.div>
  );
}
