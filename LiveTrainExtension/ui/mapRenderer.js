/*
 * LiveTrainExtension - Een Qlik Sense extensie voor het live volgen van treinen
 * Kaart renderer module
 */
define([
  'jquery',
  '../lib/js/qlik-style',
  'qlik',
  '../lib/leaflet/leaflet' // Direct import of bundled leaflet library
], function($, QlikStyle, qlik, L) { // Note: L is now explicitly included as a parameter
  'use strict';
  
  // Map object reference
  var map = null;
  
  // Layer groups
  var layers = {
    baseLayers: {},
    trainLayers: null,
    controls: {},
    overlays: {}
  };
  
  // Event handler tracking
  var registeredEventHandlers = [];
  
  // Leaflet beschikbaarheid controleren - niet meer nodig omdat we Leaflet direct importeren
  // maar behouden voor backward compatibility
  var isLeafletAvailable = function() {
    return typeof L !== 'undefined';
  };
  
  // Default settings for the map
  var defaultSettings = {
    center: [52.3702, 4.8952], // Amsterdam coordinates (default)
    zoom: 7,
    minZoom: 6,
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  };
  
  /**
   * Registreert een event handler voor cleanup
   * @param {Object} element - DOM element of Leaflet object
   * @param {String} event - Event naam
   * @param {Function} handler - Event handler functie
   * @param {Object} context - Context voor de handler (optioneel)
   */
  function registerEventHandler(element, event, handler, context) {
    if (!element || !event || !handler) return;
    
    registeredEventHandlers.push({
      element: element,
      event: event,
      handler: handler,
      context: context
    });
  }
  
  /**
   * Verwijdert alle geregistreerde event handlers
   */
  function removeAllEventHandlers() {
    registeredEventHandlers.forEach(function(item) {
      try {
        if (item.element && item.element.off && typeof item.element.off === 'function') {
          if (item.context) {
            item.element.off(item.event, item.handler, item.context);
          } else {
            item.element.off(item.event, item.handler);
          }
        } else if (item.element && item.element.removeEventListener) {
          item.element.removeEventListener(item.event, item.handler);
        }
      } catch (e) {
        console.error('Fout bij verwijderen event handler:', e);
      }
    });
    
    // Leeg de array
    registeredEventHandlers = [];
  }
  
  /**
   * Initialize the map in the container element
   * @param {HTMLElement} container - The DOM element to render the map in
   * @param {Object} options - Map configuration options
   * @returns {Object} Leaflet map instance
   */
  function initMap(container, options) {
    // Check of Leaflet beschikbaar is
    if (!isLeafletAvailable()) {
      console.error('Leaflet bibliotheek is niet geladen. De kaart kan niet worden geïnitialiseerd.');
      return null;
    }
    
    // Controleer of de container geldig is
    if (!container) {
      console.error('Ongeldige container voor kaart initialisatie');
      return null;
    }
    
    try {
      // Don't reinitialize if map already exists and container is the same
      if (map && map.getContainer() === container) {
        return map;
      }
      
      // Clean up an existing map before creating a new one
      if (map) {
        destroyMap();
      }
      
      // Combine default settings with provided options
      var mapOptions = $.extend({}, defaultSettings, options || {});
      
      // Make sure the container is empty and has proper dimensions
      $(container).empty();
      $(container).css({
        width: '100%',
        height: '100%',
        minHeight: '300px'  // Zorg voor minimale grootte
      });
      
      // Create a new map instance
      map = L.map(container, {
        center: mapOptions.center,
        zoom: mapOptions.zoom,
        minZoom: mapOptions.minZoom,
        maxZoom: mapOptions.maxZoom,
        zoomControl: false // We'll add this separately
      });
      
      // Add zoom control to the top-right
      var zoomControl = L.control.zoom({
        position: 'topright'
      });
      map.addControl(zoomControl);
      layers.controls.zoom = zoomControl;
      
      // Add the base layer
      addBaseLayer('default', getBaseLayerUrl(mapOptions), mapOptions);
      
      // Create a layer group for trains
      layers.trainLayers = L.layerGroup().addTo(map);
      
      // Register for map events
      if (map.on && typeof map.on === 'function') {
        // Wanneer de kaart wordt verplaatst, updatePosition
        map.on('moveend', function() {
          // Bewaar huidige positie in mapOptions
          if (map && map.getCenter) {
            mapOptions.center = [map.getCenter().lat, map.getCenter().lng];
            mapOptions.zoom = map.getZoom();
          }
        });
        
        // Registreer voor load event
        map.on('load', function() {
          resizeMap();
        });
        
        // Bijhouden voor cleanup
        registerEventHandler(map, 'moveend', mapOptions);
        registerEventHandler(map, 'load', resizeMap);
      }
      
      // Resize de kaart na een kort moment om rendering issues te voorkomen
      setTimeout(function() {
        resizeMap();
      }, 250);
      
      // Theme the map based on Qlik Sense theme
      applyQlikTheme();
      
      // Return the map instance
      return map;
    } catch (e) {
      console.error('Fout bij initialiseren van de kaart:', e);
      
      // Probeer om verwijzingen naar ongeldige kaart op te ruimen
      destroyMap();
      
      // Toon foutbericht in de container
      $(container).html('<div class="map-error">Er is een fout opgetreden bij het laden van de kaart.<br>Probeer de pagina te vernieuwen.</div>');
      
      return null;
    }
  }
  
  /**
   * Apply Qlik Sense theme to the map
   */
  function applyQlikTheme() {
    if (!map) return;
    
    try {
      // Get current theme (light/dark)
      var theme = QlikStyle.getCurrentTheme();
      
      // Apply theme-specific styling
      if (theme === 'qlik-dark') {
        // Dark theme styling
        $('.leaflet-container').addClass('dark-theme-map');
        
        // Switch to dark themed tiles if available
        setDarkTheme();
      } else {
        // Light theme styling (default)
        $('.leaflet-container').removeClass('dark-theme-map');
        
        // Switch to light themed tiles
        setLightTheme();
      }
    } catch (e) {
      console.error('Fout bij toepassen thema op kaart:', e);
    }
  }
  
  /**
   * Set light theme for map
   */
  function setLightTheme() {
    if (!map || !layers.baseLayers.default) return;
    updateBaseLayer(getBaseLayerUrl({theme: 'light'}));
  }
  
  /**
   * Set dark theme for map
   */
  function setDarkTheme() {
    if (!map || !layers.baseLayers.default) return;
    updateBaseLayer(getBaseLayerUrl({theme: 'dark'}));
  }
  
  /**
   * Get base layer URL based on theme
   * @param {Object} options - Options containing theme
   * @returns {String} URL template for the base layer
   */
  function getBaseLayerUrl(options) {
    var isDark = options && options.theme === 'dark';
    
    // Use a different tile provider based on theme
    if (isDark) {
      // Dark theme map tiles
      return 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    } else {
      // Light theme map tiles (default)
      return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    }
  }
  
  /**
   * Update the base layer URL
   * @param {String} url - New URL for the base layer
   */
  function updateBaseLayer(url) {
    if (!map || !layers.baseLayers.default) return;
    
    try {
      // Remove the current base layer
      map.removeLayer(layers.baseLayers.default);
      
      // Create a new base layer with the updated URL
      layers.baseLayers.default = L.tileLayer(url, {
        attribution: defaultSettings.attribution,
        maxZoom: defaultSettings.maxZoom
      }).addTo(map);
    } catch (e) {
      console.error('Fout bij updaten base layer:', e);
      
      // Probeer een nieuwe baselayer te maken bij fout
      addBaseLayer('default', url, defaultSettings);
    }
  }
  
  /**
   * Add a base layer to the map
   * @param {String} name - Name identifier for the layer
   * @param {String} url - URL template for the tile layer
   * @param {Object} options - Additional options for the layer
   */
  function addBaseLayer(name, url, options) {
    if (!map) return;
    
    try {
      // Remove existing layer with the same name if it exists
      if (layers.baseLayers[name]) {
        map.removeLayer(layers.baseLayers[name]);
        layers.baseLayers[name] = null;
      }
      
      // Create and add the new base layer
      layers.baseLayers[name] = L.tileLayer(url, {
        attribution: options.attribution || defaultSettings.attribution,
        maxZoom: options.maxZoom || defaultSettings.maxZoom,
        minZoom: options.minZoom || defaultSettings.minZoom
      }).addTo(map);
    } catch (e) {
      console.error('Fout bij toevoegen base layer:', e);
    }
  }
  
  /**
   * Voeg een overlay layer toe aan de kaart
   * @param {String} name - Naam identifier voor de laag
   * @param {Object} layer - Leaflet layer object
   * @param {Boolean} addToMap - Of de laag direct moet worden toegevoegd aan de kaart
   */
  function addOverlayLayer(name, layer, addToMap) {
    if (!map || !layer) return;
    
    try {
      // Verwijder bestaande laag met dezelfde naam indien aanwezig
      if (layers.overlays[name]) {
        map.removeLayer(layers.overlays[name]);
        layers.overlays[name] = null;
      }
      
      // Sla nieuwe laag op
      layers.overlays[name] = layer;
      
      // Voeg toe aan kaart indien gewenst
      if (addToMap) {
        layer.addTo(map);
      }
    } catch (e) {
      console.error('Fout bij toevoegen overlay layer:', e);
    }
  }
  
  /**
   * Set the map view (center and zoom)
   * @param {Number} lat - Latitude
   * @param {Number} lng - Longitude
   * @param {Number} zoom - Zoom level
   */
  function setMapView(lat, lng, zoom) {
    if (!map) return;
    
    try {
      map.setView([lat, lng], zoom);
    } catch (e) {
      console.error('Fout bij instellen map view:', e);
    }
  }
  
  /**
   * Center the map on a specific location
   * @param {Number} lat - Latitude
   * @param {Number} lng - Longitude
   */
  function centerMap(lat, lng) {
    if (!map) return;
    
    try {
      map.panTo([lat, lng]);
    } catch (e) {
      console.error('Fout bij centreren van de kaart:', e);
    }
  }
  
  /**
   * Resize the map to fit its container
   */
  function resizeMap() {
    if (!map) return;
    
    try {
      // Gebruik requestAnimationFrame voor betere timing met browser rendering
      window.requestAnimationFrame(function() {
        map.invalidateSize({animate: false});
      });
    } catch (e) {
      console.error('Fout bij resizen van de kaart:', e);
    }
  }
  
  /**
   * Clear all overlays from the map
   */
  function clearMap() {
    if (!map) return;
    
    try {
      // Clear train layers
      if (layers.trainLayers) {
        layers.trainLayers.clearLayers();
      }
      
      // Clear all overlay layers
      Object.keys(layers.overlays).forEach(function(name) {
        try {
          if (layers.overlays[name]) {
            map.removeLayer(layers.overlays[name]);
          }
        } catch (e) {
          console.error('Fout bij verwijderen overlay layer:', e);
        }
      });
      
      layers.overlays = {};
    } catch (e) {
      console.error('Fout bij leegmaken van de kaart:', e);
    }
  }
  
  /**
   * Get the Leaflet map instance
   * @returns {Object} Leaflet map instance
   */
  function getMap() {
    return map;
  }
  
  /**
   * Get the train layers group
   * @returns {Object} Leaflet layer group for trains
   */
  function getTrainLayers() {
    return layers.trainLayers;
  }
  
  /**
   * Clean up the map when no longer needed
   */
  function destroyMap() {
    // Verwijder alle event handlers
    removeAllEventHandlers();
    
    // Opruimen van de kaart
    if (map) {
      try {
        // Verwijder alle layers
        clearMap();
        
        // Verwijder base layers
        Object.keys(layers.baseLayers).forEach(function(name) {
          try {
            if (layers.baseLayers[name]) {
              map.removeLayer(layers.baseLayers[name]);
            }
          } catch (e) {
            console.error('Fout bij verwijderen base layer:', e);
          }
        });
        
        // Verwijder controls
        Object.keys(layers.controls).forEach(function(name) {
          try {
            if (layers.controls[name]) {
              map.removeControl(layers.controls[name]);
            }
          } catch (e) {
            console.error('Fout bij verwijderen control:', e);
          }
        });
        
        // Verwijder de kaart zelf
        map.remove();
      } catch (e) {
        console.error('Fout bij opruimen van de kaart:', e);
      }
      
      // Reset referenties
      map = null;
      layers = {
        baseLayers: {},
        trainLayers: null,
        controls: {},
        overlays: {}
      };
    }
  }
  
  /**
   * Voeg een schaal control toe aan de kaart
   */
  function addScaleControl() {
    if (!map) return;
    
    try {
      if (!layers.controls.scale) {
        layers.controls.scale = L.control.scale({
          imperial: false,
          position: 'bottomright'
        }).addTo(map);
      }
    } catch (e) {
      console.error('Fout bij toevoegen schaal control:', e);
    }
  }
  
  /**
   * Controleer of de kaart correct is geïnitialiseerd
   * @returns {boolean} True als de kaart correct is geïnitialiseerd
   */
  function isMapInitialized() {
    return !!map;
  }
  
  // Return the public API
  return {
    initMap: initMap,
    setMapView: setMapView,
    centerMap: centerMap,
    resizeMap: resizeMap,
    clearMap: clearMap,
    getMap: getMap,
    getTrainLayers: getTrainLayers,
    addBaseLayer: addBaseLayer,
    addOverlayLayer: addOverlayLayer,
    applyQlikTheme: applyQlikTheme,
    destroyMap: destroyMap,
    addScaleControl: addScaleControl,
    isMapInitialized: isMapInitialized
  };
});
