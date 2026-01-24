import { Plus, Trash2, List, Book, ChefHat, Users, Clock, DollarSign, Monitor, RefreshCw, Truck, Car } from 'lucide-react';

export const STORE_SECTIONS = [
  'Produce',
  'Meat & Seafood',
  'Dairy & Eggs',
  'Pantry & Dry Goods',
  'Spices & Seasonings',
  'Other'
];

export const UNITS = ['oz', 'lb', 'g', 'kg', 'each'];

export const ZONES = ['A', 'B', 'C'];

export const DELIVERY_PROBLEMS = ['Not home', 'Wrong address', 'Refused delivery', 'House hard to find', 'Other'];

export const DAYS = ['Monday', 'Tuesday', 'Thursday'];

export const RECIPE_CATEGORIES = ['protein', 'veg', 'starch', 'sauces', 'breakfast', 'soups'];

export const TABS = [
  { id: 'menu', label: 'Menu', icon: ChefHat },
  { id: 'recipes', label: 'Recipes', icon: Book },
  { id: 'kds', label: 'KDS', icon: Monitor },
  { id: 'prep', label: 'Shop', icon: List },
  { id: 'history', label: 'History', icon: Clock },
  { id: 'clients', label: 'Clients', icon: Users },
  { id: 'subscriptions', label: 'Subscriptions', icon: RefreshCw },
  { id: 'deliveries', label: 'Deliveries', icon: Truck },
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
  { name: "Tim Brown", displayName: "", persons: 7, address: "10590 Canterberry Rd, Fairfax Station, VA 22039", email: "", phone: "", notes: "", mealsPerWeek: 4, frequency: "weekly", status: "active", pausedDate: "", honeyBookLink: "", billingNotes: "", deliveryDay: "", zone: "", pickup: false },
  { name: "Scott Inman", displayName: "", persons: 4, address: "3418 Putnam Rd, Falls Church, VA 22042", email: "", phone: "", notes: "", mealsPerWeek: 4, frequency: "weekly", status: "active", pausedDate: "", honeyBookLink: "", billingNotes: "", deliveryDay: "", zone: "", pickup: false }
];

export const DEFAULT_NEW_CLIENT = {
  name: '',
  displayName: '',
  persons: 1,
  address: '',
  email: '',
  phone: '',
  notes: '',
  mealsPerWeek: 0,
  frequency: 'weekly',
  status: 'active',
  pausedDate: '',
  honeyBookLink: '',
  billingNotes: '',
  deliveryDay: '',
  zone: '',
  pickup: false
};

export const DEFAULT_NEW_DRIVER = {
  name: '',
  phone: '',
  zone: '',
  accessCode: ''
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
