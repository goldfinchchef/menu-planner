-- Goldfinch Chef Menu Planner - Supabase Schema
-- Run this SQL in your Supabase SQL Editor (https://supabase.com/dashboard)

-- 1. clients
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT,
  persons INTEGER DEFAULT 2,
  portions INTEGER DEFAULT 4,
  address TEXT,
  email TEXT,
  phone TEXT,
  notes TEXT,
  meals_per_week INTEGER DEFAULT 3,
  frequency TEXT DEFAULT 'weekly',
  status TEXT DEFAULT 'active',
  paused_date DATE,
  honeybook_link TEXT,
  billing_notes TEXT,
  delivery_day TEXT,
  zone TEXT,
  pickup BOOLEAN DEFAULT false,
  chef_choice BOOLEAN DEFAULT true,
  dietary_restrictions TEXT,
  plan_price DECIMAL(10,2),
  service_fee DECIMAL(10,2),
  prepay_discount BOOLEAN DEFAULT false,
  new_client_fee_paid BOOLEAN DEFAULT false,
  pays_own_groceries BOOLEAN DEFAULT false,
  access_code TEXT,
  delivery_dates JSONB DEFAULT '[]',
  bill_due_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. contacts (linked to clients)
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  full_name TEXT,
  display_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. recipes
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- protein, veg, starch, sauces, breakfast, soups
  instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(name, category)
);

-- 4. ingredients (master list)
CREATE TABLE ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  cost DECIMAL(10,2),
  unit TEXT,
  source TEXT,
  section TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. recipe_ingredients (join table)
CREATE TABLE recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE SET NULL,
  ingredient_name TEXT NOT NULL, -- denormalized for flexibility
  quantity DECIMAL(10,3),
  unit TEXT,
  cost DECIMAL(10,2),
  source TEXT,
  section TEXT
);

-- 6. menus (menu items assigned to clients)
CREATE TABLE menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  date DATE NOT NULL,
  protein TEXT,
  veg TEXT,
  starch TEXT,
  extras JSONB DEFAULT '[]',
  portions INTEGER,
  approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. weeks
CREATE TABLE weeks (
  id TEXT PRIMARY KEY, -- format: 2026-W04
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'draft', -- draft, locked
  snapshot JSONB,
  kds_status JSONB DEFAULT '{}',
  ready_for_delivery JSONB DEFAULT '[]',
  delivery_log JSONB DEFAULT '[]',
  grocery_bills JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  locked_at TIMESTAMPTZ,
  unlocked_at TIMESTAMPTZ
);

-- 8. deliveries
CREATE TABLE deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  week_id TEXT REFERENCES weeks(id),
  date DATE NOT NULL,
  dishes JSONB,
  portions INTEGER,
  cost DECIMAL(10,2),
  completed_at TIMESTAMPTZ,
  handoff_type TEXT,
  photo_data TEXT,
  driver TEXT,
  zone TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. drivers
CREATE TABLE drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  zone TEXT,
  access_code TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. billing_cycles
CREATE TABLE billing_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  cycle_number INTEGER,
  start_date DATE,
  end_date DATE,
  amount_due DECIMAL(10,2),
  paid BOOLEAN DEFAULT false,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. client_portal_data
CREATE TABLE client_portal_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL UNIQUE,
  selected_dates JSONB DEFAULT '[]',
  ingredient_picks JSONB DEFAULT '{}',
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 12. app_settings
CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for common queries
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_delivery_day ON clients(delivery_day);
CREATE INDEX idx_contacts_client_id ON contacts(client_id);
CREATE INDEX idx_recipes_category ON recipes(category);
CREATE INDEX idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
CREATE INDEX idx_menus_client_id ON menus(client_id);
CREATE INDEX idx_menus_date ON menus(date);
CREATE INDEX idx_deliveries_week_id ON deliveries(week_id);
CREATE INDEX idx_deliveries_date ON deliveries(date);
CREATE INDEX idx_billing_cycles_client_id ON billing_cycles(client_id);
CREATE INDEX idx_client_portal_data_client_id ON client_portal_data(client_id);

-- Enable Row Level Security (RLS) - policies can be added later for multi-user support
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_portal_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- For now, allow all operations with anon key (single-user mode)
-- These policies can be refined for multi-user support later
CREATE POLICY "Allow all for anon" ON clients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON contacts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON recipes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON ingredients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON recipe_ingredients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON menus FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON weeks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON deliveries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON drivers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON billing_cycles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON client_portal_data FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON app_settings FOR ALL USING (true) WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON recipes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ingredients_updated_at BEFORE UPDATE ON ingredients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_menus_updated_at BEFORE UPDATE ON menus FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_client_portal_data_updated_at BEFORE UPDATE ON client_portal_data FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_app_settings_updated_at BEFORE UPDATE ON app_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
