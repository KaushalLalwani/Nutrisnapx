import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Send, ShoppingCart, Target, Loader2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'model', type: 'text', content: "Hi! I'm your NutriSnap AI. Need a meal plan, macro advice, or want to update your goals?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', type: 'text', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Check both common token keys
      const token = localStorage.getItem('token') || localStorage.getItem('access_token');
      
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        console.warn("No auth token found in localStorage.");
      }

      const apiMessages = messages.concat(userMessage).map(m => ({
        role: m.role,
        content: m.content || m.text || JSON.stringify(m.payload)
      }));

      const res = await fetch(`${API_BASE}/api/chat/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ messages: apiMessages })
      });

      if (!res.ok) throw new Error(`Chat request failed: ${res.status}`);
      const data = await res.json();
      
      setMessages(prev => [...prev, { role: 'model', ...data }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'model', type: 'text', content: "Sorry, I couldn't process that right now." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddBasket = (payload) => {
    const currentBasket = JSON.parse(localStorage.getItem('market-basket-items') || '[]');
    const newItems = payload.items.map(item => ({
      id: `${item.name}|${item.quantity}`,
      name: item.name,
      quantity: item.quantity,
      matched_by: 'llm',
      blinkit: null,
      instamart: null
    }));
    
    localStorage.setItem('market-basket-items', JSON.stringify([...currentBasket, ...newItems]));
    alert("Items added! Open the Market tab to compare prices.");
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl w-[350px] sm:w-[400px] h-[500px] mb-4 flex flex-col overflow-hidden"
          >
            <div className="bg-slate-800 p-4 flex justify-between items-center border-b border-slate-700">
              <div className="flex items-center gap-2 text-white font-semibold">
                <Bot className="text-teal-400" /> NutriSnap Assistant
              </div>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-4 text-sm">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.type === 'text' && (
                    <div className={`p-3 rounded-2xl max-w-[85%] ${msg.role === 'user' ? 'bg-teal-600 text-white rounded-br-sm' : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-sm'}`}>
                      {msg.content || msg.text}
                    </div>
                  )}

                  {msg.type === 'basket_recommendation' && (
                    <div className="bg-slate-800 border border-teal-500/30 rounded-xl p-4 w-[90%] shadow-lg">
                      <div className="text-teal-400 font-bold mb-1">{msg.payload.plan_name}</div>
                      <p className="text-slate-300 text-xs mb-3">{msg.text}</p>
                      <ul className="text-slate-200 space-y-1 mb-3">
                        {msg.payload.items.map((item, idx) => (
                          <li key={idx} className="flex justify-between border-b border-slate-700 pb-1">
                            <span>{item.name}</span>
                            <span className="text-slate-400">{item.quantity}</span>
                          </li>
                        ))}
                      </ul>
                      <button 
                        onClick={() => handleAddBasket(msg.payload)}
                        className="w-full bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                      >
                        <ShoppingCart size={16} /> Add to Market Basket
                      </button>
                    </div>
                  )}

                  {msg.type === 'goals_updated' && (
                    <div className="bg-slate-800 border border-green-500/30 rounded-xl p-4 w-[85%]">
                      <div className="flex items-center gap-2 text-green-400 font-bold mb-2">
                        <Target size={18} /> Goals Updated
                      </div>
                      <p className="text-slate-300 text-xs mb-2">{msg.text}</p>
                      <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-200">
                         <div className="bg-slate-900 p-2 rounded">🔥 {msg.payload.daily_calories} kcal</div>
                         <div className="bg-slate-900 p-2 rounded">🥩 {msg.payload.protein_g}g Pro</div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-800 p-3 rounded-2xl rounded-bl-sm text-teal-400">
                    <Loader2 size={16} className="animate-spin" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={sendMessage} className="p-3 bg-slate-800 border-t border-slate-700 flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask for a meal plan..."
                className="flex-1 bg-slate-900 text-white rounded-lg px-4 py-2 outline-none border border-slate-700 focus:border-teal-500 transition-colors"
              />
              <button 
                type="submit" 
                disabled={!input.trim() || isLoading}
                className="bg-teal-500 text-white p-2 rounded-lg hover:bg-teal-600 disabled:opacity-50 transition-colors"
              >
                <Send size={20} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full flex items-center justify-center text-white shadow-xl hover:shadow-teal-500/25 transition-all"
      >
        {isOpen ? <X size={24} /> : <Bot size={28} />}
      </motion.button>
    </div>
  );
}