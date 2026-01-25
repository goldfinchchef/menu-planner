import React, { useState } from 'react';
import { MapPin, Clock, ExternalLink, GripVertical, Truck, Activity, FileText, Check, AlertTriangle, User, Phone, ShoppingBag, Bell, Calendar, Plus, Trash2, Edit2, X, Car } from 'lucide-react';
import { ZONES, DAYS, DELIVERY_PROBLEMS, DEFAULT_NEW_DRIVER } from '../constants';

const ViewToggle = ({ activeView, setActiveView }) => (
  <div className="flex rounded-lg overflow-hidden border-2 flex-wrap" style={{ borderColor: '#ebb582' }}>
    {[
      { id: 'week', label: 'Week View', icon: Calendar },
      { id: 'plan', label: 'Plan Routes', icon: MapPin },
      { id: 'progress', label: 'Live Progress', icon: Activity },
      { id: 'log', label: 'Delivery Log', icon: FileText },
      { id: 'bags', label: 'Bags Summary', icon: ShoppingBag },
      { id: 'drivers', label: 'Drivers', icon: Car }
    ].map(view => (
      <button
        key={view.id}
        onClick={() => setActiveView(view.id)}
        className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors ${
          activeView === view.id ? 'text-white' : 'bg-white'
        }`}
        style={activeView === view.id ? { backgroundColor: '#3d59ab' } : { color: '#423d3c' }}
      >
        <view.icon size={18} />
        {view.label}
      </button>
    ))}
  </div>
);

const FormField = ({ label, children }) => (
  <div className="flex flex-col">
    <label className="text-sm font-medium mb-1" style={{ color: '#423d3c' }}>{label}</label>
    {children}
  </div>
);

const inputStyle = "p-2 border-2 rounded-lg";
const borderStyle = { borderColor: '#ebb582' };

const ROUTE_ORDER_KEY = 'goldfinchRouteOrder';

export default function DeliveriesTab({
  clients,
  drivers,
  setDrivers,
  newDriver,
  setNewDriver,
  deliveryLog = [],
  setDeliveryLog,
  bagReminders = {},
  setBagReminders,
  readyForDelivery = [],
  setReadyForDelivery,
  orderHistory = [],
  setOrderHistory,
  selectedWeekId,
  weeks = {},
  addDeliveryLogToWeek,
  removeReadyForDeliveryFromWeek,
  isReadOnly = false,
  startingAddress = ''
}) {
  const [activeView, setActiveView] = useState('week');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverItem, setDragOverItem] = useState(null);

  // Route order state: { [date]: { [zone]: [stopKey1, stopKey2, ...] } }
  const [routeOrder, setRouteOrder] = useState(() => {
    try {
      const saved = localStorage.getItem(ROUTE_ORDER_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Save route order to localStorage
  const saveRouteOrder = (newOrder) => {
    setRouteOrder(newOrder);
    localStorage.setItem(ROUTE_ORDER_KEY, JSON.stringify(newOrder));
  };

  // Drivers state
  const [editingDriverIndex, setEditingDriverIndex] = useState(null);
  const [editingDriver, setEditingDriver] = useState(null);
  const [localNewDriver, setLocalNewDriver] = useState(newDriver || { ...DEFAULT_NEW_DRIVER });

  // Log filters
  const [logDateFilter, setLogDateFilter] = useState('');
  const [logDriverFilter, setLogDriverFilter] = useState('');
  const [logZoneFilter, setLogZoneFilter] = useState('');
  const [logProblemsOnly, setLogProblemsOnly] = useState(false);

  // Time windows
  const timeWindows = [];
  for (let hour = 9; hour <= 18; hour++) {
    for (let min = 0; min < 60; min += 30) {
      if (hour === 18 && min > 0) break;
      const startHour = hour > 12 ? hour - 12 : hour;
      const startPeriod = hour >= 12 ? 'PM' : 'AM';
      const endHour = min === 30 ? (hour + 1 > 12 ? hour + 1 - 12 : hour + 1) : (hour > 12 ? hour - 12 : hour);
      const endMin = min === 30 ? '00' : '30';
      const endPeriod = min === 30 && hour + 1 >= 12 ? 'PM' : startPeriod;
      const label = `${startHour}:${min.toString().padStart(2, '0')} ${startPeriod} - ${endHour}:${endMin} ${endPeriod}`;
      timeWindows.push({ value: `${hour}:${min.toString().padStart(2, '0')}`, label });
    }
  }

  const selectedDayOfWeek = new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' });

  // Get orders ready for delivery on the selected date
  const getOrdersForDate = (date) => {
    return readyForDelivery.filter(order => order.date === date);
  };

  const ordersForDate = getOrdersForDate(selectedDate);

  // Helper to get contacts from a client (handles migration from old single-contact format)
  const getClientContacts = (client) => {
    if (client?.contacts && client.contacts.length > 0) {
      return client.contacts;
    }
    // Migrate old single contact format
    return [{
      name: client?.name || '',
      email: client?.email || '',
      phone: client?.phone || '',
      address: client?.address || ''
    }];
  };

  // Get unique client names from ready orders and expand to delivery stops (one per unique address)
  const getClientsWithReadyOrders = () => {
    const clientNames = [...new Set(ordersForDate.map(o => o.clientName))];
    const deliveryStops = [];

    clientNames.forEach(name => {
      const client = clients.find(c => c.name === name);
      if (client?.pickup) return; // Exclude pickup clients

      const orders = ordersForDate.filter(o => o.clientName === name);
      const contacts = getClientContacts(client);

      // Group contacts by address (normalize to lowercase for comparison)
      const contactsWithAddress = contacts.filter(c => c.address);
      const addressGroups = {};

      contactsWithAddress.forEach((contact, idx) => {
        const normalizedAddr = contact.address.toLowerCase().trim();
        if (!addressGroups[normalizedAddr]) {
          addressGroups[normalizedAddr] = {
            address: contact.address,
            contacts: [],
            originalIndex: idx
          };
        }
        addressGroups[normalizedAddr].contacts.push(contact);
      });

      const uniqueAddresses = Object.values(addressGroups);

      if (uniqueAddresses.length === 0) {
        // No addresses - still show as one stop
        deliveryStops.push({
          ...client,
          name,
          orders,
          zone: client?.zone || 'Unassigned',
          address: '',
          displayName: client?.displayName || name,
          pickup: false,
          contactNames: contacts.map(c => c.name).filter(Boolean),
          contactPhones: contacts.map(c => c.phone).filter(Boolean),
          contactIndex: 0,
          totalStops: 1,
          stopKey: name
        });
      } else {
        // Create a stop for each unique address
        uniqueAddresses.forEach((group, idx) => {
          deliveryStops.push({
            ...client,
            name,
            orders,
            zone: client?.zone || 'Unassigned',
            address: group.address,
            displayName: client?.displayName || name,
            pickup: false,
            // All contacts at this address
            contactNames: group.contacts.map(c => c.name).filter(Boolean),
            contactPhones: group.contacts.map(c => c.phone).filter(Boolean),
            contactEmails: group.contacts.map(c => c.email).filter(Boolean),
            contactIndex: idx,
            totalStops: uniqueAddresses.length,
            // Unique key for this stop
            stopKey: uniqueAddresses.length > 1 ? `${name}-${idx}` : name
          });
        });
      }
    });

    return deliveryStops;
  };

  const deliveringClients = getClientsWithReadyOrders();

  const clientsByZone = {};
  ZONES.forEach(zone => {
    clientsByZone[zone] = deliveringClients.filter(c => c.zone === zone);
  });
  const unassignedClients = deliveringClients.filter(c => !c.zone || !ZONES.includes(c.zone));
  if (unassignedClients.length > 0) {
    clientsByZone['Unassigned'] = unassignedClients;
  }

  const getDriverForZone = (zone) => drivers.find(d => d.zone === zone);

  const getDeliveryStatus = (date, clientName, contactIndex = 0) => {
    return deliveryLog.find(entry =>
      entry.date === date &&
      entry.clientName === clientName &&
      (entry.contactIndex === contactIndex || (entry.contactIndex === undefined && contactIndex === 0))
    );
  };

  const markDeliveryComplete = (clientName, zone, contactIndex = 0, contactName = '', problem = null, problemNote = '', bagsReturned = false) => {
    if (isReadOnly) return; // Don't allow changes to read-only weeks

    const driver = getDriverForZone(zone);
    const newEntry = {
      id: Date.now(),
      date: selectedDate,
      clientName,
      contactIndex,
      contactName,
      zone,
      driverName: driver?.name || 'Unknown',
      completedAt: new Date().toISOString(),
      problem,
      problemNote,
      bagsReturned
    };

    // Save to global state (backwards compatibility)
    setDeliveryLog([...deliveryLog, newEntry]);

    // Also save to week record if available
    if (selectedWeekId && addDeliveryLogToWeek) {
      addDeliveryLogToWeek(selectedWeekId, newEntry);
    }

    // Check if all contacts for this client are delivered
    const client = clients.find(c => c.name === clientName);
    const contacts = getClientContacts(client);
    const contactsWithAddress = contacts.filter(c => c.address);
    const totalStops = contactsWithAddress.length || 1;

    // Count completed stops for this client on this date (including the one we just added)
    const completedStops = deliveryLog.filter(
      entry => entry.date === selectedDate && entry.clientName === clientName
    ).length + 1;

    // Only move orders to history when all stops are complete
    if (completedStops >= totalStops) {
      const clientOrders = readyForDelivery.filter(
        order => order.clientName === clientName && order.date === selectedDate
      );
      if (clientOrders.length > 0) {
        setOrderHistory(prev => [...prev, ...clientOrders]);
        setReadyForDelivery(prev =>
          prev.filter(order => !(order.clientName === clientName && order.date === selectedDate))
        );

        // Remove from week record
        if (selectedWeekId && removeReadyForDeliveryFromWeek) {
          clientOrders.forEach(order => {
            removeReadyForDeliveryFromWeek(selectedWeekId, order.id);
          });
        }
      }
    }
  };

  const toggleBagsReturned = (entryId) => {
    setDeliveryLog(deliveryLog.map(entry =>
      entry.id === entryId ? { ...entry, bagsReturned: !entry.bagsReturned } : entry
    ));
  };

  const toggleBagReminder = (clientName) => {
    setBagReminders({
      ...bagReminders,
      [clientName]: !bagReminders[clientName]
    });
  };

  // Get clients with outstanding bags (last delivery had bagsReturned = false)
  const getClientsWithOutstandingBags = () => {
    const clientLastDelivery = {};
    // Sort by date descending to find most recent delivery per client
    const sortedLog = [...deliveryLog].sort((a, b) =>
      new Date(b.completedAt) - new Date(a.completedAt)
    );

    sortedLog.forEach(entry => {
      if (!clientLastDelivery[entry.clientName]) {
        clientLastDelivery[entry.clientName] = entry;
      }
    });

    return Object.values(clientLastDelivery)
      .filter(entry => !entry.bagsReturned)
      .sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt));
  };

  const undoDelivery = (entryId) => {
    const entry = deliveryLog.find(e => e.id === entryId);
    if (entry) {
      // Move orders back from orderHistory to readyForDelivery
      const ordersToMove = orderHistory.filter(
        order => order.clientName === entry.clientName && order.date === entry.date
      );
      if (ordersToMove.length > 0) {
        setReadyForDelivery(prev => [...prev, ...ordersToMove]);
        setOrderHistory(prev =>
          prev.filter(order => !(order.clientName === entry.clientName && order.date === entry.date))
        );
      }
    }
    setDeliveryLog(deliveryLog.filter(e => e.id !== entryId));
  };

  // Get all clients for progress (both pending and delivered)
  const getAllClientsForProgress = () => {
    // Get clients from readyForDelivery (pending)
    const pendingClientNames = [...new Set(ordersForDate.map(o => o.clientName))];

    // Get clients from deliveryLog for this date (already delivered)
    const deliveredClientNames = [...new Set(
      deliveryLog
        .filter(entry => entry.date === selectedDate)
        .map(entry => entry.clientName)
    )];

    // Combine and dedupe
    const allClientNames = [...new Set([...pendingClientNames, ...deliveredClientNames])];

    return allClientNames.map(name => {
      const client = clients.find(c => c.name === name);
      return {
        name,
        zone: client?.zone || 'Unassigned',
        displayName: client?.displayName || name,
        pickup: client?.pickup || false
      };
    }).filter(c => !c.pickup);
  };

  // Progress calculations
  const getProgressByDriver = () => {
    const progress = {};
    const allClientsForProgress = getAllClientsForProgress();

    ZONES.forEach(zone => {
      const driver = getDriverForZone(zone);
      if (!driver) return;
      const zoneClients = allClientsForProgress.filter(c => c.zone === zone);
      if (zoneClients.length === 0) return;

      const completed = zoneClients.filter(c => getDeliveryStatus(selectedDate, c.name));
      const problems = completed.filter(c => {
        const status = getDeliveryStatus(selectedDate, c.name);
        return status?.problem;
      });
      const lastCompletion = deliveryLog
        .filter(entry => entry.date === selectedDate && entry.zone === zone)
        .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))[0];

      // Current stop is from pending (readyForDelivery) clients only
      const pendingZoneClients = deliveringClients.filter(c => c.zone === zone);
      const currentStop = pendingZoneClients.find(c => !getDeliveryStatus(selectedDate, c.name));

      progress[driver.name] = {
        driver,
        zone,
        total: zoneClients.length,
        completed: completed.length,
        problems: problems.length,
        lastCompletedAt: lastCompletion?.completedAt,
        lastClientName: lastCompletion?.clientName,
        currentStop
      };
    });
    return progress;
  };

  // Filtered log entries
  const getFilteredLog = () => {
    return deliveryLog.filter(entry => {
      if (logDateFilter && entry.date !== logDateFilter) return false;
      if (logDriverFilter && entry.driverName !== logDriverFilter) return false;
      if (logZoneFilter && entry.zone !== logZoneFilter) return false;
      if (logProblemsOnly && !entry.problem) return false;
      return true;
    }).sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
  };

  const zonesWithClients = Object.entries(clientsByZone).filter(([_, clients]) => clients.length > 0);

  // Get ordered clients for a zone (respecting saved route order)
  const getOrderedClientsForZone = (zone, zoneClients) => {
    const dateOrder = routeOrder[selectedDate]?.[zone];
    if (!dateOrder || dateOrder.length === 0) {
      return zoneClients;
    }

    // Sort clients by their position in saved order
    const orderedClients = [...zoneClients].sort((a, b) => {
      const aKey = a.stopKey || a.name;
      const bKey = b.stopKey || b.name;
      const aIndex = dateOrder.indexOf(aKey);
      const bIndex = dateOrder.indexOf(bKey);

      // If both are in the saved order, sort by that
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      // Items not in saved order go to the end
      if (aIndex === -1 && bIndex !== -1) return 1;
      if (aIndex !== -1 && bIndex === -1) return -1;
      return 0;
    });

    return orderedClients;
  };

  // Drag handlers
  const handleDragStart = (e, zone, clientName) => {
    setDraggedItem({ zone, clientName });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, zone, clientName) => {
    e.preventDefault();
    if (draggedItem && draggedItem.zone === zone && draggedItem.clientName !== clientName) {
      setDragOverItem({ zone, clientName });
    }
  };

  const handleDragLeave = () => setDragOverItem(null);

  const handleDrop = (e, zone, targetStopKey) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.zone !== zone || draggedItem.clientName === targetStopKey) {
      setDraggedItem(null);
      setDragOverItem(null);
      return;
    }

    // Get current zone clients in their current order
    const zoneClients = clientsByZone[zone] || [];
    const orderedClients = getOrderedClientsForZone(zone, zoneClients);
    const stopKeys = orderedClients.map(c => c.stopKey || c.name);

    // Find indices
    const fromIndex = stopKeys.indexOf(draggedItem.clientName);
    const toIndex = stopKeys.indexOf(targetStopKey);

    if (fromIndex === -1 || toIndex === -1) {
      setDraggedItem(null);
      setDragOverItem(null);
      return;
    }

    // Reorder
    const newOrder = [...stopKeys];
    const [removed] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, removed);

    // Save new order
    const newRouteOrder = {
      ...routeOrder,
      [selectedDate]: {
        ...(routeOrder[selectedDate] || {}),
        [zone]: newOrder
      }
    };
    saveRouteOrder(newRouteOrder);

    setDraggedItem(null);
    setDragOverItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const generateMapsLink = (zone) => {
    const zoneClients = clientsByZone[zone] || [];
    const orderedClients = getOrderedClientsForZone(zone, zoneClients);
    const addresses = orderedClients
      .filter(c => c.address)
      .map(c => encodeURIComponent(c.address));

    // Prepend starting address if available
    if (startingAddress) {
      addresses.unshift(encodeURIComponent(startingAddress));
    }

    if (addresses.length === 0) {
      alert('No addresses found for this zone');
      return;
    }
    window.open(`https://www.google.com/maps/dir/${addresses.join('/')}`, '_blank');
  };

  const formatTime = (isoString) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      {/* Read-only Banner */}
      {isReadOnly && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle size={24} className="text-amber-600" />
          <div>
            <p className="font-medium text-amber-800">Viewing Past Week (Read-only)</p>
            <p className="text-sm text-amber-600">This week is locked and cannot be modified.</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Truck size={28} style={{ color: '#3d59ab' }} />
            <h2 className="text-2xl font-bold" style={{ color: '#3d59ab' }}>Deliveries</h2>
          </div>
          <ViewToggle activeView={activeView} setActiveView={setActiveView} />
        </div>
      </div>

      {/* Plan Routes View */}
      {activeView === 'plan' && (
        <>
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <label className="flex items-center gap-2">
                  <span className="font-medium">Delivery Date:</span>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="p-2 border-2 rounded-lg"
                    style={{ borderColor: '#ebb582' }}
                  />
                </label>
                <p className="text-gray-600 mt-2">
                  {selectedDayOfWeek} &bull; {deliveringClients.length} orders ready for delivery
                </p>
              </div>
            </div>
          </div>

          {zonesWithClients.length === 0 && (
            <div className="bg-white rounded-lg shadow-lg p-6 text-center">
              <p className="text-gray-500 italic">No orders ready for delivery on {selectedDate}</p>
              <p className="text-sm text-gray-400 mt-2">Complete orders in KDS to see them here.</p>
            </div>
          )}

          {zonesWithClients.map(([zone, zoneClients]) => {
            const driver = zone !== 'Unassigned' ? getDriverForZone(zone) : null;
            const orderedClients = getOrderedClientsForZone(zone, zoneClients);
            return (
              <div key={zone} className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <MapPin size={24} style={{ color: '#3d59ab' }} />
                    <h3 className="text-xl font-bold" style={{ color: '#3d59ab' }}>
                      Zone {zone} ({zoneClients.length} stops)
                    </h3>
                    {driver && (
                      <span className="text-sm px-3 py-1 rounded-full text-white ml-2" style={{ backgroundColor: '#3d59ab' }}>
                        {driver.name}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => generateMapsLink(zone)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-white"
                    style={{ backgroundColor: '#27ae60' }}
                  >
                    <ExternalLink size={18} />
                    Google Maps
                  </button>
                </div>
                <p className="text-sm text-gray-500 mb-3 flex items-center gap-2">
                  <GripVertical size={16} /> Drag to reorder stops
                </p>
                <div className="space-y-2">
                  {orderedClients.map((client, index) => {
                    const stopKey = client.stopKey || client.name;
                    const status = getDeliveryStatus(selectedDate, client.name, client.contactIndex || 0);
                    const isDragging = draggedItem?.zone === zone && draggedItem?.clientName === stopKey;
                    const isDragOver = dragOverItem?.zone === zone && dragOverItem?.clientName === stopKey;
                    const isMultiStop = client.totalStops > 1;
                    const contactNames = client.contactNames || [];
                    const contactPhones = client.contactPhones || [];
                    return (
                      <div
                        key={stopKey}
                        draggable
                        onDragStart={(e) => handleDragStart(e, zone, stopKey)}
                        onDragOver={(e) => handleDragOver(e, zone, stopKey)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, zone, stopKey)}
                        onDragEnd={handleDragEnd}
                        className={`border-2 rounded-lg p-3 flex items-center gap-3 cursor-move transition-all ${
                          isDragging ? 'opacity-50' : ''
                        } ${status ? 'bg-green-50' : ''}`}
                        style={{ borderColor: status ? '#22c55e' : (isDragOver ? '#3d59ab' : '#ebb582') }}
                      >
                        <div className="flex items-center gap-2 text-gray-400">
                          <GripVertical size={20} />
                          <span className="font-bold text-lg w-6 text-center" style={{ color: '#3d59ab' }}>
                            {index + 1}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold">{client.displayName || client.name}</h4>
                            {isMultiStop && (
                              <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-700">
                                Stop {client.contactIndex + 1}/{client.totalStops}
                              </span>
                            )}
                            {contactNames.length > 0 && contactNames.some(n => n && n !== client.name) && (
                              <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 flex items-center gap-1">
                                <User size={12} /> {contactNames.filter(Boolean).join(', ')}
                              </span>
                            )}
                            {status && (
                              <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 flex items-center gap-1">
                                <Check size={12} /> {formatTime(status.completedAt)}
                              </span>
                            )}
                            {status && (
                              <span className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${
                                status.bagsReturned ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                              }`}>
                                <ShoppingBag size={12} /> {status.bagsReturned ? 'Bags returned' : 'No bags'}
                              </span>
                            )}
                            {status?.problem && (
                              <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 flex items-center gap-1">
                                <AlertTriangle size={12} /> {status.problem}
                              </span>
                            )}
                          </div>
                          {client.address && (
                            <a
                              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(client.address)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline truncate flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MapPin size={12} />
                              {client.address}
                            </a>
                          )}
                          {contactPhones.length > 0 && (
                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                              <Phone size={12} /> {contactPhones.join(', ')}
                            </p>
                          )}
                          {client.orders && client.orders.length > 0 && client.contactIndex === 0 && (
                            <p className="text-xs text-gray-400 mt-1">
                              {client.orders.map(o => `${o.portions}p: ${o.dishes.join(', ')}`).join(' | ')}
                            </p>
                          )}
                        </div>
                        {!status && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => markDeliveryComplete(client.name, zone, client.contactIndex || 0, contactNames.join(', '), null, '', true)}
                              className="px-3 py-1 rounded text-sm text-white flex items-center gap-1"
                              style={{ backgroundColor: '#22c55e' }}
                            >
                              <ShoppingBag size={14} /> + Bags
                            </button>
                            <button
                              onClick={() => markDeliveryComplete(client.name, zone, client.contactIndex || 0, contactNames.join(', '), null, '', false)}
                              className="px-3 py-1 rounded text-sm bg-gray-200"
                            >
                              No Bags
                            </button>
                          </div>
                        )}
                        {status && !status.bagsReturned && (
                          <button
                            onClick={() => toggleBagsReturned(status.id)}
                            className="px-2 py-1 rounded text-xs bg-amber-100 text-amber-700"
                          >
                            Mark bags returned
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* Live Progress View */}
      {activeView === 'progress' && (
        <>
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <span className="font-medium">Date:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="p-2 border-2 rounded-lg"
                  style={{ borderColor: '#ebb582' }}
                />
              </label>
              <p className="text-gray-600">{selectedDayOfWeek}</p>
            </div>
          </div>

          {Object.entries(getProgressByDriver()).map(([driverName, data]) => {
            const percentage = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
            return (
              <div key={driverName} className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <User size={24} style={{ color: '#3d59ab' }} />
                    <div>
                      <h3 className="text-xl font-bold" style={{ color: '#3d59ab' }}>{driverName}</h3>
                      <p className="text-sm text-gray-600">Zone {data.zone}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold" style={{ color: percentage === 100 ? '#22c55e' : '#3d59ab' }}>
                      {data.completed}/{data.total}
                    </p>
                    <p className="text-sm text-gray-600">stops completed</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: percentage === 100 ? '#22c55e' : '#3d59ab'
                      }}
                    />
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{percentage}% complete</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 rounded-lg" style={{ backgroundColor: '#f9f9ed' }}>
                    <p className="text-sm text-gray-600">Current Stop</p>
                    <p className="font-bold" style={{ color: '#3d59ab' }}>
                      {data.currentStop ? (data.currentStop.displayName || data.currentStop.name) : 'Complete!'}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg" style={{ backgroundColor: '#f9f9ed' }}>
                    <p className="text-sm text-gray-600">Last Completion</p>
                    <p className="font-bold" style={{ color: '#3d59ab' }}>
                      {data.lastCompletedAt ? formatTime(data.lastCompletedAt) : 'N/A'}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg" style={{ backgroundColor: '#f9f9ed' }}>
                    <p className="text-sm text-gray-600">Last Client</p>
                    <p className="font-bold" style={{ color: '#3d59ab' }}>
                      {data.lastClientName || 'N/A'}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg" style={{ backgroundColor: data.problems > 0 ? '#fef2f2' : '#f9f9ed' }}>
                    <p className="text-sm text-gray-600">Problems</p>
                    <p className="font-bold flex items-center gap-1" style={{ color: data.problems > 0 ? '#dc2626' : '#3d59ab' }}>
                      {data.problems > 0 && <AlertTriangle size={16} />}
                      {data.problems}
                    </p>
                  </div>
                </div>

                {/* Problems List */}
                {data.problems > 0 && (
                  <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200">
                    <p className="font-medium text-red-700 mb-2">Flagged Problems:</p>
                    {deliveryLog
                      .filter(entry => entry.date === selectedDate && entry.zone === data.zone && entry.problem)
                      .map(entry => (
                        <div key={entry.id} className="text-sm text-red-600 flex items-center gap-2">
                          <AlertTriangle size={14} />
                          <span className="font-medium">{entry.clientName}:</span>
                          <span>{entry.problem}</span>
                          {entry.problemNote && <span className="text-red-500">- {entry.problemNote}</span>}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            );
          })}

          {Object.keys(getProgressByDriver()).length === 0 && (
            <div className="bg-white rounded-lg shadow-lg p-6 text-center">
              <p className="text-gray-500">No drivers assigned to zones with deliveries today.</p>
            </div>
          )}
        </>
      )}

      {/* Delivery Log View */}
      {activeView === 'log' && (
        <>
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="font-bold mb-4" style={{ color: '#3d59ab' }}>Filters</h3>
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Date</label>
                <input
                  type="date"
                  value={logDateFilter}
                  onChange={(e) => setLogDateFilter(e.target.value)}
                  className="p-2 border-2 rounded-lg"
                  style={{ borderColor: '#ebb582' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Driver</label>
                <select
                  value={logDriverFilter}
                  onChange={(e) => setLogDriverFilter(e.target.value)}
                  className="p-2 border-2 rounded-lg"
                  style={{ borderColor: '#ebb582' }}
                >
                  <option value="">All Drivers</option>
                  {drivers.map(d => <option key={d.id || d.name} value={d.name}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Zone</label>
                <select
                  value={logZoneFilter}
                  onChange={(e) => setLogZoneFilter(e.target.value)}
                  className="p-2 border-2 rounded-lg"
                  style={{ borderColor: '#ebb582' }}
                >
                  <option value="">All Zones</option>
                  {ZONES.map(z => <option key={z} value={z}>Zone {z}</option>)}
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 p-2">
                  <input
                    type="checkbox"
                    checked={logProblemsOnly}
                    onChange={(e) => setLogProblemsOnly(e.target.checked)}
                    className="w-5 h-5"
                    style={{ accentColor: '#3d59ab' }}
                  />
                  <span className="font-medium">Problems Only</span>
                </label>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setLogDateFilter('');
                    setLogDriverFilter('');
                    setLogZoneFilter('');
                    setLogProblemsOnly(false);
                  }}
                  className="px-4 py-2 rounded-lg bg-gray-200"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="font-bold mb-4" style={{ color: '#3d59ab' }}>
              Delivery Log ({getFilteredLog().length} entries)
            </h3>
            {getFilteredLog().length > 0 ? (
              <div className="space-y-2">
                {getFilteredLog().map(entry => (
                  <div
                    key={entry.id}
                    className={`border-2 rounded-lg p-3 flex items-center justify-between ${
                      entry.problem ? 'bg-red-50' : ''
                    }`}
                    style={{ borderColor: entry.problem ? '#fca5a5' : '#ebb582' }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-center min-w-[80px]">
                        <p className="text-sm text-gray-500">{entry.date}</p>
                        <p className="font-bold" style={{ color: '#3d59ab' }}>{formatTime(entry.completedAt)}</p>
                      </div>
                      <div>
                        <p className="font-bold">{entry.clientName}</p>
                        <p className="text-sm text-gray-600">
                          Zone {entry.zone} &bull; {entry.driverName}
                        </p>
                      </div>
                      {entry.problem && (
                        <div className="flex items-center gap-2 text-red-600">
                          <AlertTriangle size={16} />
                          <span className="font-medium">{entry.problem}</span>
                          {entry.problemNote && <span className="text-sm">- {entry.problemNote}</span>}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => undoDelivery(entry.id)}
                      className="text-sm px-3 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200"
                    >
                      Undo
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No delivery log entries match the filters.</p>
            )}
          </div>
        </>
      )}

      {/* Bags Summary View */}
      {activeView === 'bags' && (
        <>
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <ShoppingBag size={24} style={{ color: '#3d59ab' }} />
              <h3 className="text-xl font-bold" style={{ color: '#3d59ab' }}>Outstanding Bags</h3>
            </div>
            <p className="text-gray-600">
              Clients who haven't returned bags on their last delivery
            </p>
          </div>

          {getClientsWithOutstandingBags().length > 0 ? (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="space-y-3">
                {getClientsWithOutstandingBags().map(entry => {
                  const client = clients.find(c => c.name === entry.clientName);
                  const reminderSent = bagReminders[entry.clientName];
                  return (
                    <div
                      key={entry.id}
                      className={`border-2 rounded-lg p-4 flex items-center justify-between ${
                        reminderSent ? 'bg-green-50' : 'bg-amber-50'
                      }`}
                      style={{ borderColor: reminderSent ? '#22c55e' : '#f59e0b' }}
                    >
                      <div className="flex items-center gap-4">
                        <div>
                          <h4 className="font-bold text-lg">{client?.displayName || entry.clientName}</h4>
                          <p className="text-sm text-gray-600">
                            Last delivery: {entry.date} &bull; Zone {entry.zone}
                          </p>
                          {client?.phone && (
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                              <Phone size={14} /> {client.phone}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={reminderSent || false}
                            onChange={() => toggleBagReminder(entry.clientName)}
                            className="w-5 h-5"
                            style={{ accentColor: '#3d59ab' }}
                          />
                          <span className="text-sm font-medium flex items-center gap-1">
                            <Bell size={16} />
                            Reminder Sent
                          </span>
                        </label>
                        <button
                          onClick={() => toggleBagsReturned(entry.id)}
                          className="px-4 py-2 rounded-lg text-white text-sm"
                          style={{ backgroundColor: '#22c55e' }}
                        >
                          Mark Returned
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-gray-600">
                  Total outstanding: <span className="font-bold">{getClientsWithOutstandingBags().length}</span> clients
                  {' '}&bull;{' '}
                  Reminders sent: <span className="font-bold">
                    {getClientsWithOutstandingBags().filter(e => bagReminders[e.clientName]).length}
                  </span>
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-lg p-6 text-center">
              <ShoppingBag size={48} className="mx-auto mb-4 text-green-300" />
              <p className="text-gray-500">All bags have been returned!</p>
              <p className="text-sm text-gray-400 mt-1">
                No outstanding bags from recent deliveries.
              </p>
            </div>
          )}
        </>
      )}

      {/* Week View */}
      {activeView === 'week' && (() => {
        // Get the Monday of selected week
        const getWeekDates = () => {
          const date = new Date(selectedDate + 'T12:00:00');
          const day = date.getDay();
          const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
          const monday = new Date(date.setDate(diff));

          return {
            monday: monday.toISOString().split('T')[0],
            tuesday: new Date(new Date(monday).setDate(monday.getDate() + 1)).toISOString().split('T')[0],
            thursday: new Date(new Date(monday).setDate(monday.getDate() + 3)).toISOString().split('T')[0]
          };
        };

        const weekDates = getWeekDates();

        // Get clients delivering on each day
        const getClientsForDay = (dayName) => {
          return clients.filter(c =>
            c.status === 'active' &&
            c.deliveryDay === dayName &&
            !c.pickup
          );
        };

        // Get ready orders for a specific date
        const getReadyForDate = (date) => {
          return readyForDelivery.filter(o => o.date === date);
        };

        const deliveryDays = [
          { name: 'Monday', date: weekDates.monday },
          { name: 'Tuesday', date: weekDates.tuesday },
          { name: 'Thursday', date: weekDates.thursday }
        ];

        // Count totals
        const totalClientsThisWeek = deliveryDays.reduce((sum, day) =>
          sum + getClientsForDay(day.name).length, 0
        );
        const totalReadyThisWeek = deliveryDays.reduce((sum, day) =>
          sum + getReadyForDate(day.date).length, 0
        );

        return (
          <>
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold" style={{ color: '#3d59ab' }}>
                    Delivering This Week
                  </h3>
                  <p className="text-gray-600">
                    {totalClientsThisWeek} clients scheduled • {totalReadyThisWeek} orders ready
                  </p>
                </div>
                <div>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="p-2 border-2 rounded-lg"
                    style={{ borderColor: '#ebb582' }}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {deliveryDays.map(day => {
                const dayClients = getClientsForDay(day.name);
                const readyOrders = getReadyForDate(day.date);
                const readyClientNames = [...new Set(readyOrders.map(o => o.clientName))];

                // Group day's clients by zone
                const clientsByZoneForDay = {};
                ZONES.forEach(zone => {
                  const zoneClients = dayClients.filter(c => c.zone === zone);
                  if (zoneClients.length > 0) {
                    clientsByZoneForDay[zone] = zoneClients;
                  }
                });
                const unassignedForDay = dayClients.filter(c => !c.zone || !ZONES.includes(c.zone));
                if (unassignedForDay.length > 0) {
                  clientsByZoneForDay['Unassigned'] = unassignedForDay;
                }

                const zonesForDay = Object.keys(clientsByZoneForDay);

                return (
                  <div key={day.name} className="bg-white rounded-lg shadow-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-bold text-lg" style={{ color: '#3d59ab' }}>{day.name}</h4>
                        <p className="text-sm text-gray-500">
                          {new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-bold" style={{ color: '#3d59ab' }}>
                          {dayClients.length}
                        </span>
                        <p className="text-xs text-gray-500">clients</p>
                      </div>
                    </div>

                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {dayClients.length === 0 ? (
                        <p className="text-gray-400 text-sm italic">No deliveries</p>
                      ) : (
                        zonesForDay.map(zone => {
                          const zoneClientsForDay = clientsByZoneForDay[zone];
                          const driver = zone !== 'Unassigned' ? drivers.find(d => d.zone === zone) : null;

                          return (
                            <div key={zone} className="border-l-4 pl-3" style={{ borderColor: '#3d59ab' }}>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-bold text-sm" style={{ color: '#3d59ab' }}>
                                  Zone {zone}
                                </span>
                                {driver && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                                    {driver.name}
                                  </span>
                                )}
                              </div>
                              <div className="space-y-1">
                                {zoneClientsForDay.map((client, idx) => {
                                  const isReady = readyClientNames.includes(client.name);
                                  const isDelivered = deliveryLog.some(
                                    e => e.date === day.date && e.clientName === client.name
                                  );

                                  return (
                                    <div
                                      key={idx}
                                      className={`p-2 rounded text-sm flex items-center justify-between ${
                                        isDelivered ? 'bg-green-50' : isReady ? 'bg-amber-50' : ''
                                      }`}
                                      style={{ backgroundColor: isDelivered ? undefined : isReady ? undefined : '#f9f9ed' }}
                                    >
                                      <span className={isDelivered ? 'line-through text-gray-400' : ''}>
                                        {client.displayName || client.name}
                                      </span>
                                      <div className="flex items-center gap-1">
                                        {isDelivered && (
                                          <Check size={14} className="text-green-600" />
                                        )}
                                        {isReady && !isDelivered && (
                                          <Truck size={14} className="text-amber-600" />
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {dayClients.length > 0 && (
                      <button
                        onClick={() => {
                          // Generate maps link for all clients on this day
                          const addresses = dayClients
                            .map(c => {
                              const contacts = c.contacts || [];
                              const firstAddr = contacts.find(ct => ct.address)?.address || c.address;
                              return firstAddr;
                            })
                            .filter(Boolean)
                            .map(a => encodeURIComponent(a));

                          if (addresses.length === 0) {
                            alert('No addresses found for this day');
                            return;
                          }
                          window.open(`https://www.google.com/maps/dir/${addresses.join('/')}`, '_blank');
                        }}
                        className="w-full mt-3 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-white text-sm"
                        style={{ backgroundColor: '#27ae60' }}
                      >
                        <ExternalLink size={16} />
                        Plan Route
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        );
      })()}

      {/* Drivers View */}
      {activeView === 'drivers' && (() => {
        const addDriver = () => {
          if (!localNewDriver.name) {
            alert('Please enter a driver name');
            return;
          }
          if (setDrivers) {
            setDrivers([...drivers, { ...localNewDriver, id: Date.now() }]);
          }
          setLocalNewDriver({ ...DEFAULT_NEW_DRIVER });
          if (setNewDriver) {
            setNewDriver({ ...DEFAULT_NEW_DRIVER });
          }
        };

        const deleteDriver = (index) => {
          if (window.confirm('Delete this driver?')) {
            if (setDrivers) {
              setDrivers(drivers.filter((_, i) => i !== index));
            }
          }
        };

        const startEditingDriver = (index) => {
          setEditingDriverIndex(index);
          setEditingDriver({ ...drivers[index] });
        };

        const cancelEditingDriver = () => {
          setEditingDriverIndex(null);
          setEditingDriver(null);
        };

        const saveEditingDriver = () => {
          if (setDrivers) {
            const updated = [...drivers];
            updated[editingDriverIndex] = editingDriver;
            setDrivers(updated);
          }
          setEditingDriverIndex(null);
          setEditingDriver(null);
        };

        return (
          <>
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold mb-4" style={{ color: '#3d59ab' }}>Add Driver</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <FormField label="Driver Name">
                  <input
                    type="text"
                    value={localNewDriver.name}
                    onChange={(e) => setLocalNewDriver({ ...localNewDriver, name: e.target.value })}
                    placeholder="Enter driver name"
                    className={inputStyle}
                    style={borderStyle}
                  />
                </FormField>
                <FormField label="Phone">
                  <input
                    type="tel"
                    value={localNewDriver.phone || ''}
                    onChange={(e) => setLocalNewDriver({ ...localNewDriver, phone: e.target.value })}
                    placeholder="Phone number"
                    className={inputStyle}
                    style={borderStyle}
                  />
                </FormField>
                <FormField label="Zone">
                  <select
                    value={localNewDriver.zone || ''}
                    onChange={(e) => setLocalNewDriver({ ...localNewDriver, zone: e.target.value })}
                    className={inputStyle}
                    style={borderStyle}
                  >
                    <option value="">Unassigned</option>
                    {ZONES.map(z => <option key={z} value={z}>Zone {z}</option>)}
                  </select>
                </FormField>
                <FormField label="Access Code">
                  <input
                    type="text"
                    value={localNewDriver.accessCode || ''}
                    onChange={(e) => setLocalNewDriver({ ...localNewDriver, accessCode: e.target.value })}
                    placeholder="Access code"
                    className={inputStyle}
                    style={borderStyle}
                  />
                </FormField>
              </div>
              <button
                onClick={addDriver}
                className="mt-4 px-6 py-2 rounded-lg text-white flex items-center gap-2"
                style={{ backgroundColor: '#3d59ab' }}
              >
                <Plus size={20} />Add Driver
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold mb-4" style={{ color: '#3d59ab' }}>
                Drivers ({drivers.length})
              </h3>
              {drivers.length > 0 ? (
                <div className="space-y-3">
                  {drivers.map((driver, i) => (
                    <div key={driver.id || i}>
                      {editingDriverIndex === i ? (
                        <div className="border-2 rounded-lg p-4" style={{ borderColor: '#3d59ab', backgroundColor: '#f9f9ed' }}>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <FormField label="Driver Name">
                              <input
                                type="text"
                                value={editingDriver.name}
                                onChange={(e) => setEditingDriver({ ...editingDriver, name: e.target.value })}
                                className={inputStyle}
                                style={borderStyle}
                              />
                            </FormField>
                            <FormField label="Phone">
                              <input
                                type="tel"
                                value={editingDriver.phone || ''}
                                onChange={(e) => setEditingDriver({ ...editingDriver, phone: e.target.value })}
                                className={inputStyle}
                                style={borderStyle}
                              />
                            </FormField>
                            <FormField label="Zone">
                              <select
                                value={editingDriver.zone || ''}
                                onChange={(e) => setEditingDriver({ ...editingDriver, zone: e.target.value })}
                                className={inputStyle}
                                style={borderStyle}
                              >
                                <option value="">Unassigned</option>
                                {ZONES.map(z => <option key={z} value={z}>Zone {z}</option>)}
                              </select>
                            </FormField>
                            <FormField label="Access Code">
                              <input
                                type="text"
                                value={editingDriver.accessCode || ''}
                                onChange={(e) => setEditingDriver({ ...editingDriver, accessCode: e.target.value })}
                                className={inputStyle}
                                style={borderStyle}
                              />
                            </FormField>
                          </div>
                          <div className="flex gap-2 mt-4">
                            <button
                              onClick={saveEditingDriver}
                              className="flex items-center gap-1 px-4 py-2 rounded-lg text-white"
                              style={{ backgroundColor: '#3d59ab' }}
                            >
                              <Check size={18} />Save
                            </button>
                            <button
                              onClick={cancelEditingDriver}
                              className="flex items-center gap-1 px-4 py-2 rounded-lg bg-gray-200"
                            >
                              <X size={18} />Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="border-2 rounded-lg p-4 flex justify-between" style={{ borderColor: '#ebb582' }}>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-lg">{driver.name}</h4>
                              {driver.zone && (
                                <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-700">
                                  Zone {driver.zone}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              {driver.phone && `Phone: ${driver.phone}`}
                              {driver.phone && driver.accessCode && ' • '}
                              {driver.accessCode && `Code: ${driver.accessCode}`}
                            </p>
                          </div>
                          <div className="flex gap-2 self-start ml-4">
                            <button onClick={() => startEditingDriver(i)} className="text-blue-600">
                              <Edit2 size={18} />
                            </button>
                            <button onClick={() => deleteDriver(i)} className="text-red-600">
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No drivers yet. Add your first driver above.</p>
              )}
            </div>
          </>
        );
      })()}
    </div>
  );
}
