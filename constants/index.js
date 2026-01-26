import { Plus, Trash2, List, Book, ChefHat, Users, Clock, DollarSign, Monitor, RefreshCw, Truck, Car, Utensils, ShoppingCart } from 'lucide-react';

export const STORE_SECTIONS = [
  'Produce',
  'Meat & Seafood',
  'Dairy & Eggs',
  'Pantry & Dry Goods',
  'Spices & Seasonings',
  'Other'
];

export const DEFAULT_UNITS = ['oz', 'lb', 'g', 'kg', 'each', 'bunch', 'cup', 'tbsp', 'tsp', 'clove', 'head', 'can', 'jar', 'package'];

// Alias for backwards compatibility
export const UNITS = DEFAULT_UNITS;

export const ZONES = ['A', 'B', 'C'];

export const DELIVERY_PROBLEMS = ['Not home', 'Wrong address', 'Refused delivery', 'House hard to find', 'Other'];

export const DAYS = ['Monday', 'Tuesday', 'Thursday'];

export const RECIPE_CATEGORIES = ['protein', 'veg', 'starch', 'sauces', 'breakfast', 'soups'];

export const TABS = [
  { id: 'kds', label: 'KDS', icon: Monitor },
  { id: 'recipes', label: 'Recipes', icon: Book },
  { id: 'deliveries', label: 'Deliveries', icon: Truck },
  { id: 'prep', label: 'Shop', icon: ShoppingCart }
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

export const DEFAULT_CONTACT = {
  fullName: '',
  displayName: '',
  email: '',
  phone: '',
  address: ''
};

export const DEFAULT_NEW_SUBSCRIPTION = {
  subscriptionId: '',
  displayName: '',
  portions: 1,
  mealsPerWeek: 0,
  frequency: 'weekly',
  status: 'active',
  zone: '',
  deliveryDay: '',
  pickup: false,
  planPrice: 0,
  serviceFee: 0,
  prepayDiscount: false,
  newClientFeePaid: false,
  paysOwnGroceries: false,
  billingNotes: '',
  accessCode: '',
  honeyBookLink: '',
  contacts: [{ ...DEFAULT_CONTACT }],
  deliveryDates: [],  // Next 4 delivery dates
  billDueDate: '',    // When payment is due
  chefChoice: true,   // true = Chef picks menu, false = client picks dishes
  dietaryRestrictions: ''  // Allergies, preferences, restrictions
};

// Legacy alias for backwards compatibility
export const DEFAULT_NEW_CLIENT = DEFAULT_NEW_SUBSCRIPTION;

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
