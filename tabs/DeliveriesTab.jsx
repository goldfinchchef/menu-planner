import React, { useState } from 'react';
import { MapPin, Clock, ExternalLink, GripVertical, Truck } from 'lucide-react';
import { ZONES, DAYS } from '../constants';

export default function DeliveriesTab({ clients, deliveryRoutes = {}, setDeliveryRoutes }) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverItem, setDragOverItem] = useState(null);

  // Generate 30-minute time windows from 9 AM to 7 PM
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

  // Get day of week for selected date
  const selectedDayOfWeek = new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' });

  // Filter clients delivering on selected day
  const getClientsForDate = () => {
    return clients.filter(client => {
      if (client.status !== 'active') return false;
      if (!client.deliveryDay) return false;
      return client.deliveryDay === selectedDayOfWeek;
    });
  };

  const deliveringClients = getClientsForDate();

  // Group clients by zone
  const clientsByZone = {};
  ZONES.forEach(zone => {
    clientsByZone[zone] = deliveringClients.filter(c => c.zone === zone);
  });
  // Add unassigned zone for clients without a zone
  const unassignedClients = deliveringClients.filter(c => !c.zone || !ZONES.includes(c.zone));
  if (unassignedClients.length > 0) {
    clientsByZone['Unassigned'] = unassignedClients;
  }

  // Get or initialize route order for a zone
  const getRouteOrder = (zone) => {
    const routeKey = `${selectedDate}-${zone}`;
    if (deliveryRoutes[routeKey]?.order) {
      // Filter to only include clients that still exist and match this zone
      const zoneClients = clientsByZone[zone] || [];
      const validOrder = deliveryRoutes[routeKey].order.filter(name =>
        zoneClients.some(c => c.name === name)
      );
      // Add any new clients not in the order
      zoneClients.forEach(client => {
        if (!validOrder.includes(client.name)) {
          validOrder.push(client.name);
        }
      });
      return validOrder;
    }
    return (clientsByZone[zone] || []).map(c => c.name);
  };

  // Get time window for a client
  const getTimeWindow = (zone, clientName) => {
    const routeKey = `${selectedDate}-${zone}`;
    return deliveryRoutes[routeKey]?.timeWindows?.[clientName] || '';
  };

  // Update route data
  const updateRoute = (zone, updates) => {
    const routeKey = `${selectedDate}-${zone}`;
    const current = deliveryRoutes[routeKey] || { order: getRouteOrder(zone), timeWindows: {} };
    if (setDeliveryRoutes) {
      setDeliveryRoutes({
        ...deliveryRoutes,
        [routeKey]: { ...current, ...updates }
      });
    }
  };

  // Set time window for a client
  const setTimeWindow = (zone, clientName, time) => {
    const routeKey = `${selectedDate}-${zone}`;
    const current = deliveryRoutes[routeKey] || { order: getRouteOrder(zone), timeWindows: {} };
    updateRoute(zone, {
      timeWindows: { ...current.timeWindows, [clientName]: time }
    });
  };

  // Drag and drop handlers
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

  const handleDragLeave = () => {
    setDragOverItem(null);
  };

  const handleDrop = (e, zone, targetClientName) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.zone !== zone) return;

    const order = [...getRouteOrder(zone)];
    const draggedIndex = order.indexOf(draggedItem.clientName);
    const targetIndex = order.indexOf(targetClientName);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      order.splice(draggedIndex, 1);
      order.splice(targetIndex, 0, draggedItem.clientName);
      updateRoute(zone, { order });
    }

    setDraggedItem(null);
    setDragOverItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverItem(null);
  };

  // Generate Google Maps link for a zone
  const generateMapsLink = (zone) => {
    const order = getRouteOrder(zone);
    const zoneClients = clientsByZone[zone] || [];

    // Get addresses in order
    const addresses = order
      .map(name => zoneClients.find(c => c.name === name))
      .filter(c => c && c.address)
      .map(c => encodeURIComponent(c.address));

    if (addresses.length === 0) {
      alert('No addresses found for this zone');
      return;
    }

    // Google Maps directions URL
    // Format: https://www.google.com/maps/dir/origin/waypoint1/waypoint2/.../destination
    const mapsUrl = `https://www.google.com/maps/dir/${addresses.join('/')}`;
    window.open(mapsUrl, '_blank');
  };

  const getClientByName = (name, zone) => {
    return (clientsByZone[zone] || []).find(c => c.name === name);
  };

  const zonesWithClients = Object.entries(clientsByZone).filter(([_, clients]) => clients.length > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Truck size={28} style={{ color: '#3d59ab' }} />
            <h2 className="text-2xl font-bold" style={{ color: '#3d59ab' }}>Plan Routes</h2>
          </div>
          <div className="flex items-center gap-4">
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
          </div>
        </div>
        <p className="text-gray-600 mt-2">
          {selectedDayOfWeek}, {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          {' '}&bull;{' '}
          {deliveringClients.length} delivery{deliveringClients.length !== 1 ? 'ies' : ''}
        </p>
      </div>

      {/* No deliveries message */}
      {zonesWithClients.length === 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6 text-center">
          <p className="text-gray-500 italic">No deliveries scheduled for {selectedDayOfWeek}</p>
          <p className="text-sm text-gray-400 mt-2">
            Clients with delivery day set to "{selectedDayOfWeek}" will appear here
          </p>
        </div>
      )}

      {/* Zone sections */}
      {zonesWithClients.map(([zone, zoneClients]) => {
        const order = getRouteOrder(zone);
        return (
          <div key={zone} className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MapPin size={24} style={{ color: '#3d59ab' }} />
                <h3 className="text-xl font-bold" style={{ color: '#3d59ab' }}>
                  Zone {zone} ({zoneClients.length} stop{zoneClients.length !== 1 ? 's' : ''})
                </h3>
              </div>
              <button
                onClick={() => generateMapsLink(zone)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-white"
                style={{ backgroundColor: '#27ae60' }}
              >
                <ExternalLink size={18} />
                Open in Google Maps
              </button>
            </div>

            <div className="space-y-2">
              {order.map((clientName, index) => {
                const client = getClientByName(clientName, zone);
                if (!client) return null;
                const isDragging = draggedItem?.zone === zone && draggedItem?.clientName === clientName;
                const isDragOver = dragOverItem?.zone === zone && dragOverItem?.clientName === clientName;

                return (
                  <div
                    key={clientName}
                    draggable
                    onDragStart={(e) => handleDragStart(e, zone, clientName)}
                    onDragOver={(e) => handleDragOver(e, zone, clientName)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, zone, clientName)}
                    onDragEnd={handleDragEnd}
                    className={`border-2 rounded-lg p-3 flex items-center gap-3 cursor-move transition-all ${
                      isDragging ? 'opacity-50' : ''
                    } ${isDragOver ? 'border-blue-500 bg-blue-50' : ''}`}
                    style={{ borderColor: isDragOver ? '#3d59ab' : '#ebb582' }}
                  >
                    <div className="flex items-center gap-2 text-gray-400">
                      <GripVertical size={20} />
                      <span className="font-bold text-lg w-6 text-center" style={{ color: '#3d59ab' }}>
                        {index + 1}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold">{client.displayName || client.name}</h4>
                      {client.address && (
                        <p className="text-sm text-gray-500 truncate">{client.address}</p>
                      )}
                      <p className="text-sm text-gray-600">
                        {client.persons} persons &bull; {client.mealsPerWeek} meals
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock size={18} className="text-gray-400" />
                      <select
                        value={getTimeWindow(zone, clientName)}
                        onChange={(e) => setTimeWindow(zone, clientName, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 border-2 rounded-lg text-sm"
                        style={{ borderColor: '#ebb582' }}
                      >
                        <option value="">No time set</option>
                        {timeWindows.map(tw => (
                          <option key={tw.value} value={tw.value}>{tw.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
