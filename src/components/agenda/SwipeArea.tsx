"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";
import { motion } from "framer-motion";

/** Faixa em cada borda onde nenhum gesto começa: é do "voltar" do iOS/Android. */
const EDGE_GUARD_PX = 20;
const DISTANCE_TO_TRIGGER_PX = 60;
const VELOCITY_TO_TRIGGER = 500;

interface SwipeAreaProps {
  onPrev: () => void;
  onNext: () => void;
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
}

/**
 * Arrastar para o lado troca de período (dia, semana ou mês).
 *
 * `drag="x"` já deixa a rolagem vertical com o navegador (touch-action: pan-y)
 * e `dragDirectionLock` só decide o eixo depois de alguns pixels — então lista
 * que rola continua rolando. O conteúdo acompanha o dedo e volta à origem: quem
 * troca o período é o callback, que re-renderiza a lista.
 */
export default function SwipeArea({ onPrev, onNext, children, style, className }: SwipeAreaProps) {
  const ignoreGesture = useRef(false);

  return (
    <motion.div
      className={className}
      style={style}
      drag="x"
      dragDirectionLock
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      dragSnapToOrigin
      onDragStart={(_, info) => {
        ignoreGesture.current =
          info.point.x < EDGE_GUARD_PX || info.point.x > window.innerWidth - EDGE_GUARD_PX;
      }}
      onDragEnd={(_, info) => {
        if (ignoreGesture.current) return;
        const { x } = info.offset;
        const vx = info.velocity.x;
        if (x < -DISTANCE_TO_TRIGGER_PX || vx < -VELOCITY_TO_TRIGGER) onNext();
        else if (x > DISTANCE_TO_TRIGGER_PX || vx > VELOCITY_TO_TRIGGER) onPrev();
      }}
    >
      {children}
    </motion.div>
  );
}
