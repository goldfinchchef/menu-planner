import { supabase, isConfigured } from './supabase';

const STORAGE_KEY = 'goldfinchChefData';

/**
 * Migration report structure
 */
function createReport() {
  return {
    startedAt: new Date().toISOString(),
    completedAt: null,
    success: false,
    tables: {},
    errors: [],
    warnings: [],
    summary: {
      totalRecords: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      failed: 0
    }
  };
}

/**
 * Add table stats to report
 */
function addTableStats(report, tableName, stats) {
  report.tables[tableName] = stats;
  report.summary.totalRecords += stats.total || 0;
  report.summary.inserted += stats.inserted || 0;
  report.summary.updated += stats.updated || 0;
  report.summary.skipped += stats.skipped || 0;
  report.summary.failed += stats.failed || 0;
}

/**
 * Check if a record exists by unique key
 */
async function recordExists(table, column, value) {
  if (!supabase) return false;
  const { data } = await supabase.from(table).select('id').eq(column, value).limit(1);
  return data && data.length > 0;
}

/**
 * Upsert with idempotency check
 */
async function upsertRecord(table, record, uniqueKey, report) {
  if (!supabase) {
    report.errors.push(`Supabase not configured for ${table}`);
    return { success: false };
  }

  try {
    const { data, error } = await supabase
      .from(table)
      .upsert(record, { onConflict: uniqueKey })
      .select()
      .single();

    if (error) {
      report.errors.push(`${table}: ${error.message} - ${JSON.stringify(record).slice(0, 100)}`);
      return { success: false, error };
    }

    return { success: true, data, isNew: true }; // Supabase upsert doesn't tell us if it was insert vs update
  } catch (e) {
    report.errors.push(`${table}: ${e.message}`);
    return { success: false, error: e };
  }
}

/**
 * Migrate clients table
 */
async function migrateClients(localData, report) {
  const clients = localData.clients || [];
  const stats = { total: clients.length, inserted: 0, updated: 0, skipped: 0, failed: 0 };

  console.log(`Migrating ${clients.length} clients...`);

  for (const client of clients) {
    const record = {
      name: client.name,
      display_name: client.displayName || null,
      persons: client.persons || 2,
      portions: client.portions || 4,
      address: client.address || null,
      email: client.email || null,
      phone: client.phone || null,
      notes: client.notes || null,
      meals_per_week: client.mealsPerWeek || 3,
      frequency: client.frequency || 'weekly',
      status: client.status || 'active',
      paused_date: client.pausedDate || null,
      honeybook_link: client.honeyBookLink || null,
      billing_notes: client.billingNotes || null,
      delivery_day: client.deliveryDay || null,
      zone: client.zone || null,
      pickup: client.pickup || false,
      chef_choice: client.chefChoice !== false,
      dietary_restrictions: client.dietaryRestrictions || null,
      plan_price: client.planPrice || null,
      service_fee: client.serviceFee || null,
      prepay_discount: client.prepayDiscount || false,
      new_client_fee_paid: client.newClientFeePaid || false,
      pays_own_groceries: client.paysOwnGroceries || false,
      access_code: client.accessCode || null,
      delivery_dates: client.deliveryDates || [],
      bill_due_date: client.billDueDate || null
    };

    const result = await upsertRecord('clients', record, 'name', report);
    if (result.success) {
      stats.inserted++;

      // Migrate contacts for this client
      if (client.contacts && client.contacts.length > 0 && result.data?.id) {
        await migrateContacts(result.data.id, client.contacts, report);
      }
    } else {
      stats.failed++;
    }
  }

  addTableStats(report, 'clients', stats);
  console.log(`  Clients: ${stats.inserted} migrated, ${stats.failed} failed`);
}

/**
 * Migrate contacts for a client
 */
async function migrateContacts(clientId, contacts, report) {
  if (!supabase) return;

  // First, delete existing contacts for this client (replace strategy)
  await supabase.from('contacts').delete().eq('client_id', clientId);

  for (const contact of contacts) {
    if (!contact.fullName && !contact.email && !contact.phone) continue;

    const record = {
      client_id: clientId,
      full_name: contact.fullName || null,
      display_name: contact.displayName || null,
      email: contact.email || null,
      phone: contact.phone || null,
      address: contact.address || null,
      is_primary: contacts.indexOf(contact) === 0
    };

    await supabase.from('contacts').insert(record);
  }
}

