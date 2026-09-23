"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type DragEvent, type KeyboardEvent } from "react";
import { ArrowUp, Menu, Palette, Paperclip, SquarePen, X } from "lucide-react";
import { useTheme } from "next-themes";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { KevinSvg, useKevin } from "./Kevin";
import styles from "./suporte.module.css";

/* Suporte AI: chat interno com o Kevin (design "Suporte AI.dc.html"). */

type Tema = "claro" | "escuro";
type FundoId = "liso" | "aurora" | "oliva" | "ceu" | "imagem";
type Provider = "hermes" | "groq";
interface Mensagem { de: "eu" | "ag"; texto: string; erro?: boolean }
interface Conversa { id: string; titulo: string; msgs: Mensagem[] }
interface Escrevendo { id: string; idx: number; n: number }
interface Salvo { conversas: Conversa[]; tema: Tema | null; fundo: FundoId; imagem?: string | null; veu: number; desfoque: boolean }

const CHAVE = "pratic-suporte-ai-v1";
const OBRIGADO = /obrigad|brigad|valeu|vlw|thanks|agrade/i;
const FUNDOS: { id: FundoId; label: string; css: string | null }[] = [
  { id: "liso", label: "Liso", css: "var(--cv)" },
  { id: "aurora", label: "Aurora", css: "radial-gradient(55% 45% at 50% 38%, color-mix(in oklab, var(--co) 24%, transparent), transparent 72%), radial-gradient(35% 35% at 18% 82%, color-mix(in oklab, #e5b454 18%, transparent), transparent 70%), var(--cv)" },
  { id: "oliva", label: "Oliva", css: "radial-gradient(60% 50% at 70% 30%, color-mix(in oklab, var(--su) 26%, transparent), transparent 72%), var(--cv)" },
  { id: "ceu", label: "Céu", css: "radial-gradient(60% 55% at 30% 25%, color-mix(in oklab, var(--in) 26%, transparent), transparent 72%), var(--cv)" },
  { id: "imagem", label: "Imagem", css: null },
];
const VEUS: [string, number][] = [["Nenhum", 0], ["Leve", 40], ["Forte", 70]];
const SUGESTOES = ["Como abrir uma demanda interna", "Resumir as demandas atrasadas", "Checklist de entrega de Reels", "Onde fica o briefing do cliente"];
const SEMENTE: Conversa[] = [
  { id: "s1", titulo: "Fluxo de aprovação de peças", msgs: [
    { de: "eu", texto: "Qual o fluxo de aprovação de peças com o cliente?" },
    { de: "ag", texto: "1. Designer move a demanda para Revisão.\n2. Líder revisa internamente e comenta na própria demanda.\n3. Após ajustes, status vai para Aguardando cliente e o link é enviado no grupo do cliente.\n4. Aprovado: status Aprovado e agenda de publicação." },
  ] },
  { id: "s2", titulo: "Prazo padrão de Reels", msgs: [] },
  { id: "s3", titulo: "Acesso ao Drive do cliente", msgs: [] },
];

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function lerSalvo(): Partial<Salvo> | null {
  try { return JSON.parse(window.localStorage.getItem(CHAVE) || "null"); } catch { return null; }
}

