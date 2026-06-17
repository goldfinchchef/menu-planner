# Zapier + HoneyBook Field Mapping Guide

## Priority Workflow: Payment Received → Confirm Next 4 Dates

This is the primary automation: when a client pays their invoice in HoneyBook, automatically confirm their next 4 requested delivery dates.

---

## Zap 1: Payment Received

### Trigger
**App:** HoneyBook
**Event:** Payment Received (or Invoice Paid)

### Step 1: Update billing_cycles

**App:** Supabase
**Action:** Update Row
**Table:** `billing_cycles`

| Filter | Value |
|--------|-------|
| `honeybook_invoice_id` | `={{invoice_id}}` |

| Column | Zapier Value |
|--------|--------------|
| `status` | `paid` |
| `paid` | `true` |
| `paid_at` | `={{payment_date}}` or `={{zap_meta_human_now}}` |
| `payment_method` | `={{payment_method}}` (if available) |
| `payment_reference` | `={{transaction_id}}` (if available) |
| `last_synced_at` | `={{zap_meta_human_now}}` |

### Step 2: Look Up Client

**App:** Supabase
**Action:** Find Row
**Table:** `billing_cycles`

| Filter | Value |
|--------|-------|
| `honeybook_invoice_id` | `={{invoice_id}}` |

**Output:** `client_id`, `client_name`

### Step 3: Confirm Next 4 Dates (Webhook)

**App:** Webhooks by Zapier
**Action:** POST
**URL:** `https://YOUR_SUPABASE_PROJECT.supabase.co/rest/v1/rpc/confirm_next_dates`

Or call your app's API endpoint if you have one.

**Alternative:** Use Supabase Edge Function or direct database update.

---

## Zap 2: Invoice Sent

### Trigger
**App:** HoneyBook
**Event:** Invoice Sent (or Payment Request Created)

### Step 1: Look Up Client by Project ID

**App:** Supabase
**Action:** Find Row
**Table:** `clients`

| Filter | Value |
|--------|-------|
| `honeybook_project_id` | `={{project_id}}` |

**Output:** `id`, `name`

### Step 2: Upsert billing_cycles Row

**App:** Supabase
**Action:** Insert Row (or Update if exists)
**Table:** `billing_cycles`

| Column | Zapier Value | Notes |
|--------|--------------|-------|
| `client_id` | `={{Step1.id}}` | From lookup |
| `client_name` | `={{Step1.name}}` | From lookup |
| `honeybook_invoice_id` | `={{invoice_id}}` | From HoneyBook |
| `honeybook_invoice_url` | `https://app.honeybook.com/app/invoices/={{invoice_id}}` | Constructed |
| `status` | `invoiced` | Fixed |
| `invoiced_at` | `={{sent_date}}` or `={{zap_meta_human_now}}` | When sent |
| `due_date` | `={{due_date}}` | From HoneyBook if available |
| `total_due` | `={{amount}}` | From HoneyBook |
| `last_synced_at` | `={{zap_meta_human_now}}` | Current time |

### Step 3: Update Legacy honeybook_link (Optional)

**App:** Supabase
**Action:** Update Row
**Table:** `clients`

| Filter | Value |
|--------|-------|
| `honeybook_project_id` | `={{project_id}}` |

| Column | Value |
|--------|-------|
| `honeybook_link` | `https://app.honeybook.com/app/invoices/={{invoice_id}}` |
| `bill_due_date` | `={{due_date}}` |

---

## Zap 3: Project Booked (Meal Service)

### Trigger
**App:** HoneyBook
**Event:** New Project (or Project Status Changed to Booked)

### Filter
Only continue if project type is "Meal Service":
```
project_type CONTAINS "Meal Service"
OR pipeline_name EQUALS "Meal Service"
```

### Step 1: Find Client by Name or Email

**App:** Supabase
**Action:** Find Row
**Table:** `clients`

| Filter | Value |
|--------|-------|
| `name` | `={{client_name}}` |

Or if name matching is unreliable:

| Filter | Value |
|--------|-------|
| `email` | `={{client_email}}` |

### Step 2: Update Client with Project ID

**App:** Supabase
**Action:** Update Row
**Table:** `clients`

| Filter | Value |
|--------|-------|
| `id` | `={{Step1.id}}` |

| Column | Value |
|--------|-------|
| `honeybook_project_id` | `={{project_id}}` |
| `honeybook_project_url` | `https://app.honeybook.com/app/projects/={{project_id}}` |

---

## Field Reference: HoneyBook → Supabase

### clients table

| Supabase Column | HoneyBook Source | When Set |
|-----------------|------------------|----------|
| `honeybook_project_id` | `project.id` | Project booked |
| `honeybook_project_url` | Constructed from ID | Project booked |
| `honeybook_link` | Invoice URL (legacy) | Invoice sent |
| `bill_due_date` | `invoice.due_date` | Invoice sent |

### billing_cycles table

| Supabase Column | HoneyBook Source | When Set |
|-----------------|------------------|----------|
| `honeybook_invoice_id` | `invoice.id` | Invoice sent |
| `honeybook_invoice_url` | Constructed from ID | Invoice sent |
| `status` | Fixed: `invoiced` → `paid` | Invoice sent / Payment received |
| `invoiced_at` | `invoice.sent_at` | Invoice sent |
| `due_date` | `invoice.due_date` | Invoice sent |
| `total_due` | `invoice.amount` | Invoice sent |
| `paid` | `true` | Payment received |
| `paid_at` | `payment.date` | Payment received |
| `payment_method` | `payment.method` | Payment received |
| `payment_reference` | `payment.transaction_id` | Payment received |
| `last_synced_at` | Zapier timestamp | Any sync |

---

## Matching Strategy

### Project Booked
```
Match: clients.name = HoneyBook client_name
Fallback: clients.email = HoneyBook client_email
```

### Invoice Sent
```
Match: clients.honeybook_project_id = HoneyBook project_id
```

### Payment Received
```
Match: billing_cycles.honeybook_invoice_id = HoneyBook invoice_id
```

---

## Edge Cases

### No Project ID in Payload
- Check for `project_url` and extract ID with Zapier Formatter
- Pattern: `https://app.honeybook.com/app/projects/([^/]+)`

### Client Name Mismatch
- Use email as primary match
- Or add manual project linking in Admin UI

### Non-Meal-Service Project
- Filter step rejects the Zap
- No data written to Supabase

### Invoice Already Exists
- Use upsert (ON CONFLICT) or check-then-insert
- `honeybook_invoice_id` unique constraint prevents duplicates

---

## Testing Checklist

- [ ] Create test client in Supabase with known name/email
- [ ] Book test Meal Service project in HoneyBook for that client
- [ ] Verify `honeybook_project_id` populated in clients table
- [ ] Send test invoice from HoneyBook
- [ ] Verify billing_cycles row created with `status = 'invoiced'`
- [ ] Mark invoice as paid in HoneyBook
- [ ] Verify billing_cycles row updated with `status = 'paid'`, `paid = true`
- [ ] Verify next 4 dates confirmed (if automated)
