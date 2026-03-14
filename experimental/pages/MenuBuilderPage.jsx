/**
 * MenuBuilderPage - /test/menu/builder
 * Renders the production MenuTab component
 */

import React from 'react';
import { useExperimentalContext } from '../ExperimentalContext';
import MenuTab from '../../tabs/MenuTab';

export default function MenuBuilderPage() {
  const {
    clients, setClients,
    selectedClients, setSelectedClients,
    menuDate, setMenuDate,
    newMenuItem, setNewMenuItem,
    recipes,
    menuItems, setMenuItems,
    selectedWeekId,
    weeks,
    masterIngredients,
    findExactMatch,
    getRecipeCost
  } = useExperimentalContext();

  return (
    <MenuTab
      clients={clients}
      setClients={setClients}
      selectedClients={selectedClients}
      setSelectedClients={setSelectedClients}
      menuDate={menuDate}
      setMenuDate={setMenuDate}
      newMenuItem={newMenuItem}
      setNewMenuItem={setNewMenuItem}
      recipes={recipes}
      menuItems={menuItems}
      setMenuItems={setMenuItems}
      selectedWeekId={selectedWeekId}
      weeks={weeks}
      masterIngredients={masterIngredients}
      findExactMatch={findExactMatch}
      getRecipeCost={getRecipeCost}
    />
  );
}
