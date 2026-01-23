import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ChefHat, Calendar, CreditCard, Truck, Check, Clock,
  AlertTriangle, Play, MapPin, Package, Home, User,
  ExternalLink, ArrowLeft, Utensils
} from 'lucide-react';
import { useClientPortalData } from '../hooks/useClientPortalData';

// Client status types
const STATUS = {
  PICK_DATES: 'pick_dates',
  NEEDS_PAYMENT: 'needs_payment',
  MENU_READY: 'menu_ready',
  DELIVERY_DAY: 'delivery_day',
  DELIVERED: 'delivered',
  OVERDUE: 'overdue',
  PAUSED: 'paused',
  NO_UPCOMING: 'no_upcoming'
};

export default function ClientPortal() {
  const { id } = useParams();
  const {
    isLoaded,
    getClientById,
    getClientMenuItems,
    getClientReadyOrders,
    getClientDeliveryStatus,
    getClientHistory,
    clientPortalData,
    updateClientPortalData
  } = useClientPortalData();

  const [selectedDates, setSelectedDates] = useState([]);

  const client = useMemo(() => getClientById(id), [id, getClientById]);
  const today = new Date().toISOString().split('T')[0];

  // Determine client's current portal status
  const getPortalStatus = () => {
    if (!client) return null;

    // Check if paused
    if (client.status === 'paused') {
      return STATUS.PAUSED;
    }

    // Check if overdue (has billingNotes with "overdue" or specific flag)
    const portalInfo = clientPortalData[client.name] || {};
    if (portalInfo.paymentOverdue) {
      return STATUS.OVERDUE;
    }

    // Check if needs to pay
    if (portalInfo.pendingPayment && client.honeyBookLink) {
      return STATUS.NEEDS_PAYMENT;
    }

    // Check if delivered today
    const todayDelivery = getClientDeliveryStatus(client.name, today);
    if (todayDelivery) {
      return STATUS.DELIVERED;
    }

    // Check if it's delivery day with ready orders
    const readyOrders = getClientReadyOrders(client.name, today);
    if (readyOrders.length > 0) {
      return STATUS.DELIVERY_DAY;
    }

    // Check if menu is ready (has menu items for upcoming dates)
    const upcomingMenuItems = getClientMenuItems(client.name).filter(
      item => item.date >= today
    );
    const upcomingReadyOrders = getClientReadyOrders(client.name).filter(
      order => order.date >= today
    );
    if (upcomingMenuItems.length > 0 || upcomingReadyOrders.length > 0) {
      return STATUS.MENU_READY;
    }

    // Check if needs to pick dates
    if (portalInfo.needsDateSelection) {
      return STATUS.PICK_DATES;
    }

    return STATUS.NO_UPCOMING;
  };

  const portalStatus = getPortalStatus();

  // Loading state
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f9f9ed' }}>
        <div className="text-center">
          <ChefHat size={48} className="mx-auto mb-4 animate-pulse" style={{ color: '#ffd700' }} />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Client not found
  if (!client) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#f9f9ed' }}>
        <div className="bg-white rounded-lg shadow-lg p-8 text-center max-w-md">
          <AlertTriangle size={48} className="mx-auto mb-4 text-amber-500" />
          <h1 className="text-xl font-bold mb-2" style={{ color: '#3d59ab' }}>
            Page Not Found
          </h1>
          <p className="text-gray-600">
            We couldn't find your client portal. Please check the link and try again.
          </p>
        </div>
      </div>
    );
  }

  const displayName = client.displayName || client.name;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f9f9ed' }}>
      {/* Header */}
      <header className="text-white p-4" style={{ backgroundColor: '#3d59ab' }}>
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <ChefHat size={32} style={{ color: '#ffd700' }} />
          <div>
            <h1 className="text-xl font-bold">Goldfinch Chef</h1>
            <p className="text-sm opacity-80">Client Portal</p>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4">
        {/* Welcome card */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
          <h2 className="text-2xl font-bold" style={{ color: '#3d59ab' }}>
            Hello, {displayName.split(' ')[0]}!
          </h2>
          <p className="text-gray-600 mt-1">
            {getStatusMessage(portalStatus)}
          </p>
        </div>

        {/* Status-specific content */}
        {portalStatus === STATUS.PAUSED && (
          <PausedView client={client} />
        )}

        {portalStatus === STATUS.OVERDUE && (
          <OverdueView client={client} />
        )}

        {portalStatus === STATUS.NEEDS_PAYMENT && (
          <PaymentView client={client} />
        )}

        {portalStatus === STATUS.PICK_DATES && (
          <DatePickerView
            client={client}
            selectedDates={selectedDates}
            setSelectedDates={setSelectedDates}
            onSubmit={() => {
              updateClientPortalData(client.name, {
                selectedDates,
                needsDateSelection: false
              });
            }}
          />
        )}

        {portalStatus === STATUS.MENU_READY && (
          <MenuReadyView
            client={client}
            getClientMenuItems={getClientMenuItems}
            getClientReadyOrders={getClientReadyOrders}
            today={today}
          />
        )}

        {portalStatus === STATUS.DELIVERY_DAY && (
          <DeliveryDayView
            client={client}
            getClientReadyOrders={getClientReadyOrders}
            getClientDeliveryStatus={getClientDeliveryStatus}
            today={today}
          />
        )}

        {portalStatus === STATUS.DELIVERED && (
          <DeliveredView
            client={client}
            getClientDeliveryStatus={getClientDeliveryStatus}
            getClientReadyOrders={getClientReadyOrders}
            getClientHistory={getClientHistory}
            today={today}
          />
        )}

        {portalStatus === STATUS.NO_UPCOMING && (
          <NoUpcomingView client={client} getClientHistory={getClientHistory} />
        )}
      </div>

      {/* Footer */}
      <footer className="text-center p-4 text-gray-500 text-sm">
        <p>Questions? Contact us at hello@goldfinchchef.com</p>
      </footer>
    </div>
  );
}

