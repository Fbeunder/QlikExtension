/*
 * LiveTrainExtension - Een Qlik Sense extensie voor het live volgen van treinen
 * Kaart renderer module
 */
define([
  'jquery',
  '../lib/js/qlik-style',
  'qlik'
], function($, QlikStyle, qlik) {
  'use strict';
  
  // Map object reference
  var map = null;
  
  // Layer groups
  var layers = {
    baseLayers: {},
    trainLayers: null,
    controls: null
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
   * Initialize the map in the container element
   * @param {HTMLElement} container - The DOM element to render the map in
   * @param {Object} options - Map configuration options
   * @returns {Object} Leaflet map instance
   */
  function initMap(container, options) {
    // Don't reinitialize if map already exists and container is the same
    if (map && map.getContainer() === container) {
      return map;
    }
    
    // Combine default settings with provided options
    var mapOptions = $.extend({}, defaultSettings, options || {});
    
    // Create the map if it doesn't exist or container changed
    if (map) {
      map.remove(); // Clean up existing map
    }
    
    // Make sure the container is empty and has proper dimensions
    $(container).empty();
    $(container).css({
      width: '100%',
      height: '100%'
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
    
    // Add the base layer
    addBaseLayer('default', getBaseLayerUrl(mapOptions), mapOptions);
    
    // Create a layer group for trains
    layers.trainLayers = L.layerGroup().addTo(map);
    
    // Theme the map based on Qlik Sense theme
    applyQlikTheme();
    
    // Return the map instance
    return map;
  }
  
  /**
   * Apply Qlik Sense theme to the map
   */
  function applyQlikTheme() {
    if (!map) return;
    
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
    
    // Remove the current base layer
    map.removeLayer(layers.baseLayers.default);
    
    // Create a new base layer with the updated URL
    layers.baseLayers.default = L.tileLayer(url, {
      attribution: defaultSettings.attribution,
      maxZoom: defaultSettings.maxZoom
    }).addTo(map);
  }
  
  /**
   * Add a base layer to the map
   * @param {String} name - Name identifier for the layer
   * @param {String} url - URL template for the tile layer
   * @param {Object} options - Additional options for the layer
   */
  function addBaseLayer(name, url, options) {
    if (!map) return;
    
    // Remove existing layer with the same name if it exists
    if (layers.baseLayers[name]) {
      map.removeLayer(layers.baseLayers[name]);
    }
    
    // Create and add the new base layer
    layers.baseLayers[name] = L.tileLayer(url, {
      attribution: options.attribution || defaultSettings.attribution,
      maxZoom: options.maxZoom || defaultSettings.maxZoom,
      minZoom: options.minZoom || defaultSettings.minZoom
    }).addTo(map);
  }
  
  /**
   * Set the map view (center and zoom)
   * @param {Number} lat - Latitude
   * @param {Number} lng - Longitude
   * @param {Number} zoom - Zoom level
   */
  function setMapView(lat, lng, zoom) {
    if (!map) return;
    map.setView([lat, lng], zoom);
  }
  
  /**
   * Center the map on a specific location
   * @param {Number} lat - Latitude
   * @param {Number} lng - Longitude
   */
  function centerMap(lat, lng) {
    if (!map) return;
    map.panTo([lat, lng]);
  }
  
  /**
   * Resize the map to fit its container
   */
  function resizeMap() {
    if (!map) return;
    map.invalidateSize();
  }
  
  /**
   * Clear all overlays from the map
   */
  function clearMap() {
    if (!map || !layers.trainLayers) return;
    layers.trainLayers.clearLayers();
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
    if (map) {
      map.remove();
      map = null;
      layers = {
        baseLayers: {},
        trainLayers: null,
        controls: null
      };
    }
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
    applyQlikTheme: applyQlikTheme,
    destroyMap: destroyMap
  };
});
