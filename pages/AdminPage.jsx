import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ChefHat, Home, Calendar, Truck, AlertTriangle, RefreshCw,
  Plus, Trash2, Edit2, Check, X, Settings, ClipboardList,
  LayoutDashboard, Users, MapPin, ChevronLeft, ChevronRight,
  Package, CreditCard, FileText, ShoppingBag
} from 'lucide-react';
import { ZONES, DEFAULT_NEW_DRIVER } from '../constants';

const STORAGE_KEY = 'goldfinchChefData';

// Custom hook for admin data
function useAdminData() {
  const [clients, setClients] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [deliveryLog, setDeliveryLog] = useState([]);
  const [readyForDelivery, setReadyForDelivery] = useState([]);
  const [clientPortalData, setClientPortalData] = useState({});
  const [blockedDates, setBlockedDates] = useState([]);
  const [adminSettings, setAdminSettings] = useState({ routeStartAddress: '' });
  const [customTasks, setCustomTasks] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadData = () => {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          if (parsed.clients) setClients(parsed.clients);
          if (parsed.drivers) setDrivers(parsed.drivers);
          if (parsed.deliveryLog) setDeliveryLog(parsed.deliveryLog);
          if (parsed.readyForDelivery) setReadyForDelivery(parsed.readyForDelivery);
          if (parsed.clientPortalData) setClientPortalData(parsed.clientPortalData);
          if (parsed.blockedDates) setBlockedDates(parsed.blockedDates);
          if (parsed.adminSettings) setAdminSettings(parsed.adminSettings);
          if (parsed.customTasks) setCustomTasks(parsed.customTasks);
        } catch (e) {
          console.error('Error loading saved data:', e);
        }
      }
      setIsLoaded(true);
    };
    loadData();

    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEY) loadData();
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const saveData = useCallback((updates) => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    let existing = {};
    if (savedData) {
      try {
        existing = JSON.parse(savedData);
      } catch (e) {
        console.error('Error parsing saved data:', e);
      }
    }
    const merged = { ...existing, ...updates, lastSaved: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  }, []);

  const updateDrivers = useCallback((newDrivers) => {
    setDrivers(newDrivers);
    saveData({ drivers: newDrivers });
  }, [saveData]);

  const updateBlockedDates = useCallback((newBlockedDates) => {
    setBlockedDates(newBlockedDates);
    saveData({ blockedDates: newBlockedDates });
  }, [saveData]);

  const updateAdminSettings = useCallback((newSettings) => {
    setAdminSettings(newSettings);
    saveData({ adminSettings: newSettings });
  }, [saveData]);

  const updateCustomTasks = useCallback((newTasks) => {
    setCustomTasks(newTasks);
    saveData({ customTasks: newTasks });
  }, [saveData]);

  return {
    clients,
    drivers,
    deliveryLog,
    readyForDelivery,
    clientPortalData,
    blockedDates,
    adminSettings,
    customTasks,
    isLoaded,
    updateDrivers,
    updateBlockedDates,
    updateAdminSettings,
    updateCustomTasks
  };
}

// Helper components
const FormField = ({ label, children }) => (
  <div className="flex flex-col">
    <label className="text-sm font-medium mb-1" style={{ color: '#423d3c' }}>{label}</label>
    {children}
  </div>
);

const inputStyle = "p-2 border-2 rounded-lg";
const borderStyle = { borderColor: '#ebb582' };

