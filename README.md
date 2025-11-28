# Goldfinch Chef - Menu Planner

A menu planning app for personal chefs to manage clients, recipes, and shopping lists.

## Features

- **Menu Builder** - Select clients and build meals with protein, veg, and starch
- **Recipe Library** - Store recipes with ingredients and cooking instructions
- **Kitchen Display (KDS)** - View consolidated orders with portion counts
- **Shopping List** - Auto-generated list organized by grocery section
- **Client Management** - Track client info, household size, and preferences
- **Master Ingredients** - Manage ingredient costs and sources

## CSV Import/Export

Each data type supports CSV import and export:

### Clients CSV Format
```
name,persons,address,email,phone,notes,mealsPerWeek,status
John Smith,4,123 Main St,john@email.com,555-1234,No shellfish,3,Active
```

### Recipes CSV Format
```
category,name,instructions,ingredients
protein,Chicken Shawarma,Marinate and grill to 165°F,Chicken Thighs:5:oz|Lemon:1:oz|Garlic:0.5:oz
```
Note: Ingredients use the format `name:quantity:unit` separated by `|`

### Ingredients CSV Format
```
name,cost,unit,source,section
Chicken Thighs,3.99,lb,Costco,Meat & Seafood
```

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Open http://localhost:5173

## Deploy to Netlify

1. Push this repo to GitHub
2. Connect to Netlify
3. Build command: `npm run build`
4. Publish directory: `dist`
