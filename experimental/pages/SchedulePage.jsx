/**
 * SchedulePage - /test/schedule
 * Renders the experimental TimelineView (schedule gantt chart)
 */

import React from 'react';
import { useExperimentalContext } from '../ExperimentalContext';
import TimelineView from '../TimelineView';

export default function SchedulePage() {
  const { clients, deliverySchedule, setDeliverySchedule } = useExperimentalContext();

  return (
    <TimelineView
      clients={clients}
      deliverySchedule={deliverySchedule}
      setDeliverySchedule={setDeliverySchedule}
    />
  );
}
