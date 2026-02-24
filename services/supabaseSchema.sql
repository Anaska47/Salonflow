
-- ============================================================
-- SCHEMA DE PRODUCTION SALONFLOW (B2B SaaS)
-- Version: 2.0 - Migration complète depuis mockDb
-- ============================================================

-- 1. Activer l'extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 2. TABLE : profiles (Propriétaires - liés à Supabase Auth)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT CHECK (role IN ('OWNER', 'MANAGER', 'STAFF')) DEFAULT 'OWNER',
  owner_id UUID REFERENCES profiles(id),
  salons UUID[] DEFAULT '{}',
  subscription_status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 3. TABLE : staff (Invitations & collaborateurs non-auth)
-- ============================================================
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  auth_id UUID REFERENCES auth.users(id),
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT CHECK (role IN ('MANAGER', 'STAFF')) DEFAULT 'STAFF',
  salons UUID[] DEFAULT '{}',
  is_bookable BOOLEAN DEFAULT true,
  can_view_own_schedule BOOLEAN DEFAULT true,
  restrict_to_current_day BOOLEAN DEFAULT false,
  status TEXT CHECK (status IN ('INVITED', 'ACTIVE')) DEFAULT 'INVITED',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(owner_id, email)
);

-- ============================================================
-- 4. TABLE : salons
-- ============================================================
CREATE TABLE IF NOT EXISTS salons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT DEFAULT '',
  total_workstations INTEGER DEFAULT 4,
  booking_workstations INTEGER DEFAULT 2,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 5. TABLE : services
-- ============================================================
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  duration INTEGER NOT NULL DEFAULT 30,  -- en minutes
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 6. TABLE : products (Stock)
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  stock_qty INTEGER DEFAULT 0,
  alert_threshold INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 7. TABLE : sales (Transactions caisse)
-- ============================================================
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  staff_id TEXT NOT NULL,          -- UID (peut être mockDb ou Supabase)
  staff_name TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',
  total_ca DECIMAL(10,2) DEFAULT 0,
  total_products DECIMAL(10,2) DEFAULT 0,
  tip_amount DECIMAL(10,2) DEFAULT 0,
  paid_amount DECIMAL(10,2) DEFAULT 0,
  payment_method TEXT DEFAULT 'Carte',
  status TEXT CHECK (status IN ('valid', 'cancelled')) DEFAULT 'valid',
  cancel_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 8. TABLE : appointments (Rendez-vous)
-- ============================================================
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  staff_id TEXT DEFAULT 'any',
  staff_name TEXT DEFAULT 'Au choix',
  service_id TEXT NOT NULL,
  service_name TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT DEFAULT '',
  start_time TIMESTAMPTZ NOT NULL,
  duration INTEGER DEFAULT 30,  -- en minutes
  status TEXT CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 9. TABLE : staff_schedules (Présences planifiées)
-- ============================================================
CREATE TABLE IF NOT EXISTS staff_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  staff_id TEXT NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(salon_id, staff_id, date)
);

-- ============================================================
-- 10. TABLE : subscriptions
-- ============================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id TEXT DEFAULT 'FREE',
  status TEXT DEFAULT 'active',
  max_salons INTEGER DEFAULT 1,
  max_staff INTEGER DEFAULT 1,
  current_period_end TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 11. TABLE : invoices (Factures)
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  amount DECIMAL(10,2) DEFAULT 0,
  plan TEXT DEFAULT 'FREE',
  status TEXT CHECK (status IN ('paid', 'pending')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 12. SÉCURITÉ : Row Level Security (RLS)
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE salons ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Profiles: each user can read/update their own profile
CREATE POLICY "profiles_self" ON profiles FOR ALL USING (id = auth.uid());

-- Staff: owner can manage their staff
CREATE POLICY "staff_owner_manage" ON staff FOR ALL USING (owner_id = auth.uid());

-- Salons: owner can manage their salons
CREATE POLICY "salons_owner_manage" ON salons FOR ALL USING (owner_id = auth.uid());

-- Services: accessible if salon belongs to owner
CREATE POLICY "services_owner_manage" ON services FOR ALL USING (
  salon_id IN (SELECT id FROM salons WHERE owner_id = auth.uid())
);

-- Products: accessible if salon belongs to owner
CREATE POLICY "products_owner_manage" ON products FOR ALL USING (
  salon_id IN (SELECT id FROM salons WHERE owner_id = auth.uid())
);

-- Sales: accessible if salon belongs to owner
CREATE POLICY "sales_owner_manage" ON sales FOR ALL USING (
  salon_id IN (SELECT id FROM salons WHERE owner_id = auth.uid())
);

-- Appointments: accessible if salon belongs to owner
CREATE POLICY "appointments_owner_manage" ON appointments FOR ALL USING (
  salon_id IN (SELECT id FROM salons WHERE owner_id = auth.uid())
);

-- Public appointment insert (for booking page)
CREATE POLICY "appointments_public_insert" ON appointments FOR INSERT WITH CHECK (true);

-- Staff schedules: owner manages
CREATE POLICY "schedules_owner_manage" ON staff_schedules FOR ALL USING (
  salon_id IN (SELECT id FROM salons WHERE owner_id = auth.uid())
);

-- Subscriptions: owner sees their own
CREATE POLICY "subscriptions_self" ON subscriptions FOR ALL USING (owner_id = auth.uid());

-- Invoices: owner sees their own
CREATE POLICY "invoices_owner" ON invoices FOR ALL USING (owner_id = auth.uid());
