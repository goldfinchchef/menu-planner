import { supabase, checkConnection, isConfigured } from './supabase';
import { isSupabaseMode } from './dataMode';

// ============ SUPABASE SAVE HELPERS ============

/**
 * Check if Supabase is available for saving
 * Returns { available: true } or { available: false, error: string }
 */
export async function checkSupabaseAvailable() {
  console.log('[checkSupabaseAvailable] isSupabaseMode:', isSupabaseMode());
  if (!isSupabaseMode()) {
    return { available: false, error: 'Not in Supabase mode' };
  }
  console.log('[checkSupabaseAvailable] isConfigured:', isConfigured());
  if (!isConfigured()) {
    return { available: false, error: 'Supabase not configured' };
  }
  console.log('[checkSupabaseAvailable] checking connection...');
  const online = await checkConnection();
  console.log('[checkSupabaseAvailable] online:', online);
  if (!online) {
    return { available: false, error: 'Supabase not reachable' };
  }
  return { available: true };
}

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

/**
 * Save a client to Supabase and refetch all clients
 * Use this for reliable Supabase-first saves
 * Returns { success, clients, error }
 */
export async function saveClientToSupabase(client) {
  console.log('[saveClient] start', client === undefined ? 'undefined' : client?.name);

  // Validate client object
  if (!client) {
    console.error('[saveClient] blocked - client is undefined');
    return { success: false, error: 'Client data is missing' };
  }

  // Ensure name is set (fall back to displayName if name is missing)
  const clientName = client.name || client.displayName;
  if (!clientName || clientName.trim() === '') {
    console.error('[saveClient] blocked - client name is empty');
    return { success: false, error: 'Client name is required' };
  }

  // Normalize client object to ensure name is set
  const normalizedClient = {
    ...client,
    name: clientName.trim()
  };

  console.log('[saveClient] payload', JSON.stringify({
    name: normalizedClient.name,
    displayName: normalizedClient.displayName,
    id: normalizedClient.id,
    status: normalizedClient.status,
    contactsCount: normalizedClient.contacts?.length || 0
  }));

  const { available, error: availError } = await checkSupabaseAvailable();
  if (!available) {
    console.error('[saveClient] blocked -', availError);
    return { success: false, error: availError };
  }

  try {
    await saveClient(normalizedClient);
    console.log('[saveClient] success', normalizedClient.name);

    const clients = await fetchClients();
    console.log('[saveClient] refetch count:', clients.length);

    return { success: true, clients };
  } catch (err) {
    console.error('[saveClient] error', err);
    return { success: false, error: err.message || 'Save failed' };
  }
}

/**
 * Delete a client from Supabase and refetch all clients
 * Returns { success, clients, error }
 */
export async function deleteClientFromSupabase(clientName) {
  console.log('[deleteClient] start', clientName);

  const { available, error: availError } = await checkSupabaseAvailable();
  if (!available) {
    console.error('[deleteClient] blocked -', availError);
    return { success: false, error: availError };
  }

  try {
    await deleteClient(clientName);
    console.log('[deleteClient] success', clientName);

    const clients = await fetchClients();
    console.log('[deleteClient] refetch count:', clients.length);

    return { success: true, clients };
  } catch (err) {
    console.error('[deleteClient] error', err);
    return { success: false, error: err.message || 'Delete failed' };
  }
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
  console.log('[saveRecipe] upserting recipe:', recipe.name, 'category:', category);

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

  if (error) {
    console.error('[saveRecipe] upsert error:', error);
    throw error;
  }
  console.log('[saveRecipe] upsert success, id:', data.id);

  // Delete existing ingredients for this recipe
  console.log('[saveRecipe] deleting existing recipe_ingredients for recipe_id:', data.id);
  const { error: deleteError } = await supabase.from('recipe_ingredients').delete().eq('recipe_id', data.id);
  if (deleteError) {
    console.error('[saveRecipe] delete ingredients error:', deleteError);
  }

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
    console.log('[saveRecipe] inserting', ingredientsToInsert.length, 'recipe_ingredients');

    const { error: insertError } = await supabase.from('recipe_ingredients').insert(ingredientsToInsert);
    if (insertError) {
      console.error('[saveRecipe] insert ingredients error:', insertError);
      throw insertError;
    }
    console.log('[saveRecipe] recipe_ingredients inserted successfully');
  }

  return data.id;
}

export async function deleteRecipe(recipeName, category) {
  console.log('[deleteRecipe] deleting:', recipeName, 'category:', category);
  const { error } = await supabase
    .from('recipes')
    .delete()
    .eq('name', recipeName)
    .eq('category', category);

  if (error) {
    console.error('[deleteRecipe] error:', error);
    throw error;
  }
  console.log('[deleteRecipe] deleted successfully');
}

