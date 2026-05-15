"use client";

import { ReactNode, useEffect, useState } from "react";
import Spotlight from "./Spotlight";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";

interface KPICardProps {
  title: string;
  value: string;
  numericValue?: number;
  prefix?: string;
  subtitle?: string;
  icon: ReactNode;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  index?: number;
}

export default function KPICard({ title, value, numericValue, prefix = "", subtitle, icon, trend, trendValue, index = 0 }: KPICardProps) {
  const count = useMotionValue(0);
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    if (numericValue !== undefined) {
      const controls = animate(count, numericValue, {
        duration: 2,
        delay: 0.3 + index * 0.1,
        ease: "easeOut",
        onUpdate: (latest) => {
          // Format based on whether it has decimals or needs thousand separators
          let formatted = latest.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          setDisplayValue(`${prefix}${formatted}`);
        }
      });
      return controls.stop;
    }
  }, [numericValue, index, count, prefix]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: "easeOut" }}
      style={{ height: '100%' }}
    >
      <Spotlight className="glass-card" style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '4px', height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '6px',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent)',
            flexShrink: 0
          }}>
            <div style={{ transform: 'scale(0.8)', display: 'flex' }}>{icon}</div>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.65rem', fontWeight: 600, margin: 0 }}>{title}</p>
        </div>

        <motion.h3
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 + (index * 0.1), type: "spring", stiffness: 100 }}
          style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FFFFFF', margin: 0 }}
        >
          {numericValue !== undefined ? displayValue : value}
        </motion.h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem' }}>
          {trend && trendValue && (
            <span style={{
              color: trend === 'up' ? '#22C55E' : trend === 'down' ? '#EF4444' : 'var(--text-secondary)',
              fontWeight: 600
            }}>
              {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
            </span>
          )}
          <span style={{ color: 'var(--text-tertiary)' }}>{subtitle}</span>
        </div>
      </Spotlight>
    </motion.div>
  );
}
