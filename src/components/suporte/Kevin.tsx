"use client";

import { memo, useCallback, useEffect, useRef, useState, type ReactElement } from "react";

/* Kevin: ursinho em pixel art do Suporte AI (design "Suporte AI.dc.html"). */

const KEVIN = [
  ".LLMM..........MMLL.",
  ".LDDM..........MDDL.",
  ".LDDMMHHHMMMMMMMDDL.",
  "..MMMHHHHMMMMMMMMM..",
  "...MHHHMMMMMMMMMM...",
  "...MHHMMMMMMMMMMM...",
  "...MHMMMMMMMMMMMM...",
  "...MHMMMMMMMMMMMM...",
  "...MMMMMMMMMMMMMM...",
  "...MMMMMTTSSMMMMM...",
  "...MMMMTKGKKSMMMM...",
  ".LsMMMMSSKKSSMMMMsL.",
  "LLsMMMMSSKKSSMMMMsLL",
  "LMssMMMSKSSKSMMMssML",
  "LMMsssssSSSSsssssMML",
  "LMMMsMMMMMMMMMMsMMML",
];
const KCOR: Record<string, string> = { M: "#9a5a3a", H: "#ad6a44", L: "#a8663f", D: "#5f3322", s: "#7d4832", S: "#d49670", T: "#dca47e", K: "#120d0b", G: "#5a5552", W: "#ffffff" };
const OLHOS = [6, 13];
const GLIFOS: Record<string, string[]> = {
  "?": [".KK.", "K..K", "..K.", "....", "..K."],
  "!": ["K", "K", "K", ".", "K"],
  z: ["KKKK", "..K.", ".K..", "KKKK"],
  coracao: [".C.C.", "CCCCC", "CCCCC", ".CCC.", "..C.."],
};

export type Olhos = "abertos" | "fechados" | "feliz" | "cima" | "esq" | "dir" | "surpreso";
export interface Pose {
  olhos?: Olhos;
  dy?: number;
  orelha?: number;
  braco?: 0 | 1 | 2;
  pata?: boolean;
  patas?: "e" | "d";
  simbolo?: keyof typeof GLIFOS;
  simDy?: number;
}

function Pixel({ x, y, cor }: { x: number; y: number; cor: string }) {
  return <rect x={x} y={y} width={1.02} height={1.02} fill={KCOR[cor] || cor} />;
}

