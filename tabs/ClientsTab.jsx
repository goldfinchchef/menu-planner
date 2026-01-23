import React from 'react';
import { Plus, Trash2, Upload, Download } from 'lucide-react';

export default function ClientsTab({
  clients,
  newClient,
  setNewClient,
  addClient,
  deleteClient,
  clientsFileRef,
  exportClientsCSV
}) {
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            value={newClient.name}
            onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
            placeholder="Client name"
            className="p-2 border-2 rounded-lg"
            style={{ borderColor: '#ebb582' }}
          />
          <input
            type="number"
            value={newClient.persons}
            onChange={(e) => setNewClient({ ...newClient, persons: parseInt(e.target.value) || 1 })}
            placeholder="Household size"
            className="p-2 border-2 rounded-lg"
            style={{ borderColor: '#ebb582' }}
          />
          <input
            type="text"
            value={newClient.address}
            onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
            placeholder="Address"
            className="p-2 border-2 rounded-lg md:col-span-2"
            style={{ borderColor: '#ebb582' }}
          />
          <input
            type="email"
            value={newClient.email}
            onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
            placeholder="Email"
            className="p-2 border-2 rounded-lg"
            style={{ borderColor: '#ebb582' }}
          />
          <input
            type="tel"
            value={newClient.phone}
            onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
            placeholder="Phone"
            className="p-2 border-2 rounded-lg"
            style={{ borderColor: '#ebb582' }}
          />
          <input
            type="number"
            value={newClient.mealsPerWeek}
            onChange={(e) => setNewClient({ ...newClient, mealsPerWeek: parseInt(e.target.value) || 0 })}
            placeholder="Meals/week"
            className="p-2 border-2 rounded-lg"
            style={{ borderColor: '#ebb582' }}
          />
        </div>
        <button
          onClick={addClient}
          className="mt-4 px-6 py-2 rounded-lg text-white"
          style={{ backgroundColor: '#3d59ab' }}
        >
          <Plus size={20} className="inline mr-2" />Add
        </button>
      </div>
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4" style={{ color: '#3d59ab' }}>Clients ({clients.length})</h2>
        <div className="space-y-3">
          {clients.map((client, i) => (
            <div key={i} className="border-2 rounded-lg p-4 flex justify-between" style={{ borderColor: '#ebb582' }}>
              <div>
                <h3 className="font-bold text-lg">{client.name}</h3>
                <p className="text-sm text-gray-600">{client.persons} persons • {client.mealsPerWeek} meals/week</p>
                {client.address && <p className="text-sm text-gray-500">{client.address}</p>}
              </div>
              <button onClick={() => deleteClient(i)} className="text-red-600 self-start">
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
