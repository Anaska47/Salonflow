
import { User, UserRole, Salon, Service, Product, Sale, ItemType, PaymentMethod, Appointment, StaffSchedule, Invoice, AppNotification } from '../types';

const STORAGE_KEY = 'salon_flow_db';

export interface DbData {
  users: User[];
  salons: Salon[];
  services: Service[];
  products: Product[];
  sales: Sale[];
  appointments: Appointment[];
  schedules: StaffSchedule[];
  invoices: Invoice[];
  notifications: AppNotification[];
  subscriptionLimits: Record<string, { maxSalons: number, maxStaff: number }>;
}

const today = new Date().toISOString().split('T')[0];
const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

const INITIAL_DATA: DbData = {
  users: [
    { id: 'u1', email: 'owner@salon.com', name: 'Jean Patron', role: UserRole.OWNER, salons: ['s1', 's2', 's3'], subscriptionStatus: 'active', isBookable: true, canViewOwnSchedule: true },
    { id: 'u2', email: 'manager@salon.com', name: 'Sophie Manager', role: UserRole.MANAGER, salons: ['s1'], isBookable: true, canViewOwnSchedule: true, ownerId: 'u1' },
    { id: 'u3', email: 'marc@salon.com', name: 'Marc Manager', role: UserRole.MANAGER, salons: ['s2', 's3'], isBookable: true, canViewOwnSchedule: true, ownerId: 'u1' },
    { id: 'u4', email: 'staff@salon.com', name: 'Marco Barber', role: UserRole.STAFF, salons: ['s1'], isBookable: true, canViewOwnSchedule: false, ownerId: 'u1', restrictToCurrentDay: true },
    { id: 'u5', email: 'julie@salon.com', name: 'Julie Coloriste', role: UserRole.STAFF, salons: ['s1'], isBookable: true, canViewOwnSchedule: true, ownerId: 'u1' },
  ],
  salons: [
    { id: 's1', ownerId: 'u1', name: 'Salon de Coiffure Principal', address: '12 Avenue des Champs, Paris', totalWorkstations: 8, bookingWorkstations: 2 },
    { id: 's2', ownerId: 'u1', name: 'Studio Barbier Centre', address: '5 Rue de la Paix, Lyon', totalWorkstations: 4, bookingWorkstations: 1 },
    { id: 's3', ownerId: 'u1', name: 'L\'Atelier Coiffure Nord', address: '45 Boulevard Maritime, Lille', totalWorkstations: 6, bookingWorkstations: 2 },
  ],
  subscriptionLimits: {
    'u1': { maxSalons: 5, maxStaff: 20 }
  },
  services: [
    { id: 'sv1', salonId: 's1', name: 'Coupe Homme Express', price: 25, duration: 30, isActive: true },
    { id: 'sv2', salonId: 's1', name: 'Barbe Royale', price: 35, duration: 45, isActive: true },
    { id: 'sv3', salonId: 's1', name: 'Coupe & Couleur Femme', price: 85, duration: 90, isActive: true },
    { id: 'sv4', salonId: 's2', name: 'Taille Barbe', price: 15, duration: 20, isActive: true },
  ],
  products: [
    { id: 'p1', salonId: 's1', name: 'Huile Barbe Premium 50ml', price: 22, stockQty: 3, alertThreshold: 5 },
    { id: 'p2', salonId: 's1', name: 'Shampoing Kératine 500ml', price: 34, stockQty: 12, alertThreshold: 5 },
    { id: 'p3', salonId: 's2', name: 'Cire Matte Strong Hold', price: 18, stockQty: 2, alertThreshold: 10 },
  ],
  sales: [
    // 14 jours d'historique pour les graphiques
    ...Array.from({ length: 14 }).map((_, i) => {
      const date = new Date(Date.now() - (i + 1) * 86400000).toISOString().split('T')[0];
      const ca = 25 + Math.floor(Math.random() * 150);
      const items = [{ type: ItemType.SERVICE, refId: 'sv1', name: 'Coupe Homme', unitPrice: 25, qty: 1, lineTotal: 25 }];
      return {
        id: `hist-sl-${i}`,
        salonId: i % 2 === 0 ? 's1' : 's2',
        staffId: i % 3 === 0 ? 'u4' : 'u5',
        staffName: i % 3 === 0 ? 'Marco Barber' : 'Julie Coloriste',
        items,
        totalCA: ca,
        totalProducts: 0,
        tipAmount: Math.floor(Math.random() * 15),
        paidAmount: ca + 20,
        paymentMethod: i % 2 === 0 ? PaymentMethod.CARD : PaymentMethod.CASH,
        status: 'valid' as const,
        createdAt: date + 'T14:00:00Z'
      };
    }),
    {
      id: 'sl3', salonId: 's1', staffId: 'u5', staffName: 'Julie Coloriste',
      items: [
        { type: ItemType.SERVICE, refId: 'sv3', name: 'Coupe & Couleur', unitPrice: 85, qty: 1, lineTotal: 85 },
        { type: ItemType.PRODUCT, refId: 'p2', name: 'Shampoing Kératine', unitPrice: 34, qty: 1, lineTotal: 34 }
      ],
      totalCA: 85,
      totalProducts: 34,
      tipAmount: 10,
      paidAmount: 129,
      paymentMethod: PaymentMethod.CARD,
      status: 'valid',
      createdAt: today + 'T10:15:00Z'
    }
  ],
  appointments: [
    // 10 jours de passés
    ...Array.from({ length: 10 }).map((_, i) => {
      const date = new Date(Date.now() - (i + 1) * 86400000).toISOString().split('T')[0];
      return {
        id: `past-ap-${i}`, salonId: 's1', staffId: 'u4', staffName: 'Marco Barber',
        serviceId: 'sv1', serviceName: 'Coupe Homme', clientName: 'Thomas Client', clientPhone: '0601020304',
        startTime: date + 'T10:00:00', duration: 30, status: 'completed' as const
      };
    }),
    {
      id: 'ap1', salonId: 's1', staffId: 'u4', staffName: 'Marco Barber',
      serviceId: 'sv1', serviceName: 'Coupe Homme', clientName: 'Thomas Durand', clientPhone: '0612345678',
      startTime: today + 'T14:00:00', duration: 30, status: 'confirmed'
    },
    {
      id: 'ap2', salonId: 's1', staffId: 'u1', staffName: 'Jean Patron',
      serviceId: 'sv2', serviceName: 'Barbe Royale', clientName: 'Nicolas Martin', clientPhone: '0788990011',
      startTime: today + 'T15:30:00', duration: 45, status: 'pending'
    },
    // 5 jours de futur
    ...Array.from({ length: 5 }).map((_, i) => {
      const date = new Date(Date.now() + (i + 1) * 86400000).toISOString().split('T')[0];
      return {
        id: `fut-ap-${i}`, salonId: 's1', staffId: 'u5', staffName: 'Julie Coloriste',
        serviceId: 'sv3', serviceName: 'Coupe & Couleur Femme', clientName: 'Mme Client', clientPhone: '0655443322',
        startTime: date + 'T11:00:00', duration: 90, status: 'confirmed' as const
      };
    })
  ],
  schedules: [
    ...Array.from({ length: 15 }).map((_, i) => {
      const date = new Date(Date.now() - (i - 2) * 86400000).toISOString().split('T')[0];
      return { id: `auto-sch-${i}`, salonId: 's1', staffId: 'u4', date };
    }),
    { id: 'sch2', salonId: 's1', staffId: 'u5', date: today },
    { id: 'sch3', salonId: 's2', staffId: 'u3', date: today },
  ],
  invoices: [
    { id: 'inv-JAN-26', ownerId: 'u1', date: '2026-01-15', amount: 79, plan: 'PRO', status: 'paid' },
    { id: 'inv-FEB-26', ownerId: 'u1', date: '2026-02-15', amount: 79, plan: 'PRO', status: 'paid' },
  ],
  notifications: [
    { id: 'n1', userId: 'u1', type: 'billing', title: 'Facture de Février émise', message: 'Le prélèvement de 79€ a été validé.', isRead: false, createdAt: new Date().toISOString() },
    { id: 'n2', userId: 'u1', type: 'stock', title: 'Alerte Huile Barbe', message: 'Le stock est tombé à 3 unités au Salon Principal.', isRead: false, createdAt: new Date().toISOString() },
    { id: 'n3', userId: 'u1', type: 'system', title: 'Nouveau Rapport Mensuel', message: 'Vos analyses de Janvier sont prêtes.', isRead: true, createdAt: yesterday },
  ]
};

