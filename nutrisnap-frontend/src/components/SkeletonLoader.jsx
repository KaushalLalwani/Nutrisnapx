import { motion } from "framer-motion";

export default function SkeletonLoader({ count = 1, type = "card" }) {
  const variants = {
    card: (
      <div className="bg-slate-800/50 rounded-xl p-6 space-y-4 border border-slate-700/50">
        <div className="h-6 bg-slate-700/50 rounded w-3/4 animate-pulse" />
        <div className="space-y-2">
          <div className="h-4 bg-slate-700/50 rounded animate-pulse" />
          <div className="h-4 bg-slate-700/50 rounded w-5/6 animate-pulse" />
        </div>
      </div>
    ),
    image: (
      <div className="bg-slate-700/50 rounded-xl aspect-square animate-pulse border border-slate-600/50" />
    ),
    text: (
      <div className="space-y-2">
        <div className="h-4 bg-slate-700/50 rounded animate-pulse" />
        <div className="h-4 bg-slate-700/50 rounded w-5/6 animate-pulse" />
      </div>
    ),
  };

  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0.5 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {variants[type]}
        </motion.div>
      ))}
    </div>
  );
}
