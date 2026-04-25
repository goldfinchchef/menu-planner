-- Migration: Base Weekly Menus (Menu-First Model)
-- Creates tables and columns for base menu inheritance
-- Test environment only - fully backward compatible

-- ============================================================
-- 1. base_weekly_menus table
-- ============================================================

CREATE TABLE IF NOT EXISTS base_weekly_menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id TEXT NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
  meal_index INTEGER NOT NULL CHECK (meal_index BETWEEN 1 AND 4),
  protein TEXT,
  veg TEXT,
  starch TEXT,
  extras JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (week_id, meal_index)
);

-- Index for fast week lookups
CREATE INDEX IF NOT EXISTS idx_base_weekly_menus_week_id ON base_weekly_menus(week_id);

-- Enable RLS
ALTER TABLE base_weekly_menus ENABLE ROW LEVEL SECURITY;

-- RLS policy (permissive for single-user mode)
DROP POLICY IF EXISTS "anon_base_weekly_menus_all" ON base_weekly_menus;
CREATE POLICY "anon_base_weekly_menus_all" ON base_weekly_menus FOR ALL USING (true) WITH CHECK (true);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_base_weekly_menus_updated_at ON base_weekly_menus;
CREATE TRIGGER update_base_weekly_menus_updated_at
  BEFORE UPDATE ON base_weekly_menus
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 2. Add columns to menus table
-- ============================================================

-- Track inheritance from base menu
ALTER TABLE menus ADD COLUMN IF NOT EXISTS inherited_from_base BOOLEAN DEFAULT false;

-- Track which base meal this came from (1-4)
ALTER TABLE menus ADD COLUMN IF NOT EXISTS base_meal_index INTEGER;

-- ============================================================
-- 3. client_meal_assignments table
-- ============================================================

CREATE TABLE IF NOT EXISTS client_meal_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  week_id TEXT NOT NULL,
  assigned_meals INTEGER[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (client_id, week_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_client_meal_assignments_client_id ON client_meal_assignments(client_id);
CREATE INDEX IF NOT EXISTS idx_client_meal_assignments_week_id ON client_meal_assignments(week_id);

-- Enable RLS
ALTER TABLE client_meal_assignments ENABLE ROW LEVEL SECURITY;

-- RLS policy (permissive for single-user mode)
DROP POLICY IF EXISTS "anon_client_meal_assignments_all" ON client_meal_assignments;
CREATE POLICY "anon_client_meal_assignments_all" ON client_meal_assignments FOR ALL USING (true) WITH CHECK (true);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_client_meal_assignments_updated_at ON client_meal_assignments;
CREATE TRIGGER update_client_meal_assignments_updated_at
  BEFORE UPDATE ON client_meal_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Verification
-- ============================================================

DO $$
BEGIN
  -- Check base_weekly_menus exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'base_weekly_menus') THEN
    RAISE NOTICE 'base_weekly_menus table created successfully';
  END IF;

  -- Check menus columns exist
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'menus' AND column_name = 'inherited_from_base') THEN
    RAISE NOTICE 'menus.inherited_from_base column added successfully';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'menus' AND column_name = 'base_meal_index') THEN
    RAISE NOTICE 'menus.base_meal_index column added successfully';
  END IF;

  -- Check client_meal_assignments exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_meal_assignments') THEN
    RAISE NOTICE 'client_meal_assignments table created successfully';
  END IF;
END $$;
