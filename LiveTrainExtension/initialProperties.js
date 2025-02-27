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
    
    // Interactie instellingen
    selectionMode: 'click',
    allowSelectionFromMap: true,
    bidirectionalSelection: true,
    highlightSelectedTrains: true,
    
    // Kaart instellingen
    defaultZoom: 7,
    defaultCenter: {
      lat: 52.1326,
      lng: 5.2913
    },
    followSelectedTrains: true,
    maxTrainsToShow: 50,
    
    // Update instellingen
    autoRefresh: true,
    refreshIntervalType: 'normal', // 'fast', 'normal', 'slow', 'custom'
    refreshInterval: 15, // Seconden
    pauseRefreshWhenNotVisible: true,
    refreshOnSelection: true,
    showUpdateIndicator: true,
    
    // Animatie instellingen
    animateUpdates: true,
    animationDuration: 1000, // Milliseconden
    
    // Data instellingen
    maxResults: 100,
    filterBySelection: false
  };
});
