/**
 * SchedulePage - /test/schedule
 * Renders the experimental TimelineView (schedule gantt chart)
 * Wired to Supabase menus table for scheduling data
 */

import React, { useEffect } from 'react';
import { useExperimentalContext } from '../ExperimentalContext';
import TimelineView from '../TimelineView';

export default function SchedulePage() {
  const {
    clients,
    scheduleMenus,
    scheduleMenusLoading,
    loadScheduleMenus,
    scheduleClientWeek,
    unscheduleClientWeek,
    updateMenuStatus,
    getScheduleCellState
  } = useExperimentalContext();

  return (
    <TimelineView
      clients={clients}
      scheduleMenus={scheduleMenus}
      scheduleMenusLoading={scheduleMenusLoading}
      loadScheduleMenus={loadScheduleMenus}
      scheduleClientWeek={scheduleClientWeek}
      unscheduleClientWeek={unscheduleClientWeek}
      updateMenuStatus={updateMenuStatus}
      getScheduleCellState={getScheduleCellState}
    />
  );
}
