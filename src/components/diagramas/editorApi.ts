// Comandos que a página do editor pode mandar para o canvas (ex.: aplicar o texto do outline)
export interface DiagramEditorApi {
  applyData: (data: Record<string, unknown>) => void;
}
