"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, X, Info } from "lucide-react";
import { useState, useEffect, createContext, useContext } from "react";

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: ToastType) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 10000, display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              className="glass-card"
              style={{
                padding: '16px 20px',
                minWidth: '300px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                border: toast.type === 'error' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border)',
                background: toast.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'var(--glass-bg)',
                backdropFilter: 'blur(20px)'
              }}
            >
              {toast.type === 'success' && <CheckCircle2 size={20} color="#10B981" />}
              {toast.type === 'error' && <AlertCircle size={20} color="#EF4444" />}
              {toast.type === 'info' && <Info size={20} color="var(--accent)" />}
              
              <span style={{ fontSize: '0.9rem', fontWeight: 600, flex: 1 }}>{toast.message}</span>
              
              <button 
                onClick={() => setToasts(t => t.filter(x => x.id !== toast.id))}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex' }}
              >
                <X size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
