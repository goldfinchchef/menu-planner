-- Migration: HoneyBook Integration Fields
-- Adds project-level fields to clients and invoice-level fields to billing_cycles
-- Safe to run multiple times (idempotent)

-- ============================================================
-- CLIENTS: Add HoneyBook project-level fields
-- ============================================================

-- Project ID from HoneyBook (unique identifier for the project)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS honeybook_project_id TEXT;

-- Direct URL to the project in HoneyBook
ALTER TABLE clients ADD COLUMN IF NOT EXISTS honeybook_project_url TEXT;

-- Partial unique index: only enforce uniqueness when value is NOT NULL
-- This allows multiple clients to have NULL (no HoneyBook project linked)
DROP INDEX IF EXISTS idx_clients_honeybook_project_id_unique;
CREATE UNIQUE INDEX idx_clients_honeybook_project_id_unique
  ON clients(honeybook_project_id)
  WHERE honeybook_project_id IS NOT NULL;

-- ============================================================
-- BILLING_CYCLES: Add HoneyBook invoice-level fields
-- ============================================================

-- Invoice ID from HoneyBook (unique identifier for the invoice)
ALTER TABLE billing_cycles ADD COLUMN IF NOT EXISTS honeybook_invoice_id TEXT;

-- Direct URL to the invoice in HoneyBook
ALTER TABLE billing_cycles ADD COLUMN IF NOT EXISTS honeybook_invoice_url TEXT;

-- Timestamp of last sync from HoneyBook (for debugging/audit)
ALTER TABLE billing_cycles ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- Partial unique index: only enforce uniqueness when value is NOT NULL
-- This allows multiple billing_cycles to have NULL (not linked to HoneyBook)
DROP INDEX IF EXISTS idx_billing_cycles_honeybook_invoice_id_unique;
CREATE UNIQUE INDEX idx_billing_cycles_honeybook_invoice_id_unique
  ON billing_cycles(honeybook_invoice_id)
  WHERE honeybook_invoice_id IS NOT NULL;

-- Lookup index for Zapier queries by invoice ID
DROP INDEX IF EXISTS idx_billing_cycles_honeybook_invoice_id;
CREATE INDEX IF NOT EXISTS idx_billing_cycles_honeybook_invoice_id
  ON billing_cycles(honeybook_invoice_id)
  WHERE honeybook_invoice_id IS NOT NULL;

-- ============================================================
-- VERIFICATION
-- ============================================================

DO $$
BEGIN
  -- Verify clients columns
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'honeybook_project_id'
  ) THEN
    RAISE NOTICE 'clients.honeybook_project_id: OK';
  ELSE
    RAISE WARNING 'clients.honeybook_project_id: MISSING';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'honeybook_project_url'
  ) THEN
    RAISE NOTICE 'clients.honeybook_project_url: OK';
  ELSE
    RAISE WARNING 'clients.honeybook_project_url: MISSING';
  END IF;

  -- Verify billing_cycles columns
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'billing_cycles' AND column_name = 'honeybook_invoice_id'
  ) THEN
    RAISE NOTICE 'billing_cycles.honeybook_invoice_id: OK';
  ELSE
    RAISE WARNING 'billing_cycles.honeybook_invoice_id: MISSING';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'billing_cycles' AND column_name = 'honeybook_invoice_url'
  ) THEN
    RAISE NOTICE 'billing_cycles.honeybook_invoice_url: OK';
  ELSE
    RAISE WARNING 'billing_cycles.honeybook_invoice_url: MISSING';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'billing_cycles' AND column_name = 'last_synced_at'
  ) THEN
    RAISE NOTICE 'billing_cycles.last_synced_at: OK';
  ELSE
    RAISE WARNING 'billing_cycles.last_synced_at: MISSING';
  END IF;

  -- Verify indexes
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_clients_honeybook_project_id_unique'
  ) THEN
    RAISE NOTICE 'idx_clients_honeybook_project_id_unique: OK';
  ELSE
    RAISE WARNING 'idx_clients_honeybook_project_id_unique: MISSING';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_billing_cycles_honeybook_invoice_id_unique'
  ) THEN
    RAISE NOTICE 'idx_billing_cycles_honeybook_invoice_id_unique: OK';
  ELSE
    RAISE WARNING 'idx_billing_cycles_honeybook_invoice_id_unique: MISSING';
  END IF;

END $$;

-- ============================================================
-- EXISTING COLUMNS REFERENCE (do not modify)
-- ============================================================
--
-- clients (existing HoneyBook-related):
--   honeybook_link TEXT        -- legacy: single invoice URL, cleared on payment
--   bill_due_date DATE         -- payment due date
--   billing_notes TEXT         -- free-form notes
--
-- billing_cycles (existing):
--   client_id UUID             -- FK to clients
--   client_name TEXT           -- denormalized
--   cycle_number INTEGER       -- sequential cycle number
--   start_date DATE            -- cycle start
--   end_date DATE              -- cycle end
--   due_date DATE              -- payment due
--   plan_amount DECIMAL        -- meal plan amount
--   service_fee DECIMAL        -- service fee
--   grocery_cost DECIMAL       -- grocery reimbursement
--   adjustments DECIMAL        -- credits/debits
--   total_due DECIMAL          -- final amount due
--   status TEXT                -- pending/invoiced/paid/overdue/cancelled
--   paid BOOLEAN               -- payment received
--   paid_at TIMESTAMPTZ        -- when paid
--   payment_method TEXT        -- card/ACH/check/etc
--   payment_reference TEXT     -- transaction ID
--   invoiced_at TIMESTAMPTZ    -- when invoice sent
--   notes TEXT                 -- billing notes
--