/**
 * Migrate recipes and their ingredients
 */
async function migrateRecipes(localData, report) {
  const recipes = localData.recipes || {};
  let totalRecipes = 0;
  const stats = { total: 0, inserted: 0, updated: 0, skipped: 0, failed: 0 };

  // Count total recipes
  Object.values(recipes).forEach(categoryRecipes => {
    totalRecipes += categoryRecipes.length;
  });
  stats.total = totalRecipes;

  console.log(`Migrating ${totalRecipes} recipes...`);

  for (const [category, categoryRecipes] of Object.entries(recipes)) {
    for (const recipe of categoryRecipes) {
      if (!recipe.name) {
        stats.skipped++;
        report.warnings.push(`Skipped recipe with no name in category ${category}`);
        continue;
      }

      const record = {
        name: recipe.name,
        category: category,
        instructions: recipe.instructions || null
      };

      const result = await upsertRecord('recipes', record, 'name,category', report);
      if (result.success) {
        stats.inserted++;

        // Migrate recipe ingredients
        if (recipe.ingredients && recipe.ingredients.length > 0 && result.data?.id) {
          await migrateRecipeIngredients(result.data.id, recipe.ingredients, report);
        }
      } else {
        stats.failed++;
      }
    }
  }

  addTableStats(report, 'recipes', stats);
  console.log(`  Recipes: ${stats.inserted} migrated, ${stats.failed} failed`);
}

/**
 * Migrate recipe ingredients
 */
async function migrateRecipeIngredients(recipeId, ingredients, report) {
  if (!supabase) return;

  // Delete existing ingredients for this recipe (replace strategy)
  await supabase.from('recipe_ingredients').delete().eq('recipe_id', recipeId);

  for (const ing of ingredients) {
    if (!ing.name) continue;

    const record = {
      recipe_id: recipeId,
      ingredient_name: ing.name,
      quantity: ing.quantity ? parseFloat(ing.quantity) : null,
      unit: ing.unit || 'oz',
      cost: ing.cost ? parseFloat(ing.cost) : null,
      source: ing.source || null,
      section: ing.section || 'Other'
    };

    await supabase.from('recipe_ingredients').insert(record);
  }
}

/**
 * Migrate master ingredients
 */
async function migrateIngredients(localData, report) {
  const ingredients = localData.masterIngredients || [];
  const stats = { total: ingredients.length, inserted: 0, updated: 0, skipped: 0, failed: 0 };

  console.log(`Migrating ${ingredients.length} ingredients...`);

  for (const ing of ingredients) {
    if (!ing.name) {
      stats.skipped++;
      continue;
    }

    const record = {
      name: ing.name,
      cost: ing.cost ? parseFloat(ing.cost) : null,
      unit: ing.unit || 'oz',
      source: ing.source || null,
      section: ing.section || 'Other'
    };

    const result = await upsertRecord('ingredients', record, 'name', report);
    if (result.success) {
      stats.inserted++;
    } else {
      stats.failed++;
    }
  }

  addTableStats(report, 'ingredients', stats);
  console.log(`  Ingredients: ${stats.inserted} migrated, ${stats.failed} failed`);
}

/**
 * Migrate menu items
 */
