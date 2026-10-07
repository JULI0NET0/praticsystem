"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { QrLinkView } from "@/lib/qr";
import { createBrowserSupabase } from "@/lib/supabase/browser";

type FormState = { id: string | null; title: string; destination_url: string };
const EMPTY: FormState = { id: null, title: "", destination_url: "" };

export default function PainelPage() {
  const router = useRouter();
  const [links, setLinks] = useState<QrLinkView[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const supabase = createBrowserSupabase();
      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email ?? "");
      const res = await fetch("/api/qrcodes");
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Erro ao buscar QR Codes.");
      setLinks(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao buscar QR Codes.");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(form.id ? `/api/qrcodes/${form.id}` : "/api/qrcodes", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: form.title, destination_url: form.destination_url }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Erro ao salvar.");
      setNotice(form.id ? "Destino atualizado. O QR impresso continua o mesmo." : "QR criado.");
      setForm(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(link: QrLinkView) {
    const res = await fetch(`/api/qrcodes/${link.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !link.is_active }),
    });
    if (!res.ok) {
      setError("Erro ao atualizar status.");
      return;
    }
    await load();
  }

  async function remove(link: QrLinkView) {
    if (!confirm(`Excluir "${link.title}"? O QR impresso deixa de funcionar.`)) return;
    const res = await fetch(`/api/qrcodes/${link.id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Erro ao excluir.");
      return;
    }
    await load();
  }

  async function copy(url: string) {
    await navigator.clipboard.writeText(url);
    setNotice("Link copiado.");
  }

  async function signOut() {
    const supabase = createBrowserSupabase();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <main className="wrap">
      <header className="topbar">
        <Link className="brand" href="/">
          <strong>QR dinâmico</strong>
          <span>{email || "Painel"}</span>
        </Link>
        <div className="row">
          <button className="btn-ghost" type="button" onClick={() => void signOut()}>
            Sair
          </button>
          <button className="btn" type="button" onClick={() => { setForm(EMPTY); setError(""); }}>
            Novo QR
          </button>
        </div>
      </header>

      <div className="row" style={{ justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h2>Seus QR Codes</h2>
          <p className="muted" style={{ margin: "4px 0 0" }}>
            Troque o destino sem gerar um QR novo.
          </p>
        </div>
      </div>

      {notice && <p className="hint">{notice}</p>}
      {error && <p className="error">{error}</p>}

      <section className="card">
        {loading ? (
          <p className="empty muted">Carregando…</p>
        ) : error && links.length === 0 ? (
          <p className="empty muted">Não foi possível carregar os QR Codes.</p>
        ) : links.length === 0 ? (
          <div className="empty stack">
            <strong>Nenhum QR Code ainda</strong>
            <span className="muted">Crie o primeiro. A imagem vai guardar o link curto, não o destino.</span>
            <button className="btn" type="button" onClick={() => setForm(EMPTY)}>
              Novo QR
            </button>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Título</th>
                  <th>URL curta</th>
                  <th className="num">Cliques</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {links.map((link) => (
                  <tr key={link.id}>
                    <td>
                      <strong>{link.title}</strong>
                      <div className="muted">{link.destination_url}</div>
                    </td>
                    <td className="short">{link.short_url}</td>
                    <td className="num">{link.click_count}</td>
                    <td>
                      <button
                        type="button"
                        className={link.is_active ? "badge" : "badge off"}
                        onClick={() => void toggleActive(link)}
                      >
                        {link.is_active ? "Ativo" : "Inativo"}
                      </button>
                    </td>
                    <td>
                      <div className="row" style={{ justifyContent: "flex-end" }}>
                        <button className="btn-ghost" type="button" onClick={() => void copy(link.short_url)}>
                          Copiar
                        </button>
                        <a className="btn-ghost" href={`/api/qrcodes/${link.id}/image`} download={`qr-${link.slug}.png`}>
                          PNG
                        </a>
                        <button
                          className="btn-ghost"
                          type="button"
                          onClick={() =>
                            setForm({ id: link.id, title: link.title, destination_url: link.destination_url })
                          }
                        >
                          Editar
                        </button>
                        <button className="btn-danger" type="button" onClick={() => void remove(link)}>
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {form && (
        <div className="modal-back" onClick={() => setForm(null)}>
          <div className="card pad modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <form className="stack" onSubmit={onSubmit}>
              <h2>{form.id ? "Editar destino" : "Novo QR Code"}</h2>
              <label className="field">
                <span>Título</span>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  placeholder="Cartão de visita"
                />
              </label>
              <label className="field">
                <span>URL de destino</span>
                <input
                  type="url"
                  value={form.destination_url}
                  onChange={(e) => setForm({ ...form, destination_url: e.target.value })}
                  required
                  placeholder="https://"
                />
                <span className="hint">Pode trocar depois. O arquivo PNG não muda.</span>
              </label>
              {form.id && (
                <div className="preview">
                  <img src={`/api/qrcodes/${form.id}/image`} alt="Prévia do QR Code" width={148} height={148} />
                </div>
              )}
              {error && <p className="error">{error}</p>}
              <div className="row" style={{ justifyContent: "flex-end" }}>
                <button className="btn-ghost" type="button" onClick={() => setForm(null)}>
                  Cancelar
                </button>
                <button className="btn" type="submit" disabled={saving}>
                  {saving ? "Salvando…" : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
