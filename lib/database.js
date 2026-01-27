import { supabase } from './supabase';

// ============ CLIENTS ============

export async function fetchClients() {
  const { data, error } = await supabase
    .from('clients')
    .select(`
      *,
      contacts (*)
    `)
    .order('name');

  if (error) throw error;

  // Transform from DB format to app format
  return data.map(transformClientFromDB);
}

export async function saveClient(client) {
  const dbClient = transformClientToDB(client);
  const contacts = client.contacts || [];

  // Upsert client by name
  const { data, error } = await supabase
    .from('clients')
    .upsert(dbClient, { onConflict: 'name' })
    .select()
    .single();

  if (error) throw error;

  // Handle contacts
  if (contacts.length > 0) {
    // Delete existing contacts
    await supabase.from('contacts').delete().eq('client_id', data.id);

    // Insert new contacts
    const contactsToInsert = contacts.map((c, i) => ({
      client_id: data.id,
      full_name: c.fullName || '',
      display_name: c.displayName || '',
      email: c.email || '',
      phone: c.phone || '',
      address: c.address || '',
      is_primary: i === 0
    }));

    await supabase.from('contacts').insert(contactsToInsert);
  }

  return data.id;
}

export async function deleteClient(clientName) {
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('name', clientName);

  if (error) throw error;
}

// ============ RECIPES ============

export async function fetchRecipes() {
  const { data: recipes, error } = await supabase
    .from('recipes')
    .select(`
      *,
      recipe_ingredients (*)
    `)
    .order('name');

  if (error) throw error;

  // Transform to app format (grouped by category)
  const grouped = {
    protein: [],
    veg: [],
    starch: [],
    sauces: [],
    breakfast: [],
    soups: []
  };

  recipes.forEach(recipe => {
    const category = recipe.category || 'protein';
    if (!grouped[category]) grouped[category] = [];

    grouped[category].push({
      name: recipe.name,
      instructions: recipe.instructions || '',
      ingredients: (recipe.recipe_ingredients || []).map(ri => ({
        name: ri.ingredient_name,
        quantity: ri.quantity ? String(ri.quantity) : '',
        unit: ri.unit || 'oz',
        cost: ri.cost ? String(ri.cost) : '',
        source: ri.source || '',
        section: ri.section || 'Other'
      }))
    });
  });

  return grouped;
}

export async function saveRecipe(recipe, category) {
  // Upsert recipe
  const { data, error } = await supabase
    .from('recipes')
    .upsert({
      name: recipe.name,
      category: category,
      instructions: recipe.instructions || ''
    }, { onConflict: 'name,category' })
    .select()
    .single();

  if (error) throw error;

  // Delete existing ingredients for this recipe
  await supabase.from('recipe_ingredients').delete().eq('recipe_id', data.id);

  // Insert new ingredients
  if (recipe.ingredients && recipe.ingredients.length > 0) {
    const ingredientsToInsert = recipe.ingredients.map(ing => ({
      recipe_id: data.id,
      ingredient_name: ing.name,
      quantity: ing.quantity ? parseFloat(ing.quantity) : null,
      unit: ing.unit || 'oz',
      cost: ing.cost ? parseFloat(ing.cost) : null,
      source: ing.source || '',
      section: ing.section || 'Other'
    }));

    await supabase.from('recipe_ingredients').insert(ingredientsToInsert);
  }

  return data.id;
}

export async function deleteRecipe(recipeName, category) {
  const { error } = await supabase
    .from('recipes')
    .delete()
    .eq('name', recipeName)
    .eq('category', category);

  if (error) throw error;
}

// ============ INGREDIENTS ============

export async function fetchIngredients() {
  const { data, error } = await supabase
    .from('ingredients')
    .select('*')
    .order('name');

  if (error) throw error;

  return data.map(ing => ({
    id: ing.id,
    name: ing.name,
    cost: ing.cost ? String(ing.cost) : '',
    unit: ing.unit || 'oz',
    source: ing.source || '',
    section: ing.section || 'Other'
  }));
}

export async function saveIngredient(ingredient) {
  const { data, error } = await supabase
    .from('ingredients')
    .upsert({
      id: ingredient.id || undefined,
      name: ingredient.name,
      cost: ingredient.cost ? parseFloat(ingredient.cost) : null,
      unit: ingredient.unit || 'oz',
      source: ingredient.source || '',
      section: ingredient.section || 'Other'
    }, { onConflict: 'name' })
    .select()
    .single();

  if (error) throw error;
  return data.id;
}

