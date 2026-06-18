/**
 * useMenuBuilder.js
 *
 * Custom hook for Menu Builder functionality.
 * Manages base weekly menus, client meal assignments, and per-client menus.
 * Extracted from ExperimentalLayout.jsx for reuse across experimental and production.
 */

import { useState, useCallback, useMemo } from 'react';
import { getWeekStartDate, getWeekEndDate } from '../utils/weekUtils';
import { isSupabaseMode } from '../lib/dataMode';
import { isConfigured } from '../lib/supabase';
import {
  fetchBaseWeeklyMenus,
  saveAllBaseWeeklyMenus,
  fetchAllClientMealAssignments,
  saveClientMealAssignment,
  deleteClientMealAssignment,
  getDefaultMealAssignment,
  applyBaseMenuToClients,
  rebuildSingleClientMenus,
  ensureWeeksExist,
  saveClientMeal,
  confirmClientMenusForWeek,
  fetchMenusForWeekRange,
  fetchClientWeekStatuses,
  clearWeekMenus,
  deleteMenusForClientWeek
} from '../lib/database';

/**
 * useMenuBuilder hook
 * @param {Object} options
 * @param {string} options.selectedWeekId - Current week ID (e.g., "2026-W22")
 * @param {Array} options.clients - Array of client objects
 */
