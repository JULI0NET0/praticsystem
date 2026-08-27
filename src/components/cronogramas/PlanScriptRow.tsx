"use client";

import { Clapperboard, ExternalLink, Unlink, Calendar, User } from "lucide-react";
import Link from "next/link";
import { UserAvatar } from "@/components/demandas/AssigneePicker";
import type { Note } from "@/types/database";

interface Props {
  note: Note;
  onOpen: (noteId: string) => void;
  onUnlink?: (noteId: string) => void;
}

export default function PlanScriptRow({ note, onOpen, onUnlink }: Props) {
  const tags = (note.subjects ?? []).filter((s) => !s.startsWith("_"));
  const dateStr = note.updated_at || note.created_at || note.date;
  const formattedDate = dateStr
    ? new Date(dateStr).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
    : "";

  return (
    <div
      onClick={() => onOpen(note.id)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "10px 14px",
        borderRadius: "10px",
        background: "var(--color-surface-sunken)",
        border: "1px solid var(--border)",
        cursor: "pointer",
        transition: "all 0.15s ease",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "color-mix(in oklab, var(--accent) 40%, transparent)";
        (e.currentTarget as HTMLElement).style.background = "var(--bg-secondary)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
        (e.currentTarget as HTMLElement).style.background = "var(--color-surface-sunken)";
      }}
    >
      {/* Left: Icon & Title & Tags */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "7px",
            background: "color-mix(in oklab, var(--accent) 15%, transparent)",
            color: "var(--accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Clapperboard size={15} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontWeight: 600,
                fontSize: "0.86rem",
                color: "var(--text-primary)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {note.title || "Roteiro sem título"}
            </span>
          </div>

          {tags.length > 0 && (
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontSize: "0.68rem",
                    color: "var(--text-tertiary)",
                    background: "rgba(255, 255, 255, 0.04)",
                    padding: "1px 5px",
                    borderRadius: "4px",
                  }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: Date, Author, Actions */}
      <div
        style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {formattedDate && (
          <span style={{ fontSize: "0.72rem", color: "var(--text-tertiary)" }}>
            {formattedDate}
          </span>
        )}

        {note.author && (
          <div title={note.author.name || "Autor"}>
            <UserAvatar name={note.author.name || "Autor"} avatarUrl={note.author.avatar_url || undefined} size={20} />
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Link
            href={`/admin/notas/${note.id}`}
            target="_blank"
            style={{
              padding: "4px 8px",
              borderRadius: "6px",
              background: "transparent",
              border: "1px solid transparent",
              color: "var(--text-tertiary)",
              display: "flex",
              alignItems: "center",
              textDecoration: "none",
            }}
            title="Abrir nota completa"
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
              (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = "var(--text-tertiary)";
              (e.currentTarget as HTMLElement).style.borderColor = "transparent";
            }}
          >
            <ExternalLink size={13} />
          </Link>

          {onUnlink && (
            <button
              type="button"
              onClick={() => onUnlink(note.id)}
              style={{
                padding: "4px 8px",
                borderRadius: "6px",
                background: "transparent",
                border: "1px solid transparent",
                color: "var(--text-tertiary)",
                display: "flex",
                alignItems: "center",
                cursor: "pointer",
              }}
              title="Desvincular do cronograma"
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color = "var(--color-danger, #ef4444)";
                (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color = "var(--text-tertiary)";
                (e.currentTarget as HTMLElement).style.borderColor = "transparent";
              }}
            >
              <Unlink size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
