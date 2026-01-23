import React, { useState } from 'react';
import { Plus, Trash2, Upload, Download, Edit2, Check, X } from 'lucide-react';
import { ZONES, DAYS } from '../constants';

const FormField = ({ label, children }) => (
  <div className="flex flex-col">
    <label className="text-sm font-medium mb-1" style={{ color: '#423d3c' }}>{label}</label>
    {children}
  </div>
);

const inputStyle = "p-2 border-2 rounded-lg";
const borderStyle = { borderColor: '#ebb582' };

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

  const startEditing = (index) => {
    setEditingIndex(index);
    setEditingClient({ ...clients[index] });
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

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold" style={{ color: '#3d59ab' }}>Add Client</h2>
          <div className="flex gap-2">
            <button
              onClick={() => clientsFileRef.current.click()}
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
          <FormField label="Address">
            <input
              type="text"
              value={newClient.address}
              onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
              placeholder="Street address"
              className={`${inputStyle} md:col-span-2 lg:col-span-1`}
              style={borderStyle}
            />
          </FormField>
          <FormField label="Email">
            <input
              type="email"
              value={newClient.email}
              onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
              placeholder="Email address"
              className={inputStyle}
              style={borderStyle}
            />
          </FormField>
          <FormField label="Phone">
            <input
              type="tel"
              value={newClient.phone}
              onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
              placeholder="Phone number"
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
              onChange={(e) => setNewClient({ ...newClient, pickup: e.target.checked })}
              className="w-5 h-5 rounded border-2"
              style={{ accentColor: '#3d59ab' }}
            />
            <label htmlFor="pickup" className="text-sm font-medium" style={{ color: '#423d3c' }}>
              Pickup (exclude from delivery routes)
            </label>
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
                    <FormField label="Address">
                      <input
                        type="text"
                        value={editingClient.address || ''}
                        onChange={(e) => setEditingClient({ ...editingClient, address: e.target.value })}
                        className={inputStyle}
                        style={borderStyle}
                      />
                    </FormField>
                    <FormField label="Email">
                      <input
                        type="email"
                        value={editingClient.email || ''}
                        onChange={(e) => setEditingClient({ ...editingClient, email: e.target.value })}
                        className={inputStyle}
                        style={borderStyle}
                      />
                    </FormField>
                    <FormField label="Phone">
                      <input
                        type="tel"
                        value={editingClient.phone || ''}
                        onChange={(e) => setEditingClient({ ...editingClient, phone: e.target.value })}
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
                        onChange={(e) => setEditingClient({ ...editingClient, pickup: e.target.checked })}
                        className="w-5 h-5 rounded border-2"
                        style={{ accentColor: '#3d59ab' }}
                      />
                      <label htmlFor={`pickup-edit-${i}`} className="text-sm font-medium" style={{ color: '#423d3c' }}>
                        Pickup (exclude from delivery routes)
                      </label>
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
                  className={`border-2 rounded-lg p-4 flex justify-between ${client.status === 'paused' ? 'opacity-60' : ''}`}
                  style={{ borderColor: client.status === 'paused' ? '#9ca3af' : '#ebb582' }}
                >
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
                    {client.address && <p className="text-sm text-gray-500">{client.address}</p>}
                    {client.billingNotes && (
                      <p className="text-sm text-amber-700 mt-1 bg-amber-50 px-2 py-1 rounded">
                        Billing: {client.billingNotes}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 self-start ml-4">
                    <button onClick={() => startEditing(i)} className="text-blue-600">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => deleteClient(i)} className="text-red-600">
                      <Trash2 size={18} />
                    </button>
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
