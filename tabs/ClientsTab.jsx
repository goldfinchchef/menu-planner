import React, { useState } from 'react';
import { Plus, Trash2, Upload, Download, Edit2, Check, X, Link2, Minus, Users, User, ChevronDown, ChevronUp, Truck, MapPin, DollarSign, AlertCircle, Settings } from 'lucide-react';
import { ZONES, DAYS, DEFAULT_CONTACT, DEFAULT_NEW_SUBSCRIPTION } from '../constants';
import { isSupabaseMode } from '../lib/dataMode';
import { saveClientToSupabase } from '../lib/database';

// Extract city from address string
const extractCity = (address) => {
  if (!address) return null;
  // Try to match "City, State ZIP" or "City, State" pattern
  const match = address.match(/,\s*([^,]+),\s*[A-Z]{2}(?:\s+\d{5})?/i);
  if (match) return match[1].trim();
  // Fallback: split by comma and take second-to-last part
  const parts = address.split(',').map(p => p.trim());
  if (parts.length >= 2) return parts[parts.length - 2];
  return null;
};

const FormField = ({ label, children, compact }) => (
  <div className="flex flex-col">
    <label className={`text-sm font-medium ${compact ? 'mb-0.5' : 'mb-1'}`} style={{ color: '#423d3c' }}>{label}</label>
    {children}
  </div>
);

const inputStyle = "p-2 border-2 rounded-lg";
const inputStyleCompact = "px-2 py-1.5 border-2 rounded-lg text-sm";
const borderStyle = { borderColor: '#ebb582' };

// Accordion section for form organization
const AccordionSection = ({ title, icon: Icon, isOpen, onToggle, children, count }) => (
  <div className="border-t" style={{ borderColor: '#ebb582' }}>
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between py-2 hover:bg-gray-50"
    >
      <span className="flex items-center gap-2 font-medium text-sm" style={{ color: '#3d59ab' }}>
        {Icon && <Icon size={16} />}
        {title}
        {count !== undefined && (
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">{count}</span>
        )}
      </span>
      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
    </button>
    {isOpen && <div className="pb-3">{children}</div>}
  </div>
);

// Contact form component for reuse
const ContactForm = ({ contact, index, onChange, onRemove, canRemove }) => (
  <div className="p-4 rounded-lg border-2 relative" style={{ borderColor: '#d9a87a', backgroundColor: '#fff' }}>
    <div className="flex items-center justify-between mb-3">
      <span className="text-sm font-bold" style={{ color: '#3d59ab' }}>
        Contact {index + 1}
      </span>
      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="text-red-500 hover:text-red-700 p-1"
          title="Remove contact"
        >
          <Minus size={18} />
        </button>
      )}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <FormField label="Full Name">
        <input
          type="text"
          value={contact.fullName || ''}
          onChange={(e) => onChange(index, 'fullName', e.target.value)}
          placeholder="Full name"
          className={inputStyle}
          style={borderStyle}
        />
      </FormField>
      <FormField label="Display Name (for greetings)">
        <input
          type="text"
          value={contact.displayName || ''}
          onChange={(e) => onChange(index, 'displayName', e.target.value)}
          placeholder="e.g., Jennifer"
          className={inputStyle}
          style={borderStyle}
        />
      </FormField>
      <FormField label="Email">
        <input
          type="email"
          value={contact.email || ''}
          onChange={(e) => onChange(index, 'email', e.target.value)}
          placeholder="Email address"
          className={inputStyle}
          style={borderStyle}
        />
      </FormField>
      <FormField label="Phone">
        <input
          type="tel"
          value={contact.phone || ''}
          onChange={(e) => onChange(index, 'phone', e.target.value)}
          placeholder="Phone number"
          className={inputStyle}
          style={borderStyle}
        />
      </FormField>
      <div className="md:col-span-2">
        <FormField label="Delivery Address">
          <input
            type="text"
            value={contact.address || ''}
            onChange={(e) => onChange(index, 'address', e.target.value)}
            placeholder="Street address"
            className={inputStyle}
            style={borderStyle}
          />
        </FormField>
      </div>
    </div>
  </div>
);