/**
 * Save a recipe to Supabase and refetch all recipes
 * Use this for reliable Supabase-first saves
 * Returns { success, recipes, error }
 */
export async function saveRecipeToSupabase(recipe, category) {
  console.log('[saveRecipeToSupabase] START', recipe?.name || 'undefined');

  // Validate recipe object
  if (!recipe) {
    console.error('[saveRecipeToSupabase] BLOCKED - recipe is undefined');
    return { success: false, error: 'Recipe data is missing' };
  }

  // Validate required fields
  if (!recipe.name || recipe.name.trim() === '') {
    console.error('[saveRecipeToSupabase] BLOCKED - recipe name is empty');
    return { success: false, error: 'Recipe name is required' };
  }

  if (!category || category.trim() === '') {
    console.error('[saveRecipeToSupabase] BLOCKED - category is empty');
    return { success: false, error: 'Recipe category is required' };
  }

  // Log payload details
  console.log('[saveRecipeToSupabase] payload', JSON.stringify({
    name: recipe.name,
    category: category,
    ingredientCount: recipe.ingredients?.length || 0,
    hasInstructions: !!recipe.instructions
  }));

  console.log('[saveRecipeToSupabase] checking Supabase availability...');
  const { available, error: availError } = await checkSupabaseAvailable();
  console.log('[saveRecipeToSupabase] available:', available, availError || '');
  if (!available) {
    console.error('[saveRecipeToSupabase] BLOCKED -', availError);
    return { success: false, error: availError };
  }

  try {
    console.log('[saveRecipeToSupabase] calling saveRecipe (actual Supabase upsert)...');
    const recipeId = await saveRecipe(recipe, category);
    console.log('[saveRecipeToSupabase] SUCCESS id=', recipeId);

    console.log('[saveRecipeToSupabase] refetching all recipes...');
    const recipes = await fetchRecipes();
    const totalRecipes = Object.values(recipes).flat().length;
    console.log('[saveRecipeToSupabase] refetch count:', totalRecipes);

    return { success: true, recipes };
  } catch (err) {
    console.error('[saveRecipeToSupabase] ERROR', err);
    return { success: false, error: err.message || 'Save failed' };
  }
}

/**
 * Delete a recipe from Supabase and refetch all recipes
 * Returns { success, recipes, error }
 */
