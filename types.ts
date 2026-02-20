
export enum UserRole {
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  STAFF = 'STAFF'
}

export enum ItemType {
  SERVICE = 'service',
  PRODUCT = 'product'
}

export enum PaymentMethod {
  CASH = 'Espèces',
  CARD = 'Carte',
  OTHER = 'Autre'
}


export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  salons: string[];
  subscriptionStatus?: 'active' | 'inactive' | 'trial';
  trialEndsAt?: string;
  isBookable: boolean;
  canViewOwnSchedule: boolean;
  ownerId?: string;
  restrictToCurrentDay?: boolean; // Restrict staff to see only today
  status?: 'INVITED' | 'ACTIVE';
}

export interface StaffSchedule {
  id: string;
  salonId: string;
  staffId: string;
  date: string; // YYYY-MM-DD
}

export interface Salon {
  id: string;
  ownerId: string;
  name: string;
  address: string;
  totalWorkstations?: number; // Total physical chairs in salon
  bookingWorkstations?: number; // Chairs available for online booking
}

export interface Service {
  id: string;
  salonId: string;
  name: string;
  price: number;
  duration: number; // minutes
  isActive: boolean;
}

export interface Product {
  id: string;
  salonId: string;
  name: string;
  price: number;
  stockQty: number;
  alertThreshold: number;
}

export interface Appointment {
  id: string;
  salonId: string;
  staffId: string;
  staffName: string;
  serviceId: string;
  serviceName: string;
  clientName: string;
  clientPhone: string;
  startTime: string; // ISO String
  duration: number; // minutes
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
}

export interface SaleItem {
  type: ItemType;
  refId: string;
  name: string;
  unitPrice: number;
  qty: number;
  lineTotal: number;
}

export interface Sale {
  id: string;
  salonId: string;
  staffId: string;
  staffName: string;
  items: SaleItem[];
  totalCA: number;      // Prestations / Services only
  totalProducts: number; // Revente Boutique
  tipAmount: number;
  paidAmount: number;
  paymentMethod: PaymentMethod;
  status: 'valid' | 'cancelled';
  cancelReason?: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  ownerId: string;
  date: string;
  amount: number;
  plan: string;
  status: 'paid' | 'pending';
}

export type NotificationType = 'billing' | 'stock' | 'system';

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}