// Helper function for status messages
function getStatusMessage(status) {
  switch (status) {
    case STATUS.PAUSED:
      return "Your account is currently paused.";
    case STATUS.OVERDUE:
      return "Your account needs attention.";
    case STATUS.NEEDS_PAYMENT:
      return "Please complete your payment to continue.";
    case STATUS.PICK_DATES:
      return "Let's schedule your upcoming deliveries.";
    case STATUS.MENU_READY:
      return "Your menu is ready! Here's what's coming.";
    case STATUS.DELIVERY_DAY:
      return "Your delivery is on the way!";
    case STATUS.DELIVERED:
      return "Your delivery has arrived!";
    default:
      return "Welcome to your client portal.";
  }
}

// Paused View
function PausedView({ client }) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center bg-gray-100">
          <Play size={32} className="text-gray-400 ml-1" />
        </div>
        <h3 className="text-xl font-bold mb-2" style={{ color: '#3d59ab' }}>
          Account Paused
        </h3>
        <p className="text-gray-600 mb-4">
          {client.pausedDate
            ? `Paused since ${new Date(client.pausedDate).toLocaleDateString()}`
            : "Your meal deliveries are currently on hold."
          }
        </p>
        <p className="text-gray-600 mb-6">
          Ready to start enjoying delicious meals again? Contact us to reactivate your account.
        </p>
        <a
          href="mailto:hello@goldfinchchef.com?subject=Reactivate%20My%20Account"
          className="inline-block px-6 py-3 rounded-lg text-white font-medium"
          style={{ backgroundColor: '#3d59ab' }}
        >
          Request Reactivation
        </a>
      </div>
    </div>
  );
}

