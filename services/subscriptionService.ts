
export type SubscriptionTier = 'FREE' | 'STARTER' | 'PRO' | 'ELITE';

export interface Plan {
  id: SubscriptionTier;
  name: string;
  price: number;
  features: string[];
  maxSalons: number;
  maxStaff: number;
  maxTicketsMonth: number;
  aiIncluded: boolean;
  highlight?: boolean;
}

export const PLANS: Plan[] = [
  {
    id: 'FREE',
    name: 'Découverte',
    price: 0,
    features: ['1 Salon', '1 Utilisateur Unique', '30 Tickets / mois', 'Support Email'],
    maxSalons: 1,
    maxStaff: 1,
    maxTicketsMonth: 30,
    aiIncluded: false
  },
  {
    id: 'STARTER',
    name: 'Salon Solo',
    price: 29,
    features: ['1 Salon', '2 Employés max', 'Tickets Illimités', 'Gestion Stock'],
    maxSalons: 1,
    maxStaff: 2,
    maxTicketsMonth: 999999,
    aiIncluded: false
  },
  {
    id: 'PRO',
    name: 'Multi-Salon Pro',
    price: 79,
    features: ['Jusqu\'à 3 Salons', '10 Employés max', 'Statistiques Avancées', 'Export Comptable'],
    maxSalons: 3,
    maxStaff: 10,
    maxTicketsMonth: 999999,
    aiIncluded: false,
    highlight: true
  },
  {
    id: 'ELITE',
    name: 'Empire Coiffure',
    price: 199,
    features: ['Salons Illimités', 'Staff Illimité', 'API Accès Direct', 'Support Dédié 24h'],
    maxSalons: 99,
    maxStaff: 999,
    maxTicketsMonth: 999999,
    aiIncluded: false
  }
];

export class SubscriptionService {
  static getPlan(tier: SubscriptionTier): Plan {
    return PLANS.find(p => p.id === tier) || PLANS[0];
  }

  static isFeatureAvailable(userTier: SubscriptionTier, feature: 'ADVANCED_STATS' | 'MULTI_SALON'): boolean {
    const plan = this.getPlan(userTier);
    if (feature === 'ADVANCED_STATS') return plan.id === 'PRO' || plan.id === 'ELITE';
    if (feature === 'MULTI_SALON') return plan.maxSalons > 1;
    return true;
  }
}
