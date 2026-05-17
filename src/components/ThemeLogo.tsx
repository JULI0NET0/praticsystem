"use client";

import { useTheme } from "next-themes";
import Image from "next/image";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface ThemeLogoProps {
  width?: number;
  height?: number;
  align?: 'left' | 'center' | 'right';
  isCollapsed?: boolean;
}

export default function ThemeLogo({
  width = 200,
  height = 48,
  align = 'center',
  isCollapsed = false
}: ThemeLogoProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Retorna um div transparente do mesmo tamanho para evitar layout shift
    return <div style={{ width: isCollapsed ? 40 : width, height }} />;
  }

  const fullLogo = resolvedTheme === 'light' ? '/logo-horizontal-preta.png' : '/logo-horizontal-branca.png';
  const symbolLogo = resolvedTheme === 'light' ? '/simbolo-preto.png' : '/simbolo-branco.png';
  const logoSrc = isCollapsed ? symbolLogo : fullLogo;

  const alignmentMap = {
    left: 'flex-start',
    center: 'center',
    right: 'flex-end'
  };

  return (
    <motion.div
      initial={false}
      animate={{
        width: isCollapsed ? 40 : '100%',
        maxWidth: isCollapsed ? 40 : width,
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{
        height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: isCollapsed ? 'center' : alignmentMap[align],
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      <div style={{
        minWidth: isCollapsed ? 40 : width,
        height: '100%',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: isCollapsed ? 'center' : alignmentMap[align],
        transition: 'min-width 0.3s ease'
      }}>
        <Image
          src={logoSrc}
          alt="Prátic Logo"
          width={isCollapsed ? 32 : width}
          height={isCollapsed ? 32 : height}
          style={{
            width: isCollapsed ? '32px' : '100%',
            height: isCollapsed ? '32px' : '100%',
            objectFit: 'contain',
            objectPosition: isCollapsed ? 'center' : alignmentMap[align],
          }}
          priority
        />
      </div>
    </motion.div>
  );
}
