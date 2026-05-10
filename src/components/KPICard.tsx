"use client";

import { ReactNode, useEffect, useState } from "react";
import Spotlight from "./Spotlight";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";

interface KPICardProps {
  title: string;
  value: string;
  numericValue?: number;
  prefix?: string;
  subtitle: string;
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
          let formatted = Math.floor(latest).toLocaleString('pt-BR');
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
      <Spotlight className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>{title}</p>
            <motion.h3 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 + (index * 0.1), type: "spring", stiffness: 100 }}
              style={{ fontSize: '2rem', fontWeight: 700, color: '#FFFFFF', marginTop: '4px' }}
            >
              {numericValue !== undefined ? displayValue : value}
            </motion.h3>
          </div>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            borderRadius: '12px', 
            backgroundColor: 'rgba(28, 28, 28, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent)'
          }}>
            {icon}
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem' }}>
          {trend && trendValue && (
            <span style={{ 
              color: trend === 'up' ? '#22C55E' : trend === 'down' ? '#EF4444' : 'var(--text-secondary)',
              fontWeight: 500
            }}>
              {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
            </span>
          )}
          <span style={{ color: 'var(--text-secondary)' }}>{subtitle}</span>
        </div>
      </Spotlight>
    </motion.div>
  );
}