// Overdue View
function OverdueView({ client }) {
  return (
    <div className="space-y-4">
      <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <AlertTriangle size={32} className="text-red-500 flex-shrink-0" />
          <div>
            <h3 className="text-xl font-bold text-red-700 mb-2">
              Payment Overdue
            </h3>
            <p className="text-red-600 mb-4">
              Your account has an outstanding balance. Please make a payment to continue receiving deliveries.
            </p>
            {client.honeyBookLink && (
              <a
                href={client.honeyBookLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-white font-medium"
                style={{ backgroundColor: '#dc2626' }}
              >
                <CreditCard size={20} />
                Pay Now
                <ExternalLink size={16} />
              </a>
            )}
          </div>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow p-4 text-center text-gray-600">
        <p>
          Questions about your invoice?{' '}
          <a href="mailto:hello@goldfinchchef.com" className="text-blue-600 underline">
            Contact us
          </a>
        </p>
      </div>
    </div>
  );
}

// Payment View
function PaymentView({ client }) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
          style={{ backgroundColor: '#fef3c7' }}>
          <CreditCard size={32} style={{ color: '#f59e0b' }} />
        </div>
        <h3 className="text-xl font-bold mb-2" style={{ color: '#3d59ab' }}>
          Payment Required
        </h3>
        <p className="text-gray-600 mb-6">
          Please complete your payment to confirm your upcoming deliveries.
        </p>
        {client.honeyBookLink && (
          <a
            href={client.honeyBookLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-white font-medium"
            style={{ backgroundColor: '#3d59ab' }}
          >
            <CreditCard size={20} />
            View Invoice
            <ExternalLink size={16} />
          </a>
        )}
      </div>
    </div>
  );
}