// Compact Client Card Component
const ClientCard = ({ subscription, onEdit, onDelete, onCopyLink }) => {
  const contacts = subscription.contacts || [];
  const uniqueAddresses = [...new Set(contacts.filter(c => c.address).map(c => c.address.toLowerCase().trim()))];
  const primaryCity = extractCity(contacts[0]?.address);

  return (
    <div
      className={`border-2 rounded-lg p-3 flex flex-col h-full ${subscription.status === 'paused' ? 'opacity-70' : ''}`}
      style={{ borderColor: subscription.status === 'paused' ? '#9ca3af' : '#ebb582', backgroundColor: '#fff' }}
    >
      {/* Header: Name + Status */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-bold text-base leading-tight" style={{ color: '#3d59ab' }}>
          {subscription.displayName || 'Unnamed'}
        </h3>
        <div className="flex items-center gap-1 flex-shrink-0">
          {subscription.status === 'paused' ? (
            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-200 text-gray-600">Paused</span>
          ) : (
            <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700">Active</span>
          )}
          {subscription.pickup && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">Pickup</span>
          )}
        </div>
      </div>

      {/* Compact Info Grid */}
      <div className="text-sm text-gray-600 space-y-1 flex-1">
        {/* Portions & Meals */}
        <p className="font-medium">
          {subscription.portions} portions • {subscription.mealsPerWeek} meals
        </p>

        {/* Frequency & Day */}
        <p>
          {subscription.frequency === 'biweekly' ? 'Biweekly' : 'Weekly'}
          {subscription.deliveryDay && ` • ${subscription.deliveryDay}`}
        </p>

        {/* Zone & Location */}
        <p className="flex items-center gap-1">
          {subscription.zone && (
            <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#f0f0ff', color: '#3d59ab' }}>
              Zone {subscription.zone}
            </span>
          )}
          {primaryCity && (
            <span className="text-gray-500 flex items-center gap-0.5">
              <MapPin size={12} />{primaryCity}
            </span>
          )}
        </p>

        {/* Contacts & Stops Summary */}
        <p className="text-purple-600 text-xs">
          <Users size={12} className="inline mr-1" />
          {contacts.length} contact{contacts.length !== 1 ? 's' : ''} • {uniqueAddresses.length} stop{uniqueAddresses.length !== 1 ? 's' : ''}
        </p>

        {/* Dietary Notes (line-clamped) */}
        {subscription.dietaryRestrictions && (
          <p
            className="text-xs text-red-700 bg-red-50 px-1.5 py-1 rounded line-clamp-2"
            title={subscription.dietaryRestrictions}
          >
            {subscription.dietaryRestrictions}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 mt-2 pt-2 border-t" style={{ borderColor: '#ebb582' }}>
        <button
          onClick={onCopyLink}
          className="p-1.5 rounded hover:bg-purple-50 text-purple-600"
          title="Copy portal link"
        >
          <Link2 size={16} />
        </button>
        <button
          onClick={onEdit}
          className="p-1.5 rounded hover:bg-blue-50 text-blue-600"
          title="Edit"
        >
          <Edit2 size={16} />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded hover:bg-red-50 text-red-600"
          title="Delete"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};

// Helper to migrate old client format to new subscription format
const migrateToSubscription = (client) => {
  if (client.subscriptionId) {
    // Already in new format - ensure name is preserved
    return {
      ...client,
      name: client.name || client.displayName || ''
    };
  }

  // Migrate from old format
  const contacts = client.contacts && client.contacts.length > 0
    ? client.contacts.map(c => ({
        fullName: c.fullName || c.name || '',
        displayName: c.displayName || '',
        email: c.email || '',
        phone: c.phone || '',
        address: c.address || ''
      }))
    : [{
        fullName: client.name || '',
        displayName: '',
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || ''
      }];

  // Preserve both name and displayName for Supabase compatibility
  const clientName = client.name || client.displayName || '';

  return {
    subscriptionId: client.id || Date.now().toString(),
    name: clientName,  // Preserve for Supabase 'name' column
    displayName: client.displayName || client.name || '',
    portions: client.portions || client.persons || 1,
    mealsPerWeek: client.mealsPerWeek || 0,
    frequency: client.frequency || 'weekly',
    status: client.status || 'active',
    zone: client.zone || '',
    deliveryDay: client.deliveryDay || '',
    pickup: client.pickup || false,
    planPrice: client.planPrice || 0,
    serviceFee: client.serviceFee || 0,
    prepayDiscount: client.prepayDiscount || false,
    newClientFeePaid: client.newClientFeePaid || false,
    paysOwnGroceries: client.paysOwnGroceries || false,
    billingNotes: client.billingNotes || '',
    accessCode: client.accessCode || '',
    honeyBookLink: client.honeyBookLink || '',
    dietaryRestrictions: client.dietaryRestrictions || '',
    contacts
  };
};

export default function ClientsTab({
  clients,
  newClient,
  setNewClient,
  addClient,
  deleteClient,
  clientsFileRef,
  exportClientsCSV,
  setClients,
  deliveryLog = [],
  orderHistory = []
}) {
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingClient, setEditingClient] = useState(null);
  const [expandedDeliveries, setExpandedDeliveries] = useState({});
  const [showPausedClients, setShowPausedClients] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addFormSections, setAddFormSections] = useState({
    basicInfo: true,
    contacts: false,
    pricing: false,
    dietary: false
  });

  const toggleAddFormSection = (section) => {
    setAddFormSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Wrapper for addClient that collapses form on success
  const handleAddClient = () => {
    addClient();
    // Check if form should close (if addClient was successful, newClient will be reset)
    // We'll close it optimistically - the parent handles validation
    setShowAddForm(false);
    setAddFormSections({ basicInfo: true, contacts: false, pricing: false, dietary: false });
  };

  // Toggle delivery history visibility for a client
  const toggleDeliveryHistory = (subscriptionId) => {
    setExpandedDeliveries(prev => ({
      ...prev,
      [subscriptionId]: !prev[subscriptionId]
    }));
  };

  // Get recent deliveries for a client (from both deliveryLog and orderHistory)
  const getRecentDeliveries = (clientName) => {
    // Combine deliveries from deliveryLog and orderHistory
    const fromLog = deliveryLog
      .filter(entry => entry.clientName === clientName)
      .map(entry => ({
        date: entry.date,
        dishes: [],
        status: entry.problem ? 'problem' : 'delivered',
        problem: entry.problem,
        bagsReturned: entry.bagsReturned,
        source: 'log'
      }));

    const fromHistory = orderHistory
      .filter(order => order.clientName === clientName)
      .map(order => ({
        date: order.date,
        dishes: order.dishes || [],
        status: 'completed',
        source: 'history'
      }));

    // Combine and dedupe by date, preferring history entries (they have dishes)
    const combined = {};
    [...fromLog, ...fromHistory].forEach(entry => {
      if (!combined[entry.date] || entry.dishes.length > 0) {
        combined[entry.date] = entry;
      }
    });

    // Sort by date descending and take last 4
    return Object.values(combined)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 4);
  };

  // Ensure subscription has contacts array
  const ensureContacts = (subscription) => {
    if (subscription.contacts && subscription.contacts.length > 0) {
      return subscription.contacts;
    }
    return [{ ...DEFAULT_CONTACT }];
  };

  const startEditing = (index) => {
    const subscription = migrateToSubscription(clients[index]);
    setEditingIndex(index);
    setEditingClient({
      ...subscription,
      contacts: ensureContacts(subscription)
    });
  };

  const cancelEditing = () => {
    setEditingIndex(null);
    setEditingClient(null);
  };

  const saveEditing = async () => {
    // Validate that we have a name (from name or displayName)
    const clientName = editingClient?.name || editingClient?.displayName;
    if (!clientName || clientName.trim() === '') {
      alert('Client name is required');
      return;
    }

    // Ensure name is set for Supabase (it uses 'name' column)
    const clientToSave = {
      ...editingClient,
      name: clientName.trim()
    };

    if (isSupabaseMode()) {
      const result = await saveClientToSupabase(clientToSave);
      if (result.success) {
        setClients(result.clients);
        setEditingIndex(null);
        setEditingClient(null);
      } else {
        alert(`Save failed: ${result.error}`);
      }
    } else {
      const updated = [...clients];
      updated[editingIndex] = clientToSave;
      setClients(updated);
      setEditingIndex(null);
      setEditingClient(null);
    }
  };

  // Contact management for new subscription
  const updateNewContact = (index, field, value) => {
    const contacts = [...(newClient.contacts || [{ ...DEFAULT_CONTACT }])];
    contacts[index] = { ...contacts[index], [field]: value };
    setNewClient({ ...newClient, contacts });
  };

  const addNewContact = () => {
    const contacts = [...(newClient.contacts || []), { ...DEFAULT_CONTACT }];
    setNewClient({ ...newClient, contacts });
  };

  const removeNewContact = (index) => {
    const contacts = (newClient.contacts || []).filter((_, i) => i !== index);
    setNewClient({ ...newClient, contacts });
  };

  // Contact management for editing subscription
  const updateEditingContact = (index, field, value) => {
    const contacts = [...editingClient.contacts];
    contacts[index] = { ...contacts[index], [field]: value };
    setEditingClient({ ...editingClient, contacts });
  };

  const addEditingContact = () => {
    const contacts = [...editingClient.contacts, { ...DEFAULT_CONTACT }];
    setEditingClient({ ...editingClient, contacts });
  };

  const removeEditingContact = (index) => {
    const contacts = editingClient.contacts.filter((_, i) => i !== index);
    setEditingClient({ ...editingClient, contacts });
  };

  const getClientPortalUrl = (subscription) => {
    const slug = (subscription.subscriptionId || subscription.displayName || subscription.name || '')
      .toString().toLowerCase().replace(/\s+/g, '-');
    return `${window.location.origin}/client/${slug}`;
  };

  const copyPortalLink = (subscription) => {
    const url = getClientPortalUrl(subscription);
    navigator.clipboard.writeText(url).then(() => {
      alert(`Portal link copied!\n${url}`);
    }).catch(() => {
      prompt('Copy this link:', url);
    });
  };

  // Get summary info for a subscription's contacts
  const getContactsSummary = (subscription) => {
    const contacts = ensureContacts(migrateToSubscription(subscription));
    const addresses = [...new Set(contacts.filter(c => c.address).map(c => c.address.toLowerCase().trim()))];
    return {
      count: contacts.length,
      uniqueAddresses: addresses.length,
      contacts,
      primaryContact: contacts[0]
    };
  };

  // Custom CSV export with new structure
  const handleExportCSV = () => {
    const headers = [
      'subscriptionId', 'subscriptionDisplayName', 'portions', 'mealsPerWeek', 'frequency',
      'status', 'zone', 'deliveryDay', 'pickup', 'planPrice', 'serviceFee',
      'prepayDiscount', 'newClientFeePaid', 'paysOwnGroceries', 'billingNotes', 'dietaryRestrictions', 'accessCode',
      'contactFullName', 'contactDisplayName', 'email', 'phone', 'address'
    ];

    const rows = [];
    clients.forEach(client => {
      const sub = migrateToSubscription(client);
      const contacts = ensureContacts(sub);

      contacts.forEach((contact, idx) => {
        rows.push([
          idx === 0 ? sub.subscriptionId : '',
          idx === 0 ? sub.displayName : '',
          idx === 0 ? sub.portions : '',
          idx === 0 ? sub.mealsPerWeek : '',
          idx === 0 ? sub.frequency : '',
          idx === 0 ? sub.status : '',
          idx === 0 ? sub.zone : '',
          idx === 0 ? sub.deliveryDay : '',
          idx === 0 ? sub.pickup : '',
          idx === 0 ? sub.planPrice : '',
          idx === 0 ? sub.serviceFee : '',
          idx === 0 ? sub.prepayDiscount : '',
          idx === 0 ? sub.newClientFeePaid : '',
          idx === 0 ? sub.paysOwnGroceries : '',
          idx === 0 ? sub.billingNotes : '',
          idx === 0 ? sub.dietaryRestrictions : '',
          idx === 0 ? sub.accessCode : '',
          contact.fullName || '',
          contact.displayName || '',
          contact.email || '',
          contact.phone || '',
          contact.address || ''
        ].map(v => `"${(v || '').toString().replace(/"/g, '""')}"`).join(','));
      });
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'subscriptions.csv';
    a.click();
  };

  return (
    <div className="space-y-4">
      {/* Page Header with Import/Export */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold" style={{ color: '#3d59ab' }}>Clients</h1>
        <div className="flex gap-2">
          <button
            onClick={() => clientsFileRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 text-sm"
            style={{ borderColor: '#3d59ab', color: '#3d59ab' }}
          >
            <Upload size={16} />Import
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-sm"
            style={{ backgroundColor: '#3d59ab' }}
          >
            <Download size={16} />Export
          </button>
        </div>
      </div>

      {/* Collapsible Add Subscription Form */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
        >
          <span className="flex items-center gap-2 font-bold" style={{ color: '#3d59ab' }}>
            <Plus size={20} />
            Add Subscription
          </span>
          {showAddForm ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        {showAddForm && (
          <div className="px-4 pb-4 border-t" style={{ borderColor: '#ebb582' }}>
            {/* Basic Info Section - Open by default */}
            <AccordionSection
              title="Basic Info"
              icon={Settings}
              isOpen={addFormSections.basicInfo}
              onToggle={() => toggleAddFormSection('basicInfo')}
            >
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                <FormField label="Name" compact>
                  <input
                    type="text"
                    value={newClient.displayName || ''}
                    onChange={(e) => setNewClient({ ...newClient, displayName: e.target.value })}
                    placeholder="e.g., J.J. and Lauren"
                    className={inputStyleCompact}
                    style={borderStyle}
                  />
                </FormField>
                <FormField label="Portions" compact>
                  <input
                    type="number"
                    value={newClient.portions || 1}
                    onChange={(e) => setNewClient({ ...newClient, portions: parseInt(e.target.value) || 1 })}
                    className={inputStyleCompact}
                    style={borderStyle}
                  />
                </FormField>
                <FormField label="Meals/Week" compact>
                  <input
                    type="number"
                    value={newClient.mealsPerWeek || 0}
                    onChange={(e) => setNewClient({ ...newClient, mealsPerWeek: parseInt(e.target.value) || 0 })}
                    className={inputStyleCompact}
                    style={borderStyle}
                  />
                </FormField>
                <FormField label="Zone" compact>
                  <select
                    value={newClient.zone || ''}
                    onChange={(e) => setNewClient({ ...newClient, zone: e.target.value })}
                    className={inputStyleCompact}
                    style={borderStyle}
                  >
                    <option value="">Unassigned</option>
                    {ZONES.map(z => <option key={z} value={z}>Zone {z}</option>)}
                  </select>
                </FormField>
                <FormField label="Delivery Day" compact>
                  <select
                    value={newClient.deliveryDay || ''}
                    onChange={(e) => setNewClient({ ...newClient, deliveryDay: e.target.value })}
                    className={inputStyleCompact}
                    style={borderStyle}
                  >
                    <option value="">Select day</option>
                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </FormField>
                <FormField label="Frequency" compact>
                  <select
                    value={newClient.frequency || 'weekly'}
                    onChange={(e) => setNewClient({ ...newClient, frequency: e.target.value })}
                    className={inputStyleCompact}
                    style={borderStyle}
                  >
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Biweekly</option>
                  </select>
                </FormField>
                <FormField label="Status" compact>
                  <select
                    value={newClient.status || 'active'}
                    onChange={(e) => setNewClient({ ...newClient, status: e.target.value })}
                    className={inputStyleCompact}
                    style={borderStyle}
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                  </select>
                </FormField>
                <FormField label="Menu Selection" compact>
                  <select
                    value={newClient.chefChoice === false ? 'client' : 'chef'}
                    onChange={(e) => setNewClient({ ...newClient, chefChoice: e.target.value === 'chef' })}
                    className={inputStyleCompact}
                    style={borderStyle}
                  >
                    <option value="chef">Chef Choice</option>
                    <option value="client">Client Picks</option>
                  </select>
                </FormField>
              </div>
              <div className="flex items-center gap-4 mt-2">
                <label className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={newClient.pickup || false}
                    onChange={(e) => setNewClient({ ...newClient, pickup: e.target.checked, serviceFee: e.target.checked ? 0 : newClient.serviceFee })}
                    className="w-4 h-4 rounded"
                    style={{ accentColor: '#3d59ab' }}
                  />
                  Pickup
                </label>
                <FormField label="Access Code" compact>
                  <input
                    type="text"
                    value={newClient.accessCode || ''}
                    onChange={(e) => setNewClient({ ...newClient, accessCode: e.target.value })}
                    placeholder="Optional"
                    className={inputStyleCompact + " w-32"}
                    style={borderStyle}
                  />
                </FormField>
              </div>
            </AccordionSection>

            {/* Contacts Section */}
            <AccordionSection
              title="Contacts"
              icon={Users}
              isOpen={addFormSections.contacts}
              onToggle={() => toggleAddFormSection('contacts')}
              count={(newClient.contacts || []).length || 1}
            >
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs text-gray-500">
                  Each contact receives notifications. Different addresses = separate stops.
                </p>
                <button
                  type="button"
                  onClick={addNewContact}
                  className="flex items-center gap-1 px-2 py-1 rounded text-white text-xs"
                  style={{ backgroundColor: '#3d59ab' }}
                >
                  <Plus size={14} />Add
                </button>
              </div>
              <div className="space-y-3">
                {(newClient.contacts || [{ ...DEFAULT_CONTACT }]).map((contact, idx) => (
                  <div key={idx} className="p-3 rounded-lg border" style={{ borderColor: '#d9a87a', backgroundColor: '#fff' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold" style={{ color: '#3d59ab' }}>Contact {idx + 1}</span>
                      {(newClient.contacts || []).length > 1 && (
                        <button onClick={() => removeNewContact(idx)} className="text-red-500 hover:text-red-700">
                          <Minus size={14} />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <FormField label="Full Name" compact>
                        <input
                          type="text"
                          value={contact.fullName || ''}
                          onChange={(e) => updateNewContact(idx, 'fullName', e.target.value)}
                          className={inputStyleCompact}
                          style={borderStyle}
                        />
                      </FormField>
                      <FormField label="Display Name" compact>
                        <input
                          type="text"
                          value={contact.displayName || ''}
                          onChange={(e) => updateNewContact(idx, 'displayName', e.target.value)}
                          placeholder="e.g., Jennifer"
                          className={inputStyleCompact}
                          style={borderStyle}
                        />
                      </FormField>
                      <FormField label="Email" compact>
                        <input
                          type="email"
                          value={contact.email || ''}
                          onChange={(e) => updateNewContact(idx, 'email', e.target.value)}
                          className={inputStyleCompact}
                          style={borderStyle}
                        />
                      </FormField>
                      <FormField label="Phone" compact>
                        <input
                          type="tel"
                          value={contact.phone || ''}
                          onChange={(e) => updateNewContact(idx, 'phone', e.target.value)}
                          className={inputStyleCompact}
                          style={borderStyle}
                        />
                      </FormField>
                      <div className="col-span-2 md:col-span-4">
                        <FormField label="Delivery Address" compact>
                          <input
                            type="text"
                            value={contact.address || ''}
                            onChange={(e) => updateNewContact(idx, 'address', e.target.value)}
                            className={inputStyleCompact + " w-full"}
                            style={borderStyle}
                          />
                        </FormField>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </AccordionSection>

            {/* Pricing & Billing Section */}
            <AccordionSection
              title="Pricing & Billing"
              icon={DollarSign}
              isOpen={addFormSections.pricing}
              onToggle={() => toggleAddFormSection('pricing')}
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <FormField label="Plan Price ($)" compact>
                  <input
                    type="number"
                    step="0.01"
                    value={newClient.planPrice || 0}
                    onChange={(e) => setNewClient({ ...newClient, planPrice: parseFloat(e.target.value) || 0 })}
                    className={inputStyleCompact}
                    style={borderStyle}
                  />
                </FormField>
                <FormField label="Service Fee ($)" compact>
                  <input
                    type="number"
                    step="0.01"
                    value={newClient.pickup ? 0 : (newClient.serviceFee || 0)}
                    onChange={(e) => setNewClient({ ...newClient, serviceFee: parseFloat(e.target.value) || 0 })}
                    className={inputStyleCompact}
                    style={borderStyle}
                    disabled={newClient.pickup}
                  />
                </FormField>
                <label className="flex items-center gap-1.5 text-sm pt-5">
                  <input
                    type="checkbox"
                    checked={newClient.prepayDiscount || false}
                    onChange={(e) => setNewClient({ ...newClient, prepayDiscount: e.target.checked })}
                    className="w-4 h-4 rounded"
                    style={{ accentColor: '#3d59ab' }}
                  />
                  Pre-pay (10% off)
                </label>
                <label className="flex items-center gap-1.5 text-sm pt-5">
                  <input
                    type="checkbox"
                    checked={newClient.paysOwnGroceries || false}
                    onChange={(e) => setNewClient({ ...newClient, paysOwnGroceries: e.target.checked })}
                    className="w-4 h-4 rounded"
                    style={{ accentColor: '#3d59ab' }}
                  />
                  Pays Own Groceries
                </label>
              </div>
              <div className="mt-2">
                <FormField label="Billing Notes" compact>
                  <textarea
                    value={newClient.billingNotes || ''}
                    onChange={(e) => setNewClient({ ...newClient, billingNotes: e.target.value })}
                    placeholder="Any billing notes"
                    className={inputStyleCompact + " w-full"}
                    style={borderStyle}
                    rows="2"
                  />
                </FormField>
              </div>
            </AccordionSection>

            {/* Dietary Notes Section */}
            <AccordionSection
              title="Dietary Notes"
              icon={AlertCircle}
              isOpen={addFormSections.dietary}
              onToggle={() => toggleAddFormSection('dietary')}
            >
              <FormField label="Dietary Restrictions & Preferences" compact>
                <textarea
                  value={newClient.dietaryRestrictions || ''}
                  onChange={(e) => setNewClient({ ...newClient, dietaryRestrictions: e.target.value })}
                  placeholder="Allergies, preferences, dietary needs..."
                  className={inputStyleCompact + " w-full"}
                  style={borderStyle}
                  rows="2"
                />
              </FormField>
            </AccordionSection>

            {/* Submit Button */}
            <div className="pt-3 border-t mt-2" style={{ borderColor: '#ebb582' }}>
              <button
                onClick={handleAddClient}
                className="px-4 py-2 rounded-lg text-white text-sm font-medium"
                style={{ backgroundColor: '#3d59ab' }}
              >
                <Plus size={16} className="inline mr-1" />Add Subscription
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Active Clients Section */}
      {(() => {
        const activeClients = clients
          .map((c, i) => ({ ...migrateToSubscription(c), originalIndex: i }))
          .filter(c => c.status !== 'paused');
        const pausedClients = clients
          .map((c, i) => ({ ...migrateToSubscription(c), originalIndex: i }))
          .filter(c => c.status === 'paused');

        return (
          <>
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-4" style={{ color: '#3d59ab' }}>
                Active Clients ({activeClients.length})
              </h2>

              {/* Edit Modal (full width, above grid when editing) */}
              {editingIndex !== null && clients[editingIndex]?.status !== 'paused' && (
                <div className="border-2 rounded-lg p-4 mb-4" style={{ borderColor: '#3d59ab', backgroundColor: '#f9f9ed' }}>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <FormField label="Subscription Name">
                      <input
                        type="text"
                        value={editingClient.displayName || ''}
                        onChange={(e) => setEditingClient({ ...editingClient, displayName: e.target.value })}
                        className={inputStyle}
                        style={borderStyle}
                      />
                    </FormField>
                    <FormField label="Portions">
                      <input
                        type="number"
                        value={editingClient.portions || 1}
                        onChange={(e) => setEditingClient({ ...editingClient, portions: parseInt(e.target.value) || 1 })}
                        className={inputStyle}
                        style={borderStyle}
                      />
                    </FormField>
                    <FormField label="Meals per Week">
                      <input
                        type="number"
                        value={editingClient.mealsPerWeek || 0}
                        onChange={(e) => setEditingClient({ ...editingClient, mealsPerWeek: parseInt(e.target.value) || 0 })}
                        className={inputStyle}
                        style={borderStyle}
                      />
                    </FormField>
                    <FormField label="Zone">
                      <select
                        value={editingClient.zone || ''}
                        onChange={(e) => setEditingClient({ ...editingClient, zone: e.target.value })}
                        className={inputStyle}
                        style={borderStyle}
                      >
                        <option value="">Unassigned</option>
                        {ZONES.map(z => <option key={z} value={z}>Zone {z}</option>)}
                      </select>
                    </FormField>
                    <FormField label="Delivery Day">
                      <select
                        value={editingClient.deliveryDay || ''}
                        onChange={(e) => setEditingClient({ ...editingClient, deliveryDay: e.target.value })}
                        className={inputStyle}
                        style={borderStyle}
                      >
                        <option value="">Select day</option>
                        {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </FormField>
                    <FormField label="Frequency">
                      <select
                        value={editingClient.frequency || 'weekly'}
                        onChange={(e) => setEditingClient({ ...editingClient, frequency: e.target.value })}
                        className={inputStyle}
                        style={borderStyle}
                      >
                        <option value="weekly">Weekly</option>
                        <option value="biweekly">Biweekly</option>
                      </select>
                    </FormField>
                    <FormField label="Status">
                      <select
                        value={editingClient.status || 'active'}
                        onChange={(e) => setEditingClient({ ...editingClient, status: e.target.value })}
                        className={inputStyle}
                        style={borderStyle}
                      >
                        <option value="active">Active</option>
                        <option value="paused">Paused</option>
                      </select>
                    </FormField>
                    <FormField label="Access Code">
                      <input
                        type="text"
                        value={editingClient.accessCode || ''}
                        onChange={(e) => setEditingClient({ ...editingClient, accessCode: e.target.value })}
                        className={inputStyle}
                        style={borderStyle}
                      />
                    </FormField>
                    <div className="flex items-center gap-2 pt-6">
                      <input
                        type="checkbox"
                        id={`pickup-edit-${editingIndex}`}
                        checked={editingClient.pickup || false}
                        onChange={(e) => setEditingClient({ ...editingClient, pickup: e.target.checked, serviceFee: e.target.checked ? 0 : editingClient.serviceFee })}
                        className="w-5 h-5 rounded border-2"
                        style={{ accentColor: '#3d59ab' }}
                      />
                      <label htmlFor={`pickup-edit-${editingIndex}`} className="text-sm font-medium" style={{ color: '#423d3c' }}>
                        Pickup
                      </label>
                    </div>
                    <FormField label="Menu Selection">
                      <select
                        value={editingClient.chefChoice === false ? 'client' : 'chef'}
                        onChange={(e) => setEditingClient({ ...editingClient, chefChoice: e.target.value === 'chef' })}
                        className={inputStyle}
                        style={borderStyle}
                      >
                        <option value="chef">Chef Choice (Chef Paula picks)</option>
                        <option value="client">Client Picks (Client selects dishes)</option>
                      </select>
                    </FormField>
                  </div>

                  {/* Contacts Section for Edit */}
                  <div className="mt-4 pt-4 border-t-2" style={{ borderColor: '#ebb582' }}>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-md font-bold flex items-center gap-2" style={{ color: '#3d59ab' }}>
                        <Users size={18} />
                        Contacts ({editingClient.contacts?.length || 1})
                      </h4>
                      <button
                        type="button"
                        onClick={addEditingContact}
                        className="flex items-center gap-1 px-3 py-1 rounded-lg text-white text-sm"
                        style={{ backgroundColor: '#3d59ab' }}
                      >
                        <Plus size={16} />Add Contact
                      </button>
                    </div>
                    <div className="space-y-4">
                      {(editingClient.contacts || []).map((contact, idx) => (
                        <ContactForm
                          key={idx}
                          contact={contact}
                          index={idx}
                          onChange={updateEditingContact}
                          onRemove={() => removeEditingContact(idx)}
                          canRemove={editingClient.contacts.length > 1}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Pricing Section for Edit */}
                  <div className="mt-4 pt-4 border-t-2" style={{ borderColor: '#ebb582' }}>
                    <h4 className="text-md font-bold mb-3" style={{ color: '#3d59ab' }}>Pricing</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <FormField label="Plan Price ($)">
                        <input
                          type="number"
                          step="0.01"
                          value={editingClient.planPrice || 0}
                          onChange={(e) => setEditingClient({ ...editingClient, planPrice: parseFloat(e.target.value) || 0 })}
                          className={inputStyle}
                          style={borderStyle}
                        />
                      </FormField>
                      <FormField label="Service Fee ($)">
                        <input
                          type="number"
                          step="0.01"
                          value={editingClient.pickup ? 0 : (editingClient.serviceFee || 0)}
                          onChange={(e) => setEditingClient({ ...editingClient, serviceFee: parseFloat(e.target.value) || 0 })}
                          className={inputStyle}
                          style={borderStyle}
                          disabled={editingClient.pickup}
                        />
                      </FormField>
                      <div className="flex items-center gap-2 pt-6">
                        <input
                          type="checkbox"
                          id={`prepayDiscount-edit-${editingIndex}`}
                          checked={editingClient.prepayDiscount || false}
                          onChange={(e) => setEditingClient({ ...editingClient, prepayDiscount: e.target.checked })}
                          className="w-5 h-5 rounded border-2"
                          style={{ accentColor: '#3d59ab' }}
                        />
                        <label htmlFor={`prepayDiscount-edit-${editingIndex}`} className="text-sm font-medium" style={{ color: '#423d3c' }}>
                          Pre-pay (10% off)
                        </label>
                      </div>
                      <div className="flex items-center gap-2 pt-6">
                        <input
                          type="checkbox"
                          id={`paysOwnGroceries-edit-${editingIndex}`}
                          checked={editingClient.paysOwnGroceries || false}
                          onChange={(e) => setEditingClient({ ...editingClient, paysOwnGroceries: e.target.checked })}
                          className="w-5 h-5 rounded border-2"
                          style={{ accentColor: '#3d59ab' }}
                        />
                        <label htmlFor={`paysOwnGroceries-edit-${editingIndex}`} className="text-sm font-medium" style={{ color: '#423d3c' }}>
                          Pays Own Groceries
                        </label>
                      </div>
                    </div>
                    <div className="mt-4">
                      <FormField label="Billing Notes">
                        <textarea
                          value={editingClient.billingNotes || ''}
                          onChange={(e) => setEditingClient({ ...editingClient, billingNotes: e.target.value })}
                          className={inputStyle + " w-full"}
                          style={borderStyle}
                          rows="2"
                        />
                      </FormField>
                    </div>
                    <div className="mt-4">
                      <FormField label="Dietary Restrictions">
                        <textarea
                          value={editingClient.dietaryRestrictions || ''}
                          onChange={(e) => setEditingClient({ ...editingClient, dietaryRestrictions: e.target.value })}
                          placeholder="Allergies, preferences, dietary needs..."
                          className={inputStyle + " w-full"}
                          style={borderStyle}
                          rows="2"
                        />
                      </FormField>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={saveEditing}
                      className="flex items-center gap-1 px-4 py-2 rounded-lg text-white"
                      style={{ backgroundColor: '#3d59ab' }}
                    >
                      <Check size={18} />Save
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="flex items-center gap-1 px-4 py-2 rounded-lg bg-gray-200"
                    >
                      <X size={18} />Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Active Clients Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeClients.map((subscription) => (
                  editingIndex !== subscription.originalIndex && (
                    <ClientCard
                      key={subscription.subscriptionId || subscription.originalIndex}
                      subscription={subscription}
                      onEdit={() => startEditing(subscription.originalIndex)}
                      onDelete={() => deleteClient(subscription.originalIndex)}
                      onCopyLink={() => copyPortalLink(subscription)}
                    />
                  )
                ))}
              </div>

              {activeClients.length === 0 && (
                <p className="text-gray-500 text-center py-8">No active clients</p>
              )}
            </div>

            {/* Paused Clients Section */}
            {pausedClients.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <button
                  onClick={() => setShowPausedClients(!showPausedClients)}
                  className="flex items-center justify-between w-full"
                >
                  <h2 className="text-xl font-bold" style={{ color: '#6b7280' }}>
                    Paused Clients ({pausedClients.length})
                  </h2>
                  {showPausedClients ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>

                {showPausedClients && (
                  <>
                    {/* Edit Modal for Paused Clients */}
                    {editingIndex !== null && clients[editingIndex]?.status === 'paused' && (
                      <div className="border-2 rounded-lg p-4 mt-4 mb-4" style={{ borderColor: '#9ca3af', backgroundColor: '#f9f9ed' }}>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <FormField label="Subscription Name">
                            <input
                              type="text"
                              value={editingClient.displayName || ''}
                              onChange={(e) => setEditingClient({ ...editingClient, displayName: e.target.value })}
                              className={inputStyle}
                              style={borderStyle}
                            />
                          </FormField>
                          <FormField label="Status">
                            <select
                              value={editingClient.status || 'paused'}
                              onChange={(e) => setEditingClient({ ...editingClient, status: e.target.value })}
                              className={inputStyle}
                              style={borderStyle}
                            >
                              <option value="active">Active</option>
                              <option value="paused">Paused</option>
                            </select>
                          </FormField>
                          <FormField label="Portions">
                            <input
                              type="number"
                              value={editingClient.portions || 1}
                              onChange={(e) => setEditingClient({ ...editingClient, portions: parseInt(e.target.value) || 1 })}
                              className={inputStyle}
                              style={borderStyle}
                            />
                          </FormField>
                          <FormField label="Meals per Week">
                            <input
                              type="number"
                              value={editingClient.mealsPerWeek || 0}
                              onChange={(e) => setEditingClient({ ...editingClient, mealsPerWeek: parseInt(e.target.value) || 0 })}
                              className={inputStyle}
                              style={borderStyle}
                            />
                          </FormField>
                          <FormField label="Zone">
                            <select
                              value={editingClient.zone || ''}
                              onChange={(e) => setEditingClient({ ...editingClient, zone: e.target.value })}
                              className={inputStyle}
                              style={borderStyle}
                            >
                              <option value="">Unassigned</option>
                              {ZONES.map(z => <option key={z} value={z}>Zone {z}</option>)}
                            </select>
                          </FormField>
                          <FormField label="Delivery Day">
                            <select
                              value={editingClient.deliveryDay || ''}
                              onChange={(e) => setEditingClient({ ...editingClient, deliveryDay: e.target.value })}
                              className={inputStyle}
                              style={borderStyle}
                            >
                              <option value="">Select day</option>
                              {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                          </FormField>
                        </div>

                        {/* Contacts Section for Edit */}
                        <div className="mt-4 pt-4 border-t-2" style={{ borderColor: '#ebb582' }}>
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-md font-bold flex items-center gap-2" style={{ color: '#3d59ab' }}>
                              <Users size={18} />
                              Contacts ({editingClient.contacts?.length || 1})
                            </h4>
                            <button
                              type="button"
                              onClick={addEditingContact}
                              className="flex items-center gap-1 px-3 py-1 rounded-lg text-white text-sm"
                              style={{ backgroundColor: '#3d59ab' }}
                            >
                              <Plus size={16} />Add Contact
                            </button>
                          </div>
                          <div className="space-y-4">
                            {(editingClient.contacts || []).map((contact, idx) => (
                              <ContactForm
                                key={idx}
                                contact={contact}
                                index={idx}
                                onChange={updateEditingContact}
                                onRemove={() => removeEditingContact(idx)}
                                canRemove={editingClient.contacts.length > 1}
                              />
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-2 mt-4">
                          <button
                            onClick={saveEditing}
                            className="flex items-center gap-1 px-4 py-2 rounded-lg text-white"
                            style={{ backgroundColor: '#3d59ab' }}
                          >
                            <Check size={18} />Save
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="flex items-center gap-1 px-4 py-2 rounded-lg bg-gray-200"
                          >
                            <X size={18} />Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Paused Clients Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                      {pausedClients.map((subscription) => (
                        editingIndex !== subscription.originalIndex && (
                          <ClientCard
                            key={subscription.subscriptionId || subscription.originalIndex}
                            subscription={subscription}
                            onEdit={() => startEditing(subscription.originalIndex)}
                            onDelete={() => deleteClient(subscription.originalIndex)}
                            onCopyLink={() => copyPortalLink(subscription)}
                          />
                        )
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}
