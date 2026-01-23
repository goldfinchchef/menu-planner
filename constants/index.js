import { Plus, Trash2, List, Book, ChefHat, Users, Clock, DollarSign, Monitor } from 'lucide-react';

export const STORE_SECTIONS = [
  'Produce',
  'Meat & Seafood',
  'Dairy & Eggs',
  'Pantry & Dry Goods',
  'Spices & Seasonings',
  'Other'
];

export const UNITS = ['oz', 'lb', 'g', 'kg', 'each'];

export const RECIPE_CATEGORIES = ['protein', 'veg', 'starch', 'sauces', 'breakfast', 'soups'];

export const TABS = [
  { id: 'menu', label: 'Menu', icon: ChefHat },
  { id: 'recipes', label: 'Recipes', icon: Book },
  { id: 'kds', label: 'KDS', icon: Monitor },
  { id: 'prep', label: 'Shop', icon: List },
  { id: 'history', label: 'History', icon: Clock },
  { id: 'clients', label: 'Clients', icon: Users },
  { id: 'ingredients', label: 'Ingredients', icon: DollarSign }
];

export const DEFAULT_RECIPES = {
  protein: [],
  veg: [],
  starch: [],
  sauces: [],
  breakfast: [],
  soups: []
};

export const DEFAULT_CLIENTS = [
  { name: "Tim Brown", persons: 7, address: "10590 Canterberry Rd, Fairfax Station, VA 22039", email: "", phone: "", notes: "", mealsPerWeek: 4, status: "Active" },
  { name: "Scott Inman", persons: 4, address: "3418 Putnam Rd, Falls Church, VA 22042", email: "", phone: "", notes: "", mealsPerWeek: 4, status: "Active" }
];

export const DEFAULT_NEW_CLIENT = {
  name: '',
  persons: 1,
  address: '',
  email: '',
  phone: '',
  notes: '',
  mealsPerWeek: 0,
  status: 'Active'
};

export const DEFAULT_NEW_RECIPE = {
  category: 'protein',
  name: '',
  instructions: '',
  ingredients: [{ name: '', quantity: '', unit: 'oz', cost: '', source: '', section: 'Other' }]
};

export const DEFAULT_NEW_MENU_ITEM = {
  protein: '',
  veg: '',
  starch: '',
  extras: [],
  portions: 1
};

export const DEFAULT_NEW_INGREDIENT = {
  name: '',
  cost: '',
  unit: 'oz',
  source: '',
  section: 'Produce'
};
