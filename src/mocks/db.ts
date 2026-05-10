import { Client, Service, Contract, Invoice, AgendaEvent, PortfolioCase, User, Role, Demand } from '../types/database';

export const roles: Role[] = [
  { id: 'admin', name: 'Administrativo', permissions: ['all'] },
  { id: 'board', name: 'Diretoria', permissions: ['all'] },
  { id: 'social_media', name: 'Social Media', permissions: ['clients.view', 'demands.view', 'demands.edit'] },
  { id: 'filmmaker', name: 'Filmmaker', permissions: ['demands.view', 'agenda.view'] },
  { id: 'client', name: 'Cliente', permissions: ['portal.view'] },
];

export const users: User[] = [];

export const clients: Client[] = [];
export const services: Service[] = [];
export const contracts: Contract[] = [];
export const invoices: Invoice[] = [];
export const agendaEvents: AgendaEvent[] = [];
export const portfolioCases: PortfolioCase[] = [];
export const demands: Demand[] = [];
export const notifications: any[] = [];
export const chatMessages: any[] = [];
