import Papa from 'papaparse';

export const downloadCSV = (csv, filename) => {
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export const exportClientsCSV = (clients) => {
  downloadCSV(
    Papa.unparse(clients, { columns: ['name', 'persons', 'address', 'email', 'phone', 'notes', 'mealsPerWeek', 'status'] }),
    'clients.csv'
  );
};

export const importClientsCSV = (file, onComplete) => {
  Papa.parse(file, {
    header: true,
    complete: (results) => {
      const imported = results.data
        .filter(row => row.name)
        .map(row => ({
          name: row.name || '',
          persons: parseInt(row.persons) || 1,
          address: row.address || '',
          email: row.email || '',
          phone: row.phone || '',
          notes: row.notes || '',
          mealsPerWeek: parseInt(row.mealsPerWeek) || 0,
          status: row.status || 'Active'
        }));
      onComplete(imported);
    },
    error: (err) => alert('Error parsing CSV: ' + err.message)
  });
};

export const exportIngredientsCSV = (masterIngredients) => {
  downloadCSV(
    Papa.unparse(
      masterIngredients.map(ing => ({
        name: ing.name,
        cost: ing.cost,
        unit: ing.unit,
        source: ing.source,
        section: ing.section
      })),
      { columns: ['name', 'cost', 'unit', 'source', 'section'] }
    ),
    'ingredients.csv'
  );
};

export const importIngredientsCSV = (file, onComplete) => {
  Papa.parse(file, {
    header: true,
    complete: (results) => {
      const imported = results.data
        .filter(row => row.name)
        .map(row => ({
          id: Date.now() + Math.random(),
          name: row.name || '',
          cost: row.cost || '',
          unit: row.unit || 'oz',
          source: row.source || '',
          section: row.section || 'Other'
        }));
      onComplete(imported);
    },
    error: (err) => alert('Error parsing CSV: ' + err.message)
  });
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
  downloadCSV(
    Papa.unparse(rows, { columns: ['Recipe Name', 'Category', 'Instructions', 'Ingredient', 'Portion Size (oz)', 'cost', 'source', 'section'] }),
    'recipes.csv'
  );
};

export const importRecipesCSV = (file, onComplete) => {
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
          recipeMap[recipeName] = {
            name: recipeName,
            category,
            instructions: row['Instructions'] || '',
            ingredients: []
          };
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
          newRecipes[recipe.category].push({
            name: recipe.name,
            instructions: recipe.instructions,
            ingredients: recipe.ingredients
          });
        }
      });

      onComplete(newRecipes, ingredientsToAdd);
    },
    error: (err) => alert('Error parsing CSV: ' + err.message)
  });
};

export const exportPrepList = (prepList) => {
  downloadCSV(
    Papa.unparse(
      prepList.map(item => ({
        Source: item.source,
        Section: item.section,
        Ingredient: item.name,
        Quantity: item.quantity.toFixed(2),
        Unit: item.unit
      })),
      { columns: ['Source', 'Section', 'Ingredient', 'Quantity', 'Unit'] }
    ),
    'shopping-list.csv'
  );
};
