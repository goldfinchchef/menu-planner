-- Verification Queries for Route Saving
-- Run these in Supabase SQL Editor to verify routes are being saved

-- 1. Show all delivery runs with stop counts
SELECT
  id,
  week_id,
  date,
  zone,
  driver_name,
  total_stops,
  jsonb_array_length(COALESCE(stops, '[]'::jsonb)) as actual_stop_count,
  status,
  updated_at
FROM public.delivery_runs
ORDER BY week_id DESC, date DESC, zone
LIMIT 20;

-- 2. Show stop counts per run (grouped summary)
SELECT
  week_id,
  date,
  zone,
  driver_name,
  jsonb_array_length(COALESCE(stops, '[]'::jsonb)) as stop_count
FROM public.delivery_runs
WHERE week_id IS NOT NULL
ORDER BY week_id DESC, date, zone;

-- 3. Show detailed stops for most recent run
SELECT
  id,
  week_id,
  date,
  zone,
  stops
FROM public.delivery_runs
ORDER BY updated_at DESC
LIMIT 1;

-- 4. Count total runs by week
SELECT
  week_id,
  COUNT(*) as run_count,
  SUM(jsonb_array_length(COALESCE(stops, '[]'::jsonb))) as total_stops
FROM public.delivery_runs
GROUP BY week_id
ORDER BY week_id DESC;

-- 5. Verify unique constraint exists
SELECT conname, contype, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.delivery_runs'::regclass
  AND conname = 'delivery_runs_week_date_zone_key';