async function migrateMenuItems(localData, report) {
  const menuItems = localData.menuItems || [];
  const stats = { total: menuItems.length, inserted: 0, updated: 0, skipped: 0, failed: 0 };

  console.log(`Migrating ${menuItems.length} menu items...`);

  // Pre-fetch all clients to build a name->id lookup map
  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select('id, name');

  if (clientsError) {
    report.errors.push(`menus: Failed to fetch clients for lookup: ${clientsError.message}`);
    console.error('Failed to fetch clients for menu migration:', clientsError);
    return;
  }

  const clientLookup = {};
  for (const client of clients || []) {
    clientLookup[client.name] = client.id;
  }

  for (const item of menuItems) {
    if (!item.clientName || !item.date) {
      stats.skipped++;
      report.warnings.push(`Skipped menu item with missing clientName or date`);
      continue;
    }

    // Look up client_id by name
    const clientId = clientLookup[item.clientName];
    if (!clientId) {
      stats.skipped++;
      report.warnings.push(`Skipped menu for "${item.clientName}": client not found in database`);
      continue;
    }

    const record = {
      client_id: clientId,         // REQUIRED: client UUID
      client_name: item.clientName,
      date: item.date,
      protein: item.protein || null,
      veg: item.veg || null,
      starch: item.starch || null,
      extras: item.extras || [],
      portions: item.portions || 1,
      approved: item.approved || false
    };

    // Use date + clientName as a pseudo-unique key (can have duplicates in localStorage)
    const { data, error } = await supabase
      .from('menus')
      .insert(record)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Duplicate - update instead
        stats.skipped++;
      } else {
        stats.failed++;
        report.errors.push(`menus: ${error.message}`);
      }
    } else {
      stats.inserted++;
    }
  }

  addTableStats(report, 'menus', stats);
  console.log(`  Menus: ${stats.inserted} migrated, ${stats.skipped} skipped, ${stats.failed} failed`);
}

/**
 * Migrate weeks
 */
async function migrateWeeks(localData, report) {
  const weeks = localData.weeks || {};
  const weekList = Object.values(weeks);
  const stats = { total: weekList.length, inserted: 0, updated: 0, skipped: 0, failed: 0 };

  console.log(`Migrating ${weekList.length} weeks...`);

  for (const week of weekList) {
    if (!week.id) {
      stats.skipped++;
      continue;
    }

    const record = {
      id: week.id,
      start_date: week.startDate,
      end_date: week.endDate,
      status: week.status || 'draft',
      snapshot: week.snapshot || null,
      kds_status: week.kdsStatus || {},
      ready_for_delivery: week.readyForDelivery || [],
      delivery_log: week.deliveryLog || [],
      grocery_bills: week.groceryBills || [],
      locked_at: week.lockedAt || null,
      unlocked_at: week.unlockedAt || null
    };

    const result = await upsertRecord('weeks', record, 'id', report);
    if (result.success) {
      stats.inserted++;
    } else {
      stats.failed++;
    }
  }

  addTableStats(report, 'weeks', stats);
  console.log(`  Weeks: ${stats.inserted} migrated, ${stats.failed} failed`);
}

/**
 * Migrate drivers
 */
async function migrateDrivers(localData, report) {
  const drivers = localData.drivers || [];
  const stats = { total: drivers.length, inserted: 0, updated: 0, skipped: 0, failed: 0 };

  console.log(`Migrating ${drivers.length} drivers...`);

  for (const driver of drivers) {
    if (!driver.name) {
      stats.skipped++;
      continue;
    }

    const record = {
      name: driver.name,
      phone: driver.phone || null,
      zone: driver.zone || null,
      access_code: driver.accessCode || null
    };

    const result = await upsertRecord('drivers', record, 'name', report);
    if (result.success) {
      stats.inserted++;
    } else {
      stats.failed++;
    }
  }

  addTableStats(report, 'drivers', stats);
  console.log(`  Drivers: ${stats.inserted} migrated, ${stats.failed} failed`);
}

/**
 * Migrate client portal data
 */
async function migrateClientPortalData(localData, report) {
  const portalData = localData.clientPortalData || {};
  const entries = Object.entries(portalData);
  const stats = { total: entries.length, inserted: 0, updated: 0, skipped: 0, failed: 0 };

  console.log(`Migrating ${entries.length} client portal entries...`);

  for (const [clientName, data] of entries) {
    const record = {
      client_name: clientName,
      selected_dates: data.selectedDates || [],
      ingredient_picks: data.ingredientPicks || {},
      notes: data.notes || null
    };

    const result = await upsertRecord('client_portal_data', record, 'client_name', report);
    if (result.success) {
      stats.inserted++;
    } else {
      stats.failed++;
    }
  }

  addTableStats(report, 'client_portal_data', stats);
  console.log(`  Client Portal: ${stats.inserted} migrated, ${stats.failed} failed`);
}

/**
 * Migrate app settings
 */
