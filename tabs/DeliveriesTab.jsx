import React, { useState } from 'react';
import { MapPin, Clock, ExternalLink, GripVertical, Truck, Activity, FileText, Check, AlertTriangle, User, Phone, ShoppingBag, Bell } from 'lucide-react';
import { ZONES, DAYS, DELIVERY_PROBLEMS } from '../constants';

const ViewToggle = ({ activeView, setActiveView }) => (
  <div className="flex rounded-lg overflow-hidden border-2 flex-wrap" style={{ borderColor: '#ebb582' }}>
    {[
      { id: 'plan', label: 'Plan Routes', icon: MapPin },
      { id: 'progress', label: 'Live Progress', icon: Activity },
      { id: 'log', label: 'Delivery Log', icon: FileText },
      { id: 'bags', label: 'Bags Summary', icon: ShoppingBag }
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

export default function DeliveriesTab({
  clients,
  drivers,
  deliveryLog = [],
  setDeliveryLog,
  bagReminders = {},
  setBagReminders,
  readyForDelivery = [],
  setReadyForDelivery,
  orderHistory = [],
  setOrderHistory
}) {
  const [activeView, setActiveView] = useState('plan');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverItem, setDragOverItem] = useState(null);

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

  // Get unique client names from ready orders and map to client data
  const getClientsWithReadyOrders = () => {
    const clientNames = [...new Set(ordersForDate.map(o => o.clientName))];
    return clientNames.map(name => {
      const client = clients.find(c => c.name === name);
      const orders = ordersForDate.filter(o => o.clientName === name);
      return {
        ...client,
        name,
        orders,
        zone: client?.zone || 'Unassigned',
        address: client?.address || '',
        displayName: client?.displayName || name,
        pickup: client?.pickup || false
      };
    }).filter(c => !c.pickup); // Exclude pickup clients from delivery routes
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

  const getDeliveryStatus = (date, clientName) => {
    return deliveryLog.find(entry => entry.date === date && entry.clientName === clientName);
  };

  const markDeliveryComplete = (clientName, zone, problem = null, problemNote = '', bagsReturned = false) => {
    const driver = getDriverForZone(zone);
    const newEntry = {
      id: Date.now(),
      date: selectedDate,
      clientName,
      zone,
      driverName: driver?.name || 'Unknown',
      completedAt: new Date().toISOString(),
      problem,
      problemNote,
      bagsReturned
    };
    setDeliveryLog([...deliveryLog, newEntry]);

    // Move orders from readyForDelivery to orderHistory
    const clientOrders = readyForDelivery.filter(
      order => order.clientName === clientName && order.date === selectedDate
    );
    if (clientOrders.length > 0) {
      setOrderHistory(prev => [...prev, ...clientOrders]);
      setReadyForDelivery(prev =>
        prev.filter(order => !(order.clientName === clientName && order.date === selectedDate))
      );
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
  const handleDrop = (e, zone, targetClientName) => {
    e.preventDefault();
    setDraggedItem(null);
    setDragOverItem(null);
  };
  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const generateMapsLink = (zone) => {
    const zoneClients = clientsByZone[zone] || [];
    const addresses = zoneClients
      .filter(c => c.address)
      .map(c => encodeURIComponent(c.address));
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
            return (
              <div key={zone} className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <MapPin size={24} style={{ color: '#3d59ab' }} />
                    <h3 className="text-xl font-bold" style={{ color: '#3d59ab' }}>
                      Zone {zone} ({zoneClients.length} stops)
                    </h3>
                    {driver && (
                      <span className="text-sm text-gray-600 ml-2">
                        Driver: {driver.name}
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
                <div className="space-y-2">
                  {zoneClients.map((client, index) => {
                    const status = getDeliveryStatus(selectedDate, client.name);
                    const isDragging = draggedItem?.zone === zone && draggedItem?.clientName === client.name;
                    const isDragOver = dragOverItem?.zone === zone && dragOverItem?.clientName === client.name;
                    return (
                      <div
                        key={client.name}
                        draggable
                        onDragStart={(e) => handleDragStart(e, zone, client.name)}
                        onDragOver={(e) => handleDragOver(e, zone, client.name)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, zone, client.name)}
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
                          {client.orders && client.orders.length > 0 && (
                            <p className="text-xs text-gray-400 mt-1">
                              {client.orders.map(o => `${o.portions}p: ${o.dishes.join(', ')}`).join(' | ')}
                            </p>
                          )}
                        </div>
                        {!status && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => markDeliveryComplete(client.name, zone, null, '', true)}
                              className="px-3 py-1 rounded text-sm text-white flex items-center gap-1"
                              style={{ backgroundColor: '#22c55e' }}
                            >
                              <ShoppingBag size={14} /> + Bags
                            </button>
                            <button
                              onClick={() => markDeliveryComplete(client.name, zone, null, '', false)}
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
    </div>
  );
}
