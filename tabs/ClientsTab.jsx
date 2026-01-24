import React, { useState } from 'react';
import { Plus, Trash2, Upload, Download, Edit2, Check, X, Link2, Minus, Users } from 'lucide-react';
import { ZONES, DAYS, DEFAULT_CONTACT } from '../constants';

const FormField = ({ label, children }) => (
  <div className="flex flex-col">
    <label className="text-sm font-medium mb-1" style={{ color: '#423d3c' }}>{label}</label>
    {children}
  </div>
);

const inputStyle = "p-2 border-2 rounded-lg";
const borderStyle = { borderColor: '#ebb582' };

// Contact form component for reuse
const ContactForm = ({ contact, index, onChange, onRemove, canRemove, idPrefix }) => (
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
      <FormField label="Name">
        <input
          type="text"
          value={contact.name || ''}
          onChange={(e) => onChange(index, 'name', e.target.value)}
          placeholder="Contact name"
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
);

export default function ClientsTab({
  clients,
  newClient,
  setNewClient,
  addClient,
  deleteClient,
  clientsFileRef,
  exportClientsCSV,
  setClients
}) {
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingClient, setEditingClient] = useState(null);

  // Ensure contacts array exists
  const ensureContacts = (client) => {
    if (!client.contacts || client.contacts.length === 0) {
      // Migrate old single contact fields to contacts array
      return [{
        name: client.name || '',
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || ''
      }];
    }
    return client.contacts;
  };

  const startEditing = (index) => {
    const client = clients[index];
    setEditingIndex(index);
    setEditingClient({
      ...client,
      contacts: ensureContacts(client)
    });
  };

  const cancelEditing = () => {
    setEditingIndex(null);
    setEditingClient(null);
  };

  const saveEditing = () => {
    const updated = [...clients];
    updated[editingIndex] = editingClient;
    setClients(updated);
    setEditingIndex(null);
    setEditingClient(null);
  };

  // Contact management for new client
  const updateNewClientContact = (index, field, value) => {
    const contacts = [...(newClient.contacts || [{ ...DEFAULT_CONTACT }])];
    contacts[index] = { ...contacts[index], [field]: value };
    setNewClient({ ...newClient, contacts });
  };

  const addNewClientContact = () => {
    const contacts = [...(newClient.contacts || []), { ...DEFAULT_CONTACT }];
    setNewClient({ ...newClient, contacts });
  };

  const removeNewClientContact = (index) => {
    const contacts = (newClient.contacts || []).filter((_, i) => i !== index);
    setNewClient({ ...newClient, contacts });
  };

  // Contact management for editing client
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

  const getClientPortalUrl = (clientName) => {
    const slug = clientName.toLowerCase().replace(/\s+/g, '-');
    return `${window.location.origin}/client/${slug}`;
  };

  const copyPortalLink = (clientName) => {
    const url = getClientPortalUrl(clientName);
    navigator.clipboard.writeText(url).then(() => {
      alert(`Portal link copied!\n${url}`);
    }).catch(() => {
      prompt('Copy this link:', url);
    });
  };

  // Get display info for a client's contacts
  const getContactsSummary = (client) => {
    const contacts = ensureContacts(client);
    const addresses = contacts.filter(c => c.address).map(c => c.address);
    return {
      count: contacts.length,
      addresses,
      primaryContact: contacts[0]
    };
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold" style={{ color: '#3d59ab' }}>Add Client</h2>
          <div className="flex gap-2">
            <button
              onClick={() => clientsFileRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border-2"
              style={{ borderColor: '#3d59ab', color: '#3d59ab' }}
            >
              <Upload size={18} />Import
            </button>
            <button
              onClick={exportClientsCSV}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white"
              style={{ backgroundColor: '#3d59ab' }}
            >
              <Download size={18} />Export
            </button>
          </div>
        </div>

        {/* Client Info Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <FormField label="Client Name">
            <input
              type="text"
              value={newClient.name}
              onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
              placeholder="Enter client name"
              className={inputStyle}
              style={borderStyle}
            />
          </FormField>
          <FormField label="Display Name">
            <input
              type="text"
              value={newClient.displayName}
              onChange={(e) => setNewClient({ ...newClient, displayName: e.target.value })}
              placeholder="Optional display name"
              className={inputStyle}
              style={borderStyle}
            />
          </FormField>
          <FormField label="Household Size">
            <input
              type="number"
              value={newClient.persons}
              onChange={(e) => setNewClient({ ...newClient, persons: parseInt(e.target.value) || 1 })}
              placeholder="Number of persons"
              className={inputStyle}
              style={borderStyle}
            />
          </FormField>
          <FormField label="Meals per Week">
            <input
              type="number"
              value={newClient.mealsPerWeek}
              onChange={(e) => setNewClient({ ...newClient, mealsPerWeek: parseInt(e.target.value) || 0 })}
              placeholder="Number of meals"
              className={inputStyle}
              style={borderStyle}
            />
          </FormField>
          <FormField label="Zone">
            <select
              value={newClient.zone}
              onChange={(e) => setNewClient({ ...newClient, zone: e.target.value })}
              className={inputStyle}
              style={borderStyle}
            >
              <option value="">Unassigned</option>
              {ZONES.map(z => <option key={z} value={z}>Zone {z}</option>)}
            </select>
          </FormField>
          <FormField label="Delivery Day">
            <select
              value={newClient.deliveryDay}
              onChange={(e) => setNewClient({ ...newClient, deliveryDay: e.target.value })}
              className={inputStyle}
              style={borderStyle}
            >
              <option value="">Select day</option>
              {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </FormField>
          <FormField label="Frequency">
            <select
              value={newClient.frequency}
              onChange={(e) => setNewClient({ ...newClient, frequency: e.target.value })}
              className={inputStyle}
              style={borderStyle}
            >
              <option value="weekly">Weekly</option>
              <option value="biweekly">Biweekly</option>
            </select>
          </FormField>
          <FormField label="Status">
            <select
              value={newClient.status}
              onChange={(e) => setNewClient({ ...newClient, status: e.target.value })}
              className={inputStyle}
              style={borderStyle}
            >
              <option value="active">Active</option>
              <option value="paused">Paused</option>
            </select>
          </FormField>
          <FormField label="Billing Notes">
            <textarea
              value={newClient.billingNotes}
              onChange={(e) => setNewClient({ ...newClient, billingNotes: e.target.value })}
              placeholder="Any billing notes"
              className={inputStyle}
              style={borderStyle}
              rows="2"
            />
          </FormField>
          <div className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              id="pickup"
              checked={newClient.pickup || false}
              onChange={(e) => setNewClient({ ...newClient, pickup: e.target.checked, serviceFee: e.target.checked ? 0 : newClient.serviceFee })}
              className="w-5 h-5 rounded border-2"
              style={{ accentColor: '#3d59ab' }}
            />
            <label htmlFor="pickup" className="text-sm font-medium" style={{ color: '#423d3c' }}>
              Pickup (exclude from delivery routes)
            </label>
          </div>
        </div>

        {/* Contacts Section */}
        <div className="mt-6 pt-6 border-t-2" style={{ borderColor: '#ebb582' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: '#3d59ab' }}>
              <Users size={20} />
              Contacts
            </h3>
            <button
              type="button"
              onClick={addNewClientContact}
              className="flex items-center gap-1 px-3 py-1 rounded-lg text-white text-sm"
              style={{ backgroundColor: '#3d59ab' }}
            >
              <Plus size={16} />Add Contact
            </button>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Each contact receives notifications. Each address is a separate delivery stop.
          </p>
          <div className="space-y-4">
            {(newClient.contacts || [{ ...DEFAULT_CONTACT }]).map((contact, idx) => (
              <ContactForm
                key={idx}
                contact={contact}
                index={idx}
                onChange={updateNewClientContact}
                onRemove={() => removeNewClientContact(idx)}
                canRemove={(newClient.contacts || []).length > 1}
                idPrefix="new"
              />
            ))}
          </div>
        </div>

        {/* Pricing Section */}
        <div className="mt-6 pt-6 border-t-2" style={{ borderColor: '#ebb582' }}>
          <h3 className="text-lg font-bold mb-4" style={{ color: '#3d59ab' }}>Pricing</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <FormField label="Plan Price ($)">
              <input
                type="number"
                step="0.01"
                value={newClient.planPrice || 0}
                onChange={(e) => setNewClient({ ...newClient, planPrice: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                className={inputStyle}
                style={borderStyle}
              />
            </FormField>
            <FormField label="Service Fee ($)">
              <input
                type="number"
                step="0.01"
                value={newClient.pickup ? 0 : (newClient.serviceFee || 0)}
                onChange={(e) => setNewClient({ ...newClient, serviceFee: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                className={inputStyle}
                style={borderStyle}
                disabled={newClient.pickup}
              />
            </FormField>
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="prepayDiscount"
                checked={newClient.prepayDiscount || false}
                onChange={(e) => setNewClient({ ...newClient, prepayDiscount: e.target.checked })}
                className="w-5 h-5 rounded border-2"
                style={{ accentColor: '#3d59ab' }}
              />
              <label htmlFor="prepayDiscount" className="text-sm font-medium" style={{ color: '#423d3c' }}>
                Pre-pay Discount (10% off)
              </label>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="newClientFeePaid"
                checked={newClient.newClientFeePaid || false}
                onChange={(e) => setNewClient({ ...newClient, newClientFeePaid: e.target.checked })}
                className="w-5 h-5 rounded border-2"
                style={{ accentColor: '#3d59ab' }}
              />
              <label htmlFor="newClientFeePaid" className="text-sm font-medium" style={{ color: '#423d3c' }}>
                New Client Fee Paid
              </label>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="paysOwnGroceries"
                checked={newClient.paysOwnGroceries || false}
                onChange={(e) => setNewClient({ ...newClient, paysOwnGroceries: e.target.checked })}
                className="w-5 h-5 rounded border-2"
                style={{ accentColor: '#3d59ab' }}
              />
              <label htmlFor="paysOwnGroceries" className="text-sm font-medium" style={{ color: '#423d3c' }}>
                Pays Own Groceries
              </label>
            </div>
          </div>
        </div>

        <button
          onClick={addClient}
          className="mt-4 px-6 py-2 rounded-lg text-white"
          style={{ backgroundColor: '#3d59ab' }}
        >
          <Plus size={20} className="inline mr-2" />Add Client
        </button>
      </div>

      {/* Clients List */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4" style={{ color: '#3d59ab' }}>Clients ({clients.length})</h2>
        <div className="space-y-3">
          {clients.map((client, i) => (
            <div key={i}>
              {editingIndex === i ? (
                <div className="border-2 rounded-lg p-4" style={{ borderColor: '#3d59ab', backgroundColor: '#f9f9ed' }}>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <FormField label="Client Name">
                      <input
                        type="text"
                        value={editingClient.name}
                        onChange={(e) => setEditingClient({ ...editingClient, name: e.target.value })}
                        className={inputStyle}
                        style={borderStyle}
                      />
                    </FormField>
                    <FormField label="Display Name">
                      <input
                        type="text"
                        value={editingClient.displayName || ''}
                        onChange={(e) => setEditingClient({ ...editingClient, displayName: e.target.value })}
                        className={inputStyle}
                        style={borderStyle}
                      />
                    </FormField>
                    <FormField label="Household Size">
                      <input
                        type="number"
                        value={editingClient.persons}
                        onChange={(e) => setEditingClient({ ...editingClient, persons: parseInt(e.target.value) || 1 })}
                        className={inputStyle}
                        style={borderStyle}
                      />
                    </FormField>
                    <FormField label="Meals per Week">
                      <input
                        type="number"
                        value={editingClient.mealsPerWeek}
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
                    <FormField label="Billing Notes">
                      <textarea
                        value={editingClient.billingNotes || ''}
                        onChange={(e) => setEditingClient({ ...editingClient, billingNotes: e.target.value })}
                        className={inputStyle}
                        style={borderStyle}
                        rows="2"
                      />
                    </FormField>
                    <div className="flex items-center gap-2 pt-6">
                      <input
                        type="checkbox"
                        id={`pickup-edit-${i}`}
                        checked={editingClient.pickup || false}
                        onChange={(e) => setEditingClient({ ...editingClient, pickup: e.target.checked, serviceFee: e.target.checked ? 0 : editingClient.serviceFee })}
                        className="w-5 h-5 rounded border-2"
                        style={{ accentColor: '#3d59ab' }}
                      />
                      <label htmlFor={`pickup-edit-${i}`} className="text-sm font-medium" style={{ color: '#423d3c' }}>
                        Pickup (exclude from delivery routes)
                      </label>
                    </div>
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
                          idPrefix={`edit-${i}`}
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
                          id={`prepayDiscount-edit-${i}`}
                          checked={editingClient.prepayDiscount || false}
                          onChange={(e) => setEditingClient({ ...editingClient, prepayDiscount: e.target.checked })}
                          className="w-5 h-5 rounded border-2"
                          style={{ accentColor: '#3d59ab' }}
                        />
                        <label htmlFor={`prepayDiscount-edit-${i}`} className="text-sm font-medium" style={{ color: '#423d3c' }}>
                          Pre-pay (10% off)
                        </label>
                      </div>
                      <div className="flex items-center gap-2 pt-6">
                        <input
                          type="checkbox"
                          id={`newClientFeePaid-edit-${i}`}
                          checked={editingClient.newClientFeePaid || false}
                          onChange={(e) => setEditingClient({ ...editingClient, newClientFeePaid: e.target.checked })}
                          className="w-5 h-5 rounded border-2"
                          style={{ accentColor: '#3d59ab' }}
                        />
                        <label htmlFor={`newClientFeePaid-edit-${i}`} className="text-sm font-medium" style={{ color: '#423d3c' }}>
                          New Client Fee Paid
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`paysOwnGroceries-edit-${i}`}
                          checked={editingClient.paysOwnGroceries || false}
                          onChange={(e) => setEditingClient({ ...editingClient, paysOwnGroceries: e.target.checked })}
                          className="w-5 h-5 rounded border-2"
                          style={{ accentColor: '#3d59ab' }}
                        />
                        <label htmlFor={`paysOwnGroceries-edit-${i}`} className="text-sm font-medium" style={{ color: '#423d3c' }}>
                          Pays Own Groceries
                        </label>
                      </div>
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
              ) : (
                <div
                  className={`border-2 rounded-lg p-4 ${client.status === 'paused' ? 'opacity-60' : ''}`}
                  style={{ borderColor: client.status === 'paused' ? '#9ca3af' : '#ebb582' }}
                >
                  <div className="flex justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-lg">{client.displayName || client.name}</h3>
                        {client.displayName && <span className="text-sm text-gray-500">({client.name})</span>}
                        {client.status === 'paused' && (
                          <span className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-600">Paused</span>
                        )}
                        {client.status === 'active' && (
                          <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700">Active</span>
                        )}
                        {client.pickup && (
                          <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">Pickup</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {client.persons} persons • {client.mealsPerWeek} meals/week • {client.frequency === 'biweekly' ? 'Biweekly' : 'Weekly'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {client.zone ? `Zone ${client.zone}` : 'No zone'}
                        {client.deliveryDay && ` • ${client.deliveryDay}`}
                      </p>

                      {/* Contacts Display */}
                      {(() => {
                        const { count, addresses, primaryContact } = getContactsSummary(client);
                        return (
                          <div className="mt-2">
                            {count > 1 ? (
                              <div className="text-sm">
                                <span className="text-purple-600 font-medium">
                                  <Users size={14} className="inline mr-1" />
                                  {count} contacts • {addresses.length} delivery stop{addresses.length !== 1 ? 's' : ''}
                                </span>
                                <div className="mt-1 space-y-1">
                                  {ensureContacts(client).map((contact, idx) => (
                                    <div key={idx} className="text-gray-500 pl-4 border-l-2" style={{ borderColor: '#d9a87a' }}>
                                      <span className="font-medium">{contact.name || `Contact ${idx + 1}`}</span>
                                      {contact.address && <span className="block text-xs">{contact.address}</span>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <>
                                {primaryContact?.address && (
                                  <p className="text-sm text-gray-500">{primaryContact.address}</p>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })()}

                      {client.billingNotes && (
                        <p className="text-sm text-amber-700 mt-1 bg-amber-50 px-2 py-1 rounded">
                          Billing: {client.billingNotes}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 self-start ml-4">
                      <button
                        onClick={() => copyPortalLink(client.name)}
                        className="text-purple-600"
                        title="Copy portal link"
                      >
                        <Link2 size={18} />
                      </button>
                      <button onClick={() => startEditing(i)} className="text-blue-600" title="Edit">
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => deleteClient(i)} className="text-red-600" title="Delete">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
