-- Migration: Enable route saving to delivery_runs table
-- Run this in Supabase SQL Editor to enable Save Route functionality

-- 1. Add stops JSONB column if it doesn't exist
ALTER TABLE public.delivery_runs
ADD COLUMN IF NOT EXISTS stops JSONB DEFAULT '[]';

-- 2. Add unique constraint for upsert on (week_id, date, zone)
-- Drop existing constraint if it exists (for idempotency)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'delivery_runs_week_date_zone_key'
  ) THEN
    ALTER TABLE public.delivery_runs DROP CONSTRAINT delivery_runs_week_date_zone_key;
  END IF;
END $$;

-- Create the unique constraint
ALTER TABLE public.delivery_runs
ADD CONSTRAINT delivery_runs_week_date_zone_key UNIQUE (week_id, date, zone);

-- 3. Add updated_at column if missing
ALTER TABLE public.delivery_runs
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 4. Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_delivery_runs_week_date ON public.delivery_runs (week_id, date);
CREATE INDEX IF NOT EXISTS idx_delivery_runs_zone ON public.delivery_runs (zone);

-- 5. Add comment documenting the stops JSONB structure
COMMENT ON COLUMN public.delivery_runs.stops IS
'JSONB array of stops: [{order, client_id, client_name, display_name, address, phone, zone, pickup, dishes, portions, status}]';

-- 6. Verification: Show table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'delivery_runs'
ORDER BY ordinal_position;

-- 7. Verification: Show constraints
SELECT conname, contype, pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public.delivery_runs'::regclass;
