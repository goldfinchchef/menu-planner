-- Migration: Create view v_delivery_stops_from_menus
-- Source of truth for delivery stops derived from approved menus
-- One row per (week_id, date, client_id) for clients with at least one approved menu row

-- Drop existing view if it exists
DROP VIEW IF EXISTS public.v_delivery_stops_from_menus;

-- Create the view
CREATE VIEW public.v_delivery_stops_from_menus AS
WITH approved_menu_stops AS (
  -- Get unique (week_id, date, client_name) combinations from approved menus
  SELECT DISTINCT
    m.week_id,
    m.date,
    m.client_name
  FROM public.menus m
  WHERE m.approved = true
    AND m.week_id IS NOT NULL
    AND m.date IS NOT NULL
),

-- Get primary contact address for each client
-- Prefer is_primary = true, then most recently created
client_primary_contact AS (
  SELECT DISTINCT ON (c.id)
    c.id AS client_id,
    c.name AS client_name,
    c.display_name,
    c.zone,
    c.delivery_day,
    c.pickup,
    ct.address AS contact_address,
    ct.id AS contact_id
  FROM public.clients c
  LEFT JOIN public.contacts ct ON ct.client_id = c.id
  ORDER BY
    c.id,
    ct.is_primary DESC NULLS LAST,  -- Primary contacts first
    ct.created_at DESC NULLS LAST    -- Most recent if no primary
),

-- Fallback: get any contact address if primary has no address
client_any_contact AS (
  SELECT DISTINCT ON (c.id)
    c.id AS client_id,
    ct.address AS fallback_address
  FROM public.clients c
  LEFT JOIN public.contacts ct ON ct.client_id = c.id AND ct.address IS NOT NULL AND ct.address != ''
  ORDER BY c.id, ct.created_at DESC NULLS LAST
)

SELECT
  ams.week_id,
  ams.date,
  cpc.client_id,
  ams.client_name,
  COALESCE(cpc.display_name, ams.client_name) AS display_name,
  cpc.zone,
  cpc.delivery_day,
  COALESCE(cpc.pickup, false) AS pickup,
  -- Address priority: primary contact address > any contact address > clients.address (not used per requirements)
  COALESCE(
    NULLIF(cpc.contact_address, ''),
    cac.fallback_address
  ) AS address,
  -- Include contact_id for debugging
  cpc.contact_id
FROM approved_menu_stops ams
LEFT JOIN client_primary_contact cpc
  ON LOWER(TRIM(cpc.client_name)) = LOWER(TRIM(ams.client_name))
LEFT JOIN client_any_contact cac
  ON cac.client_id = cpc.client_id
ORDER BY ams.date, cpc.zone NULLS LAST, COALESCE(cpc.display_name, ams.client_name);

-- Add comment for documentation
COMMENT ON VIEW public.v_delivery_stops_from_menus IS
'Delivery stops derived from approved menus. One row per (week_id, date, client_id).
Address sourced from contacts table (primary contact preferred).
This is the single source of truth for delivery visibility.';

-- Grant access
GRANT SELECT ON public.v_delivery_stops_from_menus TO authenticated;
GRANT SELECT ON public.v_delivery_stops_from_menus TO anon;
