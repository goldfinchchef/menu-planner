/**
 * ClientsDirectoryPage - /test/clients/directory
 * Renders the production ClientsTab component
 */

import React from 'react';
import { useExperimentalContext } from '../ExperimentalContext';
import ClientsTab from '../../tabs/ClientsTab';

export default function ClientsDirectoryPage() {
  const {
    clients, setClients,
    newClient, setNewClient,
    clientsFileRef
  } = useExperimentalContext();

  return (
    <ClientsTab
      clients={clients}
      setClients={setClients}
      newClient={newClient}
      setNewClient={setNewClient}
      clientsFileRef={clientsFileRef}
    />
  );
}
