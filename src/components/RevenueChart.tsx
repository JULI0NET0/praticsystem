"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Spotlight from './Spotlight';
import { motion } from 'framer-motion';

const data = [
  { name: 'Jan', receita: 40000, gastos: 24000 },
  { name: 'Fev', receita: 45000, gastos: 22000 },
  { name: 'Mar', receita: 38000, gastos: 26000 },
  { name: 'Abr', receita: 52000, gastos: 29000 },
  { name: 'Mai', receita: 65000, gastos: 31000 },
  { name: 'Jun', receita: 58000, gastos: 28000 },
];

export default function RevenueChart() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
      style={{ height: '100%' }}
    >
      <Spotlight className="glass-card" style={{ padding: '24px', height: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Evolução Financeira</h3>
          <select className="input-dark" style={{ width: 'auto', padding: '8px 12px', fontSize: '0.875rem' }}>
            <option>Últimos 6 meses</option>
            <option>Este ano</option>
          </select>
        </div>
        
        <div style={{ width: '100%', height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D9480F" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#D9480F" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#282828" vertical={false} />
              <XAxis dataKey="name" stroke="#A8A8A8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#A8A8A8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val/1000}k`} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1C1C1C', borderColor: '#282828', borderRadius: '8px' }}
                itemStyle={{ color: '#FFFFFF' }}
              />
              <Area 
                type="monotone" 
                dataKey="receita" 
                stroke="#D9480F" 
                strokeWidth={2} 
                fillOpacity={1} 
                fill="url(#colorReceita)" 
                isAnimationActive={true}
                animationBegin={600}
                animationDuration={1500}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Spotlight>
    </motion.div>
  );
}