export async function deleteIngredient(ingredientId) {
  const { error } = await supabase
    .from('ingredients')
    .delete()
    .eq('id', ingredientId);

  if (error) throw error;
}

// ============ MENUS ============

export async function fetchMenus() {
  const { data, error } = await supabase
    .from('menus')
    .select('*')
    .order('date', { ascending: false });

  if (error) throw error;

  return data.map(m => ({
    id: m.id,
    clientName: m.client_name,
    date: m.date,
    protein: m.protein || '',
    veg: m.veg || '',
    starch: m.starch || '',
    extras: m.extras || [],
    portions: m.portions || 1,
    approved: m.approved || false
  }));
}

export async function saveMenu(menuItem) {
  const { data, error } = await supabase
    .from('menus')
    .upsert({
      id: menuItem.id || undefined,
      client_name: menuItem.clientName,
      date: menuItem.date,
      protein: menuItem.protein || '',
      veg: menuItem.veg || '',
      starch: menuItem.starch || '',
      extras: menuItem.extras || [],
      portions: menuItem.portions || 1,
      approved: menuItem.approved || false
    })
    .select()
    .single();

  if (error) throw error;
  return data.id;
}

export async function deleteMenu(menuId) {
  const { error } = await supabase
    .from('menus')
    .delete()
    .eq('id', menuId);

  if (error) throw error;
}

// ============ WEEKS ============

export async function fetchWeeks() {
  const { data, error } = await supabase
    .from('weeks')
    .select('*')
    .order('id', { ascending: false });

  if (error) throw error;

  // Convert to object keyed by week id
  const weeks = {};
  data.forEach(w => {
    weeks[w.id] = {
      id: w.id,
      startDate: w.start_date,
      endDate: w.end_date,
      status: w.status || 'draft',
      snapshot: w.snapshot || null,
      kdsStatus: w.kds_status || {},
      readyForDelivery: w.ready_for_delivery || [],
      deliveryLog: w.delivery_log || [],
      groceryBills: w.grocery_bills || [],
      lockedAt: w.locked_at,
      unlockedAt: w.unlocked_at
    };
  });

  return weeks;
}

export async function saveWeek(week) {
  const { error } = await supabase
    .from('weeks')
    .upsert({
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
    });

  if (error) throw error;
}

// ============ DELIVERIES ============

export async function fetchDeliveries() {
  const { data, error } = await supabase
    .from('deliveries')
    .select('*')
    .order('date', { ascending: false });

  if (error) throw error;

  return data.map(d => ({
    id: d.id,
    clientName: d.client_name,
    weekId: d.week_id,
    date: d.date,
    dishes: d.dishes || [],
    portions: d.portions || 1,
    cost: d.cost ? parseFloat(d.cost) : 0,
    completedAt: d.completed_at,
    handoffType: d.handoff_type || '',
    photoData: d.photo_data || '',
    driver: d.driver || '',
    zone: d.zone || '',
    status: d.status || 'pending'
  }));
}

export async function saveDelivery(delivery) {
  const { data, error } = await supabase
    .from('deliveries')
    .upsert({
      id: delivery.id || undefined,
      client_name: delivery.clientName,
      week_id: delivery.weekId || null,
      date: delivery.date,
      dishes: delivery.dishes || [],
      portions: delivery.portions || 1,
      cost: delivery.cost || null,
      completed_at: delivery.completedAt || null,
      handoff_type: delivery.handoffType || '',
      photo_data: delivery.photoData || '',
      driver: delivery.driver || '',
      zone: delivery.zone || '',
      status: delivery.status || 'pending'
    })
    .select()
    .single();

  if (error) throw error;
  return data.id;
}

// ============ DRIVERS ============

export async function fetchDrivers() {
  const { data, error } = await supabase
    .from('drivers')
    .select('*')
    .order('name');

  if (error) throw error;

  return data.map(d => ({
    id: d.id,
    name: d.name,
    phone: d.phone || '',
    zone: d.zone || '',
    accessCode: d.access_code || ''
  }));
}

export async function saveDriver(driver) {
  const { data, error } = await supabase
    .from('drivers')
    .upsert({
      id: driver.id || undefined,
      name: driver.name,
      phone: driver.phone || '',
      zone: driver.zone || '',
      access_code: driver.accessCode || ''
    })
    .select()
    .single();

  if (error) throw error;
  return data.id;
}

export async function deleteDriver(driverId) {
  const { error } = await supabase
    .from('drivers')
    .delete()
    .eq('id', driverId);

  if (error) throw error;
}