export const KevinSvg = memo(function KevinSvg({ px, pose = {}, folga = 6 }: { px: number; pose?: Pose; folga?: number }) {
  const P = { olhos: "abertos" as Olhos, dy: 0, orelha: 0, braco: 0, ...pose };
  const olhar = P.olhos === "esq" ? -1 : P.olhos === "dir" ? 1 : 0;
  const olhoEm = (x: number, y: number): string | null => {
    for (const c0 of OLHOS) {
      const c = c0 + olhar;
      if (P.olhos === "feliz") {
        if (y === 7 && x === c) return "K";
        if (y === 8 && (x === c - 1 || x === c + 1)) return "K";
      } else if (P.olhos === "fechados" && y === 8 && (x === c - 1 || x === c + 1)) {
        return "D";
      } else if (x === c) {
        if (P.olhos === "fechados") { if (y === 8) return "D"; }
        else if (P.olhos === "cima") { if (y === 5) return "W"; if (y === 6 || y === 7) return "K"; }
        else if (P.olhos === "surpreso") { if (y === 5) return "W"; if (y >= 6 && y <= 8) return "K"; }
        else { if (y === 6) return "W"; if (y === 7 || y === 8) return "K"; }
      }
    }
    return null;
  };

  const orelhas: ReactElement[] = [];
  const corpo: ReactElement[] = [];
  const extra: ReactElement[] = [];
  KEVIN.forEach((linha, y) => {
    [...linha].forEach((ch, x) => {
      if (ch === ".") return;
      if (P.braco && x <= 1 && y >= 12) return;
      if (P.pata && x >= 18 && y >= 12) return;
      let cor = ch;
      if (y >= 5 && y <= 8 && (OLHOS.includes(x) || OLHOS.includes(x - olhar) || OLHOS.some((c) => Math.abs(x - c - olhar) === 1))) {
        if (OLHOS.some((c) => x === c || x === c + 1 || x === c - 1)) cor = KEVIN[y][x] === "H" ? "H" : "M";
        const o = olhoEm(x, y);
        if (o) cor = o;
      }
      (y <= 1 ? orelhas : corpo).push(<Pixel key={x + "-" + y} x={x} y={y} cor={cor} />);
    });
  });
  if (P.braco) {
    [12, 13, 14, 15].forEach((y) => extra.push(<Pixel key={"f" + y} x={1} y={y} cor={y === 12 ? "s" : "M"} />));
    const b = P.braco === 1
      ? [[0, 8], [1, 8], [0, 9], [1, 9], [0, 10], [1, 10], [1, 11]]
      : [[-1, 7], [0, 7], [-1, 8], [0, 8], [0, 9], [1, 9], [1, 10], [1, 11]];
    b.forEach(([x, y], i) => extra.push(<Pixel key={"b" + i} x={x} y={y} cor={i < 2 ? "T" : "L"} />));
  }
  if (P.pata) {
    [[13, 12], [14, 12], [15, 12], [13, 13], [14, 13], [15, 13], [16, 13], [17, 14], [18, 14], [19, 14], [18, 15], [19, 15]]
      .forEach(([x, y], i) => extra.push(<Pixel key={"p" + i} x={x} y={y} cor={i < 3 ? "T" : "L"} />));
  }
  if (P.patas) {
    const e = P.patas === "e";
    [[4, 5, 6], [13, 14, 15]].forEach((cols, lado) => {
      const alto = (lado === 0) === e;
      cols.forEach((x) => extra.push(<Pixel key={"t" + lado + x} x={x} y={alto ? 14 : 15} cor="T" />));
      if (alto) cols.forEach((x) => extra.push(<Pixel key={"u" + lado + x} x={x} y={15} cor="s" />));
    });
  }
  if (P.simbolo && GLIFOS[P.simbolo]) {
    const gl = GLIFOS[P.simbolo];
    const ox = P.simbolo === "z" ? 16 : 17 - Math.floor(gl[0].length / 2) + 1;
    const oy = -gl.length - 1 + (P.simDy || 0);
    gl.forEach((linha, y) => [...linha].forEach((c, x) => {
      if (c === ".") return;
      extra.push(<rect key={"g" + x + "-" + y} x={ox + x} y={oy + y} width={1.02} height={1.02} fill={c === "C" ? "#d97757" : "var(--tp)"} />);
    }));
    if (P.simbolo === "z") {
      gl.forEach((linha, y) => [...linha].forEach((c, x) => {
        if (c !== ".") extra.push(<rect key={"zz" + x + "-" + y} x={12 + x} y={oy + y + 3} width={0.9} height={0.9} fill="var(--tt)" />);
      }));
    }
  }

  const alt = KEVIN.length + folga;
  return (
    <svg width={20 * px} height={alt * px} viewBox={`0 ${-folga} 20 ${alt}`} overflow="visible" shapeRendering="crispEdges" style={{ display: "block" }} aria-label="Kevin">
      <g transform={`translate(0 ${P.dy})`}>
        <g transform={`translate(0 ${P.orelha})`}>{orelhas}</g>
        <g>{corpo}</g>
        <g>{extra}</g>
      </g>
    </svg>
  );
});

