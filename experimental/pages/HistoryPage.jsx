/**
 * HistoryPage - /test/clients/history
 * Renders the production HistoryTab component
 */

import React from 'react';
import { useExperimentalContext } from '../ExperimentalContext';
import HistoryTab from '../../tabs/HistoryTab';

export default function HistoryPage() {
  const { orderHistory, clients } = useExperimentalContext();

  return (
    <HistoryTab
      orderHistory={orderHistory}
      clients={clients}
    />
  );
}
