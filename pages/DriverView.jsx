import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Truck, MapPin, Camera, AlertTriangle, Check, ChevronLeft,
  ChevronRight, List, LogOut, Package, ShoppingBag, Home, User,
  Calendar, Eye, Clock, ChefHat, FileText
} from 'lucide-react';
import { useDriverData } from '../hooks/useDriverData';
import { DELIVERY_PROBLEMS } from '../constants';

const HANDOFF_TYPES = {
  HAND: 'hand',
  PORCH: 'porch'
};

// Status definitions for driver view
const DELIVERY_STATUS = {
  DELIVERED: { key: 'delivered', label: 'Delivered', color: '#22c55e', icon: Check },
  READY: { key: 'ready', label: 'Ready', color: '#f59e0b', icon: Truck },
  IN_KDS: { key: 'kds', label: 'In Kitchen', color: '#3b82f6', icon: ChefHat },
  PENDING: { key: 'pending', label: 'Menu Pending', color: '#6b7280', icon: FileText },
  NONE: { key: 'none', label: 'No Menu', color: '#9ca3af', icon: Clock }
};

export default function DriverView() {
  const [searchParams] = useSearchParams();
  const {
    clients,
    readyForDelivery,
    deliveryLog,
    orderHistory,
    menuItems,
    isLoaded,
    updateDeliveryLog,
    updateReadyForDelivery,
    updateOrderHistory,
    authenticateDriver,
    getDriverByName
  } = useDriverData();

  // Auth state
  const [accessCode, setAccessCode] = useState('');
  const [driver, setDriver] = useState(null);
  const [authError, setAuthError] = useState('');
  const [isAdminPreview, setIsAdminPreview] = useState(false);

  // Auto-login from admin preview
  useEffect(() => {
    if (isLoaded && !driver) {
      const adminDriver = searchParams.get('admin_driver');
      if (adminDriver) {
        const foundDriver = getDriverByName(adminDriver);
        if (foundDriver) {
          setDriver(foundDriver);
          setIsAdminPreview(true);
        }
      }
    }
  }, [isLoaded, searchParams, driver, getDriverByName]);

  // Delivery state
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [handoffType, setHandoffType] = useState(HANDOFF_TYPES.HAND);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [bagsReturned, setBagsReturned] = useState(false);
  const [showProblemModal, setShowProblemModal] = useState(false);
  const [selectedProblem, setSelectedProblem] = useState('');
  const [problemNote, setProblemNote] = useState('');
  const [showAllStops, setShowAllStops] = useState(false);
  const [completedStops, setCompletedStops] = useState([]);
  const [isComplete, setIsComplete] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null); // null = today

  const fileInputRef = useRef(null);
  const today = new Date().toISOString().split('T')[0];
  const viewingDate = selectedDate || today;
  const isViewingFuture = viewingDate !== today;

  // Get client delivery status
  const getClientStatus = (clientName, date) => {
    // Check if delivered
    if (deliveryLog.some(e => e.clientName === clientName && e.date === date)) {
      return DELIVERY_STATUS.DELIVERED;
    }
    // Check if ready for delivery
    if (readyForDelivery.some(o => o.clientName === clientName && o.date === date)) {
      return DELIVERY_STATUS.READY;
    }
    // Check if has approved menu (in KDS)
    if (menuItems.some(m => m.clientName === clientName && m.approved && m.date === date)) {
      return DELIVERY_STATUS.IN_KDS;
    }
    // Check if has menu pending approval
    if (menuItems.some(m => m.clientName === clientName && !m.approved && m.date === date)) {
      return DELIVERY_STATUS.PENDING;
    }
    // No menu yet
    return DELIVERY_STATUS.NONE;
  };

  // Get the day name from a date string
  const getDayName = (dateStr) => {
    const date = new Date(dateStr + 'T12:00:00');
    return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()];
  };

  // Get upcoming delivery dates for this driver's zone (next 7 days)
  const getUpcomingDeliveryDates = () => {
    if (!driver) return [];
    const dates = [];
    const startDate = new Date(today);

    // Get next 7 days
    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(startDate);
      checkDate.setDate(startDate.getDate() + i);
      const dateStr = checkDate.toISOString().split('T')[0];
      const dayName = getDayName(dateStr);

      // Check if any clients in this zone have deliveries on this day
      const hasDeliveries = clients.some(
        c => c.status === 'active' && c.zone === driver.zone && c.deliveryDay === dayName && !c.pickup
      );

      if (hasDeliveries) {
        dates.push(dateStr);
      }
    }

    return dates;
  };

  const upcomingDates = getUpcomingDeliveryDates();

  // Get ALL scheduled stops for this driver's zone on a specific date
  const getDriverStops = (date) => {
    if (!driver) return [];
    const dayName = getDayName(date);

    // Get all scheduled clients for this day/zone
    return clients
      .filter(c => c.status === 'active' && c.zone === driver.zone && c.deliveryDay === dayName && !c.pickup)
      .map(client => {
        const status = getClientStatus(client.name, date);
        const orders = readyForDelivery.filter(o => o.clientName === client.name && o.date === date);

        return {
          clientName: client.name,
          displayName: client.displayName || client.name,
          address: client.address || '',
          orders,
          zone: client.zone,
          status: status.key,
          statusInfo: status,
          isReady: status.key === 'ready',
          isDelivered: status.key === 'delivered'
        };
      });
  };

  // Get only READY stops (for the active delivery flow)
  const getReadyStops = (date) => {
    return getDriverStops(date).filter(s => s.isReady);
  };

  const allStops = getDriverStops(viewingDate);
  const readyStops = getReadyStops(viewingDate);
  const todayReadyStops = getReadyStops(today);
  const remainingReadyStops = readyStops.filter(s => !completedStops.includes(s.clientName) && !s.isDelivered);
  const currentStop = remainingReadyStops[currentStopIndex];

  // Check if already delivered today
  const isAlreadyDelivered = (clientName) => {
    return deliveryLog.some(
      entry => entry.date === today && entry.clientName === clientName
    );
  };

  // Filter out already delivered stops on mount (only for today)
  useEffect(() => {
    if (driver && isLoaded && !isViewingFuture) {
      const alreadyDeliveredToday = todayReadyStops
        .filter(s => isAlreadyDelivered(s.clientName))
        .map(s => s.clientName);
      setCompletedStops(alreadyDeliveredToday);
    }
  }, [driver, isLoaded, todayReadyStops.length, isViewingFuture]);

  // Check if all READY stops are done
  useEffect(() => {
    if (driver && readyStops.length > 0 && remainingReadyStops.length === 0) {
      setIsComplete(true);
    }
  }, [driver, readyStops.length, remainingReadyStops.length]);

  const handleLogin = (e) => {
    e.preventDefault();
    const foundDriver = authenticateDriver(accessCode);
    if (foundDriver) {
      setDriver(foundDriver);
      setAuthError('');
    } else {
      setAuthError('Invalid access code');
    }
  };

  const handleLogout = () => {
    setDriver(null);
    setAccessCode('');
    setCurrentStopIndex(0);
    setCompletedStops([]);
    setIsComplete(false);
    resetDeliveryForm();
  };

  const resetDeliveryForm = () => {
    setHandoffType(HANDOFF_TYPES.HAND);
    setPhoto(null);
    setPhotoPreview(null);
    setBagsReturned(false);
    setSelectedProblem('');
    setProblemNote('');
    setShowProblemModal(false);
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCompleteDelivery = (problem = null, note = '') => {
    if (!currentStop) return;

    // Validate porch drop requires photo
    if (handoffType === HANDOFF_TYPES.PORCH && !photo && !problem) {
      alert('Photo is required for porch drops');
      return;
    }

    // Validate "Other" problem requires note
    if (problem === 'Other' && !note.trim()) {
      alert('Please provide details for "Other" problem');
      return;
    }

    const newEntry = {
      id: Date.now(),
      date: today,
      clientName: currentStop.clientName,
      zone: driver.zone,
      driverName: driver.name,
      completedAt: new Date().toISOString(),
      handoffType,
      photoData: photoPreview,
      bagsReturned,
      problem,
      problemNote: note
    };

    // Update delivery log
    const newLog = [...deliveryLog, newEntry];
    updateDeliveryLog(newLog);

    // Move orders to history
    const clientOrders = readyForDelivery.filter(
      order => order.clientName === currentStop.clientName && order.date === today
    );
    if (clientOrders.length > 0) {
      updateOrderHistory([...orderHistory, ...clientOrders]);
      updateReadyForDelivery(
        readyForDelivery.filter(
          order => !(order.clientName === currentStop.clientName && order.date === today)
        )
      );
    }

    // Mark as completed and advance
    setCompletedStops([...completedStops, currentStop.clientName]);
    resetDeliveryForm();
    setShowProblemModal(false);

    // Check if this was the last stop
    if (remainingStops.length <= 1) {
      setIsComplete(true);
    }
  };

  const handleProblemSubmit = () => {
    if (!selectedProblem) {
      alert('Please select a problem type');
      return;
    }
    handleCompleteDelivery(selectedProblem, problemNote);
  };

  const handleBack = () => {
    if (currentStopIndex > 0) {
      // Just go back to view previous remaining stop
      setCurrentStopIndex(currentStopIndex - 1);
      resetDeliveryForm();
    } else if (completedStops.length > 0) {
      // Undo the last completed stop
      const lastCompleted = completedStops[completedStops.length - 1];

      // Remove from delivery log
      const updatedLog = deliveryLog.filter(
        entry => !(entry.date === today && entry.clientName === lastCompleted)
      );
      updateDeliveryLog(updatedLog);

      // Move orders back from history to ready
      const ordersToMove = orderHistory.filter(
        order => order.clientName === lastCompleted && order.date === today
      );
      if (ordersToMove.length > 0) {
        updateReadyForDelivery([...readyForDelivery, ...ordersToMove]);
        updateOrderHistory(
          orderHistory.filter(
            order => !(order.clientName === lastCompleted && order.date === today)
          )
        );
      }

      setCompletedStops(completedStops.slice(0, -1));
      setIsComplete(false);
      resetDeliveryForm();
    }
  };

  const openMaps = (address) => {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`,
      '_blank'
    );
  };

  // Get summary stats
  const getSummary = () => {
    const todaysDeliveries = deliveryLog.filter(
      entry => entry.date === today && entry.driverName === driver?.name
    );
    return {
      completed: todaysDeliveries.length,
      problems: todaysDeliveries.filter(e => e.problem).length,
      bagsReturned: todaysDeliveries.filter(e => e.bagsReturned).length,
      porchDrops: todaysDeliveries.filter(e => e.handoffType === HANDOFF_TYPES.PORCH).length,
      handoffs: todaysDeliveries.filter(e => e.handoffType === HANDOFF_TYPES.HAND).length
    };
  };

  // Loading state
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f9f9ed' }}>
        <div className="text-center">
          <Truck size={48} className="mx-auto mb-4 animate-pulse" style={{ color: '#3d59ab' }} />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Login screen
  if (!driver) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#f9f9ed' }}>
        <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <Truck size={48} className="mx-auto mb-4" style={{ color: '#3d59ab' }} />
            <h1 className="text-2xl font-bold" style={{ color: '#3d59ab' }}>Driver Login</h1>
            <p className="text-gray-600 mt-2">Enter your access code to start deliveries</p>
          </div>
          <form onSubmit={handleLogin}>
            <input
              type="text"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder="Access Code"
              className="w-full p-4 text-center text-2xl border-2 rounded-lg mb-4 tracking-widest"
              style={{ borderColor: '#ebb582' }}
              autoFocus
            />
            {authError && (
              <p className="text-red-600 text-center mb-4">{authError}</p>
            )}
            <button
              type="submit"
              className="w-full py-4 rounded-lg text-white font-bold text-lg"
              style={{ backgroundColor: '#3d59ab' }}
            >
              Start Deliveries
            </button>
          </form>
        </div>
      </div>
    );
  }

  // View All Stops (shows all scheduled with status)
  if (showAllStops) {
    return (
      <div className="min-h-screen p-4" style={{ backgroundColor: '#f9f9ed' }}>
        <div className="max-w-lg mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold" style={{ color: '#3d59ab' }}>All Scheduled</h2>
                <p className="text-sm text-gray-500">
                  {viewingDate === today ? 'Today' : new Date(viewingDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </p>
              </div>
              <button
                onClick={() => setShowAllStops(false)}
                className="px-4 py-2 rounded-lg bg-gray-200"
              >
                Back
              </button>
            </div>
          </div>

          {/* Status legend */}
          <div className="bg-white rounded-lg shadow p-3 mb-4">
            <div className="flex flex-wrap gap-3 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: DELIVERY_STATUS.READY.color }}></span>
                Ready to Deliver
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: DELIVERY_STATUS.IN_KDS.color }}></span>
                In Kitchen
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: DELIVERY_STATUS.PENDING.color }}></span>
                Menu Pending
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: DELIVERY_STATUS.DELIVERED.color }}></span>
                Delivered
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {allStops.map((stop, index) => {
              const deliveryEntry = deliveryLog.find(
                e => e.date === viewingDate && e.clientName === stop.clientName
              );
              const StatusIcon = stop.statusInfo.icon;

              return (
                <div
                  key={stop.clientName}
                  className={`bg-white rounded-lg shadow p-4 border-l-4 ${
                    stop.isDelivered ? 'opacity-60' : ''
                  }`}
                  style={{ borderLeftColor: stop.statusInfo.color }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg" style={{ color: '#3d59ab' }}>
                          {index + 1}.
                        </span>
                        <h3 className="font-bold">{stop.displayName}</h3>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
                          style={{ backgroundColor: stop.statusInfo.color + '20', color: stop.statusInfo.color }}
                        >
                          <StatusIcon size={12} />
                          {stop.statusInfo.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{stop.address}</p>
                      {stop.isReady && stop.orders.length > 0 && (
                        <p className="text-sm text-gray-500 mt-1">
                          {stop.orders.map(o => `${o.portions}p: ${o.dishes?.join(', ')}`).join(' | ')}
                        </p>
                      )}
                      {deliveryEntry?.problem && (
                        <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                          <AlertTriangle size={14} />
                          {deliveryEntry.problem}
                        </p>
                      )}
                    </div>
                    {stop.address && (
                      <button
                        onClick={() => openMaps(stop.address)}
                        className="p-2 rounded-lg text-white"
                        style={{ backgroundColor: '#27ae60' }}
                      >
                        <MapPin size={20} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {allStops.length === 0 && (
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <Package size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">No deliveries scheduled for your zone</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Summary screen
  if (isComplete) {
    const summary = getSummary();
    return (
      <div className="min-h-screen p-4" style={{ backgroundColor: '#f9f9ed' }}>
        <div className="max-w-lg mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ backgroundColor: '#22c55e' }}>
              <Check size={40} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold mb-2" style={{ color: '#3d59ab' }}>
              All Deliveries Complete!
            </h1>
            <p className="text-gray-600 mb-6">Great job, {driver.name}!</p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 rounded-lg" style={{ backgroundColor: '#f9f9ed' }}>
                <p className="text-3xl font-bold" style={{ color: '#3d59ab' }}>
                  {summary.completed}
                </p>
                <p className="text-sm text-gray-600">Deliveries</p>
              </div>
              <div className="p-4 rounded-lg" style={{ backgroundColor: summary.problems > 0 ? '#fef2f2' : '#f9f9ed' }}>
                <p className="text-3xl font-bold" style={{ color: summary.problems > 0 ? '#dc2626' : '#3d59ab' }}>
                  {summary.problems}
                </p>
                <p className="text-sm text-gray-600">Problems</p>
              </div>
              <div className="p-4 rounded-lg" style={{ backgroundColor: '#f9f9ed' }}>
                <p className="text-3xl font-bold" style={{ color: '#3d59ab' }}>
                  {summary.bagsReturned}
                </p>
                <p className="text-sm text-gray-600">Bags Returned</p>
              </div>
              <div className="p-4 rounded-lg" style={{ backgroundColor: '#f9f9ed' }}>
                <p className="text-3xl font-bold" style={{ color: '#3d59ab' }}>
                  {summary.porchDrops}
                </p>
                <p className="text-sm text-gray-600">Porch Drops</p>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => setShowAllStops(true)}
                className="w-full py-3 rounded-lg border-2 font-medium flex items-center justify-center gap-2"
                style={{ borderColor: '#3d59ab', color: '#3d59ab' }}
              >
                <List size={20} />
                View All Stops
              </button>
              <button
                onClick={handleLogout}
                className="w-full py-3 rounded-lg bg-gray-200 font-medium flex items-center justify-center gap-2"
              >
                <LogOut size={20} />
                Log Out
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No READY stops available (but might have scheduled stops)
  if (remainingReadyStops.length === 0 && !isComplete) {
    const scheduledCount = allStops.filter(s => !s.isDelivered).length;
    const inKdsCount = allStops.filter(s => s.status === 'kds').length;

    return (
      <div className="min-h-screen p-4" style={{ backgroundColor: '#f9f9ed' }}>
        <div className="max-w-lg mx-auto">
          <Header driver={driver} onLogout={handleLogout} onViewAll={() => setShowAllStops(true)} />
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <Package size={48} className="mx-auto mb-4 text-gray-300" />
            <h2 className="text-xl font-bold mb-2" style={{ color: '#3d59ab' }}>
              No Deliveries Ready
            </h2>
            {scheduledCount > 0 ? (
              <>
                <p className="text-gray-600 mb-4">
                  {scheduledCount} delivery{scheduledCount !== 1 ? 'ies' : ''} scheduled for Zone {driver.zone} today,
                  but {scheduledCount === 1 ? "it's" : "they're"} not ready yet.
                </p>
                {inKdsCount > 0 && (
                  <p className="text-blue-600 text-sm">
                    <ChefHat size={16} className="inline mr-1" />
                    {inKdsCount} in kitchen - coming soon!
                  </p>
                )}
              </>
            ) : (
              <p className="text-gray-600">
                No deliveries scheduled for Zone {driver.zone} today.
              </p>
            )}
            <button
              onClick={() => setShowAllStops(true)}
              className="mt-4 px-4 py-2 rounded-lg border-2"
              style={{ borderColor: '#3d59ab', color: '#3d59ab' }}
            >
              View All Scheduled
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main delivery view
  return (
    <div className="min-h-screen p-4" style={{ backgroundColor: '#f9f9ed' }}>
      <div className="max-w-lg mx-auto">
        <Header driver={driver} onLogout={handleLogout} onViewAll={() => setShowAllStops(true)} />

        {/* Progress indicator */}
        <div className="bg-white rounded-lg shadow p-3 mb-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              Stop {completedStops.length + 1} of {readyStops.length} ready
              {allStops.length > readyStops.length && (
                <span className="text-gray-400 ml-1">
                  ({allStops.length} scheduled)
                </span>
              )}
            </span>
            <span className="font-medium" style={{ color: '#3d59ab' }}>
              Zone {driver.zone}
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full transition-all"
              style={{
                width: `${readyStops.length > 0 ? (completedStops.length / readyStops.length) * 100 : 0}%`,
                backgroundColor: '#3d59ab'
              }}
            />
          </div>
        </div>

        {/* Current stop card */}
        {currentStop && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
            <div className="mb-4">
              <h2 className="text-2xl font-bold" style={{ color: '#3d59ab' }}>
                {currentStop.displayName}
              </h2>
              <p className="text-gray-600 mt-1">{currentStop.address}</p>
              {currentStop.orders.length > 0 && (
                <p className="text-sm text-gray-500 mt-2">
                  {currentStop.orders.map(o => `${o.portions}p: ${o.dishes.join(', ')}`).join(' | ')}
                </p>
              )}
            </div>

            {/* Navigate button */}
            <button
              onClick={() => openMaps(currentStop.address)}
              className="w-full py-4 rounded-lg text-white font-bold text-lg flex items-center justify-center gap-2 mb-6"
              style={{ backgroundColor: '#27ae60' }}
            >
              <MapPin size={24} />
              Navigate in Maps
            </button>

            {/* Hand-off type toggle */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Delivery Type</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setHandoffType(HANDOFF_TYPES.HAND)}
                  className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-all ${
                    handoffType === HANDOFF_TYPES.HAND ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <User size={24} style={{ color: handoffType === HANDOFF_TYPES.HAND ? '#3d59ab' : '#9ca3af' }} />
                  <span className={handoffType === HANDOFF_TYPES.HAND ? 'font-medium' : 'text-gray-500'}>
                    Hand-off
                  </span>
                </button>
                <button
                  onClick={() => setHandoffType(HANDOFF_TYPES.PORCH)}
                  className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-all ${
                    handoffType === HANDOFF_TYPES.PORCH ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <Home size={24} style={{ color: handoffType === HANDOFF_TYPES.PORCH ? '#3d59ab' : '#9ca3af' }} />
                  <span className={handoffType === HANDOFF_TYPES.PORCH ? 'font-medium' : 'text-gray-500'}>
                    Porch Drop
                  </span>
                </button>
              </div>
            </div>

            {/* Photo upload (required for porch drops) */}
            {handoffType === HANDOFF_TYPES.PORCH && (
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">
                  Photo <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoChange}
                  ref={fileInputRef}
                  className="hidden"
                />
                {photoPreview ? (
                  <div className="relative">
                    <img
                      src={photoPreview}
                      alt="Delivery photo"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-2 right-2 px-3 py-1 rounded bg-white shadow text-sm"
                    >
                      Retake
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2"
                    style={{ borderColor: '#ebb582' }}
                  >
                    <Camera size={32} className="text-gray-400" />
                    <span className="text-gray-500">Take Photo</span>
                  </button>
                )}
              </div>
            )}

            {/* Bags returned toggle */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Bags Returned?</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setBagsReturned(true)}
                  className={`p-3 rounded-lg border-2 flex items-center justify-center gap-2 ${
                    bagsReturned ? 'border-green-500 bg-green-50' : 'border-gray-200'
                  }`}
                >
                  <ShoppingBag size={20} style={{ color: bagsReturned ? '#22c55e' : '#9ca3af' }} />
                  <span className={bagsReturned ? 'font-medium text-green-700' : 'text-gray-500'}>
                    Yes
                  </span>
                </button>
                <button
                  onClick={() => setBagsReturned(false)}
                  className={`p-3 rounded-lg border-2 flex items-center justify-center gap-2 ${
                    !bagsReturned ? 'border-amber-500 bg-amber-50' : 'border-gray-200'
                  }`}
                >
                  <ShoppingBag size={20} style={{ color: !bagsReturned ? '#f59e0b' : '#9ca3af' }} />
                  <span className={!bagsReturned ? 'font-medium text-amber-700' : 'text-gray-500'}>
                    No
                  </span>
                </button>
              </div>
            </div>

            {/* Problem button */}
            <button
              onClick={() => setShowProblemModal(true)}
              className="w-full py-3 rounded-lg border-2 border-red-300 text-red-600 font-medium flex items-center justify-center gap-2 mb-4"
            >
              <AlertTriangle size={20} />
              Problem with Delivery
            </button>

            {/* Navigation and Complete buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleBack}
                className="flex-1 py-4 rounded-lg bg-gray-200 font-medium flex items-center justify-center gap-2"
                disabled={currentStopIndex === 0 && completedStops.length === 0}
              >
                <ChevronLeft size={20} />
                Back
              </button>
              <button
                onClick={() => handleCompleteDelivery()}
                className="flex-[2] py-4 rounded-lg text-white font-bold flex items-center justify-center gap-2"
                style={{ backgroundColor: '#3d59ab' }}
              >
                Complete Delivery
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Problem Modal */}
        {showProblemModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
              <h3 className="text-xl font-bold mb-4" style={{ color: '#3d59ab' }}>
                Report Problem
              </h3>
              <div className="space-y-3 mb-4">
                {DELIVERY_PROBLEMS.map(problem => (
                  <button
                    key={problem}
                    onClick={() => setSelectedProblem(problem)}
                    className={`w-full p-3 rounded-lg border-2 text-left ${
                      selectedProblem === problem
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-200'
                    }`}
                  >
                    {problem}
                  </button>
                ))}
              </div>
              {selectedProblem === 'Other' && (
                <textarea
                  value={problemNote}
                  onChange={(e) => setProblemNote(e.target.value)}
                  placeholder="Please describe the problem..."
                  className="w-full p-3 border-2 rounded-lg mb-4"
                  style={{ borderColor: '#ebb582' }}
                  rows={3}
                />
              )}
              {selectedProblem && selectedProblem !== 'Other' && (
                <textarea
                  value={problemNote}
                  onChange={(e) => setProblemNote(e.target.value)}
                  placeholder="Additional notes (optional)"
                  className="w-full p-3 border-2 rounded-lg mb-4"
                  style={{ borderColor: '#ebb582' }}
                  rows={2}
                />
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowProblemModal(false);
                    setSelectedProblem('');
                    setProblemNote('');
                  }}
                  className="flex-1 py-3 rounded-lg bg-gray-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleProblemSubmit}
                  className="flex-1 py-3 rounded-lg text-white font-medium"
                  style={{ backgroundColor: '#dc2626' }}
                >
                  Submit Problem
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Header component
function Header({ driver, onLogout, onViewAll }) {
  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#3d59ab' }}>
            <Truck size={20} className="text-white" />
          </div>
          <div>
            <p className="font-bold" style={{ color: '#3d59ab' }}>{driver.name}</p>
            <p className="text-sm text-gray-500">Zone {driver.zone}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onViewAll}
            className="p-2 rounded-lg bg-gray-100"
            title="View All Stops"
          >
            <List size={20} className="text-gray-600" />
          </button>
          <button
            onClick={onLogout}
            className="p-2 rounded-lg bg-gray-100"
            title="Log Out"
          >
            <LogOut size={20} className="text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );
}
