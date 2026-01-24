import React, { useState } from 'react';
import { RefreshCw, Clock, Truck, CalendarOff, Pause, CheckSquare, DollarSign, Repeat, Package, MessageSquare, ExternalLink, Calendar, ChefHat, AlertTriangle } from 'lucide-react';

export default function SubscriptionsTab({ clients, weeklyTasks = {}, setWeeklyTasks, clientPortalData = {} }) {
  const today = new Date();
  const dayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' });

  // Get the Monday of current week as the week identifier
  const getWeekStart = () => {
    const d = new Date(today);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    return d.toISOString().split('T')[0];
  };

  const weekStart = getWeekStart();
  const weekEnd = new Date(new Date(weekStart).getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const weekStartFormatted = new Date(weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  // Local state fallback if no external state provided
  const [localTasks, setLocalTasks] = useState({});
  const tasks = weeklyTasks[weekStart] || localTasks;

  const updateTask = (clientName, taskKey, value) => {
    const updated = {
      ...tasks,
      [clientName]: {
        ...(tasks[clientName] || {}),
        [taskKey]: value
      }
    };
    if (setWeeklyTasks) {
      setWeeklyTasks({ ...weeklyTasks, [weekStart]: updated });
    } else {
      setLocalTasks(updated);
    }
  };

  const updateHoneybookLink = (clientName, link) => {
    updateTask(clientName, 'honeybookLink', link);
  };

  // Calculate week number for each client (simulating subscription week)
  const getClientWeekNumber = (client) => {
    // Use client start date if available, otherwise use a hash of their name
    const startDate = client.startDate ? new Date(client.startDate) : new Date(2024, 0, 1);
    const weeksSinceStart = Math.floor((today - startDate) / (7 * 24 * 60 * 60 * 1000));
    return (weeksSinceStart % 4) + 1; // Cycle through weeks 1-4
  };

  // Group clients
  const week4Clients = []; // Billing clients
  const deliveringThisWeek = []; // Menu planning clients
  const pausedClients = [];

  clients.forEach(client => {
    if (client.status === 'paused') {
      pausedClients.push(client);
    } else if (client.status === 'active') {
      const weekNum = getClientWeekNumber(client);
      if (weekNum === 4) {
        week4Clients.push({ ...client, weekNumber: weekNum });
      }

      // Check if delivering this week
      if (client.frequency === 'weekly') {
        deliveringThisWeek.push(client);
      } else if (client.frequency === 'biweekly') {
        const weekNumber = Math.floor(today.getTime() / (7 * 24 * 60 * 60 * 1000));
        if (weekNumber % 2 === 0) {
          deliveringThisWeek.push(client);
        }
      }
    }
  });

  // Get substitution requests from clientPortalData
  const substitutionRequests = [];
  Object.entries(clientPortalData).forEach(([clientName, data]) => {
    if (data.substitutionRequest) {
      const client = clients.find(c => c.name === clientName);
      substitutionRequests.push({
        clientName,
        displayName: client?.displayName || clientName,
        ...data.substitutionRequest
      });
    }
  });

  // Calculate progress
  const getBillingProgress = () => {
    let completed = 0;
    let total = week4Clients.length * 5; // 5 tasks per client
    week4Clients.forEach(client => {
      if (tasks[client.name]?.invoicePrepared) completed++;
      if (tasks[client.name]?.honeybookLink) completed++;
      if (tasks[client.name]?.reminderSent) completed++;
      if (tasks[client.name]?.invoicePaid) completed++;
      if (tasks[client.name]?.datesSelected) completed++;
    });
    return { completed, total };
  };

  const getMenuProgress = () => {
    let completed = 0;
    let total = deliveringThisWeek.length * 2; // 2 tasks per client
    deliveringThisWeek.forEach(client => {
      if (tasks[client.name]?.menusPlanned) completed++;
      if (tasks[client.name]?.menusSent) completed++;
    });
    return { completed, total };
  };

  const billingProgress = getBillingProgress();
  const menuProgress = getMenuProgress();
  const totalProgress = {
    completed: billingProgress.completed + menuProgress.completed + substitutionRequests.filter(r => tasks[r.clientName]?.substitutionHandled).length,
    total: billingProgress.total + menuProgress.total + substitutionRequests.length
  };

  const sections = [
    { key: 'deliveringThisWeek', title: 'Delivering This Week', icon: Truck, color: '#27ae60', clients: deliveringThisWeek },
    { key: 'paused', title: 'Paused', icon: Pause, color: '#9b59b6', clients: pausedClients }
  ];

  const ClientCard = ({ client }) => (
    <div className="border-2 rounded-lg p-3 bg-white" style={{ borderColor: '#ebb582' }}>
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-bold">{client.displayName || client.name}</h4>
          <p className="text-sm text-gray-600">
            {client.persons} persons • {client.mealsPerWeek} meals/week • {client.frequency}
          </p>
          {client.deliveryDay && (
            <p className="text-sm text-gray-500">Delivery: {client.deliveryDay}</p>
          )}
          {client.zone && (
            <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded bg-blue-100 text-blue-800">
              Zone {client.zone}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-2" style={{ color: '#3d59ab' }}>Weekly Tasks</h2>
        <div className="flex items-center justify-between">
          <p className="text-gray-600">Today is {dayOfWeek}</p>
          <div className="text-right">
            <p className="text-sm text-gray-500">Week of {weekStartFormatted} - {weekEnd}</p>
            <p className="text-lg font-bold" style={{ color: totalProgress.completed === totalProgress.total && totalProgress.total > 0 ? '#27ae60' : '#3d59ab' }}>
              {totalProgress.completed} / {totalProgress.total} complete
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-3 mt-4">
          <div
            className="h-3 rounded-full transition-all duration-300"
            style={{
              width: `${totalProgress.total > 0 ? (totalProgress.completed / totalProgress.total) * 100 : 0}%`,
              backgroundColor: totalProgress.completed === totalProgress.total && totalProgress.total > 0 ? '#27ae60' : '#3d59ab'
            }}
          />
        </div>
      </div>

      {/* Billing & Renewals Section */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <DollarSign size={24} style={{ color: '#e74c3c' }} />
            <h3 className="text-xl font-bold" style={{ color: '#e74c3c' }}>Billing & Renewals</h3>
          </div>
          <span
            className="px-3 py-1 rounded text-sm font-medium"
            style={{
              backgroundColor: billingProgress.completed === billingProgress.total && billingProgress.total > 0 ? '#e8f8f0' : '#fde8e8',
              color: billingProgress.completed === billingProgress.total && billingProgress.total > 0 ? '#27ae60' : '#e74c3c'
            }}
          >
            {billingProgress.completed}/{billingProgress.total}
          </span>
        </div>

        <p className="text-sm text-gray-600 mb-4">Week 4 clients due for renewal</p>

        {week4Clients.length === 0 ? (
          <p className="text-gray-500 italic">No clients in Week 4 this week</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4">Client</th>
                  <th className="text-center py-2 px-2">Invoice Prepared</th>
                  <th className="text-center py-2 px-2">Honeybook Link</th>
                  <th className="text-center py-2 px-2">Reminder Sent</th>
                  <th className="text-center py-2 px-2">Invoice Paid</th>
                  <th className="text-center py-2 px-2">Dates Selected</th>
                </tr>
              </thead>
              <tbody>
                {week4Clients.map(client => (
                  <tr key={client.name} className="border-b border-gray-100">
                    <td className="py-3 pr-4">
                      <p className="font-medium">{client.displayName || client.name}</p>
                      <p className="text-xs text-gray-500">{client.frequency}</p>
                    </td>
                    <td className="text-center py-3 px-2">
                      <input
                        type="checkbox"
                        checked={tasks[client.name]?.invoicePrepared || false}
                        onChange={(e) => updateTask(client.name, 'invoicePrepared', e.target.checked)}
                        className="w-5 h-5 rounded cursor-pointer"
                        style={{ accentColor: '#e74c3c' }}
                      />
                    </td>
                    <td className="text-center py-3 px-2">
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={tasks[client.name]?.honeybookLink || client.honeyBookLink || ''}
                          onChange={(e) => updateHoneybookLink(client.name, e.target.value)}
                          placeholder="Paste link..."
                          className="w-24 p-1 text-xs border rounded"
                        />
                        {(tasks[client.name]?.honeybookLink || client.honeyBookLink) && (
                          <a
                            href={tasks[client.name]?.honeybookLink || client.honeyBookLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600"
                          >
                            <ExternalLink size={14} />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="text-center py-3 px-2">
                      <input
                        type="checkbox"
                        checked={tasks[client.name]?.reminderSent || false}
                        onChange={(e) => updateTask(client.name, 'reminderSent', e.target.checked)}
                        className="w-5 h-5 rounded cursor-pointer"
                        style={{ accentColor: '#e74c3c' }}
                      />
                    </td>
                    <td className="text-center py-3 px-2">
                      <input
                        type="checkbox"
                        checked={tasks[client.name]?.invoicePaid || false}
                        onChange={(e) => updateTask(client.name, 'invoicePaid', e.target.checked)}
                        className="w-5 h-5 rounded cursor-pointer"
                        style={{ accentColor: '#27ae60' }}
                      />
                    </td>
                    <td className="text-center py-3 px-2">
                      <input
                        type="checkbox"
                        checked={tasks[client.name]?.datesSelected || false}
                        onChange={(e) => updateTask(client.name, 'datesSelected', e.target.checked)}
                        className="w-5 h-5 rounded cursor-pointer"
                        style={{ accentColor: '#3d59ab' }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Menu Planning Section */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ChefHat size={24} style={{ color: '#27ae60' }} />
            <h3 className="text-xl font-bold" style={{ color: '#27ae60' }}>Menu Planning</h3>
          </div>
          <span
            className="px-3 py-1 rounded text-sm font-medium"
            style={{
              backgroundColor: menuProgress.completed === menuProgress.total && menuProgress.total > 0 ? '#e8f8f0' : '#e8f8f0',
              color: menuProgress.completed === menuProgress.total && menuProgress.total > 0 ? '#27ae60' : '#27ae60'
            }}
          >
            {menuProgress.completed}/{menuProgress.total}
          </span>
        </div>

        <p className="text-sm text-gray-600 mb-4">Clients with deliveries this week</p>

        {deliveringThisWeek.length === 0 ? (
          <p className="text-gray-500 italic">No deliveries scheduled this week</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4">Client</th>
                  <th className="text-center py-2 px-2">Menus Planned</th>
                  <th className="text-center py-2 px-2">Menus Sent</th>
                </tr>
              </thead>
              <tbody>
                {deliveringThisWeek.map(client => (
                  <tr key={client.name} className="border-b border-gray-100">
                    <td className="py-3 pr-4">
                      <p className="font-medium">{client.displayName || client.name}</p>
                      <p className="text-xs text-gray-500">
                        {client.persons}p • {client.mealsPerWeek} meals • {client.deliveryDay || 'No day set'}
                      </p>
                    </td>
                    <td className="text-center py-3 px-2">
                      <input
                        type="checkbox"
                        checked={tasks[client.name]?.menusPlanned || false}
                        onChange={(e) => updateTask(client.name, 'menusPlanned', e.target.checked)}
                        className="w-5 h-5 rounded cursor-pointer"
                        style={{ accentColor: '#27ae60' }}
                      />
                    </td>
                    <td className="text-center py-3 px-2">
                      <input
                        type="checkbox"
                        checked={tasks[client.name]?.menusSent || false}
                        onChange={(e) => updateTask(client.name, 'menusSent', e.target.checked)}
                        className="w-5 h-5 rounded cursor-pointer"
                        style={{ accentColor: '#27ae60' }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Substitution Requests Section */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Repeat size={24} style={{ color: '#f39c12' }} />
            <h3 className="text-xl font-bold" style={{ color: '#f39c12' }}>Substitution Requests</h3>
          </div>
          {substitutionRequests.length > 0 && (
            <span
              className="px-3 py-1 rounded text-sm font-medium"
              style={{ backgroundColor: '#fef3c7', color: '#f39c12' }}
            >
              {substitutionRequests.filter(r => tasks[r.clientName]?.substitutionHandled).length}/{substitutionRequests.length}
            </span>
          )}
        </div>

        {substitutionRequests.length === 0 ? (
          <div className="text-center py-6">
            <Repeat size={32} className="mx-auto mb-2 text-gray-300" />
            <p className="text-gray-500 italic">No substitution requests this week</p>
          </div>
        ) : (
          <div className="space-y-3">
            {substitutionRequests.map((request, idx) => (
              <div
                key={idx}
                className={`border-2 rounded-lg p-4 ${tasks[request.clientName]?.substitutionHandled ? 'bg-green-50 border-green-200' : 'border-amber-200 bg-amber-50'}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-bold">{request.displayName}</h4>
                      {tasks[request.clientName]?.substitutionHandled && (
                        <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700">Handled</span>
                      )}
                    </div>
                    <div className="text-sm space-y-1">
                      <p><span className="text-gray-500">Instead of:</span> <span className="font-medium">{request.originalDish}</span></p>
                      <p><span className="text-gray-500">Requested:</span> <span className="font-medium">{request.requestedSubstitution}</span></p>
                      {request.submittedAt && (
                        <p className="text-xs text-gray-400">
                          Submitted: {new Date(request.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tasks[request.clientName]?.substitutionHandled || false}
                      onChange={(e) => updateTask(request.clientName, 'substitutionHandled', e.target.checked)}
                      className="w-5 h-5 rounded"
                      style={{ accentColor: '#27ae60' }}
                    />
                    <span className="text-sm">Handled</span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Client Status Sections */}
      {sections.map(({ key, title, icon: Icon, color, clients: sectionClients }) => (
        <div key={key} className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Icon size={24} style={{ color }} />
            <h3 className="text-xl font-bold" style={{ color }}>
              {title} ({sectionClients.length})
            </h3>
          </div>
          {sectionClients.length === 0 ? (
            <p className="text-gray-500 italic">No clients in this category</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {sectionClients.map((client, i) => (
                <ClientCard key={i} client={client} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
