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

export const findSimilarIngredients = (name, masterIngredients) => {
  if (!name || name.length < 2) return [];
  return masterIngredients.filter(mi => {
    const sim = similarity(name, mi.name);
    return sim > 0.7 && sim < 1;
  });
};

export const findExactMatch = (name, masterIngredients) =>
  masterIngredients.find(mi => normalizeName(mi.name) === normalizeName(name));

export const categorizeIngredient = (name) => {
  const n = name.toLowerCase();
  if (['lettuce', 'cucumber', 'tomato', 'onion', 'garlic', 'carrot', 'potato', 'cauliflower', 'broccoli', 'spinach', 'pepper', 'celery', 'mushroom', 'zucchini', 'squash', 'asparagus', 'lemon', 'lime', 'ginger', 'cilantro', 'parsley'].some(x => n.includes(x))) return 'Produce';
  if (['chicken', 'beef', 'pork', 'salmon', 'fish', 'shrimp', 'turkey', 'lamb', 'bacon', 'sausage', 'steak', 'thigh', 'breast'].some(x => n.includes(x))) return 'Meat & Seafood';
  if (['milk', 'cheese', 'butter', 'egg', 'cream', 'yogurt'].some(x => n.includes(x))) return 'Dairy & Eggs';
  if (['salt', 'pepper', 'spice', 'cumin', 'paprika', 'oregano', 'thyme', 'cinnamon', 'cayenne', 'curry'].some(x => n.includes(x))) return 'Spices & Seasonings';
  if (['rice', 'pasta', 'flour', 'sugar', 'oil', 'vinegar', 'sauce', 'honey', 'bread', 'stock', 'broth'].some(x => n.includes(x))) return 'Pantry & Dry Goods';
  return 'Other';
};

export const getRecipeCost = (recipe, masterIngredients) => {
  if (!recipe?.ingredients) return 0;
  return recipe.ingredients.reduce((total, ing) => {
    const masterIng = findExactMatch(ing.name, masterIngredients);
    const costPerUnit = parseFloat(masterIng?.cost || ing.cost || 0);
    const quantity = parseFloat(ing.quantity || 0);
    return total + (costPerUnit * quantity);
  }, 0);
};

export const getRecipeCounts = (recipes) => {
  const counts = {};
  let total = 0;
  Object.entries(recipes).forEach(([category, items]) => {
    counts[category] = items.length;
    total += items.length;
  });
  counts.total = total;
  return counts;
};

export const SECTIONS = ['Produce', 'Meat & Seafood', 'Dairy & Eggs', 'Pantry & Dry Goods', 'Spices & Seasonings', 'Other'];
export const UNITS = ['oz', 'lb', 'g', 'kg', 'each'];
export const CATEGORIES = ['protein', 'veg', 'starch', 'sauces', 'breakfast', 'soups'];
