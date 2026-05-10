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
  avatarUrl?: string;
  role: string; // ID do cargo ou nome do cargo fixo
  statusMessage?: string; // Frase de status
}

export interface Client {
  id: string;
  name: string; // Razão Social
  nomeFantasia?: string;
  cnpj: string; // Ou CPF
  tipoPessoa: 'PF' | 'PJ';
  contactName: string;
  email: string;
  emailFinanceiro?: string;
  phone: string; // WhatsApp
  telefoneFixo?: string;
  setor?: string;
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
  createdAt: string;
  socialAccess?: {
    instagram?: { usuario: string; senha?: string; email?: string; link?: string };
    facebook?: { usuario: string; senha?: string; email?: string; link?: string };
    google?: { usuario: string; senha?: string; email?: string; link?: string };
    linkedin?: { usuario: string; senha?: string; email?: string; link?: string };
    tiktok?: { usuario: string; senha?: string; email?: string; link?: string };
  };
  notes?: { id: string; content: string; date: string; author: string }[];
  portalEmail?: string;
  portalPassword?: string;
  briefing?: string;
  servicoInteresse?: string;
}

export interface Demand {
  id: string;
  clientId: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_production' | 'review' | 'approved' | 'completed';
  priority: 'low' | 'medium' | 'high';
  dueDate: string;
  type: string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  isRecurring: boolean;
  category: string;
}

export interface Contract {
  id: string;
  clientId: string;
  serviceId: string;
  status: 'active' | 'expiring' | 'expired';
  startDate: string;
  endDate: string;
  value: number;
  autoRenew: boolean;
}
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'mention' | 'demand' | 'system';
  read: boolean;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId?: string; // se for nulo, é grupo/geral
  content: string;
  timestamp: string;
}

export interface Invoice {
  id: string;
  clientId: string;
  contractId?: string;
  amount: number;
  dueDate: string;
  status: 'pending' | 'paid' | 'overdue';
  description: string;
}

export interface AgendaEvent {
  id: string;
  title: string;
  type: 'meeting' | 'payment' | 'prospecting' | 'task';
  date: string;
  clientId?: string;
  assignedTo: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

export interface PortfolioCase {
  id: string;
  title: string;
  category: string;
  description: string;
  imageUrl: string;
  results: string[];
}
