import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function DatePickerModal({ onSelect, onClose, defaultDate = null }) {
  const [currentDate, setCurrentDate] = useState(
    defaultDate ? new Date(defaultDate) : new Date()
  );
  const [selectedDate, setSelectedDate] = useState(
    defaultDate || new Date().toISOString().split("T")[0]
  );

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const handlePrevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
  };

  const handleNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );
  };

  const handleSelectDay = (day) => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, "0");
    const dayStr = String(day).padStart(2, "0");
    const dateStr = `${year}-${month}-${dayStr}`;
    setSelectedDate(dateStr);
  };

  const handleConfirm = () => {
    onSelect(selectedDate);
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const days = [];

  // Empty cells for days before month starts
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  // Days of month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const monthName = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  // Check if date is today
  const today = new Date().toISOString().split("T")[0];
  const isToday = (day) => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, "0");
    const dayStr = String(day).padStart(2, "0");
    return `${year}-${month}-${dayStr}` === today;
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
        className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={handlePrevMonth}
            className="p-2 hover:bg-slate-100 rounded-lg"
          >
            <ChevronLeft size={20} className="text-slate-600" />
          </motion.button>
          <h2 className="text-lg font-bold text-slate-900">{monthName}</h2>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleNextMonth}
            className="p-2 hover:bg-slate-100 rounded-lg"
          >
            <ChevronRight size={20} className="text-slate-600" />
          </motion.button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="text-center text-xs font-semibold text-slate-600"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2 mb-6">
          {days.map((day, i) => {
            if (!day) {
              return <div key={`empty-${i}`} className="aspect-square" />;
            }

            const year = currentDate.getFullYear();
            const month = String(currentDate.getMonth() + 1).padStart(2, "0");
            const dayStr = String(day).padStart(2, "0");
            const dateStr = `${year}-${month}-${dayStr}`;
            const isSelected = selectedDate === dateStr;
            const isTodayDate = isToday(day);

            return (
              <motion.button
                key={day}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSelectDay(day)}
                className={`aspect-square rounded-lg font-medium text-sm transition-all ${
                  isSelected
                    ? "bg-teal-500 text-white"
                    : isTodayDate
                    ? "bg-teal-100 text-teal-700 border border-teal-300"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {day}
              </motion.button>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleConfirm}
            className="flex-1 py-3 bg-gradient-to-r from-teal-500 to-green-600 text-white font-semibold rounded-lg hover:shadow-lg"
          >
            Select Date
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className="flex-1 py-3 bg-slate-200 text-slate-900 font-semibold rounded-lg hover:bg-slate-300"
          >
            Cancel
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
