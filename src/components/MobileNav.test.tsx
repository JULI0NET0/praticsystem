import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import MobileNav from "./MobileNav";

const auth = vi.hoisted(() => ({ role: "admin" }));

vi.mock("next/navigation", () => ({ usePathname: () => "/admin/schedule" }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ currentUser: { role: auth.role } }) }));

afterEach(cleanup);

function labels() {
  return within(screen.getByRole("navigation")).getAllByRole("link").map((a) => a.textContent);
}

describe("MobileNav", () => {
  it.each(["admin", "board", "social_media"])("%s: Agenda no lugar do Chat", (role) => {
    auth.role = role;
    render(<MobileNav onOpenMenu={() => {}} />);
    expect(labels()).toEqual(["Work", "Demandas", "Agenda", "Notas"]);
  });

  it("filmmaker continua com Chat e Agenda", () => {
    auth.role = "filmmaker";
    render(<MobileNav onOpenMenu={() => {}} />);
    expect(labels()).toEqual(["Work", "Chat", "Agenda", "Notas"]);
  });

  it("a Agenda fica ativa quando é a rota atual", () => {
    auth.role = "admin";
    render(<MobileNav onOpenMenu={() => {}} />);
    const agenda = screen.getByRole("link", { name: /Agenda/ });
    expect(agenda.getAttribute("href")).toBe("/admin/schedule");
  });

  it("sem Chat na barra, as mensagens não lidas sobem para o Mais", () => {
    auth.role = "admin";
    render(<MobileNav onOpenMenu={() => {}} unreadChat={3} />);
    const more = screen.getByRole("button", { name: "Abrir menu" });
    expect(within(more).getByText("3")).toBeTruthy();
  });

  it("99+ para contagens grandes", () => {
    auth.role = "admin";
    render(<MobileNav onOpenMenu={() => {}} unreadChat={250} />);
    expect(within(screen.getByRole("button", { name: "Abrir menu" })).getByText("99+")).toBeTruthy();
  });

  it("com o Chat na barra (filmmaker), o contador fica no Chat e não duplica no Mais", () => {
    auth.role = "filmmaker";
    render(<MobileNav onOpenMenu={() => {}} unreadChat={4} />);
    expect(within(screen.getByRole("link", { name: /Chat/ })).getByText("4")).toBeTruthy();
    expect(within(screen.getByRole("button", { name: "Abrir menu" })).queryByText("4")).toBeNull();
  });

  it("sem mensagens não lidas, nenhum contador aparece", () => {
    auth.role = "admin";
    render(<MobileNav onOpenMenu={() => {}} unreadChat={0} />);
    expect(within(screen.getByRole("button", { name: "Abrir menu" })).queryByText("0")).toBeNull();
  });
});