export function useMenuBuilder({ selectedWeekId, clients }) {
  // Base weekly menus state (menu-first model)
  const [baseWeeklyMenus, setBaseWeeklyMenus] = useState([]);
  const [clientMealAssignments, setClientMealAssignments] = useState([]);

  // Schedule menus state (per-client menus)
  const [scheduleMenus, setScheduleMenus] = useState([]);
  const [scheduleMenusLoading, setScheduleMenusLoading] = useState(false);

  // Client week status state (planning intent: unconfirmed, skipped)
  const [clientWeekStatuses, setClientWeekStatuses] = useState([]);

  // Load base menus and assignments for a week
  const loadBaseMenuData = useCallback(async (weekId) => {
    if (!isSupabaseMode() || !isConfigured() || !weekId) {
      return;
    }

    try {
      const [baseMenus, assignments] = await Promise.all([
        fetchBaseWeeklyMenus(weekId),
        fetchAllClientMealAssignments(weekId)
      ]);
      setBaseWeeklyMenus(baseMenus);
      setClientMealAssignments(assignments);
      console.log('[useMenuBuilder] Loaded', baseMenus.length, 'base meals,', assignments.length, 'assignments for', weekId);
    } catch (err) {
      console.error('[useMenuBuilder] Error loading base menu data:', err);
    }
  }, []);

  // Load menus AND client_week_status for visible weeks
  const loadScheduleData = useCallback(async (weekIds) => {
    if (!isSupabaseMode() || !isConfigured() || !weekIds || weekIds.length === 0) {
      return;
    }

    setScheduleMenusLoading(true);
    try {
      const [menus, statuses] = await Promise.all([
        fetchMenusForWeekRange(weekIds),
        fetchClientWeekStatuses(weekIds)
      ]);
      setScheduleMenus(menus);
      setClientWeekStatuses(statuses);
    } catch (err) {
      console.error('[useMenuBuilder] Error loading schedule data:', err);
    } finally {
      setScheduleMenusLoading(false);
    }
  }, []);

  // Save all 4 base menus for the selected week
  const saveBaseMenus = useCallback(async (meals) => {
    if (!isSupabaseMode() || !isConfigured()) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      const saved = await saveAllBaseWeeklyMenus(selectedWeekId, meals);
      setBaseWeeklyMenus(saved);
      return { success: true, saved };
    } catch (err) {
      console.error('[useMenuBuilder] Error saving base menus:', err);
      return { success: false, error: err.message };
    }
  }, [selectedWeekId]);

  // Save a client's meal assignment override
  const saveMealAssignment = useCallback(async (clientId, assignedMeals) => {
    if (!isSupabaseMode() || !isConfigured()) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      const saved = await saveClientMealAssignment(clientId, selectedWeekId, assignedMeals);
      setClientMealAssignments(prev => {
        const filtered = prev.filter(a => !(a.client_id === clientId && a.week_id === selectedWeekId));
        return [...filtered, saved];
      });
      return { success: true, saved };
    } catch (err) {
      console.error('[useMenuBuilder] Error saving meal assignment:', err);
      return { success: false, error: err.message };
    }
  }, [selectedWeekId]);

  // Delete a client's meal assignment (revert to default)
  const deleteMealAssignment = useCallback(async (clientId) => {
    if (!isSupabaseMode() || !isConfigured()) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      await deleteClientMealAssignment(clientId, selectedWeekId);
      setClientMealAssignments(prev =>
        prev.filter(a => !(a.client_id === clientId && a.week_id === selectedWeekId))
      );
      return { success: true };
    } catch (err) {
      console.error('[useMenuBuilder] Error deleting meal assignment:', err);
      return { success: false, error: err.message };
    }
  }, [selectedWeekId]);

  // Get assigned meals for a client (override or default)
  const getClientAssignedMeals = useCallback((clientId, mealsPerWeek) => {
    const override = clientMealAssignments.find(
      a => a.client_id === clientId && a.week_id === selectedWeekId
    );
    if (override) {
      return override.assigned_meals;
    }
    return getDefaultMealAssignment(mealsPerWeek);
  }, [clientMealAssignments, selectedWeekId]);

  // Apply base menu to clients WITHOUT existing menus (additive - preserves edits)
  const applyBaseMenu = useCallback(async () => {
    console.log('[useMenuBuilder] === Apply Base Menu (Additive) ===');
    console.log('[useMenuBuilder] weekId:', selectedWeekId);

    if (!isSupabaseMode() || !isConfigured()) {
      return { success: false, error: 'Supabase not configured' };
    }

    if (baseWeeklyMenus.length === 0) {
      return { success: false, error: 'No base menus defined for this week' };
    }

    // Find clients who need menus created (skip those who already have menus)
    const confirmedClients = [];
    const clientsWithMenus = [];  // Clients to skip (already have menus)
    const clientsNoDate = [];

    const activeClients = clients.filter(c => c.status === 'active');
    const weekStart = getWeekStartDate(selectedWeekId);
    const weekEnd = getWeekEndDate(selectedWeekId);

    for (const client of activeClients) {
      // Check if client has menu rows this week
      const clientMenus = scheduleMenus.filter(
        m => m.client_id === client.id && m.week_id === selectedWeekId
      );

      if (clientMenus.length > 0) {
        // Has menu rows - SKIP to preserve existing menus
        clientsWithMenus.push(client.name);
        continue;
      }

      // No existing menus - check for delivery date
      const deliveryDates = client.deliveryDates || client.delivery_dates || [];
      const dateInWeek = deliveryDates.find(d => d && d >= weekStart && d <= weekEnd);

      if (dateInWeek) {
        confirmedClients.push({ client, date: dateInWeek });
      } else {
        clientsNoDate.push(client.name);
      }
    }

    console.log('[useMenuBuilder] New clients to create:', confirmedClients.map(c => c.client.name));
    console.log('[useMenuBuilder] Skipped (have menus):', clientsWithMenus);
    console.log('[useMenuBuilder] Skipped (no date):', clientsNoDate);

    if (confirmedClients.length === 0) {
      return {
        success: true,
        message: clientsWithMenus.length > 0
          ? 'All scheduled clients already have menus'
          : 'No clients with confirmed dates for this week',
        created: 0,
        skippedExisting: clientsWithMenus.length,
        clientsWithMenus,
        skippedNoDate: clientsNoDate.length,
        clientsNoDate
      };
    }

    try {
      await ensureWeeksExist([selectedWeekId]);

      const applyResult = await applyBaseMenuToClients(
        selectedWeekId,
        baseWeeklyMenus,
        confirmedClients,
        clientMealAssignments
      );

      // Refresh scheduleMenus to show updated data
      const menus = await fetchMenusForWeekRange([selectedWeekId]);
      console.log('[useMenuBuilder] Refreshed menus:', menus?.length, 'rows');
      setScheduleMenus(menus);

      return {
        success: true,
        created: applyResult.created,
        skippedExisting: clientsWithMenus.length,
        clientsWithMenus,
        skippedNoDate: clientsNoDate.length,
        clientsNoDate,
        errors: applyResult.errors
      };
    } catch (err) {
      console.error('[useMenuBuilder] Error applying base menu:', err);
      return { success: false, error: err.message };
    }
  }, [baseWeeklyMenus, clients, scheduleMenus, selectedWeekId, clientMealAssignments]);

  // Save individual client menu edit (override from base)
  const updateClientMeal = useCallback(async (menuId, updates) => {
    try {
      const updatedRow = await saveClientMeal(menuId, updates);

      // Update scheduleMenus state with the new values
      setScheduleMenus(prev => prev.map(menu =>
        menu.id === menuId ? { ...menu, ...updatedRow } : menu
      ));

      return { success: true, data: updatedRow };
    } catch (err) {
      console.error('[useMenuBuilder] Error updating client meal:', err);
      return { success: false, error: err.message };
    }
  }, []);

  // Rebuild a single client's menus from their current assignment
  // Does NOT affect other clients
  const rebuildClientMenus = useCallback(async (clientId) => {
    if (!isSupabaseMode() || !isConfigured()) {
      return { success: false, error: 'Supabase not configured' };
    }

    const client = clients.find(c => c.id === clientId);
    if (!client) {
      return { success: false, error: 'Client not found' };
    }

    // Get client's delivery date for this week
    const todayStr = new Date().toISOString().split('T')[0];
    const clientDates = (client.deliveryDates || client.delivery_dates || [])
      .filter(d => d && d >= todayStr);
    const deliveryDate = clientDates[0] || todayStr;

    // Get assigned meals (from saved assignment or default)
    const mealsPerWeek = client.meals_per_week || client.mealsPerWeek || 3;
    const savedAssignment = clientMealAssignments.find(
      a => a.client_id === clientId && a.week_id === selectedWeekId
    );
    const assignedMeals = savedAssignment?.assigned_meals || getDefaultMealAssignment(mealsPerWeek);

    console.log('[useMenuBuilder] Rebuilding', client.name, 'with assignment:', assignedMeals);

    try {
      const result = await rebuildSingleClientMenus(
        selectedWeekId,
        baseWeeklyMenus,
        client,
        deliveryDate,
        assignedMeals
      );

      if (result.success) {
        // Refresh scheduleMenus to show updated data
        const menus = await fetchMenusForWeekRange([selectedWeekId]);
        setScheduleMenus(menus);
      }

      return result;
    } catch (err) {
      console.error('[useMenuBuilder] Error rebuilding client menus:', err);
      return { success: false, error: err.message };
    }
  }, [clients, clientMealAssignments, baseWeeklyMenus, selectedWeekId]);

  // Confirm/approve all menus for a client + week
  const confirmClientMenus = useCallback(async (clientId, weekId) => {
    try {
      const result = await confirmClientMenusForWeek(clientId, weekId);

      // Update local state to reflect approved status
      setScheduleMenus(prev => prev.map(menu =>
        menu.client_id === clientId && menu.week_id === weekId
          ? { ...menu, approved: true }
          : menu
      ));

      return { success: true, updated: result.updated };
    } catch (err) {
      console.error('[useMenuBuilder] Error confirming client menus:', err);
      return { success: false, error: err.message };
    }
  }, []);

  // Clear all client menus for a week (Reset Week)
  // Preserves base_weekly_menus and client_meal_assignments
  const clearWeekMenusHandler = useCallback(async (weekId) => {
    if (!isSupabaseMode() || !isConfigured()) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      const result = await clearWeekMenus(weekId);

      // Refresh scheduleMenus - remove all menus for this week from local state
      setScheduleMenus(prev => prev.filter(m => m.week_id !== weekId));

      return { success: true, deleted: result.deleted };
    } catch (err) {
      console.error('[useMenuBuilder] Error clearing week menus:', err);
      return { success: false, error: err.message };
    }
  }, []);

  // Remove a single client's menus from a week (Remove From Week)
  // Used when a client cancels after menus were already generated
  const removeClientFromWeek = useCallback(async (clientId, weekId) => {
    if (!isSupabaseMode() || !isConfigured()) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      const result = await deleteMenusForClientWeek({ clientId, weekId });

      // Update local scheduleMenus - remove this client's menus for this week
      setScheduleMenus(prev => prev.filter(
        m => !(m.client_id === clientId && m.week_id === weekId)
      ));

      return { success: true, deleted: result.deleted };
    } catch (err) {
      console.error('[useMenuBuilder] Error removing client from week:', err);
      return { success: false, error: err.message };
    }
  }, []);

  // Compute which clients are scheduled for the selected week
  // A client is "scheduled" if:
  //   1. They have menu rows in scheduleMenus for this week, OR
  //   2. They have a deliveryDates entry within the week's range
  const scheduledClientIds = useMemo(() => {
    const scheduled = new Set();
    const weekStart = getWeekStartDate(selectedWeekId);
    const weekEnd = getWeekEndDate(selectedWeekId);

    const activeClients = clients.filter(c => c.status === 'active');

    for (const client of activeClients) {
      // Check if client has menu rows this week
      const clientMenus = scheduleMenus.filter(
        m => m.client_id === client.id && m.week_id === selectedWeekId
      );

      if (clientMenus.length > 0) {
        scheduled.add(client.id);
      } else {
        // Check delivery dates
        const deliveryDates = client.deliveryDates || client.delivery_dates || [];
        const dateInWeek = deliveryDates.find(d => d && d >= weekStart && d <= weekEnd);

        if (dateInWeek) {
          scheduled.add(client.id);
        }
      }
    }

    return scheduled;
  }, [clients, scheduleMenus, selectedWeekId]);

  return {
    // State
    baseWeeklyMenus,
    clientMealAssignments,
    scheduleMenus,
    scheduleMenusLoading,
    clientWeekStatuses,

    // Computed
    scheduledClientIds,

    // Functions
    loadBaseMenuData,
    loadScheduleData,
    saveBaseMenus,
    saveMealAssignment,
    deleteMealAssignment,
    getClientAssignedMeals,
    applyBaseMenu,
    rebuildClientMenus,
    updateClientMeal,
    confirmClientMenus,
    clearWeekMenus: clearWeekMenusHandler,
    removeClientFromWeek,

    // Re-export for convenience
    getDefaultMealAssignment
  };
}

export default useMenuBuilder;
