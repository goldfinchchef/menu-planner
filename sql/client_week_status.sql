-- client_week_status table
-- Stores planning intent (unconfirmed, skipped) separate from actual menu data
-- A row in menus = confirmed; this table handles pre-confirmation states

CREATE TABLE IF NOT EXISTS client_week_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  week_id TEXT NOT NULL,  -- e.g., "2026-W12"
  status TEXT NOT NULL CHECK (status IN ('unconfirmed', 'skipped')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, week_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_client_week_status_client_id ON client_week_status(client_id);
CREATE INDEX IF NOT EXISTS idx_client_week_status_week_id ON client_week_status(week_id);
CREATE INDEX IF NOT EXISTS idx_client_week_status_status ON client_week_status(status);

-- Enable RLS
ALTER TABLE client_week_status ENABLE ROW LEVEL SECURITY;

-- RLS policy (permissive for single-user mode)
DROP POLICY IF EXISTS "anon_client_week_status_all" ON client_week_status;
CREATE POLICY "anon_client_week_status_all" ON client_week_status FOR ALL USING (true) WITH CHECK (true);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_client_week_status_updated_at ON client_week_status;
CREATE TRIGGER update_client_week_status_updated_at
  BEFORE UPDATE ON client_week_status
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
