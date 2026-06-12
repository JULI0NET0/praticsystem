"use client";

import { useEffect, useState } from "react";

export default function InteractiveBackground() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const handleMouseMove = (e: MouseEvent) => {
      // Calcular a posição relativa do mouse (de -1 a 1)
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      
      setPosition({ x, y });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  if (!mounted) return null;

  // Multiplicador do movimento (pixels). Quanto maior, mais o fundo se move.
  const moveX = position.x * -20; 
  const moveY = position.y * -20;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100dvh',
      zIndex: -1,
      overflow: 'hidden',
      backgroundColor: '#0A0A0A', // Fallback color
      pointerEvents: 'none'
    }}>
      <div style={{
        position: 'absolute',
        top: '-5%',
        left: '-5%',
        width: '110%',
        height: '110%',
        backgroundImage: 'url(/background.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        transform: `translate3d(${moveX}px, ${moveY}px, 0) scale(1.02)`,
        transition: 'transform 0.1s ease-out',
        willChange: 'transform'
      }} />
      
      {/* Overlay global para garantir legibilidade dos textos em qualquer tema */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: 'var(--bg-overlay)',
        backdropFilter: 'var(--blur-overlay)',
        transition: 'background-color 0.5s ease'
      }} />
    </div>
  );
}