export async function deleteRecipeFromSupabase(recipeName, category) {
  console.log('[deleteRecipe] start', recipeName, 'category:', category);

  const { available, error: availError } = await checkSupabaseAvailable();
  if (!available) {
    console.error('[deleteRecipe] blocked -', availError);
    return { success: false, error: availError };
  }

  try {
    await deleteRecipe(recipeName, category);
    console.log('[deleteRecipe] success', recipeName);

    const recipes = await fetchRecipes();
    const totalRecipes = Object.values(recipes).flat().length;
    console.log('[deleteRecipe] refetch count:', totalRecipes);

    return { success: true, recipes };
  } catch (err) {
    console.error('[deleteRecipe] error', err);
    return { success: false, error: err.message || 'Delete failed' };
  }
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

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function saveIngredient(ingredient) {
  // Build payload - only include id if it's a valid UUID
  const payload = {
    name: ingredient.name,
    cost: ingredient.cost ? parseFloat(ingredient.cost) : null,
    unit: ingredient.unit || 'oz',
    source: ingredient.source || '',
    section: ingredient.section || 'Other'
  };

  // Only include id if it's a valid UUID (not a timestamp or temp id)
  if (ingredient.id && UUID_REGEX.test(String(ingredient.id))) {
    payload.id = ingredient.id;
  }

  const { data, error } = await supabase
    .from('ingredients')
    .upsert(payload, { onConflict: 'name' })
    .select()
    .single();

  if (error) throw error;
  return data.id;
}

/**
 * Save an ingredient to Supabase and refetch all ingredients
 * Returns { success, ingredients, error }
 */
export async function saveIngredientToSupabase(ingredient) {
  console.log('[saveIngredient] start', ingredient?.name || 'undefined');

  // Validate ingredient
  if (!ingredient) {
    console.error('[saveIngredient] blocked - ingredient is undefined');
    return { success: false, error: 'Ingredient data is missing' };
  }

  if (!ingredient.name || ingredient.name.trim() === '') {
    console.error('[saveIngredient] blocked - ingredient name is empty');
    return { success: false, error: 'Ingredient name is required' };
  }

  console.log('[saveIngredient] payload', JSON.stringify({
    name: ingredient.name,
    hasValidUUID: ingredient.id ? UUID_REGEX.test(String(ingredient.id)) : false,
    cost: ingredient.cost,
    unit: ingredient.unit
  }));

  const { available, error: availError } = await checkSupabaseAvailable();
  if (!available) {
    console.error('[saveIngredient] blocked -', availError);
    return { success: false, error: availError };
  }

  try {
    const savedId = await saveIngredient(ingredient);
    console.log('[saveIngredient] success id=', savedId);

    const ingredients = await fetchIngredients();
    console.log('[saveIngredient] refetch count:', ingredients.length);

    return { success: true, ingredients, savedId };
  } catch (err) {
    console.error('[saveIngredient] error', err);
    return { success: false, error: err.message || 'Save failed' };
  }
}

/**
 * Delete an ingredient from Supabase and refetch all ingredients
 * Returns { success, ingredients, error }
 */
export async function deleteIngredientFromSupabase(ingredientId) {
  console.log('[deleteIngredient] start id=', ingredientId);

  // Validate UUID
  if (!ingredientId || !UUID_REGEX.test(String(ingredientId))) {
    console.error('[deleteIngredient] blocked - invalid UUID:', ingredientId);
    return { success: false, error: 'Invalid ingredient ID' };
  }

  const { available, error: availError } = await checkSupabaseAvailable();
  if (!available) {
    console.error('[deleteIngredient] blocked -', availError);
    return { success: false, error: availError };
  }

  try {
    await deleteIngredient(ingredientId);
    console.log('[deleteIngredient] success');

    const ingredients = await fetchIngredients();
    console.log('[deleteIngredient] refetch count:', ingredients.length);

    return { success: true, ingredients };
  } catch (err) {
    console.error('[deleteIngredient] error', err);
    return { success: false, error: err.message || 'Delete failed' };
  }
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
    .order('date', { ascending: false })
    .order('meal_index', { ascending: true });

  if (error) throw error;

  return data.map(m => ({
    id: m.id,
    clientName: m.client_name,
    weekId: m.week_id,
    date: m.date,
    mealIndex: m.meal_index || 1,
    protein: m.protein || '',
    veg: m.veg || '',
    starch: m.starch || '',
    extras: m.extras || [],
    portions: m.portions || 1,
    approved: m.approved || false
  }));
}

/**
 * Save a menu item to Supabase using upsert
 *
 * REQUIRED: Database must have a unique constraint on (client_name, date, meal_index)
 * Create it with: ALTER TABLE menus ADD CONSTRAINT menus_client_date_meal_unique
 *                 UNIQUE (client_name, date, meal_index);
 */
export async function saveMenu(menuItem, mealIndex = 1, weekId = null) {
  // Calculate week_id from date if not provided
  let resolvedWeekId = weekId || menuItem.weekId;

  if (!resolvedWeekId && menuItem.date) {
    // Calculate ISO week from date
    const date = new Date(menuItem.date + 'T12:00:00');
    const thursday = new Date(date);
    thursday.setDate(date.getDate() + (3 - ((date.getDay() + 6) % 7)));
    const year = thursday.getFullYear();
    const jan4 = new Date(year, 0, 4);
    const weekNum = 1 + Math.round(((thursday - jan4) / 86400000 - 3 + ((jan4.getDay() + 6) % 7)) / 7);
    resolvedWeekId = `${year}-W${String(weekNum).padStart(2, '0')}`;
  }

  // Build the record - don't pass the local numeric ID, let Supabase generate UUID
  const record = {
    client_name: menuItem.clientName,
    week_id: resolvedWeekId,
    date: menuItem.date,
    meal_index: mealIndex,
    protein: menuItem.protein || '',
    veg: menuItem.veg || '',
    starch: menuItem.starch || '',
    extras: menuItem.extras || [],
    portions: menuItem.portions || 1,
    approved: menuItem.approved || false
  };

  console.log('[saveMenu] Upserting:', { client: record.client_name, date: record.date, meal_index: mealIndex, approved: record.approved });

  // Upsert requires UNIQUE constraint on (client_name, date, meal_index) in the database
  const { data, error } = await supabase
    .from('menus')
    .upsert(record, { onConflict: 'client_name,date,meal_index' })
    .select()
    .single();

  if (error) {
    console.error('[saveMenu] ❌ Error:', error.message);
    console.error('[saveMenu] Error code:', error.code);
    console.error('[saveMenu] Full error:', JSON.stringify(error, null, 2));
    throw error;
  }

  console.log('[saveMenu] ✓ Success, id:', data.id);
  return data.id;
}

export async function deleteMenu(menuId) {
  const { error } = await supabase
    .from('menus')
    .delete()
    .eq('id', menuId);

  if (error) throw error;
}

/**
 * Fetch menus for a specific week by week_id
 * Returns only approved menus by default (for KDS)
 */
export async function fetchMenusByWeek(weekId, approvedOnly = true) {
  if (!weekId) {
    console.warn('[fetchMenusByWeek] No weekId provided');
    return [];
  }

  let query = supabase
    .from('menus')
    .select('*')
    .eq('week_id', weekId)
    .order('date', { ascending: true })
    .order('meal_index', { ascending: true });

  if (approvedOnly) {
    query = query.eq('approved', true);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[fetchMenusByWeek] Error:', error);
    throw error;
  }

  console.log(`[fetchMenusByWeek] Found ${data.length} menus for week ${weekId}`);

  return data.map(m => ({
    id: m.id,
    clientName: m.client_name,
    weekId: m.week_id,
    date: m.date,
    mealIndex: m.meal_index || 1,
    protein: m.protein || '',
    veg: m.veg || '',
    starch: m.starch || '',
    extras: m.extras || [],
    portions: m.portions || 1,
    approved: m.approved || false
  }));
}

// ============ KDS DISH STATUS ============

/**
 * Fetch all KDS dish statuses for a specific week
 * Returns { recipe_name: { done, done_at, recipe_type } }
 */
export async function fetchKdsDishStatuses(weekId) {
  if (!weekId) {
    console.warn('[fetchKdsDishStatuses] No weekId provided');
    return {};
  }

  console.log('[fetchKdsDishStatuses] start weekId:', weekId);

  try {
    const { data, error } = await supabase
      .from('kds_dish_status')
      .select('*')
      .eq('week_id', weekId);

    if (error) throw error;

    // Transform to map keyed by recipe_name
    const statusMap = {};
    (data || []).forEach(row => {
      statusMap[row.recipe_name] = {
        done: row.done,
        done_at: row.done_at,
        recipe_type: row.recipe_type
      };
    });

    console.log('[fetchKdsDishStatuses] success, count:', Object.keys(statusMap).length);
    return statusMap;
  } catch (err) {
    console.error('[fetchKdsDishStatuses] error', err);
    return {};
  }
}

/**
 * Set done status for a dish in a week
 * Upserts into kds_dish_status table
 * @param {Object} params - { week_id, recipe_name, recipe_type, done }
 * @returns {Object} - { success, error }
 */
export async function setKdsDishDone({ week_id, recipe_name, recipe_type, done }) {
  console.log('[kdsDishDone] start payload', { week_id, recipe_name, recipe_type, done });

  const { available, error: availError } = await checkSupabaseAvailable();
  if (!available) {
    console.error('[kdsDishDone] blocked -', availError);
    return { success: false, error: availError };
  }

  try {
    const payload = {
      week_id,
      recipe_name,
      recipe_type: recipe_type || null,
      done,
      done_at: done ? new Date().toISOString() : null
    };

    const { error } = await supabase
      .from('kds_dish_status')
      .upsert(payload, {
        onConflict: 'week_id,recipe_name'
      });

    if (error) throw error;

    console.log('[kdsDishDone] success');
    return { success: true };
  } catch (err) {
    console.error('[kdsDishDone] error', err);
    return { success: false, error: err.message || 'Failed to save dish status' };
  }
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

/**
 * Get or create a week by its label (e.g., "2026-W05")
 * Returns the canonical week row, creating it if necessary
 */
export async function getOrCreateWeek(weekId) {
  if (!weekId || typeof weekId !== 'string' || !weekId.includes('-W')) {
    console.error('[getOrCreateWeek] Invalid weekId:', weekId);
    return null;
  }

  // Try to fetch existing week
  const { data: existing, error: fetchError } = await supabase
    .from('weeks')
    .select('*')
    .eq('id', weekId)
    .single();

  if (existing) {
    console.log('[getOrCreateWeek] Found existing week:', weekId);
    return {
      id: existing.id,
      startDate: existing.start_date,
      endDate: existing.end_date,
      status: existing.status || 'draft',
      snapshot: existing.snapshot || null,
      kdsStatus: existing.kds_status || {},
      readyForDelivery: existing.ready_for_delivery || [],
      deliveryLog: existing.delivery_log || [],
      groceryBills: existing.grocery_bills || [],
      lockedAt: existing.locked_at,
      unlockedAt: existing.unlocked_at
    };
  }

  // Week doesn't exist - calculate dates and create it
  // Import week utils inline to avoid circular dependencies
  const [yearStr, weekPart] = weekId.split('-W');
  const year = parseInt(yearStr, 10);
  const weekNum = parseInt(weekPart, 10);

  // Calculate Monday of the week (ISO week standard)
  // January 4 is always in week 1
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7; // Convert Sunday from 0 to 7
  const week1Monday = new Date(jan4);
  week1Monday.setDate(jan4.getDate() - dayOfWeek + 1);

  const targetMonday = new Date(week1Monday);
  targetMonday.setDate(week1Monday.getDate() + (weekNum - 1) * 7);

  const targetSunday = new Date(targetMonday);
  targetSunday.setDate(targetMonday.getDate() + 6);

  const startDate = targetMonday.toISOString().split('T')[0];
  const endDate = targetSunday.toISOString().split('T')[0];

  console.log('[getOrCreateWeek] Creating new week:', weekId, startDate, '-', endDate);

  const { data: newWeek, error: insertError } = await supabase
    .from('weeks')
    .upsert({
      id: weekId,
      start_date: startDate,
      end_date: endDate,
      status: 'draft',
      kds_status: {},
      ready_for_delivery: [],
      delivery_log: [],
      grocery_bills: []
    }, { onConflict: 'id' })
    .select()
    .single();

  if (insertError) {
    console.error('[getOrCreateWeek] Error creating week:', insertError);
    throw insertError;
  }

  return {
    id: newWeek.id,
    startDate: newWeek.start_date,
    endDate: newWeek.end_date,
    status: newWeek.status || 'draft',
    snapshot: newWeek.snapshot || null,
    kdsStatus: newWeek.kds_status || {},
    readyForDelivery: newWeek.ready_for_delivery || [],
    deliveryLog: newWeek.delivery_log || [],
    groceryBills: newWeek.grocery_bills || [],
    lockedAt: newWeek.locked_at,
    unlockedAt: newWeek.unlocked_at
  };
}

/**
 * Fetch a single week by ID, returns null if not found
 */
export async function fetchWeek(weekId) {
  if (!weekId) return null;

  const { data, error } = await supabase
    .from('weeks')
    .select('*')
    .eq('id', weekId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    startDate: data.start_date,
    endDate: data.end_date,
    status: data.status || 'draft',
    snapshot: data.snapshot || null,
    kdsStatus: data.kds_status || {},
    readyForDelivery: data.ready_for_delivery || [],
    deliveryLog: data.delivery_log || [],
    groceryBills: data.grocery_bills || [],
    lockedAt: data.locked_at,
    unlockedAt: data.unlocked_at
  };
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
  // Helper to check if a value is a valid UUID
  const isValidUUID = (val) => {
    if (!val) return false;
    const str = String(val);
    // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
  };

  // Sanitize the ID - only keep if it's a valid UUID
  const originalId = driver.id;
  const hasValidUUID = isValidUUID(originalId);

  // Log if we're sanitizing an invalid ID
  if (originalId && !hasValidUUID) {
    console.log('[saveDriver] sanitizing invalid id, original value:', originalId, 'type:', typeof originalId);
  }

  // Build payload WITHOUT id for new drivers
  const payload = {
    name: driver.name,
    phone: driver.phone || '',
    zone: driver.zone || '',
    access_code: driver.accessCode || ''
  };

  // Only add id if it's a valid UUID (for updates)
  if (hasValidUUID) {
    payload.id = String(originalId);
  }

  console.log('[saveDriver] payload:', JSON.stringify(payload));
  console.log('[saveDriver] hasValidUUID:', hasValidUUID, ', original id:', originalId);

  let data, error;

  if (hasValidUUID) {
    // Update existing driver by UUID
    const result = await supabase
      .from('drivers')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single();
    data = result.data;
    error = result.error;
  } else {
    // Insert new driver - use upsert on name to avoid duplicates
    const result = await supabase
      .from('drivers')
      .upsert(payload, { onConflict: 'name' })
      .select()
      .single();
    data = result.data;
    error = result.error;
  }

  if (error) {
    console.error('[saveDriver] error:', JSON.stringify(error));
    throw error;
  }

  console.log('[saveDriver] success:', JSON.stringify(data));

  // Return the full driver object in app format with the real UUID from Supabase
  return {
    id: data.id,
    name: data.name,
    phone: data.phone || '',
    zone: data.zone || '',
    accessCode: data.access_code || ''
  };
}

export async function deleteDriver(driverId) {
  const { error } = await supabase
    .from('drivers')
    .delete()
    .eq('id', driverId);

  if (error) throw error;
}

/**
 * Save a driver to Supabase and refetch all drivers
 * Use this for reliable Supabase-first saves
 * Returns { success, drivers, error }
 */
export async function saveDriverToSupabase(driver) {
  console.log('[SAVE:start] driver', driver.name);

  // Check Supabase availability
  const { available, error: availError } = await checkSupabaseAvailable();
  if (!available) {
    console.error('[SAVE:blocked] driver -', availError);
    return { success: false, error: availError };
  }

  try {
    // Save the driver
    await saveDriver(driver);
    console.log('[SAVE:success] driver', driver.name);

    // Refetch all drivers from Supabase
    const drivers = await fetchDrivers();
    console.log('[SAVE:refetch] drivers, count:', drivers.length);

    return { success: true, drivers };
  } catch (err) {
    console.error('[SAVE:error] driver', err);
    return { success: false, error: err.message || 'Save failed' };
  }
}

/**
 * Delete a driver from Supabase and refetch all drivers
 * Returns { success, drivers, error }
 */
export async function deleteDriverFromSupabase(driverId) {
  console.log('[SAVE:start] delete driver', driverId);

  const { available, error: availError } = await checkSupabaseAvailable();
  if (!available) {
    console.error('[SAVE:blocked] delete driver -', availError);
    return { success: false, error: availError };
  }

  try {
    await deleteDriver(driverId);
    console.log('[SAVE:success] delete driver', driverId);

    const drivers = await fetchDrivers();
    console.log('[SAVE:refetch] drivers, count:', drivers.length);

    return { success: true, drivers };
  } catch (err) {
    console.error('[SAVE:error] delete driver', err);
    return { success: false, error: err.message || 'Delete failed' };
  }
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

// Bulk save all menu items
// Automatically ensures week records exist before saving (FK constraint)
export async function saveAllMenus(menuItems) {
  console.log(`[saveAllMenus] Saving ${menuItems.length} menu items...`);

  // First, ensure all required weeks exist (menus have FK to weeks)
  const weekIds = menuItems.map(item => {
    // Use existing weekId if valid
    if (item.weekId && /^\d{4}-W\d{2}$/.test(item.weekId)) {
      return item.weekId;
    }
    if (!item.date) {
      console.warn('[saveAllMenus] Item has no date:', item.clientName);
      return null;
    }
    // Calculate week ID from date
    try {
      const date = new Date(item.date + 'T12:00:00');
      if (isNaN(date.getTime())) {
        console.warn('[saveAllMenus] Invalid date:', item.date);
        return null;
      }
      const thursday = new Date(date);
      thursday.setDate(date.getDate() + (3 - ((date.getDay() + 6) % 7)));
      const year = thursday.getFullYear();
      const jan4 = new Date(year, 0, 4);
      const weekNum = 1 + Math.round(((thursday - jan4) / 86400000 - 3 + ((jan4.getDay() + 6) % 7)) / 7);
      const weekId = `${year}-W${String(weekNum).padStart(2, '0')}`;
      // Validate the calculated week ID
      if (!/^\d{4}-W\d{2}$/.test(weekId)) {
        console.warn('[saveAllMenus] Calculated invalid weekId:', weekId, 'from date:', item.date);
        return null;
      }
      return weekId;
    } catch (e) {
      console.error('[saveAllMenus] Error calculating weekId for date:', item.date, e);
      return null;
    }
  }).filter(Boolean);

  const uniqueWeekIds = [...new Set(weekIds)];
  console.log(`[saveAllMenus] Ensuring weeks exist:`, uniqueWeekIds);

  const weeksResult = await ensureWeeksExist(uniqueWeekIds);
  if (!weeksResult.success) {
    const errorMsg = `Failed to create week records: ${weeksResult.errors.join(', ')}`;
    console.error(`[saveAllMenus] ❌ ${errorMsg}`);
    throw new Error(errorMsg);
  }
  if (weeksResult.created.length > 0) {
    console.log(`[saveAllMenus] Created weeks:`, weeksResult.created);
  }

  let saved = 0;
  let errors = 0;

  // Group items by client+date to assign meal_index
  const grouped = {};
  for (const item of menuItems) {
    const key = `${item.clientName}|${item.date}`;
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(item);
  }

  // Save each item with its meal_index
  for (const [key, items] of Object.entries(grouped)) {
    for (let i = 0; i < items.length; i++) {
      const mealIndex = i + 1;
      console.log(`[saveAllMenus] Item for ${key}, meal_index=${mealIndex}`);
      try {
        await saveMenu(items[i], mealIndex);
        saved++;
      } catch (e) {
        errors++;
        console.error('[saveAllMenus] Failed to save item:', items[i], e);
      }
    }
  }

  console.log(`[saveAllMenus] Complete: ${saved} saved, ${errors} errors`);
  if (errors > 0) {
    throw new Error(`${errors} menu item(s) failed to save`);
  }
}

// Bulk save all weeks (for migration)
export async function saveAllWeeks(weeks) {
  for (const week of Object.values(weeks)) {
    await saveWeek(week);
  }
}

/**
 * Ensure week records exist for a list of week_ids before saving menus
 * Creates missing weeks with calculated start_date/end_date
 * @param {string[]} weekIds - Array of week IDs like ["2026-W05", "2026-W06"]
 * @returns {Promise<{success: boolean, created: string[], errors: string[]}>}
 */
export async function ensureWeeksExist(weekIds) {
  console.log('[ensureWeeksExist] Checking weeks:', weekIds);

  const uniqueWeekIds = [...new Set(weekIds.filter(id => id && id.includes('-W')))];
  if (uniqueWeekIds.length === 0) {
    console.log('[ensureWeeksExist] No valid week IDs to check');
    return { success: true, created: [], errors: [] };
  }

  const created = [];
  const errors = [];

  for (const weekId of uniqueWeekIds) {
    try {
      // Validate week ID format (must be YYYY-WNN)
      if (!weekId || !/^\d{4}-W\d{2}$/.test(weekId)) {
        console.error('[ensureWeeksExist] ❌ Invalid week ID format:', weekId);
        errors.push(`${weekId}: Invalid format (expected YYYY-WNN)`);
        continue;
      }

      // Check if week exists (use limit(1) instead of single/maybeSingle for compatibility)
      const { data: rows, error: fetchError } = await supabase
        .from('weeks')
        .select('id')
        .eq('id', weekId)
        .limit(1);

      if (fetchError) {
        console.warn('[ensureWeeksExist] Error checking week:', weekId, fetchError);
        // Continue to try creating it anyway
      }

      if (rows && rows.length > 0) {
        console.log('[ensureWeeksExist] Week exists:', weekId);
        continue;
      }

      // Week doesn't exist - calculate dates and create it
      console.log('[ensureWeeksExist] Week not found, creating:', weekId);
      const [yearStr, weekPart] = weekId.split('-W');
      const year = parseInt(yearStr, 10);
      const weekNum = parseInt(weekPart, 10);

      // Calculate Monday of the week (ISO week standard)
      const jan4 = new Date(year, 0, 4);
      const dayOfWeek = jan4.getDay() || 7;
      const week1Monday = new Date(jan4);
      week1Monday.setDate(jan4.getDate() - dayOfWeek + 1);

      const targetMonday = new Date(week1Monday);
      targetMonday.setDate(week1Monday.getDate() + (weekNum - 1) * 7);

      const targetSunday = new Date(targetMonday);
      targetSunday.setDate(targetMonday.getDate() + 6);

      const startDate = targetMonday.toISOString().split('T')[0];
      const endDate = targetSunday.toISOString().split('T')[0];

      console.log('[ensureWeeksExist] Creating week:', weekId, startDate, '-', endDate);

      const { error: insertError } = await supabase
        .from('weeks')
        .upsert({
          id: weekId,
          start_date: startDate,
          end_date: endDate,
          status: 'draft',
          kds_status: {},
          ready_for_delivery: [],
          delivery_log: [],
          grocery_bills: []
        }, { onConflict: 'id' });

      if (insertError) {
        console.error('[ensureWeeksExist] ❌ Failed to create week:', weekId, insertError);
        errors.push(`${weekId}: ${insertError.message}`);
      } else {
        console.log('[ensureWeeksExist] ✓ Created week:', weekId);
        created.push(weekId);
      }
    } catch (e) {
      console.error('[ensureWeeksExist] ❌ Error processing week:', weekId, e);
      errors.push(`${weekId}: ${e.message}`);
    }
  }

  const success = errors.length === 0;
  console.log('[ensureWeeksExist] Done:', { success, created: created.length, errors: errors.length });
  return { success, created, errors };
}

// Bulk save all drivers (for migration)
// Returns array of saved drivers with real UUIDs from Supabase
export async function saveAllDrivers(drivers) {
  console.log(`[saveAllDrivers] Saving ${drivers.length} drivers...`);
  const savedDrivers = [];
  let errors = 0;

  for (const driver of drivers) {
    try {
      const savedDriver = await saveDriver(driver);
      savedDrivers.push(savedDriver);
    } catch (e) {
      errors++;
      console.error('[saveAllDrivers] Failed to save driver:', driver.name, e);
    }
  }

  console.log(`[saveAllDrivers] Complete: ${savedDrivers.length} saved, ${errors} errors`);
  return savedDrivers;
}

// Bulk save all client portal data (for migration)
export async function saveAllClientPortalData(portalData) {
  for (const [clientName, data] of Object.entries(portalData)) {
    await saveClientPortalData(clientName, data);
  }
}

// ============ GROCERY BILLS ============

/**
 * Fetch grocery bills for a specific week
 * @param {string} weekId - Week ID like "2026-W05"
 * @returns {Promise<Array>} Array of grocery bills
 */
export async function fetchGroceryBillsByWeek(weekId) {
  console.log('[fetchGroceryBills] start weekId:', weekId);

  if (!weekId) {
    console.warn('[fetchGroceryBills] No weekId provided');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('grocery_bills')
      .select('*')
      .eq('week_id', weekId)
      .order('bill_date', { ascending: false });

    if (error) throw error;

    console.log('[fetchGroceryBills] success, count:', data?.length || 0);

    return (data || []).map(bill => ({
      id: bill.id,
      weekId: bill.week_id,
      date: bill.bill_date,
      store: bill.store || '',
      amount: bill.amount ? parseFloat(bill.amount) : 0,
      notes: bill.notes || ''
    }));
  } catch (err) {
    console.error('[fetchGroceryBills] error', err);
    return [];
  }
}

/**
 * Fetch all grocery bills
 * @returns {Promise<Array>} Array of all grocery bills
 */
export async function fetchAllGroceryBills() {
  console.log('[fetchAllGroceryBills] start');

  try {
    const { data, error } = await supabase
      .from('grocery_bills')
      .select('*')
      .order('bill_date', { ascending: false });

    if (error) throw error;

    console.log('[fetchAllGroceryBills] success, count:', data?.length || 0);

    return (data || []).map(bill => ({
      id: bill.id,
      weekId: bill.week_id,
      date: bill.bill_date,
      store: bill.store || '',
      amount: bill.amount ? parseFloat(bill.amount) : 0,
      notes: bill.notes || ''
    }));
  } catch (err) {
    console.error('[fetchAllGroceryBills] error', err);
    return [];
  }
}

/**
 * Save a grocery bill to Supabase
 * @param {Object} bill - { weekId, date, store, amount, notes }
 * @returns {Promise<{success: boolean, bills?: Array, error?: string}>}
 */
export async function saveGroceryBillToSupabase(bill) {
  console.log('[saveGroceryBill] start + payload', {
    weekId: bill.weekId,
    date: bill.date,
    store: bill.store,
    amount: bill.amount
  });

  // Validation
  if (!bill.amount || parseFloat(bill.amount) <= 0) {
    console.error('[saveGroceryBill] error - amount must be > 0');
    return { success: false, error: 'Amount must be greater than 0' };
  }

  if (!bill.date) {
    console.error('[saveGroceryBill] error - bill_date is required');
    return { success: false, error: 'Bill date is required' };
  }

  if (!bill.weekId) {
    console.error('[saveGroceryBill] error - week_id is required');
    return { success: false, error: 'Week ID is required' };
  }

  const { available, error: availError } = await checkSupabaseAvailable();
  if (!available) {
    console.error('[saveGroceryBill] error -', availError);
    return { success: false, error: availError };
  }

  try {
    const payload = {
      week_id: bill.weekId,
      bill_date: bill.date,
      store: bill.store || '',
      amount: parseFloat(bill.amount),
      notes: bill.notes || ''
    };

    const { data, error } = await supabase
      .from('grocery_bills')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    console.log('[saveGroceryBill] success, id:', data.id);

    // Refetch bills for this week
    const bills = await fetchGroceryBillsByWeek(bill.weekId);
    console.log('[saveGroceryBill] refetch count:', bills.length);

    return { success: true, bills, savedId: data.id };
  } catch (err) {
    console.error('[saveGroceryBill] error', err);
    return { success: false, error: err.message || 'Failed to save grocery bill' };
  }
}

/**
 * Delete a grocery bill from Supabase
 * @param {string} billId - UUID of the bill to delete
 * @param {string} weekId - Week ID for refetching
 * @returns {Promise<{success: boolean, bills?: Array, error?: string}>}
 */
export async function deleteGroceryBillFromSupabase(billId, weekId) {
  console.log('[deleteGroceryBill] start id:', billId);

  const { available, error: availError } = await checkSupabaseAvailable();
  if (!available) {
    console.error('[deleteGroceryBill] error -', availError);
    return { success: false, error: availError };
  }

  try {
    const { error } = await supabase
      .from('grocery_bills')
      .delete()
      .eq('id', billId);

    if (error) throw error;

    console.log('[deleteGroceryBill] success');

    // Refetch bills for this week
    const bills = weekId ? await fetchGroceryBillsByWeek(weekId) : [];
    console.log('[deleteGroceryBill] refetch count:', bills.length);

    return { success: true, bills };
  } catch (err) {
    console.error('[deleteGroceryBill] error', err);
    return { success: false, error: err.message || 'Failed to delete grocery bill' };
  }
}
