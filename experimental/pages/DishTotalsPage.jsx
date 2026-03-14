/**
 * DishTotalsPage - /test/kitchen/dish-totals
 * Renders the production KDSTab component
 */

import React from 'react';
import { useExperimentalContext } from '../ExperimentalContext';
import KDSTab from '../../tabs/KDSTab';

export default function DishTotalsPage() {
  const {
    menuItems,
    recipes,
    completedDishes,
    toggleDishComplete,
    allDishesComplete,
    completeAllOrders,
    getKDSView,
    selectedWeekId,
    currentWeek,
    kdsLoading,
    kdsLastRefresh,
    lastMenusApprovedAt,
    unapprovedMenuCount,
    unapprovedByClient
  } = useExperimentalContext();

  return (
    <KDSTab
      menuItems={menuItems.filter(item => item.approved)}
      recipes={recipes}
      completedDishes={completedDishes}
      toggleDishComplete={toggleDishComplete}
      allDishesComplete={allDishesComplete}
      completeAllOrders={completeAllOrders}
      getKDSView={getKDSView}
      selectedWeekId={selectedWeekId}
      currentWeek={currentWeek}
      kdsLoading={kdsLoading}
      kdsLastRefresh={kdsLastRefresh}
      lastMenusApprovedAt={lastMenusApprovedAt}
      unapprovedMenuCount={unapprovedMenuCount}
      unapprovedByClient={unapprovedByClient}
    />
  );
}
