import { describe, expect, it } from "vitest";
import { prospeccaoBase, prospeccaoFocusPath, safeProspeccaoNext } from "./paths";

describe("prospeccaoBase", () => {
  it("separa a rota focada da rota do sistema", () => {
    expect(prospeccaoBase("/prospeccao")).toBe("/prospeccao");
    expect(prospeccaoBase("/prospeccao/leads")).toBe("/prospeccao");
    expect(prospeccaoBase("/admin/prospeccao/conversas")).toBe("/admin/prospeccao");
  });
});

describe("prospeccaoFocusPath", () => {
  it("aponta a aba atual para o link focado", () => {
    expect(prospeccaoFocusPath("/admin/prospeccao/leads")).toBe("/prospeccao/leads");
    expect(prospeccaoFocusPath("/prospeccao/conversas", "?lead=1")).toBe("/prospeccao/conversas?lead=1");
  });
});

describe("safeProspeccaoNext", () => {
  it("aceita só caminhos internos da prospecção", () => {
    expect(safeProspeccaoNext("/prospeccao/conversas?lead=abc")).toBe("/prospeccao/conversas?lead=abc");
    expect(safeProspeccaoNext("https://evil.test/prospeccao")).toBeNull();
    expect(safeProspeccaoNext("//evil.test/prospeccao")).toBeNull();
    expect(safeProspeccaoNext("/admin/workspace")).toBeNull();
    expect(safeProspeccaoNext("/prospeccao/../../admin/financeiro")).toBeNull();
  });
});
