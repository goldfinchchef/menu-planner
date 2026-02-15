-- Migration: Add standalone delivery_stops for menu-based stops
-- This allows delivery stops to be created directly when menus are approved,
-- independent of delivery_runs.

-- 1. Add week_id and date columns to delivery_stops (if not exist)
ALTER TABLE delivery_stops ADD COLUMN IF NOT EXISTS week_id TEXT REFERENCES weeks(id) ON DELETE SET NULL;
ALTER TABLE delivery_stops ADD COLUMN IF NOT EXISTS date DATE;

-- 2. Make run_id nullable (stops can exist without a delivery run)
ALTER TABLE delivery_stops ALTER COLUMN run_id DROP NOT NULL;

-- 3. Add unique constraint on client_id + date (one stop per client per date)
-- First drop if exists for idempotency
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'delivery_stops_client_date_unique'
  ) THEN
    ALTER TABLE delivery_stops DROP CONSTRAINT delivery_stops_client_date_unique;
  END IF;
END $$;

-- Create the unique constraint (handles upserts by client+date)
ALTER TABLE delivery_stops
ADD CONSTRAINT delivery_stops_client_date_unique
UNIQUE (client_id, date);

-- 4. Add index for week_id queries
CREATE INDEX IF NOT EXISTS idx_delivery_stops_week_id ON delivery_stops(week_id);
CREATE INDEX IF NOT EXISTS idx_delivery_stops_date ON delivery_stops(date);

-- 5. Update status enum comments (for documentation)
-- Valid statuses: MENU_PLANNED, READY_FOR_DELIVERY, IN_PROGRESS, COMPLETED, CANCELLED

COMMENT ON COLUMN delivery_stops.status IS
'Status flow: MENU_PLANNED (menu approved) -> READY_FOR_DELIVERY (KDS complete) -> IN_PROGRESS -> COMPLETED/CANCELLED';