// Date Picker View
function DatePickerView({ client, selectedDates, setSelectedDates, onSubmit }) {
  const today = new Date();
  const nextTwoWeeks = [];

  for (let i = 1; i <= 14; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
    // Only show delivery days (Mon, Tue, Thu typically, but we'll show all weekdays)
    if (date.getDay() !== 0 && date.getDay() !== 6) {
      nextTwoWeeks.push({
        date: date.toISOString().split('T')[0],
        display: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        dayOfWeek
      });
    }
  }

  const toggleDate = (date) => {
    if (selectedDates.includes(date)) {
      setSelectedDates(selectedDates.filter(d => d !== date));
    } else {
      setSelectedDates([...selectedDates, date]);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <Calendar size={24} style={{ color: '#3d59ab' }} />
        <h3 className="text-xl font-bold" style={{ color: '#3d59ab' }}>
          Select Delivery Dates
        </h3>
      </div>
      <p className="text-gray-600 mb-4">
        Choose the dates you'd like to receive your meals. You can select up to {client.mealsPerWeek || 4} days per week.
      </p>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {nextTwoWeeks.map(({ date, display }) => (
          <button
            key={date}
            onClick={() => toggleDate(date)}
            className={`p-3 rounded-lg border-2 text-left transition-all ${
              selectedDates.includes(date)
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <p className={`font-medium ${selectedDates.includes(date) ? 'text-blue-700' : ''}`}>
              {display}
            </p>
          </button>
        ))}
      </div>
      <button
        onClick={onSubmit}
        disabled={selectedDates.length === 0}
        className="w-full py-3 rounded-lg text-white font-medium disabled:opacity-50"
        style={{ backgroundColor: '#3d59ab' }}
      >
        Confirm {selectedDates.length} Date{selectedDates.length !== 1 ? 's' : ''}
      </button>
    </div>
  );
}

// Menu Ready View
function MenuReadyView({ client, getClientMenuItems, getClientReadyOrders, today }) {
  const upcomingMenuItems = getClientMenuItems(client.name).filter(
    item => item.date >= today
  );
  const upcomingReadyOrders = getClientReadyOrders(client.name).filter(
    order => order.date >= today
  );

  // Group by date
  const byDate = {};
  upcomingMenuItems.forEach(item => {
    if (!byDate[item.date]) byDate[item.date] = { menuItems: [], readyOrders: [] };
    byDate[item.date].menuItems.push(item);
  });
  upcomingReadyOrders.forEach(order => {
    if (!byDate[order.date]) byDate[order.date] = { menuItems: [], readyOrders: [] };
    byDate[order.date].readyOrders.push(order);
  });

  const sortedDates = Object.keys(byDate).sort();

  return (
    <div className="space-y-4">
      {sortedDates.map(date => {
        const { menuItems, readyOrders } = byDate[date];
        const displayDate = new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric'
        });
        const isToday = date === today;

        return (
          <div key={date} className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-4 border-b" style={{ backgroundColor: isToday ? '#3d59ab' : '#f9f9ed' }}>
              <div className="flex items-center gap-2">
                <Calendar size={20} style={{ color: isToday ? '#ffd700' : '#3d59ab' }} />
                <h3 className={`font-bold ${isToday ? 'text-white' : ''}`} style={{ color: isToday ? undefined : '#3d59ab' }}>
                  {displayDate}
                </h3>
                {isToday && (
                  <span className="px-2 py-1 rounded text-xs font-medium" style={{ backgroundColor: '#ffd700', color: '#423d3c' }}>
                    TODAY
                  </span>
                )}
              </div>
            </div>
            <div className="p-4">
              {/* Show dishes from menu items or ready orders */}
              {menuItems.length > 0 && menuItems.map((item, idx) => (
                <MenuItemCard key={idx} item={item} />
              ))}
              {readyOrders.length > 0 && readyOrders.map((order, idx) => (
                <ReadyOrderCard key={idx} order={order} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MenuItemCard({ item }) {
  const dishes = [item.protein, item.veg, item.starch, ...(item.extras || [])].filter(Boolean);
  return (
    <div className="mb-3 last:mb-0">
      <p className="text-sm text-gray-500 mb-2">{item.portions} portion{item.portions !== 1 ? 's' : ''}</p>
      <div className="space-y-2">
        {dishes.map((dish, idx) => (
          <div key={idx} className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: '#f9f9ed' }}>
            <Utensils size={16} style={{ color: '#3d59ab' }} />
            <span className="font-medium">{dish}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReadyOrderCard({ order }) {
  return (
    <div className="mb-3 last:mb-0">
      <p className="text-sm text-gray-500 mb-2">{order.portions} portion{order.portions !== 1 ? 's' : ''}</p>
      <div className="space-y-2">
        {order.dishes.map((dish, idx) => (
          <div key={idx} className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: '#f9f9ed' }}>
            <Utensils size={16} style={{ color: '#3d59ab' }} />
            <span className="font-medium">{dish}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Delivery Day View
function DeliveryDayView({ client, getClientReadyOrders, today }) {
  const orders = getClientReadyOrders(client.name, today);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center animate-pulse"
            style={{ backgroundColor: '#dbeafe' }}>
            <Truck size={40} style={{ color: '#3d59ab' }} />
          </div>
          <h3 className="text-xl font-bold mb-2" style={{ color: '#3d59ab' }}>
            Out for Delivery
          </h3>
          <p className="text-gray-600">
            Your meals are on their way to you today!
          </p>
        </div>
      </div>

      {/* Time window */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-3 mb-3">
          <Clock size={24} style={{ color: '#3d59ab' }} />
          <h4 className="font-bold" style={{ color: '#3d59ab' }}>Estimated Arrival</h4>
        </div>
        <p className="text-2xl font-bold text-gray-800">
          {client.deliveryWindow || '2:00 PM - 6:00 PM'}
        </p>
        <p className="text-sm text-gray-500 mt-2">
          We'll leave your meals at the door if you're not home.
        </p>
      </div>

      {/* Today's order */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Package size={24} style={{ color: '#3d59ab' }} />
          <h4 className="font-bold" style={{ color: '#3d59ab' }}>Today's Order</h4>
        </div>
        {orders.map((order, idx) => (
          <ReadyOrderCard key={idx} order={order} />
        ))}
      </div>

      {/* Delivery address */}
      {client.address && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <MapPin size={24} style={{ color: '#3d59ab' }} />
            <h4 className="font-bold" style={{ color: '#3d59ab' }}>Delivery Address</h4>
          </div>
          <p className="text-gray-700">{client.address}</p>
          <p className="text-sm text-gray-500 mt-2">
            Wrong address?{' '}
            <a href="mailto:hello@goldfinchchef.com" className="text-blue-600 underline">
              Let us know ASAP
            </a>
          </p>
        </div>
      )}
    </div>
  );
}

// Delivered View
function DeliveredView({ client, getClientDeliveryStatus, getClientHistory, today }) {
  const delivery = getClientDeliveryStatus(client.name, today);
  const history = getClientHistory(client.name);
  const recentHistory = history.slice(0, 3);

  const formatTime = (isoString) => {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ backgroundColor: '#dcfce7' }}>
            <Check size={40} className="text-green-600" />
          </div>
          <h3 className="text-xl font-bold mb-2 text-green-700">
            Delivered!
          </h3>
          {delivery && (
            <p className="text-gray-600">
              {delivery.handoffType === 'porch' ? 'Left at your door' : 'Handed off'} at {formatTime(delivery.completedAt)}
            </p>
          )}
        </div>

        {/* Porch drop photo */}
        {delivery?.handoffType === 'porch' && delivery?.photoData && (
          <div className="mt-6">
            <p className="text-sm font-medium text-gray-600 mb-2">Delivery Photo:</p>
            <img
              src={delivery.photoData}
              alt="Delivery confirmation"
              className="w-full rounded-lg shadow"
            />
          </div>
        )}

        {/* Hand-off confirmation */}
        {delivery?.handoffType === 'hand' && (
          <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: '#f9f9ed' }}>
            <div className="flex items-center gap-3">
              <User size={24} style={{ color: '#3d59ab' }} />
              <div>
                <p className="font-medium">Hand Delivery</p>
                <p className="text-sm text-gray-600">
                  Received at {formatTime(delivery.completedAt)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* What was delivered */}
      {recentHistory.length > 0 && recentHistory[0].date === today && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Package size={24} style={{ color: '#3d59ab' }} />
            <h4 className="font-bold" style={{ color: '#3d59ab' }}>What's in Your Delivery</h4>
          </div>
          {recentHistory[0].dishes?.map((dish, idx) => (
            <div key={idx} className="flex items-center gap-2 p-2 rounded-lg mb-2" style={{ backgroundColor: '#f9f9ed' }}>
              <Utensils size={16} style={{ color: '#3d59ab' }} />
              <span className="font-medium">{dish}</span>
            </div>
          ))}
        </div>
      )}

      {/* Heating instructions */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-3 mb-3">
          <ChefHat size={24} style={{ color: '#ffd700' }} />
          <h4 className="font-bold" style={{ color: '#3d59ab' }}>Heating Instructions</h4>
        </div>
        <div className="text-gray-600 space-y-2 text-sm">
          <p><strong>Refrigerate</strong> meals within 2 hours of delivery.</p>
          <p><strong>To reheat:</strong> Remove lid, cover with damp paper towel, microwave 2-3 minutes or until heated through.</p>
          <p><strong>Best enjoyed</strong> within 4 days.</p>
        </div>
      </div>
    </div>
  );
}

// No Upcoming View
function NoUpcomingView({ client, getClientHistory }) {
  const history = getClientHistory(client.name);
  const recentHistory = history.slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-lg p-6 text-center">
        <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
          style={{ backgroundColor: '#f9f9ed' }}>
          <Calendar size={32} className="text-gray-400" />
        </div>
        <h3 className="text-xl font-bold mb-2" style={{ color: '#3d59ab' }}>
          No Upcoming Deliveries
        </h3>
        <p className="text-gray-600 mb-4">
          You don't have any meals scheduled yet.
        </p>
        <a
          href="mailto:hello@goldfinchchef.com?subject=Schedule%20Deliveries"
          className="inline-block px-6 py-3 rounded-lg text-white font-medium"
          style={{ backgroundColor: '#3d59ab' }}
        >
          Schedule Deliveries
        </a>
      </div>

      {/* Recent history */}
      {recentHistory.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h4 className="font-bold mb-4" style={{ color: '#3d59ab' }}>Recent Deliveries</h4>
          <div className="space-y-3">
            {recentHistory.map((order, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: '#f9f9ed' }}>
                <div>
                  <p className="font-medium">
                    {new Date(order.date + 'T12:00:00').toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </p>
                  <p className="text-sm text-gray-500">
                    {order.dishes?.slice(0, 2).join(', ')}
                    {order.dishes?.length > 2 && ` +${order.dishes.length - 2} more`}
                  </p>
                </div>
                <Check size={20} className="text-green-600" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
