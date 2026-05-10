"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import Spotlight from "./Spotlight";

interface CustomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'info' | 'confirm';
  confirmText?: string;
  cancelText?: string;
}

export default function CustomModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'info',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar'
}: CustomModalProps) {
  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="glass-card"
        style={{ width: '100%', maxWidth: '400px', padding: '32px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}
      >
        <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(217, 72, 15, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {type === 'success' && <CheckCircle2 size={32} color="#10B981" />}
          {type === 'error' && <AlertCircle size={32} color="#EF4444" />}
          {type === 'info' && <Info size={32} color="var(--accent)" />}
          {type === 'confirm' && <Info size={32} color="var(--accent)" />}
        </div>

        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>{title}</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5' }}>{message}</p>
        </div>

        <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '8px' }}>
          {type === 'confirm' && (
            <button 
              onClick={onClose}
              className="btn btn-secondary" 
              style={{ flex: 1 }}
            >
              {cancelText}
            </button>
          )}
          <Spotlight 
            as="button" 
            onClick={onConfirm || onClose}
            className={`btn ${type === 'error' ? 'btn-danger' : 'btn-accent'}`} 
            style={{ flex: 1, background: type === 'error' ? '#EF4444' : 'var(--accent)' }}
          >
            {confirmText}
          </Spotlight>
        </div>

        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>
      </motion.div>
    </div>
  );
}
