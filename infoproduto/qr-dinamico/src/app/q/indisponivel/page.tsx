import Link from "next/link";

export default function UnavailablePage() {
  return (
    <main className="wrap">
      <div className="card pad stack" style={{ maxWidth: 460 }}>
        <h2>Este link está desativado</h2>
        <p className="muted" style={{ margin: 0 }}>
          O QR Code impresso continua o mesmo. Quem criou o link pode ligar de novo e escolher outro destino.
        </p>
        <Link href="/">Voltar ao início</Link>
      </div>
    </main>
  );
}
