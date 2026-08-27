import { describe, expect, it } from "vitest";
import { cleanTrailingPunctuation, normalizeHref, parseLinks } from "./linkify";

describe("cleanTrailingPunctuation", () => {
  it("remove pontos e vírgulas no final", () => {
    expect(cleanTrailingPunctuation("https://google.com.")).toEqual({
      url: "https://google.com",
      trailing: ".",
    });
    expect(cleanTrailingPunctuation("https://google.com,")).toEqual({
      url: "https://google.com",
      trailing: ",",
    });
    expect(cleanTrailingPunctuation("https://google.com!?:;")).toEqual({
      url: "https://google.com",
      trailing: "!?:;",
    });
  });

  it("remove parênteses desbalanceados", () => {
    expect(cleanTrailingPunctuation("https://google.com)")).toEqual({
      url: "https://google.com",
      trailing: ")",
    });
  });

  it("mantém parênteses balanceados como da Wikipédia", () => {
    expect(cleanTrailingPunctuation("https://en.wikipedia.org/wiki/React_(software)")).toEqual({
      url: "https://en.wikipedia.org/wiki/React_(software)",
      trailing: "",
    });
    expect(cleanTrailingPunctuation("https://en.wikipedia.org/wiki/React_(software).")).toEqual({
      url: "https://en.wikipedia.org/wiki/React_(software)",
      trailing: ".",
    });
  });
});

describe("normalizeHref", () => {
  it("mantém http e https", () => {
    expect(normalizeHref("https://exemplo.com")).toBe("https://exemplo.com");
    expect(normalizeHref("http://localhost:3000")).toBe("http://localhost:3000");
  });

  it("adiciona https para www", () => {
    expect(normalizeHref("www.exemplo.com")).toBe("https://www.exemplo.com");
  });
});

describe("parseLinks", () => {
  it("retorna texto puro quando não há link", () => {
    expect(parseLinks("Texto simples sem link")).toEqual([
      { type: "text", content: "Texto simples sem link" },
    ]);
  });

  it("extrai URL direta https", () => {
    const result = parseLinks("Veja o site https://praticsystem.com para detalhes");
    expect(result).toEqual([
      { type: "text", content: "Veja o site " },
      { type: "link", content: "https://praticsystem.com", href: "https://praticsystem.com" },
      { type: "text", content: " para detalhes" },
    ]);
  });

  it("extrai URL direta www e preserva pontuação final", () => {
    const result = parseLinks("Acesse www.figma.com/file/123.");
    expect(result).toEqual([
      { type: "text", content: "Acesse " },
      { type: "link", content: "www.figma.com/file/123", href: "https://www.figma.com/file/123" },
      { type: "text", content: "." },
    ]);
  });

  it("extrai links no formato markdown", () => {
    const result = parseLinks("Consulte o [Figma do Projeto](https://figma.com/file/abc) aqui");
    expect(result).toEqual([
      { type: "text", content: "Consulte o " },
      { type: "link", content: "Figma do Projeto", href: "https://figma.com/file/abc" },
      { type: "text", content: " aqui" },
    ]);
  });

  it("lida com múltiplos links", () => {
    const result = parseLinks("Links: https://a.com, www.b.com e [C](https://c.com)!");
    expect(result).toEqual([
      { type: "text", content: "Links: " },
      { type: "link", content: "https://a.com", href: "https://a.com" },
      { type: "text", content: ", " },
      { type: "link", content: "www.b.com", href: "https://www.b.com" },
      { type: "text", content: " e " },
      { type: "link", content: "C", href: "https://c.com" },
      { type: "text", content: "!" },
    ]);
  });
});
