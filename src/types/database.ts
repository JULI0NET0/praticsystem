export interface Role {
  id: string;
  name: string;
  permissions: string[];
}

export interface User {
  id: string;
  name: string;
  username: string; // Para menções @usuario
  email: string;
  avatar_url?: string;
  role: string; // ID do cargo ou nome do cargo fixo
  status_message?: string; // Frase de status
}

export interface Client {
  id: string;
  sequential_id?: number;
  name: string; // Razão Social
  nome_fantasia?: string;
  cnpj: string; // Ou CPF
  tipo_pessoa: 'PF' | 'PJ';
  contact_name: string;
  email: string;
  email_financeiro?: string;
  phone: string; // WhatsApp
  whatsapp_financeiro?: string;
  telefone_fixo?: string;
  setor?: string;
  website?: string;
  sistema_proprio?: string;
  address?: {
    cep: string;
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    uf: string;
  };
  status: 'active' | 'inactive' | 'prospect';
  created_at: string;
  social_access?: {
    instagram?: { usuario: string; senha?: string; email?: string; link?: string; reserva_image_url?: string };
    facebook?: { usuario: string; senha?: string; email?: string; link?: string };
    google?: { usuario: string; senha?: string; email?: string; link?: string };
    linkedin?: { usuario: string; senha?: string; email?: string; link?: string };
    tiktok?: { usuario: string; senha?: string; email?: string; link?: string };
  };
  notes?: { id: string; content: string; date: string; author: string }[];
  portal_email?: string;
  portal_password?: string;
  briefing?: string;
  servico_interesse?: string;
  onboarding_date?: string;
  google_drive_url?: string;
  essential_links?: { id: string; title: string; url: string; icon?: string }[];
  drive_settings?: {
    auto_create_folder: boolean;
    auto_backup: boolean;
    folder_id?: string;
  };
}

export interface Demand {
  id: string;
  client_id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_production' | 'review' | 'approved' | 'completed';
  priority: 'low' | 'medium' | 'high';
  due_date: string;
  type: string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  is_recurring: boolean;
  category: string;
  billing_cycle?: 'monthly' | 'quarterly' | 'yearly' | 'one_time';
  minimum_term?: number; // em meses
  observations?: string;
  descriptive?: string;
}

export interface Contract {
  id: string;
  client_id: string;
  service_id: string;
  status: 'active' | 'expiring' | 'expired';
  start_date: string;
  end_date: string;
  value: number;
  auto_renew: boolean;
  billing_cycle?: 'monthly' | 'quarterly' | 'yearly' | 'one_time';
  minimum_term?: number; // em meses
  posts_per_week?: number;
  content_capture?: boolean;
  capture_frequency?: string;
  document_content?: string;
  document_status?: 'pending' | 'generated' | 'sent' | 'signed';
  signed_document_url?: string;
  contract_number?: number;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'mention' | 'demand' | 'system';
  read: boolean;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id?: string; // se for nulo, é grupo/geral
  content: string;
  timestamp: string;
}

export interface Invoice {
  id: string;
  client_id: string;
  contract_id?: string;
  amount: number;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue';
  description: string;
}

export interface AgendaEvent {
  id: string;
  title: string;
  type: 'meeting' | 'payment' | 'prospecting' | 'task';
  date: string;
  client_id?: string;
  assigned_to: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  visibility: 'public' | 'private';
  description?: string;
  google_event_id?: string;
}

export interface PortfolioCase {
  id: string;
  title: string;
  category: string;
  description: string;
  image_url: string;
  results: string[];
}

export type ExpenseCategory =
  | 'pro_labore' | 'funcionario_pj' | 'sistema' | 'internet'
  | 'taxa_asaas' | 'taxa_boleto' | 'taxa_mensageria' | 'outros';
export type ExpenseRecurrence = 'monthly' | 'quarterly' | 'yearly' | 'one_time';

export interface Expense {
  id: string;
  description: string;
  category: ExpenseCategory;
  amount: number;
  due_day?: number;
  recurrence: ExpenseRecurrence;
  status: 'active' | 'inactive';
  type: 'fixed' | 'variable';
  related_user_id?: string;
  notes?: string;
  created_at: string;
}

export interface ExpenseEntry {
  id: string;
  expense_id?: string;
  description: string;
  amount: number;
  date: string;
  status: 'pending' | 'paid' | 'cancelled';
  asaas_transaction_id?: string;
  category?: ExpenseCategory | string;
  notes?: string;
  created_at: string;
  expenses?: Expense;
}

export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: any; // TipTap JSON doc
  date: string;
  subjects: string[];
  client_id?: string;
  shared_with: string[];
  share_all: boolean;    // visível para todo o time
  pin_to_client: boolean; // aparece na aba Notas do cadastro do cliente
  created_at: string;
  updated_at: string;
  // Joined fields
  client?: Pick<Client, 'id' | 'name' | 'nome_fantasia'>;
  author?: Pick<User, 'id' | 'name' | 'avatar_url'>;
}

export interface AsaasTransaction {
  id: string;
  description?: string;
  value: number;
  type: 'CREDIT' | 'DEBIT';
  date: string;
  status: string;
  expense_entry_id?: string;
  invoice_id?: string;
  synced_at: string;
  expense_entries?: ExpenseEntry;
  invoices?: Invoice;
}

