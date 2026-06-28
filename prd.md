# PRD - Documento de Requisitos e Estrutura do Sistema (PRATIC SYSTEM)

Este documento descreve a estrutura atual da aplicação **Prátic System**, detalhando sua stack tecnológica, as funcionalidades mapeadas nas rotas e o sistema de design implementado.

---

## 1. Stack Tecnológica

A aplicação foi construída utilizando modernas tecnologias de desenvolvimento web, garantindo alta performance, escalabilidade e facilidade de manutenção.

### Core & Framework
* **Framework**: [Next.js (v16.2.6)](https://nextjs.org/) utilizando a estrutura moderna de App Router.
* **Biblioteca UI**: [React (v19.2.4)](https://react.dev/).
* **Linguagem**: [TypeScript](https://www.typescriptlang.org/) para tipagem estática e segurança do código.

### Backend & Banco de Dados
* **BaaS (Backend as a Service)**: [Supabase](https://supabase.com/) (`@supabase/supabase-js` v2.105.4) integrando:
  * Autenticação de usuários.
  * Banco de dados relacional PostgreSQL.
  * Chamadas de procedimentos remotos (RPC).

### Bibliotecas de Terceiros e Componentes Especializados
* **Estilização**: CSS Vanilla estruturado, focado em flexibilidade absoluta.
* **Animações**: [Framer Motion (v12.38.0)](https://www.framer.com/motion/) para transições fluidas e micro-interações.
* **Ícones**: [Lucide React (v1.14.0)](https://lucide.dev/).
* **Gráficos**: [Recharts (v3.8.1)](https://recharts.org/) para painéis visuais e relatórios financeiros no dashboard.
* **Calendário**: [FullCalendar](https://fullcalendar.io/) (v6.1.20) integrado com React para a visualização da agenda da agência.
* **Editor Rich Text**: [TipTap](https://tiptap.dev/) (v3.26.1) com extensões de cores, destaques, imagens, links e menções para o mural de observações e notas.
* **Utilitários de Exportação**:
  * `html2canvas` para captura de elementos do DOM.
  * `jspdf` para geração de relatórios e contratos em formato PDF.

---

## 2. Funcionalidades e Estrutura de Rotas

O sistema é dividido em escopos de acesso, principalmente administrativo e cliente:

### Área Pública e Autenticação
* **Login (`/login` ou `/`)**:
  * Autenticação de usuários administrativos e clientes.
  * Recuperação de senha ("Esqueci minha senha").
* **Onboarding (`/onboarding`)**:
  * Fluxo de boas-vindas e configuração inicial para novos clientes.
* **Briefing (`/briefing`)**:
  * Coleta de informações iniciais de novos projetos ou marcas.

### Dashboard e Administrativo (`/admin`)
* **Dashboard (`/admin/dashboard`)**:
  * Visão geral de faturamento previsto, faturamento realizado e previsão de gastos.
  * Atalhos de acesso rápido para clientes e cadastros.
  * Gráficos interativos de evolução de receita.
  * Feed de atividades recentes.
* **Gestão de Clientes (`/admin/clients` e `/admin/clients/:id`)**:
  * Listagem, busca (por nome ou CNPJ) e cadastro de clientes.
  * Visão 360º de cada cliente com:
    * Dados cadastrais e de contato editáveis.
    * Gerenciamento de acessos criptografados (redes sociais, etc.).
    * Mural de observações e histórico da marca.
    * Galeria de upload/download de documentos de identidade visual.
* **Catálogo de Serviços (`/admin/services`)**:
  * Configuração de serviços com definição de valores e recorrência (avulso, recorrente ou parcelado).
* **Financeiro & Faturamento (`/admin/billing` e `/admin/financeiro`)**:
  * Controle de contas a receber e alteração de status de faturas (Pago, Pendente, Atrasado).
  * Geração e exportação de relatórios financeiros.
* **Gestão de Contratos (`/admin/contracts`)**:
  * Criação, visualização (via PDF) e acompanhamento de vigência de contratos.
  * Opções de renovação automática e faturamento associado.
* **Agenda (`/admin/schedule`)**:
  * Visualização de compromissos, reuniões e entregas da agência através do calendário interativo.
* **Outras ferramentas administrativas**:
  * Chat (`/admin/chat`), Perfil (`/admin/profile`), Gestão de Usuários (`/admin/users`) e Workspace (`/admin/workspace`).

---

## 3. Design System & Interface

O design do **Prátic System** foi construído sob uma identidade estética proprietária, voltada para uma experiência premium e contemporânea.

### Identidade Estética: *iOS 26 Liquid Glass*
La interface utiliza intensivamente o conceito de **Glassmorphism**, proporcionando profundidade visual e elegância.
* **Tipografia**: Utilização da fonte [Outfit](https://fonts.google.com/specimen/Outfit) via Google Fonts, trazendo um aspecto moderno e geométrico.
* **Efeitos de Vidro**: Fundos translúcidos (`rgba`) com forte efeito de desfoque (`backdrop-filter: blur(20px)`), simulando vidro líquido.
* **Profundidade e Sombras**: Uso de sombras de profundidade com luz de néon sutil (`--shadow-glow`) e bordas internas delicadas para criar contraste (`border: 1px solid rgba(255, 255, 255, 0.08)`).
* **Bordas Arredondadas (Radius)**:
  * Cards e containers principais: `24px` para suavidade estrutural.
  * Inputs e botões: `16px`.
  * Badges e etiquetas: `8px`.

### Paleta de Cores e Temas
O sistema conta com suporte nativo a temas e tem como padrão (default) o **Dark Mode**.
* **Cor de Destaque (Accent)**: Laranja vibrante `#D9480F` (com variantes hover translúcidas).
* **Tema Escuro (Dark Mode)**:
  * Fundo principal: Escuro translúcido.
  * Containers: `rgba(28, 28, 28, 0.4)` e `rgba(255, 255, 255, 0.03)` interno.
  * Texto: Branco puro (`#FFFFFF`) e Cinza (`#A8A8A8`).
* **Tema Claro (Light Mode)**:
  * Fundo principal: Translúcido claro com desfoque de `16px`.
  * Containers: `rgba(0, 0, 0, 0.03)` com bordas sutis.
  * Texto: Preto puro (`#000000`) e Cinza escuro (`#2D2D2D`).
