"use client";

import { useEffect } from "react";
import { Download, X } from "lucide-react";

/** Foto em tela cheia: fecha com Esc, clique fora ou no X; permite baixar o original. */
export default function ImageLightbox({ src, alt, onClose }: { src: string; alt?: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="pp-lightbox" role="dialog" aria-modal="true" aria-label={alt ?? "Imagem"} onClick={onClose}>
      <div className="pp-lightbox-bar" onClick={(e) => e.stopPropagation()}>
        <a className="btn btn-secondary btn-icon" href={src} download target="_blank" rel="noreferrer" aria-label="Baixar imagem"><Download size={16} /></a>
        <button className="btn btn-secondary btn-icon" onClick={onClose} aria-label="Fechar"><X size={16} /></button>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt ?? ""} onClick={(e) => e.stopPropagation()} style={{ cursor: "default" }} />
    </div>
  );
}
