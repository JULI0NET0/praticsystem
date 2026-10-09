import json, pathlib
d = pathlib.Path(__file__).parent
def brl(v): return "—" if v is None else "R$ " + f"{v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
cat = json.load(open(d/"catalogo.json")); his = json.load(open(d/"historico.json"))
o = ["# Catálogo de preços Pratic", "", f"_{cat['_status']}_", ""]
cats = {}
for i in cat["itens"]: cats.setdefault(i["categoria"], []).append(i)
for c, its in cats.items():
    o += [f"## {c}", "", "| Item | Modelo | Valor | Unidade | Referências |", "|---|---|---|---|---|"]
    for i in its:
        v = brl(i["valor_base"]) if i.get("valor_base") else (f"{brl(i['faixa'][0])} – {brl(i['faixa'][1])}" if i.get("faixa") else "—")
        if i.get("teto"): v += f" (teto {brl(i['teto'])})"
        o.append(f"| {i['nome']} | {i['modelo']} | {v} | {i['unidade']} | {'; '.join(i.get('referencias', []))} |")
    o.append("")
o += ["## Regras gerais", ""] + [f"- {r}" for r in cat["regras_gerais"]]
(d/"CATALOGO.md").write_text("\n".join(o) + "\n")
o = ["# Histórico de propostas", "", f"_{his['_fonte']}_", ""]
for s in ["aprovada", "stand by", "recusada"]:
    o += [f"## {s.capitalize()}", "", "| Cliente | Modelo | Valor | Extras / escopo |", "|---|---|---|---|"]
    for p in his["propostas"]:
        if p["status"] == s:
            o.append(f"| {p['cliente']} | {p['modelo']} | {brl(p['valor'])}/{p['unidade']} | {p.get('extras') or p.get('escopo','')} |")
    o.append("")
(d/"HISTORICO.md").write_text("\n".join(o) + "\n")
