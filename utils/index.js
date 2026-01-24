import Papa from 'papaparse';

// Re-export week utilities
export * from './weekUtils';

export const normalizeName = (name) =>
  name.toLowerCase().trim().replace(/s$/, '').replace(/es$/, '').replace(/ies$/, 'y').replace(/[^a-z0-9]/g, '');

export const similarity = (str1, str2) => {
  const s1 = normalizeName(str1);
  const s2 = normalizeName(str2);
  if (s1 === s2) return 1;
  if (s1.includes(s2) || s2.includes(s1)) return 0.9;
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  if (longer.length === 0) return 1;
  const costs = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) costs[j] = j;
      else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return (longer.length - costs[s2.length]) / longer.length;
};

export const downloadCSV = (csv, filename) => {
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export const categorizeIngredient = (name) => {
  const n = name.toLowerCase();
  if (['lettuce', 'cucumber', 'tomato', 'onion', 'garlic', 'carrot', 'potato', 'cauliflower', 'broccoli', 'spinach', 'pepper', 'celery', 'mushroom', 'zucchini', 'squash', 'asparagus', 'lemon', 'lime', 'ginger', 'cilantro', 'parsley'].some(x => n.includes(x))) return 'Produce';
  if (['chicken', 'beef', 'pork', 'salmon', 'fish', 'shrimp', 'turkey', 'lamb', 'bacon', 'sausage', 'steak', 'thigh', 'breast'].some(x => n.includes(x))) return 'Meat & Seafood';
  if (['milk', 'cheese', 'butter', 'egg', 'cream', 'yogurt'].some(x => n.includes(x))) return 'Dairy & Eggs';
  if (['salt', 'pepper', 'spice', 'cumin', 'paprika', 'oregano', 'thyme', 'cinnamon', 'cayenne', 'curry'].some(x => n.includes(x))) return 'Spices & Seasonings';
  if (['rice', 'pasta', 'flour', 'sugar', 'oil', 'vinegar', 'sauce', 'honey', 'bread', 'stock', 'broth'].some(x => n.includes(x))) return 'Pantry & Dry Goods';
  return 'Other';
};

export const exportClientsCSV = (clients) => {
  downloadCSV(Papa.unparse(clients, { columns: ['name', 'persons', 'address', 'email', 'phone', 'notes', 'mealsPerWeek', 'status'] }), 'clients.csv');
};

export const exportIngredientsCSV = (masterIngredients) => {
  downloadCSV(Papa.unparse(masterIngredients.map(ing => ({
    name: ing.name,
    cost: ing.cost,
    unit: ing.unit,
    source: ing.source,
    section: ing.section
  })), { columns: ['name', 'cost', 'unit', 'source', 'section'] }), 'ingredients.csv');
};

export const exportRecipesCSV = (recipes) => {
  const rows = [];
  Object.entries(recipes).forEach(([category, items]) => {
    items.forEach(recipe => {
      if (recipe.ingredients?.length > 0) {
        recipe.ingredients.forEach(ing => {
          rows.push({
            'Recipe Name': recipe.name,
            'Category': category,
            'Instructions': recipe.instructions || '',
            'Ingredient': ing.name,
            'Portion Size (oz)': ing.quantity,
            'cost': ing.cost || '',
            'source': ing.source || '',
            'section': ing.section || 'Other'
          });
        });
      } else {
        rows.push({
          'Recipe Name': recipe.name,
          'Category': category,
          'Instructions': recipe.instructions || '',
          'Ingredient': '',
          'Portion Size (oz)': '',
          'cost': '',
          'source': '',
          'section': ''
        });
      }
    });
  });
  downloadCSV(Papa.unparse(rows, { columns: ['Recipe Name', 'Category', 'Instructions', 'Ingredient', 'Portion Size (oz)', 'cost', 'source', 'section'] }), 'recipes.csv');
};

export const parseClientsCSV = (file, onSuccess, onError) => {
  Papa.parse(file, {
    header: true,
    complete: (results) => {
      // Check if this is the new subscription format or old format
      const headers = results.meta.fields || [];
      const isNewFormat = headers.includes('subscriptionId') || headers.includes('subscriptionDisplayName');

      if (isNewFormat) {
        // New subscription/contacts format - group rows by subscription
        const subscriptionMap = {};
        let currentSubscription = null;

        results.data.forEach(row => {
          // If row has subscription data, start a new subscription
          if (row.subscriptionId || row.subscriptionDisplayName) {
            const subId = row.subscriptionId || Date.now().toString() + Math.random();
            currentSubscription = {
              subscriptionId: subId,
              displayName: row.subscriptionDisplayName || '',
              portions: parseInt(row.portions) || 1,
              mealsPerWeek: parseInt(row.mealsPerWeek) || 0,
              frequency: row.frequency || 'weekly',
              status: row.status || 'active',
              zone: row.zone || '',
              deliveryDay: row.deliveryDay || '',
              pickup: row.pickup === 'true' || row.pickup === true,
              planPrice: parseFloat(row.planPrice) || 0,
              serviceFee: parseFloat(row.serviceFee) || 0,
              prepayDiscount: row.prepayDiscount === 'true' || row.prepayDiscount === true,
              newClientFeePaid: row.newClientFeePaid === 'true' || row.newClientFeePaid === true,
              paysOwnGroceries: row.paysOwnGroceries === 'true' || row.paysOwnGroceries === true,
              billingNotes: row.billingNotes || '',
              accessCode: row.accessCode || '',
              honeyBookLink: row.honeyBookLink || '',
              contacts: []
            };
            subscriptionMap[subId] = currentSubscription;
          }

          // Add contact to current subscription if there's contact data
          if (currentSubscription && (row.contactFullName || row.email || row.address)) {
            currentSubscription.contacts.push({
              fullName: row.contactFullName || '',
              displayName: row.contactDisplayName || '',
              email: row.email || '',
              phone: row.phone || '',
              address: row.address || ''
            });
          }
        });

        const imported = Object.values(subscriptionMap).filter(sub => sub.displayName || sub.contacts.length > 0);
        onSuccess(imported);
      } else {
        // Old client format - convert to subscription format
        const imported = results.data.filter(row => row.name).map(row => ({
          subscriptionId: Date.now().toString() + Math.random(),
          displayName: row.displayName || row.name || '',
          portions: parseInt(row.persons) || parseInt(row.portions) || 1,
          mealsPerWeek: parseInt(row.mealsPerWeek) || 0,
          frequency: row.frequency || 'weekly',
          status: row.status || 'active',
          zone: row.zone || '',
          deliveryDay: row.deliveryDay || '',
          pickup: row.pickup === 'true' || row.pickup === true || false,
          planPrice: parseFloat(row.planPrice) || 0,
          serviceFee: parseFloat(row.serviceFee) || 0,
          prepayDiscount: false,
          newClientFeePaid: false,
          paysOwnGroceries: false,
          billingNotes: row.notes || row.billingNotes || '',
          accessCode: row.accessCode || '',
          honeyBookLink: row.honeyBookLink || '',
          contacts: [{
            fullName: row.name || '',
            displayName: '',
            email: row.email || '',
            phone: row.phone || '',
            address: row.address || ''
          }]
        }));
        onSuccess(imported);
      }
    },
    error: onError
  });
};

export const parseIngredientsCSV = (file, onSuccess, onError) => {
  Papa.parse(file, {
    header: true,
    complete: (results) => {
      const imported = results.data.filter(row => row.name).map(row => ({
        id: Date.now() + Math.random(),
        name: row.name || '',
        cost: row.cost || '',
        unit: row.unit || 'oz',
        source: row.source || '',
        section: row.section || 'Other'
      }));
      onSuccess(imported);
    },
    error: onError
  });
};

export const parseRecipesCSV = (file, onSuccess, onError) => {
  Papa.parse(file, {
    header: true,
    complete: (results) => {
      const newRecipes = { protein: [], veg: [], starch: [], sauces: [], breakfast: [], soups: [] };
      const recipeMap = {};
      const ingredientsToAdd = [];
      results.data.forEach(row => {
        if (!row['Recipe Name']) return;
        const recipeName = row['Recipe Name'];
        const category = (row['Category'] || 'protein').toLowerCase();
        if (!recipeMap[recipeName]) {
          recipeMap[recipeName] = { name: recipeName, category, instructions: row['Instructions'] || '', ingredients: [] };
        }
        if (row['Ingredient']) {
          const ingredient = {
            name: row['Ingredient'],
            quantity: row['Portion Size (oz)'] || '',
            unit: 'oz',
            cost: row['cost'] || '',
            source: row['source'] || '',
            section: row['section'] || 'Other'
          };
          recipeMap[recipeName].ingredients.push(ingredient);
          ingredientsToAdd.push(ingredient);
        }
      });
      Object.values(recipeMap).forEach(recipe => {
        if (newRecipes[recipe.category]) {
          newRecipes[recipe.category].push({ name: recipe.name, instructions: recipe.instructions, ingredients: recipe.ingredients });
        }
      });
      onSuccess(newRecipes, ingredientsToAdd);
    },
    error: onError
  });
};
