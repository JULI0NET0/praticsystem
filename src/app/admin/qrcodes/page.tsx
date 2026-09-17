"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { QrCode, Plus, Copy, Download, Pencil, Trash2, X } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { Field, Input, Select } from "@/components/ui/Field";
import DataTable, { Column } from "@/components/ui/DataTable";
import EmptyState from "@/components/ui/EmptyState";
import { useToast } from "@/components/CustomToast";
import type { Client } from "@/types/database";

interface QrLink {
  id: string;
  slug: string;
  title: string;
  destination_url: string;
  client_id: string | null;
  is_active: boolean;
  click_count: number;
  short_url: string;
  created_at: string;
}

interface FormState {
  id: string | null;
  title: string;
  destination_url: string;
  client_id: string;
}

const EMPTY_FORM: FormState = { id: null, title: "", destination_url: "", client_id: "" };

export default function QrCodesPage() {
  const [links, setLinks] = useState<QrLink[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const { showToast } = useToast();

  useEffect(() => {
    fetchLinks();
    fetchClients();
  }, []);

  async function fetchLinks() {
    try {
      setLoading(true);
      const res = await fetch("/api/qrcodes");
      if (!res.ok) throw new Error(`Erro ao buscar QR Codes: ${res.status}`);
      setLinks(await res.json());
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Erro ao buscar QR Codes.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function fetchClients() {
    try {
      const res = await fetch("/api/clients");
      if (res.ok) setClients(await res.json());
    } catch {
      // lista de clientes é só pra o select — falha aqui não bloqueia a tela
    }
  }

  function openCreateModal() {
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEditModal(link: QrLink) {
    setForm({
      id: link.id,
      title: link.title,
      destination_url: link.destination_url,
      client_id: link.client_id ?? ""
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        destination_url: form.destination_url,
        client_id: form.client_id || null
      };
      const res = await fetch(form.id ? `/api/qrcodes/${form.id}` : "/api/qrcodes", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao salvar QR Code.");

      showToast(form.id ? "QR Code atualizado." : "QR Code criado.", "success");
      setModalOpen(false);
      fetchLinks();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Erro ao salvar QR Code.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(link: QrLink) {
    try {
      const res = await fetch(`/api/qrcodes/${link.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !link.is_active })
      });
      if (!res.ok) throw new Error("Erro ao atualizar status.");
      fetchLinks();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Erro ao atualizar status.", "error");
    }
  }

  async function handleDelete(link: QrLink) {
    if (!confirm(`Excluir o QR Code "${link.title}"? Essa ação não pode ser desfeita.`)) return;
    try {
      const res = await fetch(`/api/qrcodes/${link.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir QR Code.");
      showToast("QR Code excluído.", "success");
      fetchLinks();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Erro ao excluir QR Code.", "error");
    }
  }

  async function copyShortUrl(shortUrl: string) {
    try {
      await navigator.clipboard.writeText(shortUrl);
      showToast("Link copiado.", "success");
    } catch {
      showToast("Não foi possível copiar o link.", "error");
    }
  }

  function clientName(clientId: string | null): string {
    if (!clientId) return "Uso próprio";
    return clients.find((c) => c.id === clientId)?.name ?? "Cliente";
  }

  const columns: Column<QrLink>[] = [
    {
      key: "title",
      header: "Título",
      render: (row) => <span style={{ fontWeight: 600 }}>{row.title}</span>
    },
    { key: "client", header: "Cliente", render: (row) => clientName(row.client_id) },
    {
      key: "short_url",
      header: "URL curta",
      render: (row) => (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontVariantNumeric: "tabular-nums" }}>{row.short_url}</span>
          <button type="button" className="btn btn-ghost btn-icon" onClick={() => copyShortUrl(row.short_url)} title="Copiar link">
            <Copy size={14} />
          </button>
        </div>
      )
    },
    { key: "click_count", header: "Cliques", numeric: true, render: (row) => row.click_count },
    {
      key: "is_active",
      header: "Status",
      render: (row) => (
        <button
          type="button"
          onClick={() => toggleActive(row)}
          style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
          title="Clique para alternar"
        >
          <Badge tone={row.is_active ? "success" : "neutral"} dot>
            {row.is_active ? "Ativo" : "Inativo"}
          </Badge>
        </button>
      )
    },
    {
      key: "actions",
      header: "",
      width: 120,
      render: (row) => (
        <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
          <a
            className="btn btn-ghost btn-icon"
            href={`/api/qrcodes/${row.id}/image`}
            download={`qr-${row.slug}.png`}
            title="Baixar PNG"
          >
            <Download size={14} />
          </a>
          <button type="button" className="btn btn-ghost btn-icon" onClick={() => openEditModal(row)} title="Editar">
            <Pencil size={14} />
          </button>
          <button type="button" className="btn btn-ghost btn-icon" onClick={() => handleDelete(row)} title="Excluir">
            <Trash2 size={14} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <PageHeader
        title="QR Codes"
        subtitle="Links dinâmicos: troque o destino sem precisar gerar um QR Code novo."
        actions={
          <Button leftIcon={<Plus size={15} />} onClick={openCreateModal}>
            Novo QR Code
          </Button>
        }
      />

      <Card padding="none">
        {loading ? (
          <div style={{ padding: 24 }}>Carregando...</div>
        ) : links.length === 0 ? (
          <EmptyState
            icon={<QrCode size={28} />}
            title="Nenhum QR Code cadastrado"
            description="Crie o primeiro link dinâmico para uso próprio ou de um cliente."
            action={<Button onClick={openCreateModal}>Novo QR Code</Button>}
          />
        ) : (
          <DataTable columns={columns} rows={links} rowKey={(row) => row.id} />
        )}
      </Card>

      {modalOpen &&
        createPortal(
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000
            }}
            onClick={() => setModalOpen(false)}
          >
            <Card
              style={{ width: 440, maxWidth: "90vw" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <h2 style={{ margin: 0, fontSize: "var(--text-h3)" }}>
                  {form.id ? "Editar QR Code" : "Novo QR Code"}
                </h2>
                <button type="button" className="btn btn-ghost btn-icon" onClick={() => setModalOpen(false)}>
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <Field label="Título" required htmlFor="qr-title">
                  <Input
                    id="qr-title"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    required
                    placeholder="Ex.: Cartão de visita - Loja Centro"
                  />
                </Field>

                <Field label="URL de destino" required htmlFor="qr-url" hint="Para onde o QR Code redireciona. Pode ser trocada depois sem gerar um novo QR.">
                  <Input
                    id="qr-url"
                    type="url"
                    value={form.destination_url}
                    onChange={(e) => setForm((f) => ({ ...f, destination_url: e.target.value }))}
                    required
                    placeholder="https://..."
                  />
                </Field>

                <Field label="Cliente" htmlFor="qr-client" hint="Deixe em branco para um link de uso próprio.">
                  <Select
                    id="qr-client"
                    value={form.client_id}
                    onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))}
                  >
                    <option value="">Uso próprio</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </Select>
                </Field>

                {form.id && (
                  <img
                    src={`/api/qrcodes/${form.id}/image`}
                    alt="Prévia do QR Code"
                    width={140}
                    height={140}
                    style={{ alignSelf: "center", borderRadius: "var(--radius-card)" }}
                  />
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
                  <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" loading={saving}>
                    Salvar
                  </Button>
                </div>
              </form>
            </Card>
          </div>,
          document.body
        )}
    </div>
  );
}
