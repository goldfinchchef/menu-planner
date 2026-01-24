import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ChefHat, Calendar, CreditCard, Truck, Check, Clock,
  AlertTriangle, Play, MapPin, Package, Home, User,
  ExternalLink, ArrowLeft, Utensils, RefreshCw
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
    blockedDates,
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
            blockedDates={blockedDates}
            onSubmit={(notes) => {
              updateClientPortalData(client.name, {
                selectedDates,
                dateSelectionNotes: notes,
                needsDateSelection: false,
                dateSelectionSubmittedAt: new Date().toISOString()
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
            clientPortalData={clientPortalData}
            updateClientPortalData={updateClientPortalData}
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
function DatePickerView({ client, selectedDates, setSelectedDates, blockedDates = [], onSubmit }) {
  const [notes, setNotes] = useState('');
  const [validationError, setValidationError] = useState('');

  const today = new Date();
  const isBiweekly = client.frequency === 'biweekly';
  const maxDates = 4;

  // Map delivery day name to day of week number (0=Sun, 1=Mon, 2=Tue, 4=Thu)
  const dayNameToNumber = {
    'Monday': 1,
    'Tuesday': 2,
    'Thursday': 4
  };
  const clientDeliveryDayNum = dayNameToNumber[client.deliveryDay];

  // Get next 4 available dates based on client's delivery day
  const availableDates = [];
  let daysChecked = 0;
  const maxDaysToCheck = 120; // Look ahead ~4 months max

  while (availableDates.length < maxDates && daysChecked < maxDaysToCheck) {
    daysChecked++;
    const date = new Date(today);
    date.setDate(date.getDate() + daysChecked);
    const dateStr = date.toISOString().split('T')[0];

    // Check if this day matches the client's delivery day
    if (date.getDay() !== clientDeliveryDayNum) continue;

    // Check if this date is blocked by admin
    if (blockedDates.includes(dateStr)) continue;

    availableDates.push({
      date: dateStr,
      display: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    });
  }

  // Validate biweekly spacing (at least 2 weeks apart)
  const validateBiweeklySpacing = (dates) => {
    if (!isBiweekly || dates.length < 2) return true;
    const sortedDates = [...dates].sort();
    for (let i = 1; i < sortedDates.length; i++) {
      const prev = new Date(sortedDates[i - 1] + 'T12:00:00');
      const curr = new Date(sortedDates[i] + 'T12:00:00');
      const daysDiff = (curr - prev) / (1000 * 60 * 60 * 24);
      if (daysDiff < 14) {
        return false;
      }
    }
    return true;
  };

  const toggleDate = (date) => {
    setValidationError('');

    if (selectedDates.includes(date)) {
      setSelectedDates(selectedDates.filter(d => d !== date));
    } else {
      if (selectedDates.length >= maxDates) {
        setValidationError(`You can only select ${maxDates} delivery dates`);
        return;
      }

      const newDates = [...selectedDates, date];

      if (isBiweekly && !validateBiweeklySpacing(newDates)) {
        setValidationError('Biweekly deliveries must be at least 2 weeks apart');
        return;
      }

      setSelectedDates(newDates);
    }
  };

  const handleSubmit = () => {
    if (selectedDates.length === 0) {
      setValidationError('Please select at least one delivery date');
      return;
    }
    if (selectedDates.length > maxDates) {
      setValidationError(`Please select no more than ${maxDates} dates`);
      return;
    }
    if (isBiweekly && !validateBiweeklySpacing(selectedDates)) {
      setValidationError('Biweekly deliveries must be at least 2 weeks apart');
      return;
    }
    onSubmit(notes);
  };

  const isDateDisabled = (date) => {
    if (selectedDates.includes(date)) return false;
    if (selectedDates.length >= maxDates) return true;

    if (isBiweekly && selectedDates.length > 0) {
      const testDates = [...selectedDates, date];
      return !validateBiweeklySpacing(testDates);
    }

    return false;
  };

  // If no delivery day set, show message
  if (!client.deliveryDay) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 text-center">
        <Calendar size={32} className="mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-bold mb-2" style={{ color: '#3d59ab' }}>
          Delivery Day Not Set
        </h3>
        <p className="text-gray-600">
          Please contact us to set your preferred delivery day before selecting dates.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <Calendar size={24} style={{ color: '#3d59ab' }} />
        <h3 className="text-xl font-bold" style={{ color: '#3d59ab' }}>
          Select Your Next {maxDates} Delivery Dates
        </h3>
      </div>

      <p className="text-gray-600 mb-2">
        Your deliveries are on <strong>{client.deliveryDay}s</strong>. Choose {maxDates} upcoming dates.
      </p>

      {isBiweekly && (
        <p className="text-sm text-amber-600 mb-4 flex items-center gap-2">
          <AlertTriangle size={16} />
          Biweekly schedule: dates must be at least 2 weeks apart
        </p>
      )}

      {validationError && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {validationError}
        </div>
      )}

      <div className="mb-4 text-sm text-gray-600">
        Selected: {selectedDates.length} / {maxDates}
      </div>

      <div className="space-y-2 mb-6">
        {availableDates.map(({ date, display }) => {
          const isSelected = selectedDates.includes(date);
          const isDisabled = isDateDisabled(date);

          return (
            <button
              key={date}
              onClick={() => toggleDate(date)}
              disabled={isDisabled && !isSelected}
              className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : isDisabled
                  ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <p className={`font-medium ${isSelected ? 'text-blue-700' : ''}`}>
                {display}
              </p>
            </button>
          );
        })}
      </div>

      {/* Notes field */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">
          Special requests or notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="E.g., 'No deliveries the week of the 15th' or 'Prefer morning deliveries'"
          className="w-full p-3 border-2 rounded-lg"
          style={{ borderColor: '#ebb582' }}
          rows={3}
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={selectedDates.length === 0}
        className="w-full py-3 rounded-lg text-white font-medium disabled:opacity-50"
        style={{ backgroundColor: '#3d59ab' }}
      >
        Confirm {selectedDates.length} Date{selectedDates.length !== 1 ? 's' : ''}
      </button>
    </div>
  );
}

// Styled Menu Card Component - Goldfinch Canva Style
function StyledMenuCard({ client, date, menuItems, readyOrders }) {
  const displayDate = new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).toUpperCase();

  // Extract all meals from menu items
  const extractMeals = () => {
    const meals = [];

    menuItems.forEach(item => {
      const meal = {
        protein: item.protein,
        sides: [item.veg, item.starch].filter(Boolean)
      };
      if (meal.protein || meal.sides.length > 0) {
        meals.push(meal);
      }
      // Add extras as separate items
      if (item.extras) {
        item.extras.forEach(extra => {
          meals.push({ protein: extra, sides: [], isExtra: true });
        });
      }
    });

    // Also check ready orders
    readyOrders.forEach(order => {
      if (order.dishes) {
        order.dishes.forEach((dish, idx) => {
          // First dish is protein, rest could be sides
          if (idx === 0 || order.dishes.length === 1) {
            meals.push({ protein: dish, sides: order.dishes.slice(1), isExtra: false });
          }
        });
      }
    });

    return meals;
  };

  const meals = extractMeals();
  const displayName = client.displayName || client.name;

  // Calculate renewal date (4 weeks from delivery date)
  const deliveryDate = new Date(date + 'T12:00:00');
  const renewalDate = new Date(deliveryDate);
  renewalDate.setDate(renewalDate.getDate() + 28);
  const renewalFormatted = renewalDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric'
  }).toUpperCase();

  return (
    <div className="overflow-hidden shadow-lg" style={{ backgroundColor: '#fff' }}>
      {/* Header with pattern background */}
      <div
        className="relative px-4 pt-6 pb-8"
        style={{
          backgroundColor: '#f9f9ed',
          backgroundImage: 'url(/pattern4.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        {/* Goldfinch Services text */}
        <p
          className="text-center mb-2"
          style={{
            fontFamily: '"Glacial Indifference", sans-serif',
            fontSize: '12px',
            letterSpacing: '0.3em',
            color: '#5a5a5a'
          }}
        >
          GOLDFINCH CHEF SERVICES
        </p>

        {/* Client name in Poller One with underline */}
        <h2
          className="text-center mb-3"
          style={{
            color: '#3d59ab',
            fontFamily: '"Poller One", cursive',
            fontSize: '1.5rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            textDecoration: 'underline',
            textDecorationColor: '#3d59ab',
            textUnderlineOffset: '4px'
          }}
        >
          {displayName}'s Menu
        </h2>

        {/* Script tagline in Beth Ellen */}
        <p
          className="text-center mb-4"
          style={{
            color: '#5a5a5a',
            fontFamily: '"Beth Ellen", cursive',
            fontSize: '1.4rem'
          }}
        >
          here's what to expect on your plate!
        </p>

        {/* Goldfinch bird positioned left of date */}
        <div className="flex items-center justify-center gap-3">
          <img
            src="/goldfinch5.png"
            alt="Goldfinch"
            className="w-12 h-12 object-contain"
          />
          {/* Date */}
          <p
            style={{
              fontFamily: '"Glacial Indifference", sans-serif',
              fontSize: '14px',
              letterSpacing: '0.2em',
              color: '#5a5a5a'
            }}
          >
            {displayDate}
          </p>
        </div>
      </div>

      {/* Meals section with tan/caramel background */}
      <div
        className="px-6 py-8"
        style={{ backgroundColor: '#d9a87a' }}
      >
        <div className="space-y-8">
          {meals.map((meal, idx) => (
            <div key={idx} className="text-center">
              {/* Protein/Main - larger */}
              {meal.protein && (
                <h3
                  style={{
                    color: '#ffffff',
                    fontFamily: '"Glacial Indifference", sans-serif',
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    marginBottom: meal.sides.length > 0 ? '0.5rem' : 0
                  }}
                >
                  {meal.protein}
                </h3>
              )}

              {/* Sides - smaller */}
              {meal.sides.length > 0 && (
                <p
                  style={{
                    color: '#f5e6d3',
                    fontFamily: '"Glacial Indifference", sans-serif',
                    fontSize: '0.85rem',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase'
                  }}
                >
                  {meal.sides.join(', ')}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer section */}
      <div
        className="relative px-6 py-6"
        style={{
          backgroundColor: '#f9f9ed',
          fontFamily: '"Glacial Indifference", sans-serif'
        }}
      >
        {/* GET READY heading */}
        <h4
          className="mb-3"
          style={{
            color: '#3d59ab',
            fontFamily: '"Poller One", cursive',
            fontSize: '1.1rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}
        >
          Get Ready!
        </h4>

        {/* Reminder text */}
        <p
          className="mb-4 pr-20"
          style={{
            color: '#5a5a5a',
            fontSize: '0.9rem',
            lineHeight: '1.5'
          }}
        >
          Remember to put out bags, containers, and ice packs. And get excited – great food is on the way!
        </p>

        {/* Stemflower positioned right */}
        <img
          src="/stemflower.png"
          alt=""
          className="absolute right-4 bottom-4 h-20 object-contain"
        />

        {/* Renewal date */}
        <p
          style={{
            color: '#3d59ab',
            fontSize: '0.75rem',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            fontWeight: 'bold'
          }}
        >
          Your subscription renews: {renewalFormatted}
        </p>
      </div>
    </div>
  );
}

// Menu Ready View
function MenuReadyView({ client, getClientMenuItems, getClientReadyOrders, today, clientPortalData, updateClientPortalData }) {
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

  // Collect all dishes for substitution dropdown
  const allDishes = [];
  upcomingMenuItems.forEach(item => {
    [item.protein, item.veg, item.starch, ...(item.extras || [])].filter(Boolean).forEach(dish => {
      if (!allDishes.includes(dish)) allDishes.push(dish);
    });
  });
  upcomingReadyOrders.forEach(order => {
    (order.dishes || []).forEach(dish => {
      if (!allDishes.includes(dish)) allDishes.push(dish);
    });
  });

  return (
    <div className="space-y-6">
      {sortedDates.map(date => {
        const { menuItems, readyOrders } = byDate[date];
        return (
          <StyledMenuCard
            key={date}
            client={client}
            date={date}
            menuItems={menuItems}
            readyOrders={readyOrders}
          />
        );
      })}

      {/* Substitution Request Form */}
      {allDishes.length > 0 && (
        <SubstitutionRequestForm
          dishes={allDishes}
          clientName={client.name}
          clientPortalData={clientPortalData}
          updateClientPortalData={updateClientPortalData}
        />
      )}
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

// Helper to get next Saturday 11:59pm deadline
function getNextSaturdayDeadline() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7;
  const saturday = new Date(now);
  saturday.setDate(now.getDate() + daysUntilSaturday);
  saturday.setHours(23, 59, 59, 999);
  return saturday;
}

function isBeforeDeadline() {
  return new Date() < getNextSaturdayDeadline();
}

// Substitution Request Form
function SubstitutionRequestForm({ dishes, clientName, clientPortalData, updateClientPortalData }) {
  const [selectedDish, setSelectedDish] = useState('');
  const [substitution, setSubstitution] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const deadline = getNextSaturdayDeadline();
  const canSubmit = isBeforeDeadline();

  // Check for existing substitution request
  const existingRequest = clientPortalData[clientName]?.substitutionRequest;

  const formatDeadline = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    }) + ' at 11:59 PM';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedDish || !substitution.trim()) {
      alert('Please select a dish and enter your substitution request');
      return;
    }

    updateClientPortalData(clientName, {
      substitutionRequest: {
        originalDish: selectedDish,
        requestedSubstitution: substitution.trim(),
        submittedAt: new Date().toISOString(),
        deadline: deadline.toISOString()
      }
    });
    setIsSubmitted(true);
  };

  // Show confirmation if just submitted or has existing request
  if (isSubmitted || existingRequest) {
    const request = existingRequest || {
      originalDish: selectedDish,
      requestedSubstitution: substitution
    };

    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#dcfce7' }}>
            <Check size={20} className="text-green-600" />
          </div>
          <h4 className="font-bold" style={{ color: '#3d59ab' }}>Substitution Request Received</h4>
        </div>
        <div className="p-4 rounded-lg" style={{ backgroundColor: '#f9f9ed' }}>
          <p className="text-sm text-gray-600 mb-1">Instead of:</p>
          <p className="font-medium mb-3">{request.originalDish}</p>
          <p className="text-sm text-gray-600 mb-1">You requested:</p>
          <p className="font-medium">{request.requestedSubstitution}</p>
        </div>
        <p className="text-sm text-gray-500 mt-4">
          We'll do our best to accommodate your request. If we can't, we'll reach out to you.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <RefreshCw size={24} style={{ color: '#3d59ab' }} />
        <h4 className="font-bold" style={{ color: '#3d59ab' }}>Request a Substitution</h4>
      </div>

      {!canSubmit ? (
        <div className="text-center py-4">
          <AlertTriangle size={32} className="mx-auto mb-2 text-amber-500" />
          <p className="text-gray-600">
            The deadline for substitution requests has passed.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Requests must be submitted by Saturday at 11:59 PM.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Which dish would you like to substitute?
            </label>
            <select
              value={selectedDish}
              onChange={(e) => setSelectedDish(e.target.value)}
              className="w-full p-3 border-2 rounded-lg"
              style={{ borderColor: '#ebb582' }}
            >
              <option value="">Select a dish...</option>
              {dishes.map((dish, idx) => (
                <option key={idx} value={dish}>{dish}</option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              What would you like instead?
            </label>
            <textarea
              value={substitution}
              onChange={(e) => setSubstitution(e.target.value)}
              placeholder="E.g., 'Chicken instead of beef' or 'No onions please'"
              className="w-full p-3 border-2 rounded-lg"
              style={{ borderColor: '#ebb582' }}
              rows={3}
            />
          </div>

          <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <div className="flex items-center gap-2 text-amber-700">
              <Clock size={16} />
              <span className="text-sm font-medium">
                Deadline: {formatDeadline(deadline)}
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={!selectedDish || !substitution.trim()}
            className="w-full py-3 rounded-lg text-white font-medium disabled:opacity-50"
            style={{ backgroundColor: '#3d59ab' }}
          >
            Submit Request
          </button>
        </form>
      )}
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
