"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { CalendarRange, ChevronLeft, Lightbulb, PenLine, Trash2, Trophy, Clapperboard, Plus, Link2, Printer, Loader2 } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { useToast } from "@/components/CustomToast";
import { useAuth } from "@/hooks/useAuth";
import { formatMonthRef } from "@/lib/contentSchedule";
import { getContentType } from "@/lib/contentTypes";
import { convertTipTapToHtml } from "@/lib/tiptapToHtml";
import {
  deleteContentPlan,
  fetchContentPlan,
  fetchPlanDemands,
  updateContentPlan,
  fetchPlanScriptNotes,
  createScriptNoteForPlan,
  unlinkNoteFromPlan,
} from "@/lib/contentPlans";
import { useDemandas } from "@/components/demandas/DemandasProvider";
import DemandModal from "@/components/demandas/DemandModal";
import PlanItemRow from "./PlanItemRow";
import PlanScriptRow from "./PlanScriptRow";
import ScriptNoteDrawer from "./ScriptNoteDrawer";
import LinkExistingNoteModal from "./LinkExistingNoteModal";
import DeletePlanDialog from "./DeletePlanDialog";
import BatchActionsBar from "@/components/demandas/BatchActionsBar";
import MentionTextarea from "@/components/demandas/MentionTextarea";
import type { QuickCatalogs } from "@/lib/quickParse";
import {
  channelColor,
  channelLabel,
  CONTENT_PLAN_STATUS_LABELS,
  type ContentPlan,
} from "@/types/cronogramas";
import { clientLabel, type Demand } from "@/types/demandas";
import type { Note } from "@/types/database";

const BlockEditor = dynamic(() => import("@/components/notas/BlockEditor"), {
  ssr: false,
  loading: () => (
    <div style={{ padding: 14, color: "var(--text-tertiary)", fontSize: "0.84rem" }}>
      Carregando editor…
    </div>
  ),
});

const SAVE_DELAY = 900;

const WEEKDAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function hexToRgba(hex?: string | null, alpha = 1): string {
  if (!hex) return "transparent";
  let c = hex.replace("#", "").trim();
  if (c.length === 3) {
    c = c.split("").map((x) => x + x).join("");
  }
  if (c.length === 6) {
    const num = parseInt(c, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return hex;
}

function formatPdfDate(dateStr?: string | null, timeStr?: string | null): string {
  if (!dateStr) return 'Sem data';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    const dayOfWeek = WEEKDAY_NAMES[date.getDay()];
    const timePart = timeStr ? ` às ${timeStr.slice(0, 5)}` : '';
    return `${d}/${m}/${y} (${dayOfWeek})${timePart}`;
  }
  return dateStr;
}

export default function ContentPlanView({ planId }: { planId: string }) {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const { getClient, getStatus, demands: allDemands, users, clients } = useDemandas();

  const [plan, setPlan] = useState<ContentPlan | null>(null);
  const [planDemands, setPlanDemands] = useState<Demand[]>([]);
  const [scriptNotes, setScriptNotes] = useState<Note[]>([]);
  const [activeScriptId, setActiveScriptId] = useState<string | null>(null);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [creatingScript, setCreatingScript] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);

  const load = useCallback(async () => {
    try {
      const [planRow, demandRows, scriptRows] = await Promise.all([
        fetchContentPlan(planId),
        fetchPlanDemands(planId),
        fetchPlanScriptNotes(planId),
      ]);
      setPlan(planRow);
      setPlanDemands(demandRows);
      setScriptNotes(scriptRows);
    } catch (err) {
      showToast("Erro ao carregar cronograma: " + ((err as Error)?.message ?? ""), "error");
    } finally {
      setLoading(false);
    }
  }, [planId, showToast]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchContentPlan(planId),
      fetchPlanDemands(planId),
      fetchPlanScriptNotes(planId),
    ])
      .then(([planRow, demandRows, scriptRows]) => {
        if (!cancelled) {
          setPlan(planRow);
          setPlanDemands(demandRows);
          setScriptNotes(scriptRows);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        showToast("Erro ao carregar cronograma: " + ((err as Error)?.message ?? ""), "error");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [planId, showToast]);

  const handleCreateScript = async () => {
    if (!plan || !currentUser) return;
    setCreatingScript(true);
    try {
      const newScript = await createScriptNoteForPlan({
        planId: plan.id,
        clientId: plan.client_id,
        userId: currentUser.id,
        title: `Roteiro — ${plan.title}`,
      });
      setScriptNotes((prev) => [newScript, ...prev]);
      setActiveScriptId(newScript.id);
      showToast("Novo roteiro criado!", "success");
    } catch (err: any) {
      showToast("Erro ao criar roteiro: " + (err?.message || ""), "error");
    } finally {
      setCreatingScript(false);
    }
  };

  const handleUnlinkScript = async (noteId: string) => {
    try {
      await unlinkNoteFromPlan(noteId);
      setScriptNotes((prev) => prev.filter((n) => n.id !== noteId));
      showToast("Roteiro desvinculado do cronograma.", "success");
    } catch (err: any) {
      showToast("Erro ao desvincular: " + (err?.message || ""), "error");
    }
  };

  const getUserName = (userId: string) => {
    const u = users.find((user) => user.id === userId);
    return u?.name || u?.email?.split("@")[0] || "Equipe";
  };

  const handleExportPdf = async () => {
    if (!plan) return;
    const staging = document.getElementById("cronograma-staging") as HTMLElement | null;
    const output = document.getElementById("cronograma-pages-output") as HTMLElement | null;
    if (!staging || !output) return;

    setExporting(true);

    // Torna o staging mensurável fora da tela
    staging.style.display = "block";
    staging.style.position = "fixed";
    staging.style.left = "-99999px";
    staging.style.top = "0";
    staging.style.width = "794px";
    staging.style.zIndex = "-1";

    output.innerHTML = "";
    output.style.display = "block";
    output.style.position = "fixed";
    output.style.left = "-99999px";
    output.style.top = "0";
    output.style.width = "794px";
    output.style.zIndex = "-1";

    try {
      const blocks = Array.from(staging.querySelectorAll<HTMLElement>(".pdf-render-block"));

      // Limites de altura útil de conteúdo por página em pixels
      const PAGE1_MAX_HEIGHT = 770; // Página 1 possui cabeçalho expandido e metadados
      const SUBSEQUENT_PAGE_MAX_HEIGHT = 900; // Página 2+ possui cabeçalho contínuo compacto

      const pagesBlocks: HTMLElement[][] = [[]];
      let currentPageIndex = 0;
      let currentHeight = 0;

      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        const blockHeight = block.offsetHeight + 8; // altura + margem de espaçamento
        const maxH = currentPageIndex === 0 ? PAGE1_MAX_HEIGHT : SUBSEQUENT_PAGE_MAX_HEIGHT;

        if (currentHeight + blockHeight > maxH && pagesBlocks[currentPageIndex].length > 0) {
          // Se o último item da página atual foi um título de seção, move-o para a próxima página para evitar títulos órfãos
          const lastItem = pagesBlocks[currentPageIndex][pagesBlocks[currentPageIndex].length - 1];
          if (lastItem && lastItem.dataset.isHeader === "true") {
            pagesBlocks[currentPageIndex].pop();
            currentPageIndex++;
            pagesBlocks[currentPageIndex] = [lastItem, block];
            currentHeight = (lastItem.offsetHeight + 8) + blockHeight;
          } else {
            currentPageIndex++;
            pagesBlocks[currentPageIndex] = [block];
            currentHeight = blockHeight;
          }
        } else {
          pagesBlocks[currentPageIndex].push(block);
          currentHeight += blockHeight;
        }
      }

      const totalPages = pagesBlocks.length;
      const clientObj = getClient(plan.client_id);
      const clientName = clientObj ? (clientObj.nome_fantasia || clientObj.name) : "";
      const monthFormatted = formatMonthRef(plan.month_ref);
      const now = new Date();
      const exportedAt = `${now.toLocaleDateString("pt-BR")} às ${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;

      // Monta o DOM de cada página
      for (let p = 0; p < totalPages; p++) {
        const isFirstPage = p === 0;
        const pageEl = document.createElement("div");
        pageEl.className = "cronograma-pdf-page";
        pageEl.style.cssText = [
          "width: 794px",
          "height: 1123px",
          "max-height: 1123px",
          "box-sizing: border-box",
          "background: #ffffff",
          "font-family: 'Helvetica Neue', Arial, sans-serif",
          "color: #1a1a1a",
          "display: flex",
          "flex-direction: column",
          "justify-content: space-between",
          "position: relative",
          "overflow: hidden",
          "margin-bottom: 20px",
        ].join(";");

        let headerHtml = "";
        if (isFirstPage) {
          headerHtml = `
            <div>
              <div style="padding: 16pt 22mm 10pt; display: flex; align-items: center; justify-content: space-between;">
                <img src="/logo-horizontal-preta.png" alt="Pratic System" style="height: 16pt; width: auto; object-fit: contain;" />
                <div style="text-align: right;">
                  <div style="font-size: 6.5pt; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase; color: #d9480f;">
                    Cronograma de Conteúdo
                  </div>
                  <div style="font-size: 8.5pt; color: #888; margin-top: 2pt;">
                    ${monthFormatted}
                  </div>
                </div>
              </div>
              <div style="padding: 0 22mm;">
                <div style="height: 1.5px; background: linear-gradient(90deg, #d9480f 0%, #f76b35 60%, rgba(247, 107, 53, 0) 100%); border-radius: 1px;"></div>
              </div>
              <div style="padding: 14pt 22mm 0;">
                <h1 style="font-size: 22pt; font-weight: 800; color: #111; margin: 0; line-height: 1.2; letter-spacing: -0.03em;">
                  ${plan.title || "Cronograma"}
                </h1>
              </div>
              <div style="padding: 8pt 22mm 0;">
                <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 5pt;">
                  ${clientObj ? `
                    <div style="display: inline-flex; align-items: center; gap: 4pt; background: #fff3ef; border: 0.75px solid #ffd4be; border-radius: 4px; padding: 3px 8px;">
                      <span style="font-size: 6pt; font-weight: 800; color: #d9480f; text-transform: uppercase; letter-spacing: 0.1em;">Cliente</span>
                      <span style="font-size: 8pt; color: #333; font-weight: 600;">${clientName}</span>
                    </div>
                  ` : ""}
                  <div style="display: inline-flex; align-items: center; background: #f4f4f4; border: 0.75px solid #e4e4e4; border-radius: 4px; padding: 3px 8px; font-size: 7.5pt; color: #555;">
                    <span style="font-weight: 600;">Mês:</span>&nbsp;${monthFormatted}
                  </div>
                  <div style="display: inline-flex; align-items: center; background: #f4f4f4; border: 0.75px solid #e4e4e4; border-radius: 4px; padding: 3px 8px; font-size: 7.5pt; color: #555;">
                    <span style="font-weight: 600;">Status:</span>&nbsp;${CONTENT_PLAN_STATUS_LABELS[plan.status]}
                  </div>
                  ${plan.channels.map((c) => `
                    <div style="display: inline-flex; align-items: center; background: ${hexToRgba(channelColor(c), 0.12)}; border: 0.75px solid ${hexToRgba(channelColor(c), 0.35)}; border-radius: 4px; padding: 3px 8px; font-size: 7.5pt; font-weight: 700; color: ${channelColor(c)};">
                      ${channelLabel(c)}
                    </div>
                  `).join("")}
                  <div style="display: inline-flex; align-items: center; background: #fbfbfb; border: 0.75px solid #ececec; border-radius: 4px; padding: 3px 8px; font-size: 7.5pt; color: #777;">
                    ${posts.length} conteúdos · ${donePosts} publicados${captures.length ? ` · ${captures.length} captações` : ""}${scriptNotes.length ? ` · ${scriptNotes.length} roteiros` : ""}
                  </div>
                </div>
              </div>
              <div style="margin: 10pt 22mm 10pt; height: 0.5px; background: #eaeaea;"></div>
            </div>
          `;
        } else {
          headerHtml = `
            <div style="padding: 14pt 22mm 8pt;">
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 8pt;">
                  <img src="/logo-horizontal-preta.png" alt="Pratic System" style="height: 13pt; width: auto; object-fit: contain;" />
                  <span style="font-size: 8pt; color: #ccc;">|</span>
                  <span style="font-size: 8.5pt; font-weight: 700; color: #333;">
                    ${plan.title || "Cronograma"} ${clientName ? `— ${clientName}` : ""}
                  </span>
                </div>
                <div style="text-align: right;">
                  <span style="font-size: 6.5pt; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: #d9480f;">
                    Cronograma de Conteúdo
                  </span>
                  <span style="font-size: 7.5pt; color: #888; margin-left: 6pt;">
                    · ${monthFormatted}
                  </span>
                </div>
              </div>
              <div style="height: 1px; background: linear-gradient(90deg, #d9480f 0%, #f76b35 60%, rgba(247, 107, 53, 0) 100%); margin-top: 6pt; border-radius: 1px;"></div>
            </div>
          `;
        }

        const footerHtml = `
          <div style="margin: 6pt 22mm 14pt; padding: 6pt 0 0; border-top: 0.5px solid #e8e8e8; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0;">
            <span style="font-size: 7pt; color: #aaa;">
              Exportado em ${exportedAt} · Pratic System
            </span>
            <span style="font-size: 7.5pt; font-weight: 600; color: #888;">
              Página ${p + 1} de ${totalPages}
            </span>
            <img src="/logo-horizontal-preta.png" alt="Pratic System" style="height: 8pt; width: auto; object-fit: contain; opacity: 0.2;" />
          </div>
        `;

        const topSection = document.createElement("div");
        topSection.style.cssText = "display: flex; flex-direction: column; flex: 1;";
        topSection.innerHTML = headerHtml;

        const bodyContainer = document.createElement("div");
        bodyContainer.style.cssText = "padding: 2pt 22mm 0; flex: 1; display: flex; flex-direction: column; gap: 6pt; font-size: 9.5pt; line-height: 1.6;";

        pagesBlocks[p].forEach((b) => {
          bodyContainer.appendChild(b.cloneNode(true));
        });

        topSection.appendChild(bodyContainer);
        pageEl.appendChild(topSection);

        const footerWrapper = document.createElement("div");
        footerWrapper.innerHTML = footerHtml;
        pageEl.appendChild(footerWrapper.firstElementChild || footerWrapper);

        output.appendChild(pageEl);
      }

      // Renderiza cada página com html2canvas e anexa ao jsPDF
      const { default: html2canvas } = await import("html2canvas");
      const { default: jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      const pageEls = Array.from(output.querySelectorAll<HTMLElement>(".cronograma-pdf-page"));

      for (let i = 0; i < pageEls.length; i++) {
        const pageEl = pageEls[i];
        const canvas = await html2canvas(pageEl, {
          scale: 3,
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
          width: 794,
          height: 1123,
          windowWidth: 794,
          windowHeight: 1123,
        });

        if (i > 0) {
          pdf.addPage("a4", "portrait");
        }

        const imgData = canvas.toDataURL("image/jpeg", 0.88);
        pdf.addImage(imgData, "JPEG", 0, 0, 210, 297);

        // Adiciona links clicáveis da página atual
        const linkElements = pageEl.querySelectorAll("a");
        const scaleFactor = 210 / 794;
        const pageRect = pageEl.getBoundingClientRect();

        linkElements.forEach((aEl) => {
          const href = aEl.getAttribute("href");
          if (!href || href === "#") return;

          const aRect = aEl.getBoundingClientRect();
          const x = (aRect.left - pageRect.left) * scaleFactor;
          const y = (aRect.top - pageRect.top) * scaleFactor;
          const w = aRect.width * scaleFactor;
          const h = aRect.height * scaleFactor;

          pdf.setPage(i + 1);
          pdf.link(x, y, w, h, { url: href });
        });
      }

      const safeClient = clientName ? `${clientName.replace(/[/\\?%*:|"<>]/g, "-").trim()} - ` : "";
      const safeTitle = (plan.title || "Cronograma").replace(/[/\\?%*:|"<>]/g, "-").trim();
      const safeMonth = monthFormatted.replace(/[/\\?%*:|"<>]/g, "-").trim();

      pdf.save(`${safeClient}${safeTitle} · ${safeMonth}.pdf`);
      showToast("PDF exportado com sucesso!", "success");
    } catch (err) {
      console.error("PDF export error:", err);
      showToast("Erro ao exportar PDF: " + ((err as Error)?.message ?? ""), "error");
    } finally {
      staging.style.display = "none";
      output.style.display = "none";
      setExporting(false);
    }
  };

  /**
   * As linhas vêm do provider de demandas quando ele já as tem em memória —
   * assim marcar uma etapa concluída no modal reflete aqui na hora, em vez de
   * esperar um recarregamento da página.
   */
  const rows = useMemo(() => {
    const live = new Map(allDemands.map((demand) => [demand.id, demand]));
    return planDemands.map((demand) => live.get(demand.id) ?? demand);
  }, [planDemands, allDemands]);

  const posts = rows.filter(
    (demand) => demand.plan_role !== "captacao" && demand.plan_role !== "roteiro",
  );
  // Roteiro e captação na mesma seção: `position` já os intercala aos pares
  // na geração, então o roteiro cai logo acima da captação que ele serve.
  const producao = rows
    .filter((demand) => demand.plan_role === "captacao" || demand.plan_role === "roteiro")
    .sort((a, b) => a.position - b.position);
  const captures = producao.filter((demand) => demand.plan_role === "captacao");
  const donePosts = posts.filter((demand) => demand.status_category === "fechado").length;

  const catalogs = useMemo<QuickCatalogs>(
    () => ({
      users: users.map((user) => ({ id: user.id, label: user.name || user.email })),
      clients: clients.map((item) => ({
        id: item.id,
        label: clientLabel(item),
        alias: item.name,
      })),
    }),
    [users, clients],
  );

  /** Seleção com shift/meta-click, mesmo gesto da lista de Demandas. */
  const toggleSelection = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const commitTitle = () => {
    setEditingTitle(false);
    const trimmed = titleDraft.trim();
    if (!plan || !trimmed || trimmed === plan.title) return;
    setPlan({ ...plan, title: trimmed });
    updateContentPlan(plan.id, { title: trimmed }).catch((err) =>
      showToast("Erro ao renomear: " + ((err as Error)?.message ?? ""), "error"),
    );
  };

  const confirmDelete = async (deleteDemands: boolean) => {
    if (!plan) return;
    setDeleteOpen(false);
    try {
      await deleteContentPlan(plan.id, { deleteDemands });
      showToast(
        deleteDemands ? "Cronograma e demandas excluídos." : "Cronograma excluído.",
        "success",
      );
      window.location.href = "/admin/cronogramas";
    } catch (err) {
      showToast("Erro ao excluir: " + ((err as Error)?.message ?? ""), "error");
    }
  };

  const saveField = (field: "description" | "results", content: unknown) => {
    if (!plan) return;
    window.clearTimeout(timers[field]);
    timers[field] = window.setTimeout(() => {
      updateContentPlan(plan.id, { [field]: content } as Partial<ContentPlan>).catch((err) =>
        showToast("Erro ao salvar: " + ((err as Error)?.message ?? ""), "error"),
      );
    }, SAVE_DELAY);
  };

  if (loading) {
    return (
      <div className="glass-card" style={{ padding: 40, textAlign: "center", color: "var(--text-tertiary)" }}>
        Carregando cronograma…
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="glass-card" style={{ padding: 32, textAlign: "center", color: "var(--text-tertiary)" }}>
        Cronograma não encontrado.{" "}
        <Link href="/admin/cronogramas" style={{ color: "var(--accent)" }}>
          Voltar
        </Link>
      </div>
    );
  }

  const client = getClient(plan.client_id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{ display: "flex", flexDirection: "column", gap: 20 }}
    >
      <Link
        href="/admin/cronogramas"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontSize: "0.78rem",
          fontWeight: 600,
          color: "var(--text-tertiary)",
          textDecoration: "none",
        }}
      >
        <ChevronLeft size={14} /> Cronogramas
      </Link>

      <PageHeader
        eyebrow={client ? clientLabel(client) : "Cronograma"}
        title={
          editingTitle ? (
            <MentionTextarea
              value={titleDraft}
              onChange={setTitleDraft}
              catalogs={catalogs}
              rows={1}
              onSubmit={commitTitle}
              ariaLabel="Nome do cronograma"
              placeholder="Nome do cronograma…"
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setTitleDraft(plan.title);
                setEditingTitle(true);
              }}
              title="Clique para renomear"
              style={{
                padding: "2px 6px",
                marginLeft: -6,
                border: "1px solid transparent",
                borderRadius: "var(--radius-sm)",
                background: "transparent",
                cursor: "text",
                font: "inherit",
                color: "inherit",
                textAlign: "left",
              }}
            >
              {plan.title}
            </button>
          )
        }
        subtitle={`${formatMonthRef(plan.month_ref)} · ${posts.length} conteúdos · ${donePosts} publicados${
          captures.length ? ` · ${captures.length} captações` : ""
        }`}
        actions={
          <>
            <span
              style={{
                padding: "5px 12px",
                borderRadius: "var(--radius-md)",
                fontSize: "0.74rem",
                fontWeight: 800,
                color: "var(--text-secondary)",
                background: "var(--color-surface-sunken)",
                border: "1px solid var(--border)",
              }}
            >
              {CONTENT_PLAN_STATUS_LABELS[plan.status]}
            </span>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleExportPdf}
              disabled={exporting}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
              title="Exportar cronograma em PDF"
            >
              {exporting ? (
                <>
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                    <Loader2 size={14} />
                  </motion.div>
                  <span>Exportando…</span>
                </>
              ) : (
                <>
                  <Printer size={14} />
                  <span>PDF</span>
                </>
              )}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setDeleteOpen(true)}
              title="Excluir cronograma"
            >
              <Trash2 size={15} /> Excluir
            </button>
          </>
        }
      />

      {/* Canais do plano */}
      {plan.channels.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {plan.channels.map((channel) => (
            <span
              key={channel}
              style={{
                padding: "2px 9px",
                borderRadius: "var(--radius-badge)",
                fontSize: "0.7rem",
                fontWeight: 700,
                color: channelColor(channel),
                background: `color-mix(in oklab, ${channelColor(channel)} 14%, transparent)`,
                border: `1px solid color-mix(in oklab, ${channelColor(channel)} 32%, transparent)`,
              }}
            >
              {channelLabel(channel)}
            </span>
          ))}
        </div>
      )}

      <Section title="Planejamento" icon={<Lightbulb size={14} />}>
        <div style={editorBoxStyle}>
          <BlockEditor
            key={`desc-${plan.id}`}
            content={plan.description ?? undefined}
            bucket="demand-attachments"
            placeholder="Ideias, estratégia, referências e observações do mês…"
            onChange={(content) => saveField("description", content)}
          />
        </div>
      </Section>

      {/* Seção de Roteiros (Notas) */}
      <Section
        title="Roteiros (Notas)"
        icon={<Clapperboard size={14} />}
        count={scriptNotes.length}
        action={
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setLinkModalOpen(true)}
              style={{ fontSize: "0.72rem", padding: "4px 10px", display: "flex", alignItems: "center", gap: 5 }}
              title="Vincular uma nota existente a este cronograma"
            >
              <Link2 size={13} /> Vincular Nota
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleCreateScript}
              disabled={creatingScript}
              style={{ fontSize: "0.72rem", padding: "4px 10px", display: "flex", alignItems: "center", gap: 5 }}
              title="Criar uma nova nota de roteiro"
            >
              <Plus size={13} /> Novo Roteiro
            </button>
          </div>
        }
      >
        {scriptNotes.length === 0 ? (
          <Empty>
            Nenhum roteiro em nota vinculado a este cronograma. Clique em "+ Novo Roteiro" ou "Vincular Nota".
          </Empty>
        ) : (
          scriptNotes.map((note) => (
            <PlanScriptRow
              key={note.id}
              note={note}
              onOpen={setActiveScriptId}
              onUnlink={handleUnlinkScript}
            />
          ))
        )}
      </Section>

      {producao.length > 0 && (
        <Section
          title="Demandas de Captação e Tarefas"
          icon={<PenLine size={14} />}
          count={producao.length}
        >
          {producao.map((demand) => (
            <PlanItemRow
              key={demand.id}
              demand={demand}
              onOpen={setSelectedId}
              selected={selectedIds.has(demand.id)}
              onSelect={toggleSelection}
            />
          ))}
        </Section>
      )}

      <Section title="Conteúdos" icon={<CalendarRange size={14} />} count={posts.length}>
        {posts.length === 0 ? (
          <Empty>Nenhum conteúdo neste cronograma.</Empty>
        ) : (
          posts.map((demand) => (
            <PlanItemRow
              key={demand.id}
              demand={demand}
              onOpen={setSelectedId}
              selected={selectedIds.has(demand.id)}
              onSelect={toggleSelection}
            />
          ))
        )}
      </Section>

      <Section title="Resultados" icon={<Trophy size={14} />}>
        <div style={editorBoxStyle}>
          <BlockEditor
            key={`res-${plan.id}`}
            content={plan.results ?? undefined}
            bucket="demand-attachments"
            placeholder="Métricas, prints, aprendizados do período…"
            onChange={(content) => saveField("results", content)}
          />
        </div>
      </Section>

      <DemandModal
        demandId={selectedId}
        onClose={() => {
          setSelectedId(null);
          load();
        }}
      />

      {/* Drawer de Edição Rápida de Roteiro */}
      <ScriptNoteDrawer
        noteId={activeScriptId}
        onClose={() => setActiveScriptId(null)}
        onUpdated={() => {
          fetchPlanScriptNotes(plan.id).then(setScriptNotes);
        }}
        onUnlinked={() => {
          fetchPlanScriptNotes(plan.id).then(setScriptNotes);
        }}
      />

      {/* Modal para Vincular Notas Existentes */}
      <LinkExistingNoteModal
        isOpen={linkModalOpen}
        planId={plan.id}
        clientId={plan.client_id}
        onClose={() => setLinkModalOpen(false)}
        onSuccess={() => {
          fetchPlanScriptNotes(plan.id).then(setScriptNotes);
        }}
      />

      {/* A mesma barra das Demandas: status, prazo, prioridade, concluir, excluir */}
      <BatchActionsBar
        selectedIds={selectedIds}
        onClearSelection={() => setSelectedIds(new Set())}
        onSelectAll={() => setSelectedIds(new Set(rows.map((demand) => demand.id)))}
        totalVisible={rows.length}
      />

      <DeletePlanDialog
        isOpen={deleteOpen}
        planId={plan.id}
        planTitle={plan.title}
        onClose={() => setDeleteOpen(false)}
        onConfirm={confirmDelete}
      />

      {/* ── Overlay de Impressão e Exportação em PDF ── */}
      <style>{`
        #cronograma-staging a, #cronograma-pages-output a {
          color: #d9480f !important;
          text-decoration: underline !important;
        }
        @media print {
          body > * { visibility: hidden !important; }
          #cronograma-pages-output, #cronograma-pages-output * { visibility: visible !important; }
          #cronograma-pages-output {
            display: block !important; position: fixed !important;
            inset: 0 !important; background: #fff !important;
            padding: 0 !important; margin: 0 !important; z-index: 99999;
          }
          @page { size: A4 portrait; margin: 0; }
        }
      `}</style>

      {/* Staging oculto para medição e particionamento dinâmico sem quebras bruscas */}
      <div id="cronograma-staging" style={{ display: "none" }}>
        <div style={{ width: "794px", boxSizing: "border-box", padding: "0 22mm", fontFamily: '"Helvetica Neue", Arial, sans-serif' }}>
          
          {/* SEÇÃO 1: Planejamento */}
          {Boolean(plan.description) && (
            <div className="pdf-render-block" data-is-header="false" style={{ marginBottom: "14pt" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6pt", marginBottom: "6pt", borderBottom: "1px solid #f0f0f0", paddingBottom: "3pt" }}>
                <span style={{ fontSize: "7.5pt", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#d9480f" }}>
                  Planejamento & Estratégia
                </span>
              </div>
              <div
                style={{ fontSize: "9pt", color: "#2d2d2d", lineHeight: 1.6 }}
                dangerouslySetInnerHTML={{ __html: convertTipTapToHtml(plan.description) }}
              />
            </div>
          )}

          {/* SEÇÃO 2: Roteiros (Notas) — Traz apenas o nome */}
          {scriptNotes.length > 0 && (
            <div className="pdf-render-block" data-is-header="false" style={{ marginBottom: "14pt" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6pt", marginBottom: "6pt", borderBottom: "1px solid #f0f0f0", paddingBottom: "3pt" }}>
                <span style={{ fontSize: "7.5pt", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#d9480f" }}>
                  Roteiros Vinculados ({scriptNotes.length})
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4pt" }}>
                {scriptNotes.map((note) => (
                  <div
                    key={note.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "5pt 8pt",
                      background: "#fafafa",
                      border: "0.75px solid #eaeaea",
                      borderRadius: "5px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6pt", minWidth: 0, flex: 1 }}>
                      <span style={{ color: "#d9480f", fontSize: "9pt", lineHeight: 1, flexShrink: 0 }}>🎬</span>
                      <span style={{ fontSize: "8.5pt", fontWeight: 600, color: "#222", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {note.title || "Roteiro sem título"}
                      </span>
                    </div>
                    {note.date && (
                      <span style={{ fontSize: "7.5pt", color: "#888", flexShrink: 0, marginLeft: "8pt" }}>
                        {note.date}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SEÇÃO 3: Captação & Tarefas de Produção (se houver) */}
          {producao.length > 0 && (
            <div className="pdf-render-block" data-is-header="false" style={{ marginBottom: "14pt" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6pt", marginBottom: "6pt", borderBottom: "1px solid #f0f0f0", paddingBottom: "3pt" }}>
                <span style={{ fontSize: "7.5pt", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#d9480f" }}>
                  Captação & Tarefas ({producao.length})
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4pt" }}>
                {producao.map((item, idx) => {
                  const statusObj = getStatus(item.status);
                  const isDone = item.status_category === "fechado";
                  return (
                    <div
                      key={item.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "5pt 8pt",
                        background: "#fafafa",
                        border: "0.75px solid #eaeaea",
                        borderRadius: "5px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "6pt", minWidth: 0, flex: 1 }}>
                        <span style={{ fontSize: "7.5pt", fontWeight: 700, color: "#888", width: "16px", textAlign: "center" }}>
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <span style={{ fontSize: "8.5pt", fontWeight: 600, color: isDone ? "#888" : "#222", textDecoration: isDone ? "line-through" : "none" }}>
                          {item.title}
                        </span>
                        <span style={{ fontSize: "6.5pt", fontWeight: 700, padding: "1px 4px", borderRadius: "3px", background: "#f0f0f0", color: "#666" }}>
                          {item.plan_role === "roteiro" ? "Roteiro" : "Captação"}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6pt", flexShrink: 0 }}>
                        <span style={{ fontSize: "7pt", color: "#666" }}>
                          {formatPdfDate(item.due_date, item.due_time)}
                        </span>
                        {statusObj && (
                          <span style={{ fontSize: "6.5pt", fontWeight: 700, padding: "1px 5px", borderRadius: "3px", background: "#f0f0f0", color: statusObj.color || "#555" }}>
                            {statusObj.label}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SEÇÃO 4: Conteúdos Programados */}
          <div className="pdf-render-block" data-is-header="true" style={{ marginBottom: "6pt" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #f0f0f0", paddingBottom: "3pt" }}>
              <span style={{ fontSize: "7.5pt", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#d9480f" }}>
                Conteúdos Programados ({posts.length})
              </span>
              <span style={{ fontSize: "7pt", color: "#888" }}>
                {donePosts} de {posts.length} publicados
              </span>
            </div>
          </div>

          {posts.length === 0 ? (
            <div className="pdf-render-block" data-is-header="false" style={{ fontStyle: "italic", color: "#888", fontSize: "8.5pt", padding: "6pt 0" }}>
              Nenhum conteúdo cadastrado.
            </div>
          ) : (
            posts.map((post, idx) => {
              const contentTypeDef = getContentType(post.content_type);
              const statusObj = getStatus(post.status);
              const isDone = post.status_category === "fechado";
              const assignees = post.assignee_ids?.map(getUserName).join(", ");

              return (
                <div
                  key={post.id}
                  className="pdf-render-block"
                  data-is-header="false"
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8pt",
                    padding: "7pt 9pt",
                    marginBottom: "5pt",
                    background: "#ffffff",
                    border: isDone ? "0.75px solid #e8e8e8" : "0.75px solid #dedede",
                    borderRadius: "6px",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
                    boxSizing: "border-box",
                  }}
                >
                  <div
                    style={{
                      width: "18px",
                      height: "18px",
                      borderRadius: "50%",
                      background: isDone ? "#e9ecef" : "#fff0eb",
                      border: isDone ? "1px solid #dee2e6" : "1px solid #ffd4be",
                      color: isDone ? "#868e96" : "#d9480f",
                      fontSize: "7pt",
                      fontWeight: 800,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginTop: "1px",
                    }}
                  >
                    {String(idx + 1).padStart(2, "0")}
                  </div>

                  <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "3pt" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6pt" }}>
                      <span
                        style={{
                          fontSize: "9pt",
                          fontWeight: 700,
                          color: isDone ? "#777" : "#111",
                          textDecoration: isDone ? "line-through" : "none",
                        }}
                      >
                        {post.title}
                      </span>
                      {statusObj && (
                        <span
                          style={{
                            fontSize: "6.5pt",
                            fontWeight: 700,
                            padding: "1px 5px",
                            borderRadius: "3px",
                            background: "#f4f4f4",
                            color: statusObj.color || "#555",
                            flexShrink: 0,
                          }}
                        >
                          {statusObj.label}
                        </span>
                      )}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "4pt", marginTop: "1pt" }}>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3pt",
                          fontSize: "7pt",
                          fontWeight: 600,
                          color: "#495057",
                          background: "#f8f9fa",
                          border: "0.5px solid #e9ecef",
                          borderRadius: "4px",
                          padding: "2px 5px",
                        }}
                      >
                        <span>📅</span>
                        <span>{formatPdfDate(post.due_date, post.due_time)}</span>
                      </div>

                      {contentTypeDef && (
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "3pt",
                            fontSize: "7pt",
                            fontWeight: 700,
                            color: contentTypeDef.color,
                            background: hexToRgba(contentTypeDef.color, 0.12),
                            border: `0.5px solid ${hexToRgba(contentTypeDef.color, 0.35)}`,
                            borderRadius: "4px",
                            padding: "2px 5px",
                          }}
                        >
                          <span>🎨</span>
                          <span>{contentTypeDef.label}</span>
                        </div>
                      )}

                      {post.type && (
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "3pt",
                            fontSize: "7pt",
                            fontWeight: 600,
                            color: "#555",
                            background: "#f8f9fa",
                            border: "0.5px solid #e9ecef",
                            borderRadius: "4px",
                            padding: "2px 5px",
                          }}
                        >
                          <span>📱</span>
                          <span>{channelLabel(post.type)}</span>
                        </div>
                      )}

                      {assignees && (
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "3pt",
                            fontSize: "7pt",
                            color: "#6c757d",
                            background: "#f8f9fa",
                            border: "0.5px solid #e9ecef",
                            borderRadius: "4px",
                            padding: "2px 5px",
                          }}
                        >
                          <span>👤</span>
                          <span>{assignees}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* SEÇÃO 5: Resultados (se preenchido) */}
          {Boolean(plan.results) && (
            <div className="pdf-render-block" data-is-header="false" style={{ marginTop: "10pt", marginBottom: "14pt" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6pt", marginBottom: "6pt", borderBottom: "1px solid #f0f0f0", paddingBottom: "3pt" }}>
                <span style={{ fontSize: "7.5pt", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#d9480f" }}>
                  Resultados & Métricas
                </span>
              </div>
              <div
                style={{ fontSize: "9pt", color: "#2d2d2d", lineHeight: 1.6 }}
                dangerouslySetInnerHTML={{ __html: convertTipTapToHtml(plan.results) }}
              />
            </div>
          )}

        </div>
      </div>

      {/* Container de saída para as páginas A4 geradas */}
      <div id="cronograma-pages-output" style={{ display: "none" }} />
    </motion.div>
  );
}

/** Timers de autosave por campo — fora do componente, um por montagem basta. */
const timers: Record<string, number> = {};

const editorBoxStyle: React.CSSProperties = {
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "var(--color-surface-sunken)",
  padding: "6px 12px",
};

function Section({
  title,
  icon,
  count,
  action,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  count?: number;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: "0.72rem",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--text-tertiary)",
          }}
        >
          {icon}
          {title}
          {count !== undefined && (
            <span
              style={{
                fontWeight: 700,
                background: "var(--color-surface-sunken)",
                padding: "1px 8px",
                borderRadius: 8,
              }}
            >
              {count}
            </span>
          )}
        </div>
        {action && <div>{action}</div>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontSize: "0.8rem", color: "var(--text-tertiary)", padding: "8px 0" }}>
      {children}
    </span>
  );
}