export default function SuportePainel() {
  const { currentUser } = useAuth();
  const { resolvedTheme } = useTheme();

  const [conversas, setConversas] = useState<Conversa[]>(SEMENTE);
  const [atual, setAtual] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const [pensando, setPensando] = useState(false);
  const [escrevendo, setEscrevendo] = useState<Escrevendo | null>(null);
  const [aparencia, setAparencia] = useState(false);
  const [lateralAberta, setLateralAberta] = useState(false);
  const [tema, setTema] = useState<Tema | null>(null);
  const [fundo, setFundo] = useState<FundoId>("aurora");
  const [imagem, setImagem] = useState<string | null>(null);
  const [veu, setVeu] = useState(1);
  const [desfoque, setDesfoque] = useState(true);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [agenteErro, setAgenteErro] = useState(false);
  const [carregado, setCarregado] = useState(false);

  const listaRef = useRef<HTMLDivElement>(null);
  const conversasRef = useRef(conversas);
  const escreverTimer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const kevin = useKevin({ pensando, escrevendo: !!escrevendo, texto });
  const { tocar, acordar } = kevin;

  useEffect(() => { conversasRef.current = conversas; }, [conversas]);

  // Carrega o estado salvo (conversas + aparência) uma vez no cliente.
  useEffect(() => {
    const s = lerSalvo();
    /* eslint-disable react-hooks/set-state-in-effect -- hidratação única a partir do localStorage */
    if (s) {
      if (Array.isArray(s.conversas)) setConversas(s.conversas);
      if (s.tema === "claro" || s.tema === "escuro") setTema(s.tema);
      if (s.fundo && FUNDOS.some((f) => f.id === s.fundo)) setFundo(s.fundo);
      if (s.imagem) setImagem(s.imagem);
      if (typeof s.veu === "number" && VEUS[s.veu]) setVeu(s.veu);
      if (typeof s.desfoque === "boolean") setDesfoque(s.desfoque);
    }
    setCarregado(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!carregado) return;
    const dados: Salvo = { conversas, tema, fundo, imagem, veu, desfoque };
    try { window.localStorage.setItem(CHAVE, JSON.stringify(dados)); }
    catch {
      // Imagem grande estoura a cota: salva o resto sem ela.
      try { window.localStorage.setItem(CHAVE, JSON.stringify({ ...dados, imagem: null, fundo: fundo === "imagem" ? "aurora" : fundo })); } catch { /* sem armazenamento */ }
    }
  }, [carregado, conversas, tema, fundo, imagem, veu, desfoque]);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const r = await fetch("/api/suporte/chat", { headers: await authHeaders() });
        const j = await r.json();
        if (vivo && r.ok) setProvider(j.provider ?? null);
      } catch { /* status fica como desconhecido */ }
    })();
    return () => { vivo = false; };
  }, []);

  useEffect(() => () => clearInterval(escreverTimer.current), []);

  useEffect(() => {
    const el = listaRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [conversas, pensando, escrevendo, atual]);

  const escrever = useCallback((id: string, idx: number, total: number) => new Promise<void>((ok) => {
    setPensando(false);
    let n = 0;
    setEscrevendo({ id, idx, n });
    clearInterval(escreverTimer.current);
    escreverTimer.current = setInterval(() => {
      n = Math.min(total, n + 3);
      if (n >= total) {
        clearInterval(escreverTimer.current);
        setEscrevendo(null);
        ok();
      } else setEscrevendo({ id, idx, n });
    }, 18);
  }), []);

  const enviar = useCallback(async (txt?: string) => {
    const pergunta = (txt ?? texto).trim();
    if (!pergunta || pensando || escrevendo) return;
    let id = atual;
    const anteriores = id ? (conversasRef.current.find((c) => c.id === id)?.msgs ?? []) : [];
    if (!id) {
      const novoId = "c" + Date.now();
      id = novoId;
      const titulo = pergunta.length > 42 ? pergunta.slice(0, 40) + "…" : pergunta;
      setConversas((p) => { const n = [{ id: novoId, titulo, msgs: [] }, ...p]; conversasRef.current = n; return n; });
      setAtual(novoId);
    }
    const convId = id;
    const push = (m: Mensagem) => setConversas((p) => {
      const n = p.map((c) => (c.id === convId ? { ...c, msgs: [...c.msgs, m] } : c));
      conversasRef.current = n;
      return n;
    });
    push({ de: "eu", texto: pergunta });
    setTexto("");
    setPensando(true);
    acordar();
    tocar("surpresa");

    const hist = [...anteriores.filter((m) => !m.erro), { de: "eu" as const, texto: pergunta }]
      .map((m) => ({ role: m.de === "eu" ? "user" : "assistant", content: m.texto }));
    try {
      const r = await fetch("/api/suporte/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({ messages: hist }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "HTTP " + r.status);
      setProvider(j.provider ?? null);
      setAgenteErro(false);
      const final = String(j.reply || "").trim() || "Não consegui gerar uma resposta.";
      push({ de: "ag", texto: final });
      await escrever(convId, anteriores.length + 1, final.length);
      tocar(OBRIGADO.test(pergunta) ? "coracao" : "feliz");
    } catch (e) {
      setAgenteErro(true);
      push({ de: "ag", texto: "Não consegui falar com o agente. " + (e instanceof Error ? e.message : ""), erro: true });
      setPensando(false);
    }
  }, [texto, pensando, escrevendo, atual, acordar, tocar, escrever]);

  const lerArquivo = (f?: File | null) => {
    if (!f || !f.type.startsWith("image/")) return;
    const r = new FileReader();
    r.onload = () => { setImagem(String(r.result)); setFundo("imagem"); };
    r.readAsDataURL(f);
  };

  const tecla = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); }
  };

  // Valores derivados
  const temaAtivo: Tema = tema ?? (resolvedTheme === "dark" ? "escuro" : "claro");
  const conv = conversas.find((c) => c.id === atual);
  const msgs = conv ? conv.msgs : [];
  const hora = new Date().getHours();
  const nome = (currentUser?.name || "").split(" ")[0];
  const saudacao = (hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite") + (nome ? ", " + nome : "");
  const fundoAtual = FUNDOS.find((f) => f.id === fundo) || FUNDOS[1];
  const temImagem = fundo === "imagem" && !!imagem;
  const imgCss = imagem ? `url("${imagem}")` : "var(--sk)";
  const vidro = temImagem && desfoque;
  const podeEnviar = !!texto.trim() && !pensando && !escrevendo;
  const agenteNome = provider === "hermes" ? "Kevin · Hermes" : provider === "groq" ? "Kevin · Groq" : "Kevin";
  const agenteStatus = agenteErro ? "Sem resposta do agente" : provider === "hermes" ? "Conectado ao Hermes" : provider === "groq" ? "Conectado ao Groq" : "Verificando conexão…";
  const statusCor = agenteErro ? "#b7791f" : provider ? "var(--ok)" : "var(--bd)";

  const vars = {
    "--fundo": temImagem ? imgCss : (fundoAtual.css || FUNDOS[1].css),
    "--veu": `${VEUS[veu][1]}%`,
    "--blur": vidro ? "blur(22px) saturate(1.2)" : "none",
    "--vidro-lateral": temImagem ? `color-mix(in oklab, var(--rs) ${desfoque ? 62 : 90}%, transparent)` : "color-mix(in oklab, var(--rs) 55%, transparent)",
    "--vidro-principal": temImagem ? `color-mix(in oklab, var(--cv) ${desfoque ? 55 : 88}%, transparent)` : "color-mix(in oklab, var(--rs) 35%, transparent)",
    "--envio": podeEnviar ? "var(--co)" : "var(--is)",
    "--status": statusCor,
  } as CSSProperties;

  const kevinGrande = (
    <span className={styles.kevin} onMouseEnter={kevin.oi} onClick={kevin.pula} title="Kevin">
      <KevinSvg px={2.4} pose={kevin.pose} />
    </span>
  );
  const kevinMini = (
    <span className={styles.avatar}>
      <KevinSvg px={1.15} folga={0} pose={{ olhos: kevin.piscar ? "fechados" : pensando ? "cima" : "abertos" }} />
    </span>
  );
  const botaoEnviar = (
    <button type="button" className={styles.enviar} onClick={() => enviar()} title="Enviar" aria-label="Enviar">
      <ArrowUp size={16} />
    </button>
  );
  const escolher = (on: boolean) => (on ? "true" : "false");

  return (
    <div id="suporte-ai" className={styles.root} data-tema={temaAtivo} style={vars}>
      <div className={styles.fundo} />
      {temImagem && <div className={styles.veu} />}

      <div className={styles.quadro}>
        {lateralAberta && <div className={styles.lateralScrim} onClick={() => setLateralAberta(false)} />}
        <aside className={styles.lateral} data-aberta={lateralAberta}>
          <div className={styles.marca}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={temaAtivo === "escuro" ? "/logo-horizontal-branca.png" : "/logo-horizontal-preta.png"} alt="pratic." />
            <span>Suporte</span>
            <button type="button" className={styles.fecharLateral} onClick={() => setLateralAberta(false)} aria-label="Fechar conversas"><X size={16} /></button>
          </div>
          <button type="button" className={styles.novaConversa} onClick={() => { setAtual(null); setTexto(""); setLateralAberta(false); }}>
            <SquarePen size={15} />Nova conversa
          </button>
          <div className={styles.historico}>
            <span className={styles.rotulo}>Conversas</span>
            {conversas.map((c) => (
              <div key={c.id} className={styles.itemHistorico} data-on={c.id === atual} onClick={() => { setAtual(c.id); setLateralAberta(false); }}>
                <span>{c.titulo}</span>
              </div>
            ))}
          </div>
          <div className={styles.agente}>
            <span className={styles.statusPonto} />
            <div>
              <span className={styles.agenteNome}>{agenteNome}</span>
              <span className={styles.agenteStatus}>{agenteStatus}</span>
            </div>
          </div>
        </aside>

        <main className={styles.principal}>
          <div className={styles.topo}>
            <button type="button" className={styles.abrirLateral} onClick={() => setLateralAberta(true)} aria-label="Conversas"><Menu size={16} /></button>
            <span className={styles.tituloAtual}>{conv ? conv.titulo : "Nova conversa"}</span>
            <button type="button" className={styles.botaoAparencia} onClick={() => setAparencia(true)}>
              <Palette size={15} />Aparência
            </button>
          </div>

          {msgs.length === 0 ? (
            <div className={styles.vazio}>
              <div className={styles.vazioConteudo}>
                <div className={styles.saudacao}>
                  <h1>{saudacao}</h1>
                  <p>Sou o Kevin. Em que posso ajudar o time hoje?</p>
                </div>
                <div className={styles.composerGrande}>
                  {kevinGrande}
                  <textarea value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={tecla} rows={2} placeholder="Pergunte ao Kevin sobre processos, clientes ou demandas…" />
                  <div className={styles.composerRodape}>
                    <span className={styles.chipAgente}><span className={styles.statusPonto} />{agenteNome}</span>
                    <span className={styles.anexar} title="Anexar"><Paperclip size={16} /></span>
                    {botaoEnviar}
                  </div>
                </div>
                <div className={styles.sugestoes}>
                  {SUGESTOES.map((t) => (
                    <button type="button" key={t} onClick={() => enviar(t)}>{t}</button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              <div ref={listaRef} className={styles.lista}>
                <div className={styles.listaConteudo}>
                  {msgs.map((m, i) => {
                    const corte = escrevendo && escrevendo.id === atual && escrevendo.idx === i ? m.texto.slice(0, escrevendo.n) : m.texto;
                    return (
                      <div key={i} className={styles.linha} data-lado={m.de === "eu" ? "eu" : "ag"}>
                        {m.de === "eu" ? (
                          <div className={styles.bolha}>{corte}</div>
                        ) : (
                          <div className={styles.resposta}>
                            {kevinMini}
                            <div className={styles.respostaTexto} data-erro={!!m.erro}>{corte}</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {pensando && (
                    <div className={styles.pensando}>
                      {kevinMini}
                      <span>Kevin está pensando</span>
                      <span className={styles.pontos}><i /><i /><i /></span>
                    </div>
                  )}
                </div>
              </div>
              <div className={styles.rodape}>
                <div className={styles.rodapeConteudo}>
                  <div className={styles.composer}>
                    {kevinGrande}
                    <textarea value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={tecla} rows={1} placeholder="Responder…" />
                    {botaoEnviar}
                  </div>
                  <span className={styles.aviso}>O Kevin pode errar. Confira prazos e dados de clientes antes de repassar.</span>
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {aparencia && (
        <div className={styles.overlay} onClick={() => setAparencia(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Aparência">
            <div className={styles.modalTopo}>
              <span>Aparência</span>
              <button type="button" onClick={() => setAparencia(false)} aria-label="Fechar"><X size={16} /></button>
            </div>
            <div className={styles.modalCorpo}>
              <div className={styles.campo}>
                <span>Tema</span>
                <span className={styles.seg}>
                  {([["Claro", "claro"], ["Escuro", "escuro"]] as const).map(([label, v]) => (
                    <button type="button" key={v} data-on={escolher(temaAtivo === v)} onClick={() => setTema(v)}>{label}</button>
                  ))}
                </span>
              </div>
              <div className={styles.fundos}>
                <span>Fundo</span>
                <div className={styles.fundosGrade}>
                  {FUNDOS.map((f) => (
                    <button type="button" key={f.id} className={styles.fundoOpcao} data-on={escolher(fundo === f.id)} onClick={() => setFundo(f.id)}>
                      <span style={{ background: f.css || imgCss, backgroundSize: "cover", backgroundPosition: "center" }} />
                      <span>{f.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <label className={styles.upload} onDragOver={(e: DragEvent) => e.preventDefault()} onDrop={(e: DragEvent) => { e.preventDefault(); lerArquivo(e.dataTransfer.files?.[0]); }}>
                <span className={styles.miniatura} style={{ background: imgCss, backgroundSize: "cover", backgroundPosition: "center" }} />
                <span className={styles.uploadTexto}>
                  <span>Sua imagem</span>
                  <span>Arraste ou clique · 2560 × 1440 px</span>
                </span>
                <input type="file" accept="image/*" onChange={(e) => lerArquivo(e.target.files?.[0])} hidden />
              </label>
              {temImagem && (
                <div className={styles.ajustesImagem}>
                  <div className={styles.campo}>
                    <span>Véu sobre a imagem</span>
                    <span className={styles.seg}>
                      {VEUS.map(([label], i) => (
                        <button type="button" key={label} data-on={escolher(veu === i)} onClick={() => setVeu(i)}>{label}</button>
                      ))}
                    </span>
                  </div>
                  <button type="button" className={styles.toggleLinha} onClick={() => setDesfoque((d) => !d)} aria-pressed={desfoque}>
                    <span className={styles.uploadTexto}>
                      <span>Painéis translúcidos</span>
                      <span>Desfoca a imagem atrás da conversa</span>
                    </span>
                    <span className={styles.toggle} data-on={escolher(desfoque)}><span /></span>
                  </button>
                </div>
              )}
            </div>
            <div className={styles.modalRodape}>
              <button type="button" onClick={() => setAparencia(false)}>Pronto</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
