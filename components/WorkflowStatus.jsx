import React from 'react';
import { ClipboardList, ChefHat, Package, Truck, CheckCircle, Archive } from 'lucide-react';

const stages = [
  { id: 'menu', label: 'Menu Planned', icon: ClipboardList },
  { id: 'cooking', label: 'Cooking', icon: ChefHat },
  { id: 'ready', label: 'Ready for Delivery', icon: Package },
  { id: 'delivering', label: 'Out for Delivery', icon: Truck },
  { id: 'delivered', label: 'Delivered', icon: CheckCircle },
  { id: 'history', label: 'History', icon: Archive }
];

const stageToTab = {
  menu: 'menu',
  cooking: 'kds',
  ready: 'deliveries',
  delivering: 'deliveries',
  delivered: 'history',
  history: 'history'
};

export default function WorkflowStatus({
  menuItems = [],
  completedDishes = {},
  readyForDelivery = [],
  deliveryLog = [],
  orderHistory = [],
  selectedDate,
  onNavigate
}) {
  // Calculate counts for each stage
  const getKDSProgress = () => {
    const dishes = new Set();
    menuItems.forEach(item => {
      ['protein', 'veg', 'starch'].forEach(type => {
        if (item[type]) dishes.add(item[type]);
      });
      (item.extras || []).forEach(extra => dishes.add(extra));
    });
    const total = dishes.size;
    const completed = [...dishes].filter(d => completedDishes[d]).length;
    return { total, completed };
  };

  const kdsProgress = getKDSProgress();

  // Orders in menu (not yet cooking or all dishes not started)
  const menuCount = menuItems.length;

  // Cooking = menu items exist and some dishes are being worked on
  const cookingCount = kdsProgress.completed > 0 && kdsProgress.completed < kdsProgress.total ? menuCount : 0;

  // Ready for delivery count
  const readyCount = readyForDelivery.length;

  // Out for delivery = orders where delivery has started but not all complete for today
  const todaysDeliveries = deliveryLog.filter(entry => entry.date === selectedDate);
  const deliveringCount = todaysDeliveries.length > 0 && readyCount > 0 ? todaysDeliveries.length : 0;

  // Delivered today (moved to history today)
  const todaysDelivered = orderHistory.filter(order => {
    const deliveryEntry = deliveryLog.find(
      entry => entry.clientName === order.clientName && entry.date === order.date
    );
    return deliveryEntry && deliveryEntry.date === selectedDate;
  });
  const deliveredCount = todaysDelivered.length;

  // Total history
  const historyCount = orderHistory.length;

  const stageCounts = {
    menu: menuCount,
    cooking: cookingCount > 0 ? menuCount : 0,
    ready: readyCount,
    delivering: deliveringCount,
    delivered: deliveredCount,
    history: historyCount
  };

  const stageActive = {
    menu: menuCount > 0 && kdsProgress.completed === 0,
    cooking: menuCount > 0 && kdsProgress.completed > 0,
    ready: readyCount > 0,
    delivering: deliveringCount > 0 && readyCount > 0,
    delivered: deliveredCount > 0,
    history: historyCount > 0
  };

  // Find the "current" stage (rightmost active stage with pending work)
  const getCurrentStage = () => {
    if (deliveringCount > 0 && readyCount > 0) return 'delivering';
    if (readyCount > 0) return 'ready';
    if (menuCount > 0 && kdsProgress.completed > 0) return 'cooking';
    if (menuCount > 0) return 'menu';
    return null;
  };

  const currentStage = getCurrentStage();

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
      <div className="flex items-center justify-between overflow-x-auto">
        {stages.map((stage, index) => {
          const Icon = stage.icon;
          const count = stageCounts[stage.id];
          const isActive = stageActive[stage.id];
          const isCurrent = currentStage === stage.id;

          return (
            <React.Fragment key={stage.id}>
              {index > 0 && (
                <div
                  className="flex-shrink-0 h-1 w-8 mx-1"
                  style={{
                    backgroundColor: stageActive[stages[index - 1].id] ? '#3d59ab' : '#e5e7eb'
                  }}
                />
              )}
              <div className="flex flex-col items-center flex-shrink-0 px-2">
                <div
                  className="relative w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer"
                  style={{
                    backgroundColor: isActive ? '#3d59ab' : '#e5e7eb',
                    color: isActive ? 'white' : '#9ca3af',
                    boxShadow: isCurrent ? '0 0 0 3px white, 0 0 0 6px #ffd700' : 'none'
                  }}
                  onClick={() => onNavigate && onNavigate(stageToTab[stage.id])}
                >
                  <Icon size={24} />
                  {count > 0 && (
                    <span
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center"
                      style={{
                        backgroundColor: isCurrent ? '#ffd700' : '#22c55e',
                        color: isCurrent ? '#423d3c' : 'white'
                      }}
                    >
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                </div>
                <span
                  className={`text-xs mt-2 text-center whitespace-nowrap font-medium ${
                    isActive ? '' : 'text-gray-400'
                  }`}
                  style={{ color: isActive ? '#3d59ab' : undefined }}
                >
                  {stage.label}
                </span>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
