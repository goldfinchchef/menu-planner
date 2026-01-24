// Week/Cycle utility functions

/**
 * Get ISO week number and year for a date
 * Returns format like "2026-W04"
 */
export function getWeekId(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  // Thursday of current week decides the year
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  // January 4 is always in week 1
  const week1 = new Date(d.getFullYear(), 0, 4);
  // Calculate week number
  const weekNum = 1 + Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

/**
 * Get the start date (Monday) of a week from weekId
 */
export function getWeekStartDate(weekId) {
  const [year, weekPart] = weekId.split('-W');
  const weekNum = parseInt(weekPart, 10);

  // January 4 is always in week 1
  const jan4 = new Date(parseInt(year, 10), 0, 4);
  const dayOfWeek = jan4.getDay() || 7; // Convert Sunday from 0 to 7

  // Find Monday of week 1
  const week1Monday = new Date(jan4);
  week1Monday.setDate(jan4.getDate() - dayOfWeek + 1);

  // Add weeks to get to target week
  const targetMonday = new Date(week1Monday);
  targetMonday.setDate(week1Monday.getDate() + (weekNum - 1) * 7);

  return targetMonday.toISOString().split('T')[0];
}

/**
 * Get the end date (Sunday) of a week from weekId
 */
export function getWeekEndDate(weekId) {
  const startDate = getWeekStartDate(weekId);
  const endDate = new Date(startDate + 'T12:00:00');
  endDate.setDate(endDate.getDate() + 6);
  return endDate.toISOString().split('T')[0];
}

/**
 * Get weekId from a date string (YYYY-MM-DD)
 */
export function getWeekIdFromDate(dateStr) {
  return getWeekId(new Date(dateStr + 'T12:00:00'));
}

/**
 * Format weekId for display (e.g., "Jan 20 - Jan 26, 2026")
 */
export function formatWeekRange(weekId) {
  const startDate = new Date(getWeekStartDate(weekId) + 'T12:00:00');
  const endDate = new Date(getWeekEndDate(weekId) + 'T12:00:00');

  const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
  const startDay = startDate.getDate();
  const endDay = endDate.getDate();
  const year = endDate.getFullYear();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} - ${endDay}, ${year}`;
  }
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
}

/**
 * Get array of weekIds for the past N weeks
 */
export function getPastWeekIds(count = 4) {
  const weeks = [];
  const today = new Date();

  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i * 7);
    weeks.push(getWeekId(d));
  }

  return [...new Set(weeks)]; // Remove duplicates
}

/**
 * Check if a date falls within a specific week
 */
export function isDateInWeek(dateStr, weekId) {
  return getWeekIdFromDate(dateStr) === weekId;
}

/**
 * Create a new week record
 */
export function createWeekRecord(weekId) {
  return {
    weekId,
    startDate: getWeekStartDate(weekId),
    endDate: getWeekEndDate(weekId),
    status: 'draft',
    createdAt: new Date().toISOString(),
    lockedAt: null,

    // Snapshot data (populated when locked)
    snapshot: {
      menu: {},           // clientName → [menu items]
      stops: [],          // resolved delivery stops
      subscriptions: {}   // subscription details at lock time
    },

    // Operational state
    kdsStatus: {},        // dishName → { status: 'pending'|'cooking'|'complete', completedAt }
    readyForDelivery: [], // orders ready for delivery
    deliveryLog: [],      // delivery completion records
    groceryBills: []      // grocery costs for this week
  };
}

/**
 * Migrate a client to subscription format (for snapshots)
 */
function migrateClientToSubscription(client) {
  if (client.subscriptionId) return client;

  const contacts = client.contacts && client.contacts.length > 0
    ? client.contacts.map(c => ({
        fullName: c.fullName || c.name || '',
        displayName: c.displayName || '',
        email: c.email || '',
        phone: c.phone || '',
        address: c.address || ''
      }))
    : [{
        fullName: client.name || '',
        displayName: '',
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || ''
      }];

  return {
    subscriptionId: client.id || Date.now().toString(),
    displayName: client.displayName || client.name || '',
    portions: client.portions || client.persons || 1,
    mealsPerWeek: client.mealsPerWeek || 0,
    frequency: client.frequency || 'weekly',
    status: client.status || 'active',
    zone: client.zone || '',
    deliveryDay: client.deliveryDay || '',
    pickup: client.pickup || false,
    contacts
  };
}

/**
 * Create snapshot data when locking a week
 */
export function createWeekSnapshot(weekId, menuItems, clients) {
  // Group menu items by client
  const menu = {};
  const clientsInWeek = new Set();

  menuItems.forEach(item => {
    if (isDateInWeek(item.date, weekId) && item.approved) {
      if (!menu[item.clientName]) {
        menu[item.clientName] = [];
      }
      menu[item.clientName].push({
        id: item.id,
        date: item.date,
        protein: item.protein,
        veg: item.veg,
        starch: item.starch,
        extras: item.extras || [],
        portions: item.portions
      });
      clientsInWeek.add(item.clientName);
    }
  });

  // Resolve delivery stops
  const stops = [];
  const subscriptions = {};

  clientsInWeek.forEach(clientName => {
    const client = clients.find(c => c.name === clientName || c.displayName === clientName);
    if (!client) return;

    const subscription = migrateClientToSubscription(client);
    subscriptions[clientName] = subscription;

    if (subscription.pickup) return; // Skip pickup clients for stops

    // Group contacts by unique addresses
    const contacts = subscription.contacts || [];
    const addressGroups = {};

    contacts.forEach((contact, idx) => {
      if (!contact.address) return;
      const normalizedAddr = contact.address.toLowerCase().trim();
      if (!addressGroups[normalizedAddr]) {
        addressGroups[normalizedAddr] = {
          address: contact.address,
          contacts: [],
          zone: subscription.zone
        };
      }
      addressGroups[normalizedAddr].contacts.push({
        fullName: contact.fullName,
        displayName: contact.displayName,
        phone: contact.phone,
        email: contact.email
      });
    });

    // Create a stop for each unique address
    Object.values(addressGroups).forEach((group, idx) => {
      stops.push({
        subscriptionId: subscription.subscriptionId,
        clientName,
        displayName: subscription.displayName,
        portions: subscription.portions,
        zone: group.zone,
        deliveryDay: subscription.deliveryDay,
        address: group.address,
        contacts: group.contacts,
        stopIndex: idx
      });
    });
  });

  return { menu, stops, subscriptions };
}

/**
 * Lock a week - creates snapshot and sets status
 */
export function lockWeek(week, menuItems, clients) {
  const snapshot = createWeekSnapshot(week.weekId, menuItems, clients);

  return {
    ...week,
    status: 'locked',
    lockedAt: new Date().toISOString(),
    snapshot
  };
}

/**
 * Navigate to previous/next week
 */
export function getAdjacentWeekId(weekId, direction = 1) {
  const startDate = new Date(getWeekStartDate(weekId) + 'T12:00:00');
  startDate.setDate(startDate.getDate() + direction * 7);
  return getWeekId(startDate);
}
