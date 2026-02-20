
-- SCHEMA DE PRODUCTION SALONFLOW (B2B SaaS)

-- 1. Table des profils (Authentification via Supabase Auth)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT CHECK (role IN ('OWNER', 'MANAGER', 'STAFF')),
  owner_id UUID REFERENCES profiles(id), -- Pour le STAFF/MANAGER, pointe vers l'OWNER
  salons UUID[] DEFAULT '{}',            -- IDs des salons auxquels l'utilisateur a accès
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Table des abonnements (Géré par Stripe via Webhooks)
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL, -- 'STARTER', 'PRO', 'ELITE'
  status TEXT NOT NULL,  -- 'active', 'trialing', 'canceled'
  current_period_end TIMESTAMPTZ,
  max_salons INTEGER NOT NULL DEFAULT 1,
  max_staff INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Table des salons
CREATE TABLE salons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Services et Produits
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID REFERENCES salons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID REFERENCES salons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  stock_qty INTEGER DEFAULT 0,
  alert_threshold INTEGER DEFAULT 5
);

-- 5. Table des ventes
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID REFERENCES salons(id),
  staff_id UUID REFERENCES profiles(id),
  total_ca DECIMAL(10,2) NOT NULL,
  tip_amount DECIMAL(10,2) DEFAULT 0,
  payment_method TEXT,
  status TEXT DEFAULT 'valid',
  items JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Sécurité RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE salons ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- Les membres voient les autres membres de la même organisation (même owner)
CREATE POLICY "View organization members" ON profiles
  FOR SELECT USING (
    id = auth.uid() OR 
    owner_id = (SELECT owner_id FROM profiles WHERE id = auth.uid()) OR
    owner_id = auth.uid()
  );

-- Seul l'owner peut ajouter ses membres
CREATE POLICY "Owners can manage organization staff" ON profiles
  FOR ALL USING (owner_id = auth.uid() OR id = auth.uid());

-- Vue des salons autorisés
CREATE POLICY "View authorized salons" ON salons
  FOR SELECT USING (
    id = ANY( (SELECT salons FROM profiles WHERE id = auth.uid()) ) OR
    owner_id = auth.uid()
  );

-- Vue des ventes autorisées
CREATE POLICY "View authorized sales" ON sales
  FOR SELECT USING (
    salon_id = ANY( (SELECT salons FROM profiles WHERE id = auth.uid()) )
  );
