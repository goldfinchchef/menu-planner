-- Migration: Recurring Client Add-ons
-- Adds support for recurring add-on dishes (salad, breakfast, soup, etc.)
-- that clients receive in addition to their normal dinner plan

-- ============================================================
-- 1. Add recurring_addons to clients table
-- ============================================================

-- Stores the client's recurring add-on commitments
-- Structure: [{ type: "Salad", portions: 4, price: 50.00 }, ...]
ALTER TABLE clients ADD COLUMN IF NOT EXISTS recurring_addons JSONB DEFAULT '[]';

-- ============================================================
-- 2. Add add-on fields to menus table
-- ============================================================

-- Flag to identify add-on menu rows (vs dinner meals)
ALTER TABLE menus ADD COLUMN IF NOT EXISTS is_addon BOOLEAN DEFAULT false;

-- Type of add-on (Salad, Breakfast, Soup, Other)
ALTER TABLE menus ADD COLUMN IF NOT EXISTS addon_type TEXT;

-- Selected recipe for this week's add-on (empty until selected in Menu Builder)
ALTER TABLE menus ADD COLUMN IF NOT EXISTS addon_recipe TEXT;

-- Snapshot of the add-on price at generation time (for historical accuracy)
ALTER TABLE menus ADD COLUMN IF NOT EXISTS addon_price NUMERIC(10,2);

-- ============================================================
-- 3. Add index for add-on queries
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_menus_is_addon ON menus(is_addon) WHERE is_addon = true;

-- ============================================================
-- Verification
-- ============================================================

DO $$
BEGIN
  -- Check clients.recurring_addons exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'recurring_addons') THEN
    RAISE NOTICE 'clients.recurring_addons column added successfully';
  END IF;

  -- Check menus addon columns exist
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'menus' AND column_name = 'is_addon') THEN
    RAISE NOTICE 'menus.is_addon column added successfully';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'menus' AND column_name = 'addon_type') THEN
    RAISE NOTICE 'menus.addon_type column added successfully';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'menus' AND column_name = 'addon_recipe') THEN
    RAISE NOTICE 'menus.addon_recipe column added successfully';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'menus' AND column_name = 'addon_price') THEN
    RAISE NOTICE 'menus.addon_price column added successfully';
  END IF;
END $$;