async function migrateAppSettings(localData, report) {
  const settingsToMigrate = [
    'orderHistory',
    'weeklyTasks',
    'deliveryLog',
    'bagReminders',
    'readyForDelivery',
    'blockedDates',
    'adminSettings',
    'customTasks',
    'groceryBills',
    'units'
  ];

  let migrated = 0;
  let failed = 0;

  console.log(`Migrating app settings...`);

  for (const key of settingsToMigrate) {
    if (localData[key] !== undefined) {
      const record = {
        key: key,
        value: localData[key]
      };

      const result = await upsertRecord('app_settings', record, 'key', report);
      if (result.success) {
        migrated++;
      } else {
        failed++;
      }
    }
  }

  addTableStats(report, 'app_settings', { total: settingsToMigrate.length, inserted: migrated, failed });
  console.log(`  App Settings: ${migrated} migrated, ${failed} failed`);
}

/**
 * Main migration function - idempotent
 */
export async function runMigration() {
  const report = createReport();

  console.log('='.repeat(60));
  console.log('Starting localStorage → Supabase Migration');
  console.log('='.repeat(60));

  // Check Supabase configuration
  if (!isConfigured()) {
    report.errors.push('Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env');
    report.completedAt = new Date().toISOString();
    console.error('Migration failed: Supabase not configured');
    return report;
  }

  // Load local data
  const savedData = localStorage.getItem(STORAGE_KEY);
  if (!savedData) {
    report.warnings.push('No localStorage data found to migrate');
    report.completedAt = new Date().toISOString();
    report.success = true;
    console.log('No localStorage data found to migrate');
    return report;
  }

  let localData;
  try {
    localData = JSON.parse(savedData);
  } catch (e) {
    report.errors.push(`Failed to parse localStorage data: ${e.message}`);
    report.completedAt = new Date().toISOString();
    console.error('Migration failed: Invalid localStorage data');
    return report;
  }

  // Run migrations in order (respecting foreign key dependencies)
  try {
    await migrateClients(localData, report);
    await migrateDrivers(localData, report);
    await migrateIngredients(localData, report);
    await migrateRecipes(localData, report);
    await migrateWeeks(localData, report);
    await migrateMenuItems(localData, report);
    await migrateClientPortalData(localData, report);
    await migrateAppSettings(localData, report);

    report.success = report.summary.failed === 0;
  } catch (e) {
    report.errors.push(`Migration error: ${e.message}`);
    report.success = false;
  }

  report.completedAt = new Date().toISOString();

  // Print summary
  console.log('');
  console.log('='.repeat(60));
  console.log('Migration Complete');
  console.log('='.repeat(60));
  console.log(`Status: ${report.success ? 'SUCCESS' : 'COMPLETED WITH ERRORS'}`);
  console.log(`Duration: ${new Date(report.completedAt) - new Date(report.startedAt)}ms`);
  console.log('');
  console.log('Summary:');
  console.log(`  Total Records: ${report.summary.totalRecords}`);
  console.log(`  Inserted/Updated: ${report.summary.inserted}`);
  console.log(`  Skipped: ${report.summary.skipped}`);
  console.log(`  Failed: ${report.summary.failed}`);
  console.log('');
  console.log('By Table:');
  Object.entries(report.tables).forEach(([table, stats]) => {
    console.log(`  ${table}: ${stats.inserted} ok, ${stats.skipped} skipped, ${stats.failed} failed`);
  });

  if (report.errors.length > 0) {
    console.log('');
    console.log('Errors:');
    report.errors.forEach(err => console.error(`  - ${err}`));
  }

  if (report.warnings.length > 0) {
    console.log('');
    console.log('Warnings:');
    report.warnings.forEach(warn => console.warn(`  - ${warn}`));
  }

  console.log('='.repeat(60));

  return report;
}

/**
 * Check if migration has been run before
 */
export async function getMigrationStatus() {
  if (!isConfigured() || !supabase) {
    return { configured: false, hasData: false };
  }

  try {
    // Check if any clients exist in Supabase
    const { count } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true });

    // Check localStorage
    const localData = localStorage.getItem(STORAGE_KEY);
    const hasLocalData = !!localData;

    return {
      configured: true,
      hasData: count > 0,
      hasLocalData,
      supabaseRecordCount: count || 0
    };
  } catch (e) {
    return { configured: true, hasData: false, error: e.message };
  }
}