// ============ CLIENT PORTAL DATA ============

export async function fetchClientPortalData() {
  const { data, error } = await supabase
    .from('client_portal_data')
    .select('*');

  if (error) throw error;

  // Convert to object keyed by client_name
  const portalData = {};
  data.forEach(d => {
    portalData[d.client_name] = {
      selectedDates: d.selected_dates || [],
      ingredientPicks: d.ingredient_picks || {},
      notes: d.notes || ''
    };
  });

  return portalData;
}

export async function saveClientPortalData(clientName, portalData) {
  const { error } = await supabase
    .from('client_portal_data')
    .upsert({
      client_name: clientName,
      selected_dates: portalData.selectedDates || [],
      ingredient_picks: portalData.ingredientPicks || {},
      notes: portalData.notes || ''
    }, { onConflict: 'client_name' });

  if (error) throw error;
}

// ============ APP SETTINGS ============

export async function fetchAppSettings() {
  const { data, error } = await supabase
    .from('app_settings')
    .select('*');

  if (error) throw error;

  // Convert to object
  const settings = {};
  data.forEach(s => {
    settings[s.key] = s.value;
  });

  return settings;
}

export async function saveAppSetting(key, value) {
  const { error } = await supabase
    .from('app_settings')
    .upsert({
      key: key,
      value: value
    }, { onConflict: 'key' });

  if (error) throw error;
}

// ============ HELPERS ============

function transformClientFromDB(dbClient) {
  return {
    id: dbClient.id,
    name: dbClient.name,
    displayName: dbClient.display_name || '',
    persons: dbClient.persons || 2,
    portions: dbClient.portions || 4,
    address: dbClient.address || '',
    email: dbClient.email || '',
    phone: dbClient.phone || '',
    notes: dbClient.notes || '',
    mealsPerWeek: dbClient.meals_per_week || 3,
    frequency: dbClient.frequency || 'weekly',
    status: dbClient.status || 'active',
    pausedDate: dbClient.paused_date || '',
    honeyBookLink: dbClient.honeybook_link || '',
    billingNotes: dbClient.billing_notes || '',
    deliveryDay: dbClient.delivery_day || '',
    zone: dbClient.zone || '',
    pickup: dbClient.pickup || false,
    chefChoice: dbClient.chef_choice !== false,
    dietaryRestrictions: dbClient.dietary_restrictions || '',
    planPrice: dbClient.plan_price ? parseFloat(dbClient.plan_price) : 0,
    serviceFee: dbClient.service_fee ? parseFloat(dbClient.service_fee) : 0,
    prepayDiscount: dbClient.prepay_discount || false,
    newClientFeePaid: dbClient.new_client_fee_paid || false,
    paysOwnGroceries: dbClient.pays_own_groceries || false,
    accessCode: dbClient.access_code || '',
    deliveryDates: dbClient.delivery_dates || [],
    billDueDate: dbClient.bill_due_date || '',
    contacts: (dbClient.contacts || []).map(c => ({
      fullName: c.full_name || '',
      displayName: c.display_name || '',
      email: c.email || '',
      phone: c.phone || '',
      address: c.address || ''
    }))
  };
}

function transformClientToDB(client) {
  return {
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
}

// Bulk save all recipes (for migration)
export async function saveAllRecipes(recipes) {
  for (const [category, categoryRecipes] of Object.entries(recipes)) {
    for (const recipe of categoryRecipes) {
      await saveRecipe(recipe, category);
    }
  }
}

// Bulk save all clients (for migration)
export async function saveAllClients(clients) {
  for (const client of clients) {
    await saveClient(client);
  }
}

// Bulk save all ingredients (for migration)
export async function saveAllIngredients(ingredients) {
  for (const ing of ingredients) {
    await saveIngredient(ing);
  }
}

// Bulk save all menu items (for migration)
export async function saveAllMenus(menuItems) {
  for (const item of menuItems) {
    await saveMenu(item);
  }
}

// Bulk save all weeks (for migration)
export async function saveAllWeeks(weeks) {
  for (const week of Object.values(weeks)) {
    await saveWeek(week);
  }
}

// Bulk save all drivers (for migration)
export async function saveAllDrivers(drivers) {
  for (const driver of drivers) {
    await saveDriver(driver);
  }
}

// Bulk save all client portal data (for migration)
export async function saveAllClientPortalData(portalData) {
  for (const [clientName, data] of Object.entries(portalData)) {
    await saveClientPortalData(clientName, data);
  }
}
