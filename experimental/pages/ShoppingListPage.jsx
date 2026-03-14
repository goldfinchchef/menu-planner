/**
 * ShoppingListPage - /test/kitchen/shopping-list
 * Renders the production PrepTab component
 */

import React from 'react';
import { useExperimentalContext } from '../ExperimentalContext';
import PrepTab from '../../tabs/PrepTab';

export default function ShoppingListPage() {
  const {
    getPrepList,
    getShoppingListsByDay,
    exportPrepList,
    selectedWeekId,
    unapprovedMenuCount,
    unapprovedByClient
  } = useExperimentalContext();

  return (
    <PrepTab
      prepList={getPrepList()}
      shoppingListsByDay={getShoppingListsByDay()}
      exportPrepList={exportPrepList}
      selectedWeekId={selectedWeekId}
      unapprovedMenuCount={unapprovedMenuCount}
      unapprovedByClient={unapprovedByClient}
    />
  );
}
