-- Migration: Add stops JSONB column to delivery_runs table
-- This simplifies route storage by embedding stops as JSONB instead of using delivery_stops table

-- Add stops JSONB column if it doesn't exist
ALTER TABLE public.delivery_runs
ADD COLUMN IF NOT EXISTS stops JSONB DEFAULT '[]';

-- Add unique constraint on (week_id, date, zone) for upsert
-- Drop existing constraint if any, then add
DO $$
BEGIN
  -- Try to drop the constraint if it exists
  ALTER TABLE public.delivery_runs DROP CONSTRAINT IF EXISTS delivery_runs_week_date_zone_key;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create unique constraint
ALTER TABLE public.delivery_runs
ADD CONSTRAINT delivery_runs_week_date_zone_key UNIQUE (week_id, date, zone);

-- Add updated_at column if missing
ALTER TABLE public.delivery_runs
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_delivery_runs_week_date ON public.delivery_runs (week_id, date);
CREATE INDEX IF NOT EXISTS idx_delivery_runs_zone_date ON public.delivery_runs (zone, date);

-- Add comment
COMMENT ON COLUMN public.delivery_runs.stops IS 'JSONB array of stops: [{client_id, client_name, display_name, address, zone, pickup, order, dishes, portions}]';
