import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Plus, Trash2, Check, AlertTriangle, Circle, Eye, X, ChevronDown, ChevronUp, Edit2, Printer, Calendar } from 'lucide-react';
import WeekSelector from '../components/WeekSelector';
import { getWeekIdFromDate, getWeekStartDate, getWeekEndDate } from '../utils/weekUtils';
import { isSupabaseMode, isLocalMode } from '../lib/dataMode';
import { saveAllMenus, fetchMenus, ensureWeeksExist } from '../lib/database';
import { checkConnection } from '../lib/supabase';

// Styled Menu Card Component - matches client portal
function StyledMenuCard({ client, date, menuItems }) {
  const displayDate = new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).toUpperCase();

  const meals = [];
  menuItems.forEach(item => {
    const meal = {
      protein: item.protein,
      sides: [item.veg, item.starch].filter(Boolean)
    };
    if (meal.protein || meal.sides.length > 0) {
      meals.push(meal);
    }
    if (item.extras) {
      item.extras.forEach(extra => {
        meals.push({ protein: extra, sides: [], isExtra: true });
      });
    }
  });

  const displayName = client.displayName || client.name;

  return (
    <div className="overflow-hidden shadow-lg rounded-lg" style={{ backgroundColor: '#fff' }}>
      <div
        className="relative px-4 pt-6 pb-8"
        style={{
          backgroundColor: '#f9f9ed',
          backgroundImage: 'url(/pattern4.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <p
          className="text-center mb-2"
          style={{
            fontFamily: '"Glacial Indifference", sans-serif',
            fontSize: '12px',
            letterSpacing: '0.3em',
            color: '#5a5a5a'
          }}
        >
          GOLDFINCH CHEF SERVICES
        </p>

        <h2
          className="text-center mb-3"
          style={{
            color: '#3d59ab',
            fontFamily: '"Poller One", cursive',
            fontSize: '18px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            textDecoration: 'underline',
            textDecorationColor: '#3d59ab',
            textUnderlineOffset: '4px'
          }}
        >
          {displayName}'s Menu
        </h2>

        <p
          className="text-center mb-4"
          style={{
            color: '#5a5a5a',
            fontFamily: '"Beth Ellen", cursive',
            fontSize: '12px'
          }}
        >
          here's what to expect on your plate!
        </p>

        <div className="flex items-center justify-center gap-3">
          <img
            src="/goldfinch5.png"
            alt="Goldfinch"
            className="w-12 h-12 object-contain"
          />
          <p
            style={{
              fontFamily: '"Glacial Indifference", sans-serif',
              fontSize: '14px',
              letterSpacing: '0.2em',
              color: '#5a5a5a'
            }}
          >
            {displayDate}
          </p>
        </div>
      </div>

      <div
        className="px-6 py-8"
        style={{ backgroundColor: '#d9a87a' }}
      >
        <div className="space-y-8">
          {meals.map((meal, idx) => (
            <div key={idx} className="text-center">
              {meal.protein && (
                <h3
                  style={{
                    color: '#ffffff',
                    fontFamily: '"Glacial Indifference", sans-serif',
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    marginBottom: meal.sides.length > 0 ? '0.5rem' : 0
                  }}
                >
                  {meal.protein}
                </h3>
              )}
              {meal.sides.length > 0 && (
                <p
                  style={{
                    color: '#f5e6d3',
                    fontFamily: '"Glacial Indifference", sans-serif',
                    fontSize: '0.85rem',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase'
                  }}
                >
                  {meal.sides.join(', ')}
                </p>
              )}
            </div>
          ))}
          {meals.length === 0 && (
            <p className="text-center text-white/70 italic">No menu items yet</p>
          )}
        </div>
      </div>

      <div
        className="relative px-6 py-6"
        style={{
          backgroundColor: '#f9f9ed',
          fontFamily: '"Glacial Indifference", sans-serif'
        }}
      >
        <h4
          className="mb-3"
          style={{
            color: '#3d59ab',
            fontFamily: '"Poller One", cursive',
            fontSize: '1.1rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}
        >
          Get Ready!
        </h4>
        <p
          className="mb-4 pr-20"
          style={{
            color: '#5a5a5a',
            fontSize: '0.9rem',
            lineHeight: '1.5'
          }}
        >
          Remember to put out bags, containers, and ice packs. And get excited – great food is on the way!
        </p>
        <img
          src="/stemflower.png"
          alt=""
          className="absolute right-4 bottom-4 h-20 object-contain"
        />
      </div>
    </div>
  );
}

export default function MenuTab({
  menuDate,
  setMenuDate,
  clients,
  allClients,
  selectedClients,
  setSelectedClients,
  recipes,
  newMenuItem,
  setNewMenuItem,
  menuItems,
  setMenuItems,
  addMenuItem,
  clearMenu,
  deleteMenuItem,
  getOrdersByClient,
  clientPortalData = {},
  weeklyTasks = {},
  weeks = {},
  selectedWeekId,
  setSelectedWeekId,
  lockWeekAndSnapshot,
  unlockWeekById
}) {
  const [previewClient, setPreviewClient] = useState(null);
  const [editingClientName, setEditingClientName] = useState(null);
  const [showMenuBuilder, setShowMenuBuilder] = useState(true);

  // === AUTO-SAVE LOGIC ===
  const [isDirty, setIsDirty] = useState(false);
  const initialMountRef = useRef(true);
  const menuItemsRef = useRef(menuItems);
  const selectedWeekIdRef = useRef(selectedWeekId);

  // Keep refs in sync for beforeunload handler
  useEffect(() => {
    menuItemsRef.current = menuItems;
    selectedWeekIdRef.current = selectedWeekId;
  }, [menuItems, selectedWeekId]);

  // Track changes to menuItems (mark as dirty after initial mount)
  useEffect(() => {
    if (initialMountRef.current) {
      initialMountRef.current = false;
      return;
    }
    if (menuItems && menuItems.length >= 0) {
      setIsDirty(true);
      console.log('[MenuAutoSave] dirty=true week=' + selectedWeekId);
    }
  }, [menuItems, selectedWeekId]);

  // Auto-save function
  const performAutoSave = useCallback(async () => {
    const currentMenuItems = menuItemsRef.current;
    const currentWeekId = selectedWeekIdRef.current;

    if (!isSupabaseMode()) {
      console.log('[MenuAutoSave] skipped - local mode');
      return;
    }
    if (!currentWeekId) {
      console.log('[MenuAutoSave] skipped - no week selected');
      return;
    }
    if (!currentMenuItems || currentMenuItems.length === 0) {
      console.log('[MenuAutoSave] skipped - no menu items');
      return;
    }

    // Filter to items for the current week
    const weekItems = currentMenuItems.filter(item => {
      const itemWeekId = getWeekIdFromDate(item.date);
      return itemWeekId === currentWeekId;
    });

    if (weekItems.length === 0) {
      console.log('[MenuAutoSave] skipped - no items for this week');
      return;
    }

    console.log('[MenuAutoSave] saving...', weekItems.length, 'items');
    try {
      // Ensure weeks exist first
      const weekIds = [...new Set(weekItems.map(item => {
        if (item.weekId) return item.weekId;
        return getWeekIdFromDate(item.date);
      }).filter(Boolean))];

      await ensureWeeksExist(weekIds);
      await saveAllMenus(weekItems);
      console.log('[MenuAutoSave] done');
    } catch (error) {
      console.error('[MenuAutoSave] failed:', error);
    }
  }, []);

  // Save on unmount (tab/route change)
  useEffect(() => {
    return () => {
      if (isDirty && isSupabaseMode() && selectedWeekIdRef.current) {
        console.log('[MenuAutoSave] unmount - triggering save');
        performAutoSave();
      }
    };
  }, [isDirty, performAutoSave]);

  // Save on browser close/refresh (best-effort, fire-and-forget)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isDirty && isSupabaseMode() && selectedWeekIdRef.current) {
        console.log('[MenuAutoSave] beforeunload - triggering save');
        performAutoSave();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, performAutoSave]);
  // === END AUTO-SAVE LOGIC ===

  // Check if current week is locked
  const currentWeek = weeks?.[selectedWeekId];
  const isWeekLocked = currentWeek?.status === 'locked';

  // Get clients scheduled for this week based on delivery_dates
  // Filter to clients where ANY date in deliveryDates falls within the week range
  const activeClients = useMemo(() => {
    const allClientsList = allClients || clients || [];
    if (!selectedWeekId) return [];

    const weekStart = getWeekStartDate(selectedWeekId);
    const weekEnd = getWeekEndDate(selectedWeekId);

    return allClientsList.filter(client => {
      const dates = client.deliveryDates || client.delivery_dates || [];
      if (!Array.isArray(dates) || dates.length === 0) return false;

      // Check if any non-blank date falls within the week range
      return dates.some(dateStr => {
        if (!dateStr || typeof dateStr !== 'string' || dateStr.trim() === '') return false;
        // Compare as strings (YYYY-MM-DD format sorts correctly)
        return dateStr >= weekStart && dateStr <= weekEnd;
      });
    });
  }, [allClients, clients, selectedWeekId]);

  // Calculate delivery dates for the selected week
  const weekDeliveryDates = useMemo(() => {
    if (!selectedWeekId) return { Monday: '', Tuesday: '', Thursday: '' };
    try {
      const weekStart = getWeekStartDate(selectedWeekId);
      if (!weekStart) return { Monday: '', Tuesday: '', Thursday: '' };

      const monday = new Date(weekStart + 'T12:00:00');
      if (isNaN(monday.getTime())) return { Monday: '', Tuesday: '', Thursday: '' };

      const tuesday = new Date(monday);
      tuesday.setDate(monday.getDate() + 1);
      const thursday = new Date(monday);
      thursday.setDate(monday.getDate() + 3);
      return {
        Monday: monday.toISOString().split('T')[0],
        Tuesday: tuesday.toISOString().split('T')[0],
        Thursday: thursday.toISOString().split('T')[0]
      };
    } catch (e) {
      console.error('weekDeliveryDates error:', e);
      return { Monday: '', Tuesday: '', Thursday: '' };
    }
  }, [selectedWeekId]);

  // Get a client's scheduled delivery date for this week
  const getClientDeliveryDate = (client) => {
    const clientName = client.displayName || client.name;

    // Check 1: Client-selected dates from portal
    const portalDates = clientPortalData?.[clientName]?.selectedDates || [];
    const weekDatesArray = Object.values(weekDeliveryDates);
    const portalDateInWeek = portalDates.find(d => weekDatesArray.includes(d));
    if (portalDateInWeek) return portalDateInWeek;

    // Check 2: Admin-set specific deliveryDates
    const specificDates = client.deliveryDates || [];
    const specificDateInWeek = specificDates.find(d => weekDatesArray.includes(d));
    if (specificDateInWeek) return specificDateInWeek;

    // Check 3: Regular deliveryDay setting (Monday, Tuesday, Thursday)
    if (client.deliveryDay && weekDeliveryDates[client.deliveryDay]) {
      return weekDeliveryDates[client.deliveryDay];
    }

    return null;
  };

  // Get clients scheduled for delivery this week (based on their delivery settings)
  const scheduledClients = useMemo(() => {
    return activeClients.filter(client => getClientDeliveryDate(client) !== null);
  }, [activeClients, weekDeliveryDates, clientPortalData]);

  // Group scheduled clients by delivery day
  const clientsByDeliveryDay = useMemo(() => {
    const grouped = { Monday: [], Tuesday: [], Thursday: [] };
    scheduledClients.forEach(client => {
      const deliveryDate = getClientDeliveryDate(client);
      if (deliveryDate === weekDeliveryDates.Monday) grouped.Monday.push(client);
      else if (deliveryDate === weekDeliveryDates.Tuesday) grouped.Tuesday.push(client);
      else if (deliveryDate === weekDeliveryDates.Thursday) grouped.Thursday.push(client);
    });
    return grouped;
  }, [scheduledClients, weekDeliveryDates]);

  // Filter menu items to only show items for the selected week
  const weekMenuItems = menuItems.filter(item => {
    const itemWeekId = getWeekIdFromDate(item.date);
    return itemWeekId === selectedWeekId;
  });

  // Get week start date (Monday)
  const getWeekStart = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    return d.toISOString().split('T')[0];
  };

  const weekStart = getWeekStart();
  const tasks = weeklyTasks[weekStart] || {};

  // Get client status (approved, warning, no menu) - filtered to selected week
  const getClientStatus = (client) => {
    const clientName = client.displayName || client.name;
    const clientMenuItems = weekMenuItems.filter(item => item.clientName === clientName);
    const hasMenu = clientMenuItems.length > 0;
    const allApproved = hasMenu && clientMenuItems.every(item => item.approved);

    // Check for payment issues
    let warning = null;
    if (client.billDueDate) {
      const dueDate = new Date(client.billDueDate + 'T12:00:00');
      const now = new Date();
      const daysOverdue = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));
      if (daysOverdue >= 1) {
        warning = `Invoice overdue (${daysOverdue} day${daysOverdue > 1 ? 's' : ''})`;
      }
    }

    if (!client.deliveryDates || client.deliveryDates.length === 0) {
      warning = warning || 'Delivery dates not set';
    }

    if (!hasMenu) {
      return { status: 'none', icon: Circle, color: 'text-gray-400', bg: 'bg-gray-50', warning };
    }

    if (allApproved) {
      return { status: 'approved', icon: Check, color: 'text-green-600', bg: 'bg-green-50', warning };
    }

    if (warning) {
      return { status: 'warning', icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', warning };
    }

    return { status: 'pending', icon: Circle, color: 'text-blue-600', bg: 'bg-blue-50', warning };
  };

  // Get clients delivering this week - filtered to selected week
  const getDeliveringThisWeek = () => {
    return activeClients.filter(c => {
      const hasMenuItems = weekMenuItems.some(item => {
        const clientName = c.displayName || c.name;
        return item.clientName === clientName;
      });
      return hasMenuItems;
    });
  };

  // Get orders grouped by client - filtered to selected week
  const getWeekOrdersByClient = () => {
    const grouped = {};
    weekMenuItems.forEach(item => {
      if (!grouped[item.clientName]) grouped[item.clientName] = [];
      grouped[item.clientName].push(item);
    });
    return grouped;
  };

  // State for approval toast messages
  const [approvalToast, setApprovalToast] = useState(null);

  // Show toast helper
  const showToast = (message, type = 'info') => {
    setApprovalToast({ message, type });
    setTimeout(() => setApprovalToast(null), 4000);
  };

  // Approve menu for a client
  const approveClientMenu = async (clientName) => {
    console.log('[MenuTab] === APPROVE START ===');
    console.log('[MenuTab] Approving menu for:', clientName);
    console.log('[MenuTab] Current data mode:', isSupabaseMode() ? 'SUPABASE' : 'LOCAL');

    // Get current menu items for this client
    const currentMenuItems = menuItems.filter(item => item.clientName === clientName);
    const approvedItems = currentMenuItems.map(item => ({ ...item, approved: true }));
    console.log('[MenuTab] Items to approve:', approvedItems.length);

    // Check if we should persist to Supabase BEFORE updating UI
    const supabaseMode = isSupabaseMode();
    console.log('[MenuTab] isSupabaseMode() returned:', supabaseMode);

    if (supabaseMode) {
      console.log('[MenuTab] Checking Supabase connection...');
      const isOnline = await checkConnection();
      console.log('[MenuTab] checkConnection() returned:', isOnline);

      if (!isOnline) {
        console.error('[MenuTab] Cannot persist: database offline');
        showToast('Cannot approve: database offline or misconfigured. Check console for details.', 'error');
        return; // Don't update UI if we can't persist
      }

      try {
        // Extract week IDs from menu items and ensure weeks exist first
        const weekIds = approvedItems.map(item => {
          if (item.weekId) return item.weekId;
          if (!item.date) return null;
          // Calculate week ID from date
          const date = new Date(item.date + 'T12:00:00');
          const thursday = new Date(date);
          thursday.setDate(date.getDate() + (3 - ((date.getDay() + 6) % 7)));
          const year = thursday.getFullYear();
          const jan4 = new Date(year, 0, 4);
          const weekNum = 1 + Math.round(((thursday - jan4) / 86400000 - 3 + ((jan4.getDay() + 6) % 7)) / 7);
          return `${year}-W${String(weekNum).padStart(2, '0')}`;
        }).filter(Boolean);

        console.log('[MenuTab] Ensuring weeks exist:', [...new Set(weekIds)]);
        const weeksResult = await ensureWeeksExist(weekIds);
        if (!weeksResult.success) {
          console.error('[MenuTab] ❌ Failed to create weeks:', weeksResult.errors);
          showToast(`Failed to create week records: ${weeksResult.errors.join(', ')}`, 'error');
          return;
        }
        if (weeksResult.created.length > 0) {
          console.log('[MenuTab] Created weeks:', weeksResult.created);
        }

        console.log('[saveAllMenus] start, count:', approvedItems.length);
        await saveAllMenus(approvedItems);
        console.log('[saveAllMenus] success');
        setIsDirty(false); // Reset dirty flag after successful save

        // Only update local state AFTER successful persistence
        setMenuItems(prev => {
          const updated = prev.map(item =>
            item.clientName === clientName ? { ...item, approved: true } : item
          );
          console.log('[MenuTab] Local state updated after DB success');
          return updated;
        });

        // Refetch to sync state with DB
        try {
          const freshMenus = await fetchMenus();
          console.log('[MenuTab] Refetched menus from Supabase, count:', freshMenus.length);
          setMenuItems(prev => {
            const dbIds = new Set(freshMenus.map(m => `${m.clientName}-${m.date}`));
            const localOnly = prev.filter(item => !dbIds.has(`${item.clientName}-${item.date}`));
            return [...freshMenus, ...localOnly];
          });
        } catch (refetchError) {
          console.warn('[MenuTab] Refetch failed, using local state:', refetchError);
        }

        showToast(`Menu approved for ${clientName}`, 'success');
      } catch (error) {
        console.error('[MenuTab] ❌ SAVE FAILED:', error);
        console.error('[MenuTab] Error details:', JSON.stringify(error, null, 2));
        showToast(`Failed to approve: ${error.message || 'Database error'}. Menu NOT saved.`, 'error');
        // Don't update local state - approval failed
      }
    } else {
      // Local mode - just update local state
      console.log('[MenuTab] Local mode - updating local state only');
      setMenuItems(prev => prev.map(item =>
        item.clientName === clientName ? { ...item, approved: true } : item
      ));
      showToast(`Menu approved for ${clientName} (local only - not persisted)`, 'info');
    }
  };

  // Approve all ready menus
  const approveAllReady = async () => {
    const readyClients = activeClients.filter(c => {
      const clientName = c.displayName || c.name;
      const status = getClientStatus(c);
      return status.status === 'pending' && !status.warning;
    });

    if (readyClients.length === 0) {
      showToast('No menus ready to approve', 'info');
      return;
    }

    // Check Supabase connectivity once before bulk approve
    if (isSupabaseMode()) {
      const isOnline = await checkConnection();
      if (!isOnline) {
        showToast('Cannot approve: database offline', 'error');
        return;
      }
    }

    // Approve all sequentially
    for (const c of readyClients) {
      const clientName = c.displayName || c.name;
      await approveClientMenu(clientName);
    }

    showToast(`Approved ${readyClients.length} menu(s)`, 'success');
  };

  // Deny (remove) menu for a client
  const denyClientMenu = (clientName) => {
    if (window.confirm(`Remove all menu items for ${clientName}?`)) {
      setMenuItems(prev => prev.filter(item => item.clientName !== clientName));
      setPreviewClient(null);
    }
  };

  // Start editing a client's menu
  const startEditingMenu = (clientName, orders) => {
    const isApproved = orders.every(o => o.approved);

    // Check if approved and week is locked
    if (isApproved && isWeekLocked) {
      alert('This menu is approved and the week is locked. Unlock the week first to make edits.');
      return;
    }

    // Find the client to get their actual name (not display name)
    const client = activeClients.find(c => (c.displayName || c.name) === clientName) ||
                   activeClients.find(c => c.name === clientName);
    const actualClientName = client?.name || clientName;

    // Pre-fill the menu builder with current selections
    // Combine dishes from all orders for this client
    const firstOrder = orders[0];
    const allExtras = orders.flatMap(o => o.extras || []);
    const uniqueExtras = [...new Set(allExtras)];

    setNewMenuItem({
      protein: firstOrder?.protein || '',
      veg: firstOrder?.veg || '',
      starch: firstOrder?.starch || '',
      extras: uniqueExtras
    });
    setMenuDate(firstOrder?.date || menuDate);
    setSelectedClients([actualClientName]);
    setEditingClientName(clientName);
    setShowMenuBuilder(true);

    // Remove old menu items for this client (they'll be re-added when saved)
    setMenuItems(prev => prev.filter(item => item.clientName !== clientName));
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingClientName(null);
    setNewMenuItem({ protein: '', veg: '', starch: '', extras: [] });
    setSelectedClients([]);
  };

  // Get menu items for a specific client - filtered to selected week
  const getClientMenuItems = (clientName) => {
    return weekMenuItems.filter(item => item.clientName === clientName);
  };

  // Toggle extra dish selection
  const toggleExtra = (recipeName) => {
    setNewMenuItem(prev => ({
      ...prev,
      extras: prev.extras.includes(recipeName)
        ? prev.extras.filter(e => e !== recipeName)
        : [...prev.extras, recipeName]
    }));
  };

  const extraCategories = [...(recipes.sauces || []), ...(recipes.breakfast || []), ...(recipes.soups || [])];
  const weekOrdersByClient = getWeekOrdersByClient();
  const deliveringThisWeek = getDeliveringThisWeek();

  // Print function for menu planner
  const printMenuPlanner = () => {
    const printWindow = window.open('', '_blank');

    let content = `
      <html>
      <head>
        <title>Menu Planner - Client Orders</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 15px;
            font-size: 11px;
            line-height: 1.3;
          }
          h1 {
            color: #3d59ab;
            margin-bottom: 3px;
            font-size: 18px;
          }
          .header {
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 2px solid #3d59ab;
          }
          .header p { margin: 0; color: #666; font-size: 10px; }
          .columns {
            column-count: 2;
            column-gap: 25px;
          }
          .client {
            break-inside: avoid;
            margin-bottom: 10px;
            padding-bottom: 6px;
            border-bottom: 1px dotted #ccc;
          }
          .client-name {
            font-weight: bold;
            font-size: 12px;
            color: #3d59ab;
            margin-bottom: 4px;
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .portions {
            color: #888;
            font-size: 10px;
            font-weight: normal;
          }
          .status { font-size: 12px; }
          .approved { color: #22c55e; }
          .pending { color: #f59e0b; }
          .meals {
            margin-left: 4px;
          }
          .meal {
            margin-bottom: 6px;
          }
          .protein {
            font-weight: bold;
            font-size: 11px;
            color: #333;
            padding: 2px 0;
          }
          .protein:before {
            content: "•";
            margin-right: 6px;
            color: #3d59ab;
            font-weight: bold;
          }
          .sides {
            margin-left: 16px;
            color: #555;
            font-size: 10px;
          }
          .side {
            padding: 1px 0;
          }
          .side:before {
            content: "◦";
            margin-right: 5px;
            color: #999;
          }
          .extras {
            margin-left: 16px;
            margin-top: 2px;
          }
          .extra {
            color: #7c3aed;
            font-style: italic;
            font-size: 10px;
            padding: 1px 0;
          }
          .extra:before {
            content: "+";
            margin-right: 4px;
          }
          @media print {
            body { padding: 10px; }
            .columns { column-count: 2; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Client Orders</h1>
          <p>Week: ${selectedWeekId} | ${new Date().toLocaleDateString()}</p>
        </div>
        <div class="columns">
    `;

    Object.entries(weekOrdersByClient).forEach(([clientName, orders]) => {
      const allApproved = orders.every(o => o.approved);
      const client = activeClients.find(c => (c.displayName || c.name) === clientName) ||
                     activeClients.find(c => c.name === clientName);
      const displayName = client?.displayName || clientName;
      const portions = orders[0]?.portions || 1;

      content += `<div class="client">`;
      content += `<div class="client-name">`;
      content += `<span>${displayName}</span>`;
      content += `<span class="portions">(${portions}p)</span>`;
      content += `<span class="status ${allApproved ? 'approved' : 'pending'}">${allApproved ? '✓' : '○'}</span>`;
      content += `</div>`;
      content += `<div class="meals">`;

      orders.forEach(order => {
        content += `<div class="meal">`;

        if (order.protein) {
          // Protein as main bullet
          content += `<div class="protein">${order.protein}</div>`;

          // Veg and starch as indented sub-bullets
          if (order.veg || order.starch) {
            content += `<div class="sides">`;
            if (order.veg) content += `<div class="side">${order.veg}</div>`;
            if (order.starch) content += `<div class="side">${order.starch}</div>`;
            content += `</div>`;
          }
        } else {
          // No protein - show veg/starch as main items
          if (order.veg) content += `<div class="protein">${order.veg}</div>`;
          if (order.starch) content += `<div class="protein">${order.starch}</div>`;
        }

        // Extras
        if (order.extras && order.extras.length > 0) {
          content += `<div class="extras">`;
          order.extras.forEach(extra => {
            content += `<div class="extra">${extra}</div>`;
          });
          content += `</div>`;
        }

        content += `</div>`;
      });

      content += `</div></div>`;
    });

    content += `</div></body></html>`;

    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.print();
  };

  // Count status summary
  const statusSummary = {
    approved: activeClients.filter(c => getClientStatus(c).status === 'approved').length,
    pending: activeClients.filter(c => getClientStatus(c).status === 'pending').length,
    warning: activeClients.filter(c => getClientStatus(c).warning).length,
    noMenu: activeClients.filter(c => getClientStatus(c).status === 'none').length
  };

  return (
    <div className="space-y-6">
      {/* Toast notification */}
      {approvalToast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
            approvalToast.type === 'error'
              ? 'bg-red-100 text-red-800 border border-red-300'
              : approvalToast.type === 'success'
              ? 'bg-green-100 text-green-800 border border-green-300'
              : 'bg-blue-100 text-blue-800 border border-blue-300'
          }`}
        >
          {approvalToast.type === 'error' && <AlertTriangle size={18} />}
          {approvalToast.type === 'success' && <Check size={18} />}
          <span>{approvalToast.message}</span>
          <button
            onClick={() => setApprovalToast(null)}
            className="ml-2 hover:opacity-70"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Week Selector */}
      {weeks && selectedWeekId && setSelectedWeekId && (
        <WeekSelector
          selectedWeekId={selectedWeekId}
          setSelectedWeekId={setSelectedWeekId}
          weeks={weeks}
          onLockWeek={lockWeekAndSnapshot}
          onUnlockWeek={unlockWeekById}
        />
      )}

      {/* 1. Delivering This Week - Clients grouped by delivery day */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold" style={{ color: '#3d59ab' }}>Delivering This Week</h2>
            <p className="text-sm text-gray-500 mt-1">
              {scheduledClients.length} clients scheduled • Based on delivery settings in Billing & Dates
            </p>
          </div>
          {weekMenuItems.filter(item => !item.approved).length > 0 && (
            <button
              onClick={approveAllReady}
              className="px-4 py-2 rounded-lg text-white font-medium text-sm"
              style={{ backgroundColor: '#10b981' }}
            >
              Approve All Ready
            </button>
          )}
        </div>

        {scheduledClients.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['Monday', 'Tuesday', 'Thursday'].map(day => {
              const dayClients = clientsByDeliveryDay[day];
              const dayDate = weekDeliveryDates[day];
              const formattedDate = new Date(dayDate + 'T12:00:00').toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
              });

              return (
                <div key={day} className="rounded-lg p-3" style={{ backgroundColor: '#f9f9ed' }}>
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b" style={{ borderColor: '#ebb582' }}>
                    <Calendar size={16} style={{ color: '#3d59ab' }} />
                    <span className="font-bold text-sm" style={{ color: '#3d59ab' }}>{day}</span>
                    <span className="text-xs text-gray-500">{formattedDate}</span>
                  </div>
                  {dayClients.length > 0 ? (
                    <div className="space-y-1">
                      {dayClients.map((client, i) => {
                        const clientName = client.displayName || client.name;
                        const hasMenu = weekMenuItems.some(item => item.clientName === clientName);
                        const isApproved = hasMenu && weekMenuItems.filter(item => item.clientName === clientName).every(item => item.approved);

                        return (
                          <div key={i} className="flex items-center gap-1.5 text-sm">
                            {hasMenu ? (
                              <Check
                                size={14}
                                className={isApproved ? 'text-green-600' : 'text-blue-500'}
                              />
                            ) : (
                              <Circle size={14} className="text-gray-300" />
                            )}
                            <span className={
                              hasMenu
                                ? (isApproved ? 'text-green-700 font-medium' : 'text-blue-600')
                                : 'text-gray-600'
                            }>
                              {clientName}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">No deliveries</p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 rounded-lg" style={{ backgroundColor: '#f9f9ed' }}>
            <Calendar size={32} className="mx-auto mb-2 text-gray-300" />
            <p className="text-gray-500">No clients scheduled for this week</p>
            <p className="text-sm text-gray-400 mt-1">
              Set delivery days in Clients → Edit or Billing & Dates
            </p>
          </div>
        )}
      </div>

      {/* 2. Current Orders - Shows styled menu cards for approval */}
      {weekMenuItems.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold" style={{ color: '#3d59ab' }}>
              Current Orders ({Object.keys(weekOrdersByClient).length} clients)
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={printMenuPlanner}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 text-sm"
                style={{ borderColor: '#3d59ab', color: '#3d59ab' }}
              >
                <Printer size={16} /> Print
              </button>
              {weekMenuItems.some(item => !item.approved) && (
                <button
                  onClick={approveAllReady}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm"
                  style={{ backgroundColor: '#22c55e' }}
                >
                  <Check size={16} /> Approve All
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(weekOrdersByClient).map(([clientName, orders]) => {
              const allApproved = orders.every(o => o.approved);
              const client = activeClients.find(c => (c.displayName || c.name) === clientName) ||
                             activeClients.find(c => c.name === clientName) ||
                             { name: clientName, displayName: clientName };

              return (
                <div key={clientName} className="flex flex-col">
                  {/* Styled Menu Card */}
                  <StyledMenuCard
                    client={client}
                    date={orders[0]?.date || menuDate}
                    menuItems={orders}
                  />

                  {/* Approval Controls */}
                  <div className="mt-3 flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: '#f9f9ed' }}>
                    <div className="flex items-center gap-2">
                      {allApproved ? (
                        <span className="text-sm text-green-700 flex items-center gap-1 font-medium">
                          <Check size={16} /> Approved
                        </span>
                      ) : (
                        <span className="text-sm text-blue-600">Pending approval</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {!allApproved && (
                        <button
                          onClick={() => approveClientMenu(clientName)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded text-sm text-white"
                          style={{ backgroundColor: '#22c55e' }}
                        >
                          <Check size={14} /> Approve
                        </button>
                      )}
                      <button
                        onClick={() => startEditingMenu(clientName, orders)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm ${
                          allApproved && isWeekLocked
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        }`}
                        title={allApproved && isWeekLocked ? 'Unlock week to edit approved menu' : 'Edit menu'}
                      >
                        <Edit2 size={14} /> Edit
                      </button>
                      <button
                        onClick={() => denyClientMenu(clientName)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded text-sm bg-red-100 text-red-700"
                      >
                        <Trash2 size={14} /> Remove
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Build Menu Section */}
      <div className={`bg-white rounded-lg shadow-lg p-6 ${editingClientName ? 'ring-2 ring-blue-500' : ''}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold" style={{ color: '#3d59ab' }}>
              {editingClientName ? `Editing: ${editingClientName}` : 'Build Menu'}
            </h2>
            {editingClientName && (
              <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                Editing Mode
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {editingClientName && (
              <button
                onClick={cancelEditing}
                className="flex items-center gap-1 px-3 py-1 rounded-lg text-sm bg-gray-200 text-gray-700 hover:bg-gray-300"
              >
                <X size={14} /> Cancel Edit
              </button>
            )}
            <button
              onClick={() => setShowMenuBuilder(!showMenuBuilder)}
              className="flex items-center gap-2 px-3 py-1 rounded-lg text-sm text-gray-600 hover:bg-gray-100"
            >
              {showMenuBuilder ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {showMenuBuilder ? 'Collapse' : 'Expand'}
            </button>
          </div>
        </div>

        {showMenuBuilder && (
          <>
            {/* Client Selection - grouped by delivery day */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: '#423d3c' }}>
                Select Clients for Menu
              </label>
              {scheduledClients.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {['Monday', 'Tuesday', 'Thursday'].map(day => {
                    const dayClients = clientsByDeliveryDay[day];
                    const dayDate = weekDeliveryDates[day];
                    if (dayClients.length === 0) return null;

                    return (
                      <div key={day} className="rounded-lg p-3 border-2" style={{ borderColor: '#ebb582', backgroundColor: '#fefefe' }}>
                        <div className="flex items-center justify-between mb-2 pb-1 border-b" style={{ borderColor: '#f0d5bc' }}>
                          <span className="font-bold text-xs" style={{ color: '#3d59ab' }}>{day}</span>
                          <button
                            onClick={() => {
                              const dayClientNames = dayClients.map(c => c.name);
                              const allSelected = dayClientNames.every(n => selectedClients.includes(n));
                              if (allSelected) {
                                setSelectedClients(prev => prev.filter(n => !dayClientNames.includes(n)));
                              } else {
                                setSelectedClients(prev => [...new Set([...prev, ...dayClientNames])]);
                                setMenuDate(dayDate);
                              }
                            }}
                            className="text-xs px-2 py-0.5 rounded"
                            style={{ backgroundColor: '#3d59ab', color: 'white' }}
                          >
                            {dayClients.every(c => selectedClients.includes(c.name)) ? 'Deselect All' : 'Select All'}
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {dayClients.map((client, i) => {
                            const isSelected = selectedClients.includes(client.name);
                            const hasMenu = weekMenuItems.some(item => item.clientName === (client.displayName || client.name));

                            return (
                              <button
                                key={i}
                                onClick={() => {
                                  if (isSelected) {
                                    setSelectedClients(prev => prev.filter(c => c !== client.name));
                                  } else {
                                    setSelectedClients(prev => [...prev, client.name]);
                                    setMenuDate(dayDate); // Auto-set date based on client's delivery day
                                  }
                                }}
                                className={`px-2 py-1 rounded-full border text-xs transition-colors ${
                                  isSelected ? 'text-white' : 'bg-white'
                                }`}
                                style={isSelected
                                  ? { backgroundColor: '#3d59ab', borderColor: '#3d59ab' }
                                  : { borderColor: hasMenu ? '#22c55e' : '#ebb582', color: hasMenu ? '#22c55e' : '#423d3c' }}
                              >
                                {hasMenu && <Check size={10} className="inline mr-0.5" />}
                                {client.displayName || client.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-4 rounded-lg" style={{ backgroundColor: '#f9f9ed' }}>
                  <p className="text-gray-500 text-sm">No clients scheduled for this week</p>
                  <p className="text-xs text-gray-400 mt-1">Set delivery days in Clients or Billing & Dates first</p>
                </div>
              )}

              {/* Show unscheduled active clients if any */}
              {activeClients.length > scheduledClients.length && (
                <div className="mt-3 pt-3 border-t" style={{ borderColor: '#ebb582' }}>
                  <p className="text-xs text-gray-500 mb-2">
                    Clients without scheduled delivery ({activeClients.length - scheduledClients.length}):
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {activeClients
                      .filter(c => !scheduledClients.includes(c))
                      .map((client, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setSelectedClients(prev =>
                              prev.includes(client.name)
                                ? prev.filter(c => c !== client.name)
                                : [...prev, client.name]
                            );
                          }}
                          className={`px-2 py-1 rounded-full border text-xs transition-colors ${
                            selectedClients.includes(client.name) ? 'text-white' : 'bg-white'
                          }`}
                          style={selectedClients.includes(client.name)
                            ? { backgroundColor: '#9ca3af', borderColor: '#9ca3af' }
                            : { borderColor: '#d1d5db', color: '#6b7280' }}
                        >
                          {client.displayName || client.name}
                        </button>
                      ))
                    }
                  </div>
                </div>
              )}
            </div>

            {/* Delivery Date - Auto-filled based on selected clients, but can be overridden */}
            {selectedClients.length > 0 && (
              <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: '#e8f4fd', border: '1px solid #3d59ab33' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} style={{ color: '#3d59ab' }} />
                    <span className="text-sm font-medium" style={{ color: '#3d59ab' }}>
                      Delivery Date:
                    </span>
                    <span className="font-bold" style={{ color: '#3d59ab' }}>
                      {new Date(menuDate + 'T12:00:00').toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                  <input
                    type="date"
                    value={menuDate}
                    onChange={(e) => setMenuDate(e.target.value)}
                    className="text-sm p-1.5 border rounded"
                    style={{ borderColor: '#3d59ab33' }}
                    title="Override delivery date if needed"
                  />
                </div>
              </div>
            )}

            {/* Show dietary restrictions for selected clients */}
            {selectedClients.length > 0 && (
              <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: '#fff8e7', border: '1px solid #ebb582' }}>
                <label className="block text-sm font-medium mb-2" style={{ color: '#423d3c' }}>
                  Dietary Restrictions
                </label>
                <div className="space-y-1">
                  {selectedClients.map(clientName => {
                    const client = activeClients.find(c => c.name === clientName);
                    const restrictions = client?.dietaryRestrictions;
                    if (!restrictions) return null;
                    return (
                      <div key={clientName} className="text-sm">
                        <span className="font-medium" style={{ color: '#3d59ab' }}>
                          {client.displayName || client.name}:
                        </span>{' '}
                        <span style={{ color: '#b45309' }}>{restrictions}</span>
                      </div>
                    );
                  })}
                  {selectedClients.every(clientName => {
                    const client = activeClients.find(c => c.name === clientName);
                    return !client?.dietaryRestrictions;
                  }) && (
                    <p className="text-sm text-gray-500 italic">No dietary restrictions noted</p>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {['protein', 'veg', 'starch'].map(type => (
                <div key={type}>
                  <label className="block text-sm font-medium mb-2 capitalize" style={{ color: '#423d3c' }}>
                    {type === 'veg' ? 'Vegetable' : type}
                  </label>
                  <select
                    value={newMenuItem[type]}
                    onChange={(e) => setNewMenuItem({ ...newMenuItem, [type]: e.target.value })}
                    className="w-full p-2 border-2 rounded-lg"
                    style={{ borderColor: '#ebb582' }}
                  >
                    <option value="">Select...</option>
                    {(recipes[type] || []).map((r, i) => (
                      <option key={i} value={r.name}>{r.name}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {extraCategories.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2" style={{ color: '#423d3c' }}>
                  Extras (Sauces, Breakfast, Soups)
                </label>
                <div className="flex flex-wrap gap-2">
                  {extraCategories.map((recipe, i) => (
                    <button
                      key={i}
                      onClick={() => toggleExtra(recipe.name)}
                      className={`px-3 py-1 rounded-full border-2 transition-colors text-sm ${
                        newMenuItem.extras.includes(recipe.name) ? 'text-white' : 'bg-white'
                      }`}
                      style={newMenuItem.extras.includes(recipe.name)
                        ? { backgroundColor: '#ebb582', borderColor: '#ebb582' }
                        : { borderColor: '#ebb582', color: '#423d3c' }}
                    >
                      {recipe.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => {
                  addMenuItem();
                  if (editingClientName) {
                    setEditingClientName(null);
                  }
                }}
                className="flex items-center gap-2 px-6 py-2 rounded-lg hover:opacity-90"
                style={{ backgroundColor: editingClientName ? '#3d59ab' : '#ffd700', color: editingClientName ? '#fff' : '#423d3c' }}
              >
                {editingClientName ? (
                  <>
                    <Check size={20} />Save Changes
                  </>
                ) : (
                  <>
                    <Plus size={20} />Add to Menu
                  </>
                )}
              </button>
              {editingClientName && (
                <button
                  onClick={cancelEditing}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-200 text-gray-700"
                >
                  <X size={16} />Cancel
                </button>
              )}
              {!editingClientName && menuItems.length > 0 && (
                <button
                  onClick={clearMenu}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-100 text-red-700 text-sm"
                >
                  <Trash2 size={16} />Clear All
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Preview Modal */}
      {previewClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-auto">
            <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white">
              <h3 className="text-lg font-bold" style={{ color: '#3d59ab' }}>
                Menu Preview
              </h3>
              <button
                onClick={() => setPreviewClient(null)}
                className="p-1 rounded hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4">
              <StyledMenuCard
                client={previewClient}
                date={menuDate}
                menuItems={getClientMenuItems(previewClient.displayName || previewClient.name)}
              />
            </div>

            <div className="p-4 border-t flex justify-end gap-2 sticky bottom-0 bg-white">
              <button
                onClick={() => denyClientMenu(previewClient.displayName || previewClient.name)}
                className="px-4 py-2 rounded-lg bg-red-100 text-red-700"
              >
                Remove Menu
              </button>
              <button
                onClick={() => {
                  const clientName = previewClient.displayName || previewClient.name;
                  const orders = getClientMenuItems(clientName);
                  startEditingMenu(clientName, orders);
                  setPreviewClient(null);
                }}
                className="px-4 py-2 rounded-lg border-2 flex items-center gap-2"
                style={{ borderColor: '#3d59ab', color: '#3d59ab' }}
              >
                <Edit2 size={18} /> Edit
              </button>
              <button
                onClick={() => {
                  approveClientMenu(previewClient.displayName || previewClient.name);
                  setPreviewClient(null);
                }}
                className="px-4 py-2 rounded-lg text-white flex items-center gap-2"
                style={{ backgroundColor: '#22c55e' }}
              >
                <Check size={18} /> Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