// Get week boundaries
function getWeekBounds(date = new Date()) {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function AdminPage() {
  const {
    clients,
    drivers,
    deliveryLog,
    readyForDelivery,
    clientPortalData,
    blockedDates,
    adminSettings,
    customTasks,
    isLoaded,
    updateDrivers,
    updateBlockedDates,
    updateAdminSettings,
    updateCustomTasks
  } = useAdminData();

  const [activeSection, setActiveSection] = useState('dashboard');
  const [newDriver, setNewDriver] = useState(DEFAULT_NEW_DRIVER);
  const [editingDriverIndex, setEditingDriverIndex] = useState(null);
  const [editingDriver, setEditingDriver] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [newTask, setNewTask] = useState({ title: '', notes: '', dueDate: '' });

  const today = new Date();
  const { start: weekStart, end: weekEnd } = getWeekBounds(today);

  // Dashboard calculations
  const getThisWeekDeliveries = () => {
    return readyForDelivery.filter(order => {
      const orderDate = new Date(order.date + 'T12:00:00');
      return orderDate >= weekStart && orderDate <= weekEnd;
    });
  };

  const getThisWeekCompleted = () => {
    return deliveryLog.filter(entry => {
      const entryDate = new Date(entry.date + 'T12:00:00');
      return entryDate >= weekStart && entryDate <= weekEnd;
    });
  };

  const getProblemsThisWeek = () => {
    return deliveryLog.filter(entry => {
      const entryDate = new Date(entry.date + 'T12:00:00');
      return entryDate >= weekStart && entryDate <= weekEnd && entry.problem;
    });
  };

  const getRenewalsThisWeek = () => {
    return clients.filter(client => {
      if (client.status !== 'active') return false;
      // Week 4 clients need billing attention
      const lastDelivery = deliveryLog
        .filter(d => d.clientName === client.name)
        .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
      if (!lastDelivery) return false;
      const deliveryDate = new Date(lastDelivery.date + 'T12:00:00');
      const renewalDate = new Date(deliveryDate);
      renewalDate.setDate(renewalDate.getDate() + 28);
      return renewalDate >= weekStart && renewalDate <= weekEnd;
    });
  };

  const getSubstitutionRequests = () => {
    return Object.entries(clientPortalData)
      .filter(([_, data]) => data.substitutionRequest)
      .map(([clientName, data]) => ({ clientName, ...data.substitutionRequest }));
  };

  const getClientsNeedingMenus = () => {
    const todayStr = today.toISOString().split('T')[0];
    return clients.filter(client => {
      if (client.status !== 'active') return false;
      // Check if client has delivery this week
      if (!client.deliveryDay) return false;
      const dayNum = { 'Monday': 1, 'Tuesday': 2, 'Thursday': 4 }[client.deliveryDay];
      if (!dayNum) return false;
      // Check each day this week
      for (let d = new Date(weekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
        if (d.getDay() === dayNum && d >= today) {
          const dateStr = d.toISOString().split('T')[0];
          const hasMenu = readyForDelivery.some(o => o.clientName === client.name && o.date === dateStr);
          if (!hasMenu) return true;
        }
      }
      return false;
    });
  };

  const getBagFollowups = () => {
    // Clients who had delivery but haven't returned bags (flagged in deliveryLog)
    return deliveryLog.filter(entry => {
      const entryDate = new Date(entry.date + 'T12:00:00');
      const daysSince = (today - entryDate) / (1000 * 60 * 60 * 24);
      return daysSince >= 3 && daysSince <= 10 && !entry.bagsReturned;
    });
  };

  // Auto-generated tasks
  const getAutoTasks = () => {
    const tasks = [];
    const renewals = getRenewalsThisWeek();
    const needMenus = getClientsNeedingMenus();
    const subs = getSubstitutionRequests();
    const bagFollowups = getBagFollowups();
    const pendingDeliveries = getThisWeekDeliveries();

    if (renewals.length > 0) {
      tasks.push({
        id: 'renewals',
        category: 'Billing & Renewals',
        title: `${renewals.length} client${renewals.length > 1 ? 's' : ''} due for renewal`,
        details: renewals.map(c => c.displayName || c.name),
        icon: CreditCard,
        color: '#f59e0b'
      });
    }

    if (needMenus.length > 0) {
      tasks.push({
        id: 'menus',
        category: 'Menu Planning',
        title: `Plan menus for ${needMenus.length} client${needMenus.length > 1 ? 's' : ''}`,
        details: needMenus.map(c => c.displayName || c.name),
        icon: FileText,
        color: '#3d59ab'
      });
    }

    if (subs.length > 0) {
      tasks.push({
        id: 'substitutions',
        category: 'Substitution Requests',
        title: `${subs.length} substitution request${subs.length > 1 ? 's' : ''} to review`,
        details: subs.map(s => `${s.clientName}: ${s.originalDish} → ${s.requestedSubstitution}`),
        icon: RefreshCw,
        color: '#8b5cf6'
      });
    }

    if (pendingDeliveries.length > 0) {
      tasks.push({
        id: 'delivery-prep',
        category: 'Delivery Prep',
        title: `${pendingDeliveries.length} order${pendingDeliveries.length > 1 ? 's' : ''} ready for delivery`,
        details: pendingDeliveries.map(o => `${o.clientName} - ${formatDate(o.date)}`),
        icon: Package,
        color: '#10b981'
      });
    }

    if (bagFollowups.length > 0) {
      tasks.push({
        id: 'bags',
        category: 'Bags Follow-up',
        title: `Follow up on ${bagFollowups.length} bag return${bagFollowups.length > 1 ? 's' : ''}`,
        details: bagFollowups.map(b => b.clientName),
        icon: ShoppingBag,
        color: '#ec4899'
      });
    }

    return tasks;
  };

  // Driver management
  const addDriver = () => {
    if (!newDriver.name) {
      alert('Please enter a driver name');
      return;
    }
    updateDrivers([...drivers, { ...newDriver, id: Date.now() }]);
    setNewDriver(DEFAULT_NEW_DRIVER);
  };

  const deleteDriver = (index) => {
    if (window.confirm('Delete this driver?')) {
      updateDrivers(drivers.filter((_, i) => i !== index));
    }
  };

  const startEditingDriver = (index) => {
    setEditingDriverIndex(index);
    setEditingDriver({ ...drivers[index] });
  };

  const saveEditingDriver = () => {
    const updated = [...drivers];
    updated[editingDriverIndex] = editingDriver;
    updateDrivers(updated);
    setEditingDriverIndex(null);
    setEditingDriver(null);
  };

  // Calendar functions
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    // Add empty slots for days before first of month
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    // Add all days in month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }

    return days;
  };

  const toggleBlockedDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    if (blockedDates.includes(dateStr)) {
      updateBlockedDates(blockedDates.filter(d => d !== dateStr));
    } else {
      updateBlockedDates([...blockedDates, dateStr]);
    }
  };

  const prevMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1));
  };

  // Custom tasks
  const addCustomTask = () => {
    if (!newTask.title) {
      alert('Please enter a task title');
      return;
    }
    updateCustomTasks([...customTasks, { ...newTask, id: Date.now(), completed: false }]);
    setNewTask({ title: '', notes: '', dueDate: '' });
  };

  const toggleTaskComplete = (taskId) => {
    updateCustomTasks(customTasks.map(t =>
      t.id === taskId ? { ...t, completed: !t.completed } : t
    ));
  };

  const deleteCustomTask = (taskId) => {
    updateCustomTasks(customTasks.filter(t => t.id !== taskId));
  };

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

  const autoTasks = getAutoTasks();
  const thisWeekDeliveries = getThisWeekDeliveries();
  const thisWeekCompleted = getThisWeekCompleted();
  const problemsThisWeek = getProblemsThisWeek();
  const renewalsThisWeek = getRenewalsThisWeek();

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f9f9ed' }}>
      {/* Header */}
      <header className="text-white p-4" style={{ backgroundColor: '#3d59ab' }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ChefHat size={32} style={{ color: '#ffd700' }} />
            <div>
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              <p className="text-sm opacity-80">Goldfinch Chef</p>
            </div>
          </div>
          <Link
            to="/"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
          >
            <Home size={20} />
            Back to App
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-4">
        {/* Navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'tasks', label: 'Weekly Tasks', icon: ClipboardList },
            { id: 'settings', label: 'Settings', icon: Settings }
          ].map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap ${
                activeSection === section.id
                  ? 'text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
              style={activeSection === section.id ? { backgroundColor: '#3d59ab' } : {}}
            >
              <section.icon size={20} />
              {section.label}
            </button>
          ))}
        </div>

        {/* Dashboard Section */}
        {activeSection === 'dashboard' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-4" style={{ color: '#3d59ab' }}>
                This Week at a Glance
              </h2>
              <p className="text-gray-500 mb-6">
                {formatDate(weekStart)} - {formatDate(weekEnd)}
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Pending Deliveries */}
                <div className="p-4 rounded-lg" style={{ backgroundColor: '#dbeafe' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Truck size={24} style={{ color: '#3d59ab' }} />
                    <span className="text-sm font-medium text-gray-600">Pending</span>
                  </div>
                  <p className="text-3xl font-bold" style={{ color: '#3d59ab' }}>
                    {thisWeekDeliveries.length}
                  </p>
                  <p className="text-sm text-gray-500">deliveries</p>
                </div>

                {/* Completed */}
                <div className="p-4 rounded-lg" style={{ backgroundColor: '#dcfce7' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Check size={24} className="text-green-600" />
                    <span className="text-sm font-medium text-gray-600">Completed</span>
                  </div>
                  <p className="text-3xl font-bold text-green-600">
                    {thisWeekCompleted.length}
                  </p>
                  <p className="text-sm text-gray-500">deliveries</p>
                </div>

                {/* Renewals */}
                <div className="p-4 rounded-lg" style={{ backgroundColor: '#fef3c7' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <RefreshCw size={24} className="text-amber-600" />
                    <span className="text-sm font-medium text-gray-600">Renewals</span>
                  </div>
                  <p className="text-3xl font-bold text-amber-600">
                    {renewalsThisWeek.length}
                  </p>
                  <p className="text-sm text-gray-500">due</p>
                </div>

                {/* Problems */}
                <div className="p-4 rounded-lg" style={{ backgroundColor: problemsThisWeek.length > 0 ? '#fee2e2' : '#f3f4f6' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={24} className={problemsThisWeek.length > 0 ? 'text-red-600' : 'text-gray-400'} />
                    <span className="text-sm font-medium text-gray-600">Problems</span>
                  </div>
                  <p className={`text-3xl font-bold ${problemsThisWeek.length > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                    {problemsThisWeek.length}
                  </p>
                  <p className="text-sm text-gray-500">flagged</p>
                </div>
              </div>
            </div>

            {/* Problems list if any */}
            {problemsThisWeek.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-bold mb-4 text-red-600 flex items-center gap-2">
                  <AlertTriangle size={20} />
                  Flagged Problems
                </h3>
                <div className="space-y-2">
                  {problemsThisWeek.map((entry, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-red-50 border border-red-200">
                      <p className="font-medium">{entry.clientName}</p>
                      <p className="text-sm text-gray-600">{formatDate(entry.date)} - {entry.problem}</p>
                      {entry.problemNotes && <p className="text-sm text-gray-500 mt-1">{entry.problemNotes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick links */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link
                to="/"
                className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-center"
              >
                <ChefHat size={32} className="mx-auto mb-2" style={{ color: '#3d59ab' }} />
                <p className="font-medium">Menu Planning</p>
              </Link>
              <Link
                to="/driver"
                className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-center"
              >
                <Truck size={32} className="mx-auto mb-2" style={{ color: '#3d59ab' }} />
                <p className="font-medium">Driver View</p>
              </Link>
              <button
                onClick={() => setActiveSection('tasks')}
                className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-center"
              >
                <ClipboardList size={32} className="mx-auto mb-2" style={{ color: '#3d59ab' }} />
                <p className="font-medium">Weekly Tasks</p>
              </button>
              <button
                onClick={() => setActiveSection('settings')}
                className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-center"
              >
                <Settings size={32} className="mx-auto mb-2" style={{ color: '#3d59ab' }} />
                <p className="font-medium">Settings</p>
              </button>
            </div>
          </div>
        )}

        {/* Tasks Section */}
        {activeSection === 'tasks' && (
          <div className="space-y-6">
            {/* Auto-generated tasks */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-4" style={{ color: '#3d59ab' }}>
                Weekly Tasks
              </h2>

              {autoTasks.length > 0 ? (
                <div className="space-y-4">
                  {autoTasks.map(task => (
                    <div
                      key={task.id}
                      className="border-l-4 p-4 rounded-r-lg"
                      style={{ borderColor: task.color, backgroundColor: '#f9f9ed' }}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <task.icon size={20} style={{ color: task.color }} />
                        <span className="text-xs font-medium px-2 py-1 rounded" style={{ backgroundColor: task.color + '20', color: task.color }}>
                          {task.category}
                        </span>
                      </div>
                      <h4 className="font-bold mb-2">{task.title}</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {task.details.slice(0, 5).map((detail, idx) => (
                          <li key={idx}>• {detail}</li>
                        ))}
                        {task.details.length > 5 && (
                          <li className="text-gray-400">...and {task.details.length - 5} more</li>
                        )}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Check size={48} className="mx-auto mb-4 text-green-500" />
                  <p>All caught up! No pending tasks this week.</p>
                </div>
              )}
            </div>

            {/* Custom tasks */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold mb-4" style={{ color: '#3d59ab' }}>
                Custom Tasks
              </h3>

              {/* Add task form */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 rounded-lg" style={{ backgroundColor: '#f9f9ed' }}>
                <FormField label="Task Title">
                  <input
                    type="text"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    placeholder="Enter task title"
                    className={inputStyle}
                    style={borderStyle}
                  />
                </FormField>
                <FormField label="Notes (optional)">
                  <input
                    type="text"
                    value={newTask.notes}
                    onChange={(e) => setNewTask({ ...newTask, notes: e.target.value })}
                    placeholder="Additional notes"
                    className={inputStyle}
                    style={borderStyle}
                  />
                </FormField>
                <FormField label="Due Date (optional)">
                  <input
                    type="date"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                    className={inputStyle}
                    style={borderStyle}
                  />
                </FormField>
              </div>
              <button
                onClick={addCustomTask}
                className="px-6 py-2 rounded-lg text-white mb-6"
                style={{ backgroundColor: '#3d59ab' }}
              >
                <Plus size={20} className="inline mr-2" />Add Task
              </button>

              {/* Custom tasks list */}
              {customTasks.length > 0 ? (
                <div className="space-y-2">
                  {customTasks.map(task => (
                    <div
                      key={task.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 ${
                        task.completed ? 'bg-gray-50 border-gray-200' : 'border-gray-200'
                      }`}
                    >
                      <button
                        onClick={() => toggleTaskComplete(task.id)}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          task.completed ? 'bg-green-500 border-green-500' : 'border-gray-300'
                        }`}
                      >
                        {task.completed && <Check size={14} className="text-white" />}
                      </button>
                      <div className="flex-1">
                        <p className={`font-medium ${task.completed ? 'line-through text-gray-400' : ''}`}>
                          {task.title}
                        </p>
                        {task.notes && (
                          <p className="text-sm text-gray-500">{task.notes}</p>
                        )}
                        {task.dueDate && (
                          <p className="text-xs text-gray-400 mt-1">
                            Due: {formatDate(task.dueDate)}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => deleteCustomTask(task.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No custom tasks. Add one above.</p>
              )}
            </div>
          </div>
        )}

        {/* Settings Section */}
        {activeSection === 'settings' && (
          <div className="space-y-6">
            {/* Availability Calendar */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-4" style={{ color: '#3d59ab' }}>
                <Calendar size={24} className="inline mr-2" />
                Availability Calendar
              </h2>
              <p className="text-gray-600 mb-4">
                Click dates to block them from client date selection.
              </p>

              {/* Month navigation */}
              <div className="flex items-center justify-between mb-4">
                <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded">
                  <ChevronLeft size={24} />
                </button>
                <h3 className="text-lg font-bold">
                  {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h3>
                <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded">
                  <ChevronRight size={24} />
                </button>
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1 mb-4">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                    {day}
                  </div>
                ))}
                {getDaysInMonth(calendarMonth).map((date, idx) => {
                  if (!date) return <div key={`empty-${idx}`} />;
                  const dateStr = date.toISOString().split('T')[0];
                  const isBlocked = blockedDates.includes(dateStr);
                  const isPast = date < new Date(today.toISOString().split('T')[0]);
                  const isToday = dateStr === today.toISOString().split('T')[0];

                  return (
                    <button
                      key={dateStr}
                      onClick={() => !isPast && toggleBlockedDate(date)}
                      disabled={isPast}
                      className={`p-2 rounded-lg text-center transition-colors ${
                        isPast
                          ? 'text-gray-300 cursor-not-allowed'
                          : isBlocked
                          ? 'bg-red-500 text-white hover:bg-red-600'
                          : isToday
                          ? 'bg-blue-100 hover:bg-blue-200'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>

              {blockedDates.length > 0 && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-sm font-medium text-red-700 mb-2">
                    {blockedDates.length} date{blockedDates.length > 1 ? 's' : ''} blocked:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {blockedDates.sort().map(date => (
                      <span
                        key={date}
                        className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 flex items-center gap-1"
                      >
                        {formatDate(date)}
                        <button onClick={() => updateBlockedDates(blockedDates.filter(d => d !== date))}>
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Route Starting Address */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-4" style={{ color: '#3d59ab' }}>
                <MapPin size={24} className="inline mr-2" />
                Route Starting Address
              </h2>
              <p className="text-gray-600 mb-4">
                Set the starting address for delivery route optimization.
              </p>
              <FormField label="Starting Address">
                <input
                  type="text"
                  value={adminSettings.routeStartAddress}
                  onChange={(e) => updateAdminSettings({ ...adminSettings, routeStartAddress: e.target.value })}
                  placeholder="Enter your starting address"
                  className={`${inputStyle} w-full`}
                  style={borderStyle}
                />
              </FormField>
            </div>

            {/* Drivers Management */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-4" style={{ color: '#3d59ab' }}>
                <Users size={24} className="inline mr-2" />
                Drivers
              </h2>

              {/* Add driver form */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 p-4 rounded-lg" style={{ backgroundColor: '#f9f9ed' }}>
                <FormField label="Driver Name">
                  <input
                    type="text"
                    value={newDriver.name}
                    onChange={(e) => setNewDriver({ ...newDriver, name: e.target.value })}
                    placeholder="Enter driver name"
                    className={inputStyle}
                    style={borderStyle}
                  />
                </FormField>
                <FormField label="Phone">
                  <input
                    type="tel"
                    value={newDriver.phone}
                    onChange={(e) => setNewDriver({ ...newDriver, phone: e.target.value })}
                    placeholder="Phone number"
                    className={inputStyle}
                    style={borderStyle}
                  />
                </FormField>
                <FormField label="Zone">
                  <select
                    value={newDriver.zone}
                    onChange={(e) => setNewDriver({ ...newDriver, zone: e.target.value })}
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
                    value={newDriver.accessCode}
                    onChange={(e) => setNewDriver({ ...newDriver, accessCode: e.target.value })}
                    placeholder="Access code"
                    className={inputStyle}
                    style={borderStyle}
                  />
                </FormField>
              </div>
              <button
                onClick={addDriver}
                className="px-6 py-2 rounded-lg text-white mb-6"
                style={{ backgroundColor: '#3d59ab' }}
              >
                <Plus size={20} className="inline mr-2" />Add Driver
              </button>

              {/* Drivers list */}
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
                              onClick={() => { setEditingDriverIndex(null); setEditingDriver(null); }}
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
                              <h3 className="font-bold text-lg">{driver.name}</h3>
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
          </div>
        )}
      </div>
    </div>
  );
}
