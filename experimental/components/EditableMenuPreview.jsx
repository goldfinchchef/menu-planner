/**
 * EditableMenuPreview - Canva-style local-only styled menu preview with JPG download
 *
 * Features:
 * - Per-client styled menu cards
 * - Editable meal titles and descriptions (local only)
 * - Hide/show extras
 * - Manual subscription ends field
 * - Download as high-quality JPG
 *
 * Does NOT modify Supabase data.
 */

import React, { useState, useRef, useMemo } from 'react';
import { X, Download, ChevronLeft, ChevronRight, Eye, EyeOff, Edit2, Check } from 'lucide-react';
import html2canvas from 'html2canvas';

export default function EditableMenuPreview({ clients, menus, weekId, onClose }) {
  // Group menus by client
  const clientMenus = useMemo(() => {
    const groups = {};
    menus.forEach(menu => {
      const clientId = menu.client_id;
      if (!groups[clientId]) {
        const client = clients.find(c => c.id === clientId);
        groups[clientId] = {
          clientId,
          client: client || { name: menu.client_name, id: clientId },
          meals: [],
          date: menu.date
        };
      }
      groups[clientId].meals.push(menu);
    });

    // Sort meals by meal_index
    Object.values(groups).forEach(g => {
      g.meals.sort((a, b) => (a.meal_index || 1) - (b.meal_index || 1));
    });

    return Object.values(groups).sort((a, b) =>
      (a.client.name || '').localeCompare(b.client.name || '')
    );
  }, [clients, menus]);

  // Current client index
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentClient = clientMenus[currentIndex];

  // Local editable state for current client
  const [editState, setEditState] = useState(() => initEditState(currentClient));

  // Ref for the card to capture
  const cardRef = useRef(null);

  // Reset edit state when switching clients
  const switchClient = (newIndex) => {
    setCurrentIndex(newIndex);
    setEditState(initEditState(clientMenus[newIndex]));
  };

  // Initialize edit state from client data
  function initEditState(clientData) {
    if (!clientData) return { meals: [], subscriptionEnds: '', clientName: '' };

    const meals = [];
    clientData.meals.forEach((menu, idx) => {
      // Main meal
      if (menu.protein || menu.veg || menu.starch) {
        meals.push({
          id: `meal-${idx}`,
          title: menu.protein || '',
          subtitle: [menu.veg, menu.starch].filter(Boolean).join(', '),
          visible: true,
          isExtra: false
        });
      }
      // Extras as separate items
      (menu.extras || []).forEach((extra, extraIdx) => {
        meals.push({
          id: `extra-${idx}-${extraIdx}`,
          title: `+ ${extra}`,
          subtitle: '',
          visible: true,
          isExtra: true
        });
      });
    });

    const portions = clientData.client.portions || 1;
    const mealsPerWeek = clientData.meals.length;

    return {
      clientName: clientData.client.displayName || clientData.client.name || '',
      mealPlan: `${mealsPerWeek} meal${mealsPerWeek !== 1 ? 's' : ''} × ${portions} portion${portions !== 1 ? 's' : ''}`,
      subscriptionEnds: '',
      deliveryDate: clientData.date || '',
      meals
    };
  }

  // Toggle meal visibility
  const toggleMealVisibility = (mealId) => {
    setEditState(prev => ({
      ...prev,
      meals: prev.meals.map(m =>
        m.id === mealId ? { ...m, visible: !m.visible } : m
      )
    }));
  };

  // Update meal title
  const updateMealTitle = (mealId, newTitle) => {
    setEditState(prev => ({
      ...prev,
      meals: prev.meals.map(m =>
        m.id === mealId ? { ...m, title: newTitle } : m
      )
    }));
  };

  // Download as JPG
  const downloadJPG = async () => {
    if (!cardRef.current) return;

    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2, // Higher resolution
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });

      const link = document.createElement('a');
      const clientName = (editState.clientName || 'client').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const dateStr = editState.deliveryDate || weekId || 'menu';
      link.download = `${clientName}-menu-${dateStr}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.95);
      link.click();
    } catch (err) {
      console.error('Failed to generate JPG:', err);
      alert('Failed to generate JPG. Please try again.');
    }
  };

  // Format date for display
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      }).toUpperCase();
    } catch {
      return dateStr;
    }
  };

  if (clientMenus.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-lg p-8 max-w-md">
          <h3 className="text-lg font-semibold mb-4">No Client Menus</h3>
          <p className="text-gray-600 mb-4">No menus found for this week. Apply base menu to clients first.</p>
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex bg-black/60">
      {/* Left sidebar - client list */}
      <div className="w-64 bg-white border-r overflow-y-auto">
        <div className="p-4 border-b sticky top-0 bg-white">
          <h3 className="font-semibold" style={{ color: '#3d59ab' }}>Client Menus</h3>
          <p className="text-xs text-gray-500">{clientMenus.length} client{clientMenus.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="p-2">
          {clientMenus.map((cm, idx) => (
            <button
              key={cm.clientId}
              onClick={() => switchClient(idx)}
              className={`w-full text-left px-3 py-2 rounded mb-1 text-sm ${
                idx === currentIndex
                  ? 'bg-blue-100 text-blue-800 font-medium'
                  : 'hover:bg-gray-100'
              }`}
            >
              {cm.client.name}
              <span className="text-xs text-gray-500 ml-2">
                {cm.meals.length} meal{cm.meals.length !== 1 ? 's' : ''}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main area - preview and controls */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => switchClient(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="font-medium">
              {currentIndex + 1} / {clientMenus.length}
            </span>
            <button
              onClick={() => switchClient(Math.min(clientMenus.length - 1, currentIndex + 1))}
              disabled={currentIndex === clientMenus.length - 1}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={downloadJPG}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              <Download size={16} />
              Download JPG
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Preview area */}
        <div className="flex-1 overflow-y-auto p-8 bg-gray-100 flex">
          {/* Card preview */}
          <div className="flex-1 flex justify-center">
            <div
              ref={cardRef}
              className="w-[360px] shadow-2xl rounded-lg overflow-hidden"
              style={{ backgroundColor: '#fff' }}
            >
              {/* Header section */}
              <div
                className="relative px-4 pt-6 pb-8"
                style={{
                  backgroundColor: '#f9f9ed',
                  backgroundImage: 'url(/pattern4.png)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              >
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

                <h2
                  className="text-center mb-1"
                  style={{
                    color: '#3d59ab',
                    fontFamily: '"Poller One", cursive',
                    fontSize: '18px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    textDecoration: 'underline',
                    textDecorationColor: '#3d59ab',
                    textUnderlineOffset: '4px'
                  }}
                >
                  {editState.clientName}'s Menu
                </h2>

                <p
                  className="text-center mb-1"
                  style={{
                    color: '#7c7c7c',
                    fontFamily: '"Glacial Indifference", sans-serif',
                    fontSize: '11px',
                    letterSpacing: '0.1em'
                  }}
                >
                  {editState.mealPlan}
                </p>

                {editState.subscriptionEnds && (
                  <p
                    className="text-center mb-2"
                    style={{
                      color: '#9a9a9a',
                      fontFamily: '"Glacial Indifference", sans-serif',
                      fontSize: '10px'
                    }}
                  >
                    Subscription ends: {editState.subscriptionEnds}
                  </p>
                )}

                <p
                  className="text-center mb-4"
                  style={{
                    color: '#5a5a5a',
                    fontFamily: '"Beth Ellen", cursive',
                    fontSize: '12px'
                  }}
                >
                  here's what to expect on your plate!
                </p>

                <div className="flex items-center justify-center gap-3">
                  <img
                    src="/goldfinch5.png"
                    alt="Goldfinch"
                    className="w-12 h-12 object-contain"
                  />
                  <p
                    style={{
                      fontFamily: '"Glacial Indifference", sans-serif',
                      fontSize: '14px',
                      letterSpacing: '0.2em',
                      color: '#5a5a5a'
                    }}
                  >
                    {formatDate(editState.deliveryDate)}
                  </p>
                </div>
              </div>

              {/* Meals section */}
              <div
                className="px-6 py-8"
                style={{ backgroundColor: '#d9a87a' }}
              >
                <div className="space-y-6">
                  {editState.meals.filter(m => m.visible).map((meal) => (
                    <div key={meal.id} className="text-center">
                      {meal.title && (
                        <h3
                          style={{
                            color: '#ffffff',
                            fontFamily: '"Glacial Indifference", sans-serif',
                            fontSize: meal.isExtra ? '0.95rem' : '1.1rem',
                            fontWeight: 'bold',
                            letterSpacing: '0.15em',
                            textTransform: 'uppercase',
                            marginBottom: meal.subtitle ? '0.5rem' : 0,
                            opacity: meal.isExtra ? 0.9 : 1
                          }}
                        >
                          {meal.title}
                        </h3>
                      )}
                      {meal.subtitle && (
                        <p
                          style={{
                            color: '#f5e6d3',
                            fontFamily: '"Glacial Indifference", sans-serif',
                            fontSize: '0.85rem',
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase'
                          }}
                        >
                          {meal.subtitle}
                        </p>
                      )}
                    </div>
                  ))}
                  {editState.meals.filter(m => m.visible).length === 0 && (
                    <p className="text-center text-white/70 italic">No menu items</p>
                  )}
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
                <img
                  src="/stemflower.png"
                  alt=""
                  className="absolute right-4 bottom-4 h-20 object-contain"
                />
              </div>
            </div>
          </div>

          {/* Edit panel */}
          <div className="w-72 bg-white rounded-lg shadow-lg ml-6 p-4 h-fit max-h-[calc(100vh-200px)] overflow-y-auto">
            <h4 className="font-semibold mb-4" style={{ color: '#3d59ab' }}>Edit Preview</h4>

            {/* Subscription ends */}
            <div className="mb-4">
              <label className="block text-xs text-gray-500 mb-1">Subscription Ends</label>
              <input
                type="text"
                value={editState.subscriptionEnds}
                onChange={(e) => setEditState(prev => ({ ...prev, subscriptionEnds: e.target.value }))}
                placeholder="e.g., June 30, 2024"
                className="w-full px-2 py-1.5 border rounded text-sm"
              />
            </div>

            {/* Meals */}
            <div>
              <label className="block text-xs text-gray-500 mb-2">Meals & Extras</label>
              <div className="space-y-2">
                {editState.meals.map((meal) => (
                  <div
                    key={meal.id}
                    className={`p-2 rounded border ${meal.visible ? 'bg-white' : 'bg-gray-100 opacity-60'}`}
                  >
                    <div className="flex items-start gap-2">
                      <button
                        onClick={() => toggleMealVisibility(meal.id)}
                        className={`mt-1 p-1 rounded ${meal.visible ? 'text-green-600' : 'text-gray-400'}`}
                        title={meal.visible ? 'Hide' : 'Show'}
                      >
                        {meal.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>
                      <div className="flex-1">
                        <input
                          type="text"
                          value={meal.title}
                          onChange={(e) => updateMealTitle(meal.id, e.target.value)}
                          className="w-full px-1.5 py-1 border rounded text-sm font-medium"
                          disabled={!meal.visible}
                        />
                        {meal.subtitle && (
                          <p className="text-xs text-gray-500 mt-1 px-1">{meal.subtitle}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs text-gray-400 mt-4 italic">
              Edits are local only and won't be saved to the database.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