type Listener = (isSyncing: boolean) => void;

class MockDb {
  private data: DbData = INITIAL_DATA;
  private syncing: boolean = false;
  private listeners: Listener[] = [];

  constructor() {
    // Forcer le rechargement des données fictives pour le test
    this.data = INITIAL_DATA;
    this.save();
  }

  subscribe(l: Listener) {
    this.listeners.push(l);
    return () => { this.listeners = this.listeners.filter(i => i !== l); };
  }

  private setSyncing(val: boolean) {
    this.syncing = val;
    this.listeners.forEach(l => l(val));
  }

  private async simulateNetwork() {
    const latency = 200 + Math.random() * 400;
    return new Promise(resolve => setTimeout(resolve, latency));
  }

  private async save() {
    this.setSyncing(true);
    await this.simulateNetwork();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    this.setSyncing(false);
    return true;
  }

  getUsers() { return this.data.users; }
  getSalons() { return this.data.salons; }

  getInvoices(ownerId: string) {
    return this.data.invoices.filter(inv => inv.ownerId === ownerId);
  }

  getNotifications(userId: string) {
    return this.data.notifications.filter(n => n.userId === userId);
  }

  async markNotificationAsRead(id: string) {
    const n = this.data.notifications.find(notif => notif.id === id);
    if (n) {
      n.isRead = true;
      await this.save();
    }
  }

