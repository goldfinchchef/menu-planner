import React, { useState } from 'react';
import { RefreshCw, Clock, Truck, CalendarOff, Pause, CheckSquare, DollarSign, Repeat, Package, MessageSquare } from 'lucide-react';

export default function SubscriptionsTab({ clients, weeklyTasks = {}, setWeeklyTasks }) {
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

  // Group clients by subscription status
  const groupedClients = {
    renewalsDue: [],
    gracePeriod: [],
    deliveringThisWeek: [],
    notThisWeek: [],
    paused: []
  };

  clients.forEach(client => {
    if (client.status === 'paused') {
      groupedClients.paused.push(client);
    } else if (client.status === 'active') {
      if (client.frequency === 'weekly') {
        groupedClients.deliveringThisWeek.push(client);
      } else if (client.frequency === 'biweekly') {
        const weekNumber = Math.floor(today.getTime() / (7 * 24 * 60 * 60 * 1000));
        if (weekNumber % 2 === 0) {
          groupedClients.deliveringThisWeek.push(client);
        } else {
          groupedClients.notThisWeek.push(client);
        }
      }
    }
  });

  const activeClients = groupedClients.deliveringThisWeek;

  // Task definitions grouped by category
  const taskGroups = [
    {
      key: 'billing',
      title: 'Billing & Renewals',
      icon: DollarSign,
      color: '#e74c3c',
      dueDay: 'Monday',
      tasks: [
        { key: 'invoicePrepared', label: 'Invoice prepared' },
        { key: 'invoicePaid', label: 'Invoice paid' }
      ]
    },
    {
      key: 'substitutions',
      title: 'Substitution Requests',
      icon: Repeat,
      color: '#f39c12',
      dueDay: 'Tuesday',
      tasks: [
        { key: 'substitutionsHandled', label: 'Substitutions handled' }
      ]
    },
    {
      key: 'deliveryPrep',
      title: 'Delivery Prep',
      icon: Package,
      color: '#27ae60',
      dueDay: 'Wednesday',
      tasks: [
        { key: 'datesSelected', label: 'Dates selected' },
        { key: 'menuSent', label: 'Menu sent' }
      ]
    },
    {
      key: 'followup',
      title: 'Bags Follow-up',
      icon: MessageSquare,
      color: '#9b59b6',
      dueDay: 'Thursday',
      tasks: [
        { key: 'reminderSent', label: 'Reminder sent' }
      ]
    }
  ];

  // Calculate progress for a task group
  const getGroupProgress = (group) => {
    let completed = 0;
    let total = 0;
    activeClients.forEach(client => {
      group.tasks.forEach(task => {
        total++;
        if (tasks[client.name]?.[task.key]) completed++;
      });
    });
    return { completed, total };
  };

  // Calculate overall progress
  const getOverallProgress = () => {
    let completed = 0;
    let total = 0;
    taskGroups.forEach(group => {
      const progress = getGroupProgress(group);
      completed += progress.completed;
      total += progress.total;
    });
    return { completed, total };
  };

  const overallProgress = getOverallProgress();

  const sections = [
    { key: 'renewalsDue', title: 'Renewals Due', icon: RefreshCw, color: '#e74c3c' },
    { key: 'gracePeriod', title: 'Grace Period', icon: Clock, color: '#f39c12' },
    { key: 'deliveringThisWeek', title: 'Delivering This Week', icon: Truck, color: '#27ae60' },
    { key: 'notThisWeek', title: 'Not This Week', icon: CalendarOff, color: '#7f8c8d' },
    { key: 'paused', title: 'Paused', icon: Pause, color: '#9b59b6' }
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
        <h2 className="text-2xl font-bold mb-2" style={{ color: '#3d59ab' }}>Subscriptions</h2>
        <p className="text-gray-600">Today is {dayOfWeek}</p>
      </div>

      {/* Weekly Tasks Section */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CheckSquare size={24} style={{ color: '#3d59ab' }} />
            <h3 className="text-xl font-bold" style={{ color: '#3d59ab' }}>Weekly Tasks</h3>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Week of {weekStartFormatted} - {weekEnd}</p>
            <p className="text-lg font-bold" style={{ color: overallProgress.completed === overallProgress.total && overallProgress.total > 0 ? '#27ae60' : '#3d59ab' }}>
              {overallProgress.completed} / {overallProgress.total} complete
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-3 mb-6">
          <div
            className="h-3 rounded-full transition-all duration-300"
            style={{
              width: `${overallProgress.total > 0 ? (overallProgress.completed / overallProgress.total) * 100 : 0}%`,
              backgroundColor: overallProgress.completed === overallProgress.total && overallProgress.total > 0 ? '#27ae60' : '#3d59ab'
            }}
          />
        </div>

        {activeClients.length === 0 ? (
          <p className="text-gray-500 italic">No active clients delivering this week</p>
        ) : (
          <div className="space-y-6">
            {taskGroups.map(group => {
              const progress = getGroupProgress(group);
              const Icon = group.icon;
              return (
                <div key={group.key} className="border-2 rounded-lg p-4" style={{ borderColor: group.color + '40' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Icon size={20} style={{ color: group.color }} />
                      <h4 className="font-bold" style={{ color: group.color }}>{group.title}</h4>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500">Due: {group.dueDay}</span>
                      <span
                        className="px-2 py-1 rounded text-sm font-medium"
                        style={{
                          backgroundColor: progress.completed === progress.total && progress.total > 0 ? '#e8f8f0' : group.color + '20',
                          color: progress.completed === progress.total && progress.total > 0 ? '#27ae60' : group.color
                        }}
                      >
                        {progress.completed}/{progress.total}
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 pr-4">Client</th>
                          {group.tasks.map(task => (
                            <th key={task.key} className="text-center py-2 px-2">{task.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {activeClients.map(client => (
                          <tr key={client.name} className="border-b border-gray-100">
                            <td className="py-2 pr-4 font-medium">{client.displayName || client.name}</td>
                            {group.tasks.map(task => (
                              <td key={task.key} className="text-center py-2 px-2">
                                <input
                                  type="checkbox"
                                  checked={tasks[client.name]?.[task.key] || false}
                                  onChange={(e) => updateTask(client.name, task.key, e.target.checked)}
                                  className="w-5 h-5 rounded cursor-pointer"
                                  style={{ accentColor: group.color }}
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Client Status Sections */}
      {sections.map(({ key, title, icon: Icon, color }) => (
        <div key={key} className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Icon size={24} style={{ color }} />
            <h3 className="text-xl font-bold" style={{ color }}>
              {title} ({groupedClients[key].length})
            </h3>
          </div>
          {groupedClients[key].length === 0 ? (
            <p className="text-gray-500 italic">No clients in this category</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {groupedClients[key].map((client, i) => (
                <ClientCard key={i} client={client} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
