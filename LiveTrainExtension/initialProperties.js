/*
 * LiveTrainExtension - Een Qlik Sense extensie voor het live volgen van treinen
 * Initiële eigenschappen configuratie
 */
define([], function() {
  'use strict';
  
  return {
    // Definieer de dimensies en metingen voor integratie met Qlik Sense
    qHyperCubeDef: {
      qDimensions: [],
      qMeasures: [],
      qInitialDataFetch: [{
        qWidth: 10,
        qHeight: 50
      }]
    },
    
    // API Configuratie
    apiKey: '',
    useCorsProxy: false,
    corsProxyUrl: '',
    
    // Interactie instellingen
    selectionMode: 'click',
    allowSelectionFromMap: true,
    bidirectionalSelection: true,
    highlightSelectedTrains: true,
    
    // Kaart instellingen
    defaultZoom: 7,
    minZoom: 6,
    maxZoom: 18,
    defaultLat: 52.1326,
    defaultLng: 5.2913,
    followSelectedTrains: true,
    maxTrainsToShow: 50,
    showScale: true,
    
    // Update instellingen
    autoRefresh: true,
    refreshIntervalType: 'normal', // 'fast', 'normal', 'slow', 'custom'
    refreshInterval: 15, // Seconden
    pauseRefreshWhenNotVisible: true,
    refreshOnSelection: true,
    showUpdateIndicator: true,
    updateTableOnRefresh: false, // Alleen tabel bijwerken bij handmatige verversing
    
    // Animatie instellingen
    animateUpdates: true,
    animationDuration: 1000, // Milliseconden
    animationEasing: 'linear', // 'linear', 'easeIn', 'easeOut', 'easeInOut'
    animationSmoothness: 1, // Factor voor vloeiendheid (1-3)
    
    // Data instellingen
    maxResults: 100,
    filterBySelection: false,
    trainNumberFieldName: '' // Veldnaam voor treinnummers
  };
});
