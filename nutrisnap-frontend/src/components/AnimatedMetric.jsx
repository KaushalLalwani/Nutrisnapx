import { motion } from "framer-motion";

export default function AnimatedMetric({ label, value, unit = "", delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      whileInView={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay }}
      className="text-center"
    >
      <motion.div
        className="text-3xl md:text-4xl font-bold text-teal-600"
        initial={{ y: 10 }}
        whileInView={{ y: 0 }}
        transition={{ duration: 0.6, delay: delay + 0.1 }}
      >
        {value}
        <span className="text-lg ml-1">{unit}</span>
      </motion.div>
      <p className="text-slate-600 mt-2">{label}</p>
    </motion.div>
  );
}