  getSubscriptionLimits(ownerId: string) {
    return this.data.subscriptionLimits[ownerId] || { maxSalons: 1, maxStaff: 1 };
  }

  async updateSubscription(ownerId: string, limit: { maxSalons: number, maxStaff: number }) {
    this.data.subscriptionLimits[ownerId] = limit;
    await this.save();
  }

  getProducts(salonId: string) { return this.data.products.filter(p => p.salonId === salonId); }
  getServices(salonId: string) { return this.data.services.filter(s => s.salonId === salonId); }
  getSales(salonId: string) { return this.data.sales.filter(s => s.salonId === salonId); }
  async addSale(sale: Partial<Sale>) {
    const newSale = {
      ...sale,
      id: 'sl' + Date.now(),
      createdAt: new Date().toISOString()
    } as Sale;
    this.data.sales.push(newSale);
    await this.save();
    return newSale;
  }

  getAppointments(salonId: string) { return this.data.appointments.filter(a => a.salonId === salonId); }

  async addSalon(salon: Partial<Salon>) {
    const ownerSalons = this.data.salons.filter(s => s.ownerId === salon.ownerId);
    const limit = this.getSubscriptionLimits(salon.ownerId!);

    if (ownerSalons.length >= limit.maxSalons) {
      throw new Error(`Limite atteinte : Votre abonnement actuel est limité à ${limit.maxSalons} salon(s).`);
    }

    const newSalon = { ...salon, id: 's' + Date.now() } as Salon;
    this.data.salons.push(newSalon);
    await this.save();
    return newSalon;
  }

  async addUserByOwner(email: string, name: string, ownerId: string, role: UserRole) {
    const ownerStaff = this.data.users.filter(u => u.ownerId === ownerId);
    const limit = this.getSubscriptionLimits(ownerId);

    if (ownerStaff.length >= limit.maxStaff) {
      throw new Error(`Limite atteinte : Votre abonnement est limité à ${limit.maxStaff} collaborateurs.`);
    }

    const newUser: User = {
      id: 'u' + Date.now(),
      email,
      name,
      role,
      ownerId,
      salons: [],
      isBookable: true,
      canViewOwnSchedule: true
    };
    this.data.users.push(newUser);
    await this.save();
    return newUser;
  }

  async updateProduct(product: Product) {
    const idx = this.data.products.findIndex(p => p.id === product.id);
    if (idx > -1) this.data.products[idx] = product;
    else this.data.products.push({ ...product, id: 'p' + Date.now() });
    await this.save();
  }

