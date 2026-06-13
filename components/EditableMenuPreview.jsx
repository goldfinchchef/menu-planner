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

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { X, Download, ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react';
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

  // LocalStorage key for a client's edit state
  const getStorageKey = (clientId) => `menu-preview-${weekId}-${clientId}`;

  // Generate hash of source menu data to detect changes
  // When menus are edited, this hash changes, triggering reinitialization
  function getSourceHash(clientData) {
    if (!clientData?.meals) return '';
    return clientData.meals.map(m =>
      `${m.protein || ''}|${m.veg || ''}|${m.starch || ''}|${(m.extras || []).join(',')}`
    ).join('::');
  }

  // Load edit state from localStorage or initialize from data
  // If source menu data has changed, reinitialize but preserve local-only fields
  function loadEditState(clientData) {
    if (!clientData) return { meals: [], subscriptionEnds: '', clientName: '', sourceHash: '' };

    const storageKey = getStorageKey(clientData.clientId);
    const saved = localStorage.getItem(storageKey);
    const currentHash = getSourceHash(clientData);

    if (saved) {
      try {
        const parsed = JSON.parse(saved);

        // If source data changed, reinitialize but preserve local-only fields
        if (parsed.sourceHash !== currentHash) {
          console.log('[Preview] Source menu data changed, refreshing preview');
          const fresh = initEditState(clientData);
          return {
            ...fresh,
            sourceHash: currentHash,
            // Preserve local-only fields from cache
            subscriptionEnds: parsed.subscriptionEnds || ''
          };
        }

        return parsed;
      } catch (e) {
        console.error('Failed to parse saved edit state:', e);
      }
    }

    return { ...initEditState(clientData), sourceHash: currentHash };
  }

  // Initialize edit state from client data (fresh, no localStorage)
  function initEditState(clientData) {
    if (!clientData) return { meals: [], subscriptionEnds: '', clientName: '', sourceHash: '' };

    const meals = [];
    clientData.meals.forEach((menu, idx) => {
      if (menu.protein || menu.veg || menu.starch) {
        meals.push({
          id: `meal-${idx}`,
          title: menu.protein || '',
          subtitle: [menu.veg, menu.starch].filter(Boolean).join(', '),
          visible: true,
          isExtra: false
        });
      }
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
      meals,
      sourceHash: getSourceHash(clientData)
    };
  }

  // Current client index
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentClient = clientMenus[currentIndex];

  // Local editable state for current client
  const [editState, setEditState] = useState(() => loadEditState(currentClient));

  // Ref for the card to capture
  const cardRef = useRef(null);

  // Save edit state to localStorage whenever it changes
  useEffect(() => {
    if (currentClient && editState.clientName) {
      const storageKey = getStorageKey(currentClient.clientId);
      const toSave = {
        ...editState,
        sourceHash: getSourceHash(currentClient)
      };
      localStorage.setItem(storageKey, JSON.stringify(toSave));
    }
  }, [editState, currentClient]);

  // Reset edit state when switching clients
  const switchClient = (newIndex) => {
    setCurrentIndex(newIndex);
    setEditState(loadEditState(clientMenus[newIndex]));
  };

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

  // Update meal subtitle
  const updateMealSubtitle = (mealId, newSubtitle) => {
    setEditState(prev => ({
      ...prev,
      meals: prev.meals.map(m =>
        m.id === mealId ? { ...m, subtitle: newSubtitle } : m
      )
    }));
  };

  // Download as JPG
  const downloadJPG = async () => {
    if (!cardRef.current) return;

    try {
      const element = cardRef.current;

      // Clone the element to isolate it from layout issues
      const clone = element.cloneNode(true);
      clone.style.position = 'absolute';
      clone.style.left = '-9999px';
      clone.style.top = '0';
      clone.style.width = element.offsetWidth + 'px';
      clone.style.height = 'auto'; // Let it expand naturally
      clone.style.minHeight = element.scrollHeight + 'px';
      clone.style.maxHeight = 'none';
      clone.style.overflow = 'visible'; // Ensure nothing is clipped
      clone.style.transform = 'none'; // Remove any transforms
      document.body.appendChild(clone);

      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        removeContainer: true,
        height: clone.scrollHeight,
        windowHeight: clone.scrollHeight + 100,
        scrollY: 0,
        scrollX: 0
      });

      // Remove the clone
      document.body.removeChild(clone);

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
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      {/* Modal container */}
      <div className="bg-white rounded-lg shadow-2xl flex flex-col" style={{ width: '950px', maxWidth: '100%', height: '85vh', maxHeight: '750px' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => switchClient(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="font-medium text-sm">
              {currentIndex + 1} / {clientMenus.length}
            </span>
            <button
              onClick={() => switchClient(Math.min(clientMenus.length - 1, currentIndex + 1))}
              disabled={currentIndex === clientMenus.length - 1}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
            >
              <ChevronRight size={20} />
            </button>
            <span className="text-gray-500 text-sm ml-2">{editState.clientName}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={downloadJPG}
              className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700"
            >
              <Download size={14} />
              Download JPG
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body - sidebar and content */}
        <div className="flex flex-1 min-h-0">
          {/* Sidebar */}
          <div className="w-44 border-r bg-white flex-shrink-0 overflow-y-auto">
            <div className="p-3 border-b sticky top-0 bg-white">
              <h3 className="font-semibold text-sm" style={{ color: '#3d59ab' }}>Clients</h3>
            </div>
            <div className="p-2">
              {clientMenus.map((cm, idx) => (
                <button
                  key={cm.clientId}
                  onClick={() => switchClient(idx)}
                  className={`w-full text-left px-2 py-1.5 rounded mb-1 text-sm ${
                    idx === currentIndex ? 'bg-blue-100 text-blue-800 font-medium' : 'hover:bg-gray-100'
                  }`}
                >
                  {cm.client.name}
                </button>
              ))}
            </div>
          </div>

          {/* Content - card and edit panel */}
          <div className="flex-1 bg-gray-100 p-4 overflow-auto">
            <div className="flex gap-4">
              {/* Card preview */}
              <div className="flex-shrink-0">
                <div
                  ref={cardRef}
                  className="shadow-xl rounded-lg overflow-hidden"
                  style={{ backgroundColor: '#fff', fontSize: '14px', width: '420px' }}
                >
                {/* Header section */}
                <div
                  className="relative px-4 pt-6 pb-6"
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
                      fontSize: '11px',
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
                      fontSize: '16px',
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
                    className="text-center mb-3"
                    style={{
                      color: '#5a5a5a',
                      fontFamily: '"Beth Ellen", cursive',
                      fontSize: '11px'
                    }}
                  >
                    here's what to expect on your plate!
                  </p>

                  <div className="flex items-center justify-center gap-2">
                    <img
                      src="/goldfinch5.png"
                      alt="Goldfinch"
                      className="w-10 h-10 object-contain"
                    />
                    <p
                      style={{
                        fontFamily: '"Glacial Indifference", sans-serif',
                        fontSize: '12px',
                        letterSpacing: '0.15em',
                        color: '#5a5a5a'
                      }}
                    >
                      {formatDate(editState.deliveryDate)}
                    </p>
                  </div>
                </div>

                {/* Meals section */}
                <div
                  className="px-5 py-6"
                  style={{ backgroundColor: '#d9a87a' }}
                >
                  <div className="space-y-4">
                    {editState.meals.filter(m => m.visible).map((meal) => (
                      <div key={meal.id} className="text-center">
                        {meal.title && (
                          <h3
                            style={{
                              color: '#ffffff',
                              fontFamily: '"Glacial Indifference", sans-serif',
                              fontSize: meal.isExtra ? '0.85rem' : '0.9rem',
                              fontWeight: 'bold',
                              letterSpacing: '0.12em',
                              textTransform: 'uppercase',
                              marginBottom: meal.subtitle ? '0.3rem' : 0,
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
                              fontSize: '0.75rem',
                              letterSpacing: '0.08em',
                              textTransform: 'uppercase'
                            }}
                          >
                            {meal.subtitle}
                          </p>
                        )}
                      </div>
                    ))}
                    {editState.meals.filter(m => m.visible).length === 0 && (
                      <p className="text-center text-white/70 italic text-sm">No menu items</p>
                    )}
                  </div>
                </div>

                {/* Footer section */}
                <div
                  className="relative px-5 py-5"
                  style={{
                    backgroundColor: '#f9f9ed',
                    fontFamily: '"Glacial Indifference", sans-serif'
                  }}
                >
                  <h4
                    className="mb-2"
                    style={{
                      color: '#3d59ab',
                      fontFamily: '"Poller One", cursive',
                      fontSize: '1rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}
                  >
                    Get Ready!
                  </h4>
                  <p
                    className="pr-16"
                    style={{
                      color: '#5a5a5a',
                      fontSize: '0.8rem',
                      lineHeight: '1.4'
                    }}
                  >
                    Remember to put out bags, containers, and ice packs. And get excited – great food is on the way!
                  </p>
                  <img
                    src="/stemflower.png"
                    alt=""
                    className="absolute right-3 bottom-3 h-16 object-contain"
                  />
                </div>

                {/* Footer metadata */}
                <div
                  className="px-5 py-3 text-center"
                  style={{ backgroundColor: '#f9f9ed' }}
                >
                  <p
                    style={{
                      fontFamily: '"Glacial Indifference", sans-serif',
                      fontSize: '11px',
                      color: '#4a4a4a',
                      letterSpacing: '0.03em'
                    }}
                  >
                    {editState.mealPlan}
                    {editState.subscriptionEnds && ` • Subscription ends ${editState.subscriptionEnds}`}
                  </p>
                </div>
              </div>
            </div>

            {/* Edit panel */}
            <div className="w-64 bg-white rounded-lg shadow-lg p-4 flex-shrink-0 max-h-[calc(100vh-120px)] overflow-y-auto">
              <h4 className="font-semibold mb-3 text-sm" style={{ color: '#3d59ab' }}>Edit Preview</h4>

              {/* Subscription ends */}
              <div className="mb-4">
                <label className="block text-xs text-gray-500 mb-1">Subscription Ends</label>
                <input
                  type="text"
                  value={editState.subscriptionEnds}
                  onChange={(e) => setEditState(prev => ({ ...prev, subscriptionEnds: e.target.value }))}
                  placeholder="e.g., June 30, 2024"
                  className="w-full px-2 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Meals */}
              <div>
                <label className="block text-xs text-gray-500 mb-2">Meals & Extras</label>
                <div className="space-y-3">
                  {editState.meals.map((meal) => (
                    <div
                      key={meal.id}
                      className={`p-2 rounded border ${meal.visible ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100'}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <button
                          onClick={() => toggleMealVisibility(meal.id)}
                          className={`p-1 rounded hover:bg-gray-100 ${meal.visible ? 'text-green-600' : 'text-gray-400'}`}
                          title={meal.visible ? 'Click to hide' : 'Click to show'}
                        >
                          {meal.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                        </button>
                        <span className="text-xs text-gray-400">{meal.isExtra ? 'Extra' : 'Meal'}</span>
                      </div>
                      <input
                        type="text"
                        value={meal.title}
                        onChange={(e) => updateMealTitle(meal.id, e.target.value)}
                        className={`w-full px-2 py-1 border rounded text-sm font-medium mb-1 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          !meal.visible ? 'bg-gray-100 text-gray-400' : ''
                        }`}
                        placeholder="Meal title"
                      />
                      {!meal.isExtra && (
                        <input
                          type="text"
                          value={meal.subtitle}
                          onChange={(e) => updateMealSubtitle(meal.id, e.target.value)}
                          className={`w-full px-2 py-1 border rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            !meal.visible ? 'bg-gray-100 text-gray-400' : ''
                          }`}
                          placeholder="Sides (e.g., Broccoli, Rice)"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-xs text-gray-400 mt-4 italic">
                Changes are preview-only and won't be saved.
              </p>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