type Quadro = { p: Pose; ms: number };
const F = (p: Pose, ms: number): Quadro => ({ p, ms });
const SEQ: Record<string, Quadro[]> = {
  idle: [F({}, 1600), F({ orelha: 1 }, 500), F({}, 1400), F({ orelha: 1 }, 500)],
  observa: [F({ olhos: "esq" }, 1500), F({ olhos: "esq", orelha: 1 }, 400)],
  pensando: [F({ olhos: "cima", pata: true, simbolo: "?" }, 420), F({ olhos: "cima", pata: true, simbolo: "?", simDy: -1 }, 420), F({ olhos: "cima", pata: true, simbolo: "?", orelha: 1 }, 420), F({ olhos: "cima", pata: true, simbolo: "?", simDy: -1, orelha: 1 }, 420)],
  escrevendo: [F({ patas: "e" }, 120), F({ patas: "d" }, 120)],
  dormindo: [F({ olhos: "fechados", dy: 1, simbolo: "z" }, 900), F({ olhos: "fechados", dy: 1, simbolo: "z", simDy: -1, orelha: 1 }, 900)],
  olharE: [F({ olhos: "esq" }, 900), F({}, 200)],
  olharD: [F({ olhos: "dir" }, 900), F({}, 200)],
  orelha: [F({ orelha: 1 }, 90), F({}, 90), F({ orelha: 1 }, 90), F({}, 90), F({ orelha: 1 }, 90), F({}, 200)],
  pulo: [F({ orelha: 1 }, 90), F({ dy: -2 }, 60), F({ dy: -4 }, 120), F({ dy: -2 }, 60), F({ orelha: 1 }, 90), F({}, 150)],
  aceno: [F({ braco: 1 }, 160), F({ braco: 2 }, 160), F({ braco: 1 }, 160), F({ braco: 2 }, 160), F({ braco: 1 }, 160), F({}, 120)],
  balanca: [F({ olhos: "esq" }, 280), F({ olhos: "dir" }, 280), F({ olhos: "esq" }, 280), F({}, 200)],
  surpresa: [F({ olhos: "surpreso", simbolo: "!", dy: -1 }, 110), F({ olhos: "surpreso", simbolo: "!" }, 480)],
  acordar: [F({ olhos: "surpreso", simbolo: "!", dy: -1 }, 110), F({ olhos: "surpreso", simbolo: "!" }, 500), F({ olhos: "fechados" }, 120), F({}, 200)],
  feliz: [F({ olhos: "feliz", orelha: 1 }, 100), F({ olhos: "feliz", dy: -2 }, 70), F({ olhos: "feliz", dy: -3 }, 120), F({ olhos: "feliz", dy: -1 }, 70), F({ olhos: "feliz" }, 700)],
  coracao: [F({ olhos: "feliz", simbolo: "coracao" }, 350), F({ olhos: "feliz", simbolo: "coracao", simDy: -1 }, 350), F({ olhos: "feliz", simbolo: "coracao" }, 350), F({ olhos: "feliz", simbolo: "coracao", simDy: -1 }, 350), F({ olhos: "feliz" }, 300)],
};
export type Animacao = keyof typeof SEQ;
const ACOES_IDLE: Animacao[] = ["olharE", "olharD", "orelha", "pulo", "aceno", "balanca"];
const EVENTOS_ATIVIDADE = ["mousemove", "keydown", "pointerdown", "wheel"] as const;

/**
 * Máquina de animação do Kevin: um loop por "modo" (idle, observa,
 * pensando, escrevendo, dormindo) + animações avulsas que, ao terminar,
 * devolvem o controle ao loop do modo atual.
 */
