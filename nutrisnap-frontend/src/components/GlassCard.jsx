import { motion } from "framer-motion";
import clsx from "clsx";

export default function GlassCard({
  children,
  className = "",
  hover = true,
  delay = 0,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={hover ? { y: -5 } : {}}
      className={clsx(
        "backdrop-blur-xl bg-white bg-opacity-10 border border-white border-opacity-20 rounded-2xl",
        "shadow-xl hover:shadow-2xl transition-all",
        className
      )}
    >
      {children}
    </motion.div>
  );
}
