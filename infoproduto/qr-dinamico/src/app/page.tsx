import Link from "next/link";

export default function HomePage() {
  return (
    <main className="wrap">
      <header className="topbar">
        <div className="brand">
          <strong>QR dinâmico</strong>
          <span>A imagem fica. O destino muda.</span>
        </div>
        <Link className="btn" href="/painel">
          Entrar no painel
        </Link>
      </header>

      <h1>O QR impresso continua valendo.</h1>
      <p className="lead">
        A imagem não guarda o site final. Ela guarda um link curto seu. Quando o cartão, o
        outdoor ou o PDF já saíram, você troca o destino no painel.
      </p>

      <section className="grid-2">
        <article className="card pad compare">
          <strong>QR estático</strong>
          <p>A imagem aponta direto para o site. Mudou o link, precisa imprimir de novo.</p>
        </article>
        <article className="card pad compare">
          <strong>QR dinâmico</strong>
          <p>A imagem aponta para /q/seu-slug. O site de destino mora no banco e pode mudar hoje.</p>
        </article>
      </section>
    </main>
  );
}
