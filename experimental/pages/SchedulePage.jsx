/**
 * SchedulePage - /test/schedule
 * Renders the experimental TimelineView (schedule gantt chart)
 * Wired to Supabase menus + client_week_status tables
 */

import React from 'react';
import { useExperimentalContext } from '../ExperimentalContext';
import TimelineView from '../TimelineView';

export default function SchedulePage() {
  const {
    clients,
    scheduleMenus,
    scheduleMenusLoading,
    loadScheduleData,
    transitionToConfirmed,
    transitionToPlanning,
    transitionToEmpty,
    getScheduleCellState,
    selectedWeekId
  } = useExperimentalContext();

  return (
    <TimelineView
      clients={clients}
      scheduleMenus={scheduleMenus}
      scheduleMenusLoading={scheduleMenusLoading}
      loadScheduleData={loadScheduleData}
      transitionToConfirmed={transitionToConfirmed}
      transitionToPlanning={transitionToPlanning}
      transitionToEmpty={transitionToEmpty}
      getScheduleCellState={getScheduleCellState}
      selectedWeekId={selectedWeekId}
    />
  );
}
