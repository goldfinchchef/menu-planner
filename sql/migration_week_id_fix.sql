-- Migration: Fix week identity model and menu.week_id population
-- Run this migration in Supabase SQL Editor

-- ============================================================
-- STEP 1: Fix menus unique constraint to include meal_index
-- ============================================================

-- Drop old constraint if exists
ALTER TABLE menus DROP CONSTRAINT IF EXISTS menus_client_name_date_key;

-- Create new constraint with meal_index (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'menus_client_name_date_meal_index_key'
  ) THEN
    ALTER TABLE menus
    ADD CONSTRAINT menus_client_name_date_meal_index_key
    UNIQUE (client_name, date, meal_index);
  END IF;
END $$;

-- Ensure meal_index has a default value
ALTER TABLE menus ALTER COLUMN meal_index SET DEFAULT 1;

-- ============================================================
-- STEP 2: Create helper function to get week_id from date
-- ============================================================

CREATE OR REPLACE FUNCTION get_week_id(date_val DATE)
RETURNS TEXT AS $$
DECLARE
  year_val INT;
  week_num INT;
  thursday DATE;
  jan4 DATE;
BEGIN
  -- Thursday of current week decides the year (ISO week)
  thursday := date_val + (3 - EXTRACT(DOW FROM date_val + 1)::INT);
  year_val := EXTRACT(YEAR FROM thursday);

  -- January 4 is always in week 1
  jan4 := (year_val::TEXT || '-01-04')::DATE;

  -- Calculate week number
  week_num := 1 + ((thursday - jan4 + (EXTRACT(DOW FROM jan4 + 1)::INT - 1)) / 7)::INT;

  RETURN year_val::TEXT || '-W' || LPAD(week_num::TEXT, 2, '0');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================
-- STEP 3: Backfill existing menus with week_id
-- ============================================================

-- First, ensure weeks exist for all menu dates
INSERT INTO weeks (id, start_date, end_date, status)
SELECT DISTINCT
  get_week_id(date) AS id,
  (date - EXTRACT(DOW FROM date)::INT + 1)::DATE AS start_date,  -- Monday
  (date - EXTRACT(DOW FROM date)::INT + 7)::DATE AS end_date     -- Sunday
FROM menus
WHERE date IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- Update menus to set week_id based on date
UPDATE menus
SET week_id = get_week_id(date)
WHERE date IS NOT NULL AND week_id IS NULL;

-- ============================================================
-- STEP 4: Add trigger to auto-populate week_id on insert/update
-- ============================================================

CREATE OR REPLACE FUNCTION set_menu_week_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-populate week_id from date if not provided
  IF NEW.week_id IS NULL AND NEW.date IS NOT NULL THEN
    NEW.week_id := get_week_id(NEW.date);

    -- Ensure the week exists
    INSERT INTO weeks (id, start_date, end_date, status)
    VALUES (
      NEW.week_id,
      (NEW.date - EXTRACT(DOW FROM NEW.date)::INT + 1)::DATE,
      (NEW.date - EXTRACT(DOW FROM NEW.date)::INT + 7)::DATE,
      'draft'
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS set_menu_week_id_trigger ON menus;

CREATE TRIGGER set_menu_week_id_trigger
BEFORE INSERT OR UPDATE ON menus
FOR EACH ROW
EXECUTE FUNCTION set_menu_week_id();

-- ============================================================
-- STEP 5: Verify migration
-- ============================================================

-- Check menus with week_id populated
DO $$
DECLARE
  total_menus INT;
  menus_with_week_id INT;
BEGIN
  SELECT COUNT(*) INTO total_menus FROM menus;
  SELECT COUNT(*) INTO menus_with_week_id FROM menus WHERE week_id IS NOT NULL;

  RAISE NOTICE 'Migration complete: % of % menus now have week_id', menus_with_week_id, total_menus;
END $$;