  async updateStock(productId: string, delta: number) {
    const p = this.data.products.find(x => x.id === productId);
    if (p) {
      p.stockQty = Math.max(0, p.stockQty + delta);
      await this.save();
    }
  }

  async updateUser(user: User) {
    const idx = this.data.users.findIndex(u => u.id === user.id);
    if (idx > -1) this.data.users[idx] = user;
    await this.save();
  }


  getSchedules(salonId: string, date?: string) {
    let res = this.data.schedules.filter(s => s.salonId === salonId);
    if (date) res = res.filter(s => s.date === date);
    return res;
  }

  async cloneServices(sourceSalonId: string, targetSalonIds: string[]) {
    const sourceServices = this.data.services.filter(s => s.salonId === sourceSalonId);
    targetSalonIds.forEach(targetId => {
      const cloned = sourceServices.map(s => ({
        ...s,
        id: 'sv-' + Date.now() + Math.random().toString(36).substr(2, 5),
        salonId: targetId
      }));
      this.data.services.push(...cloned);
    });
    await this.save();
  }

  async toggleStaffSchedule(salonId: string, staffId: string, date: string) {
    const existingIdx = this.data.schedules.findIndex(s => s.salonId === salonId && s.staffId === staffId && s.date === date);
    if (existingIdx > -1) {
      this.data.schedules.splice(existingIdx, 1);
    } else {
      this.data.schedules.push({
        id: 'sch-' + Date.now() + Math.random(),
        salonId,
        staffId,
        date
      });
    }
    await this.save();
  }

  async updateService(service: Service) {
    const idx = this.data.services.findIndex(s => s.id === service.id);
    if (idx > -1) this.data.services[idx] = service;
    else this.data.services.push({ ...service, id: 'sv' + Date.now() });
    await this.save();
  }

  async updateSalon(salon: Salon) {
    const idx = this.data.salons.findIndex(s => s.id === salon.id);
    if (idx > -1) this.data.salons[idx] = salon;
    else this.data.salons.push({ ...salon, id: 's' + Date.now() });
    await this.save();
  }

  async deleteProduct(productId: string, role: string) {
    this.data.products = this.data.products.filter(p => p.id !== productId);
    await this.save();
  }

  async cancelSale(saleId: string, reason: string) {
    const sale = this.data.sales.find(s => s.id === saleId);
    if (sale) { sale.status = 'cancelled'; sale.cancelReason = reason; await this.save(); }
  }

  async addAppointment(apt: any) {
    const newApt = { ...apt, id: 'apt-' + Date.now() };
    this.data.appointments.push(newApt);
    await this.save();
    return newApt;
  }

  async updateAppointmentStatus(aptId: string, status: Appointment['status']) {
    const apt = this.data.appointments.find(a => a.id === aptId);
    if (apt) { apt.status = status; await this.save(); }
  }

  async deleteUser(userId: string, role?: string) {
    this.data.users = this.data.users.filter(u => u.id !== userId);
    await this.save();
  }

  async deleteSalon(salonId: string, role?: string) {
    this.data.salons = this.data.salons.filter(s => s.id !== salonId);
    await this.save();
  }

  async exportDatabase() {
    const dataStr = JSON.stringify(this.data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `salonflow_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async importDatabase(content: string) {
    try {
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === 'object' && parsed.users && parsed.salons) {
        this.data = parsed;
        await this.save();
        window.location.reload();
      }
    } catch (e) {
      console.error('Database import failed', e);
    }
  }

  // Method to view all users of an owner
  getOrganizationUsers(ownerId: string) {
    return this.data.users.filter(u => u.id === ownerId || u.ownerId === ownerId);
  }

  getOrganizationSalons(ownerId: string) {
    return this.data.salons.filter(s => s.ownerId === ownerId);
  }
  async wipeDatabase() {
    await this.simulateNetwork();
    // Destruction totale : on vide tout sauf le schéma de base
    this.data = {
      users: [],
      salons: [],
      services: [],
      products: [],
      sales: [],
      appointments: [],
      schedules: [],
      invoices: [],
      notifications: [],
      subscriptionLimits: {}
    };
    await this.save();
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  }
}

export const db = new MockDb();