export function useKevin({ pensando, escrevendo, texto, sonoSeg = 60 }: { pensando: boolean; escrevendo: boolean; texto: string; sonoSeg?: number }) {
  const [pose, setPose] = useState<Pose>({});
  const [piscar, setPiscar] = useState(false);
  const [dormindo, setDormindo] = useState(false);

  const modo: Animacao = pensando ? "pensando" : escrevendo ? "escrevendo" : dormindo ? "dormindo" : texto.trim() ? "observa" : "idle";
  const modoRef = useRef(modo);
  const modoAtual = useRef<Animacao | null>(null);
  const umaVez = useRef(false);
  const quadroTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const dormindoRef = useRef(false);

  const tocar = useCallback((nome: Animacao, loop = false) => {
    const rodar = (seqNome: Animacao, emLoop: boolean) => {
      clearTimeout(quadroTimer.current);
      const seq = SEQ[seqNome];
      if (!seq) return;
      umaVez.current = !emLoop;
      let i = 0;
      const passo = () => {
        setPose(seq[i].p);
        quadroTimer.current = setTimeout(() => {
          i++;
          if (i >= seq.length) {
            if (emLoop) i = 0;
            else {
              umaVez.current = false;
              modoAtual.current = modoRef.current;
              rodar(modoRef.current, true);
              return;
            }
          }
          passo();
        }, seq[i].ms);
      };
      passo();
    };
    rodar(nome, loop);
  }, []);

  useEffect(() => {
    modoRef.current = modo;
    dormindoRef.current = dormindo;
    if (modo !== modoAtual.current && !umaVez.current) {
      modoAtual.current = modo;
      tocar(modo, true);
    }
  }, [modo, dormindo, tocar]);

  useEffect(() => {
    let piscaTimer: ReturnType<typeof setTimeout>;
    let piscaFim: ReturnType<typeof setTimeout>;
    const agendaPiscar = () => {
      piscaTimer = setTimeout(() => {
        if (modoRef.current !== "dormindo") {
          setPiscar(true);
          piscaFim = setTimeout(() => setPiscar(false), 130);
        }
        agendaPiscar();
      }, 2600 + Math.random() * 2600);
    };
    agendaPiscar();

    let idleTimer: ReturnType<typeof setTimeout>;
    const agendaIdle = () => {
      idleTimer = setTimeout(() => {
        if (modoRef.current === "idle" && !umaVez.current) tocar(ACOES_IDLE[Math.floor(Math.random() * ACOES_IDLE.length)]);
        agendaIdle();
      }, 5000 + Math.random() * 3000);
    };
    agendaIdle();

    let ultimo = Date.now();
    const ativo = () => {
      ultimo = Date.now();
      if (dormindoRef.current) {
        dormindoRef.current = false;
        setDormindo(false);
        tocar("acordar");
      }
    };
    EVENTOS_ATIVIDADE.forEach((e) => window.addEventListener(e, ativo, { passive: true }));
    const sono = setInterval(() => {
      const m = modoRef.current;
      if (!dormindoRef.current && (m === "idle" || m === "observa") && Date.now() - ultimo > sonoSeg * 1000) {
        dormindoRef.current = true;
        setDormindo(true);
      }
    }, 2000);

    return () => {
      clearTimeout(piscaTimer);
      clearTimeout(piscaFim);
      clearTimeout(idleTimer);
      clearTimeout(quadroTimer.current);
      clearInterval(sono);
      EVENTOS_ATIVIDADE.forEach((e) => window.removeEventListener(e, ativo));
    };
  }, [sonoSeg, tocar]);

  const acordar = useCallback(() => {
    dormindoRef.current = false;
    setDormindo(false);
  }, []);

  const oi = useCallback(() => {
    if (modoRef.current === "idle" && !umaVez.current) tocar("aceno");
  }, [tocar]);

  const pula = useCallback(() => {
    if (dormindoRef.current) {
      acordar();
      tocar("acordar");
    } else if (modoRef.current !== "pensando") tocar("pulo");
  }, [acordar, tocar]);

  const olhosPiscando: Olhos | undefined =
    piscar && (pose.olhos === undefined || pose.olhos === "abertos" || pose.olhos === "esq" || pose.olhos === "dir") ? "fechados" : pose.olhos;

  return { pose: { ...pose, olhos: olhosPiscando }, piscar, dormindo, tocar, acordar, oi, pula };
}
