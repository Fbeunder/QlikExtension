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
    // Standaard verversingsfrequentie in seconden
    refreshInterval: 30,
    // Standaard kaart zoom niveau
    defaultZoom: 7,
    // Kaart centreren op Nederland
    defaultCenter: {
      lat: 52.1326,
      lng: 5.2913
    },
    // Moet de extensie automatisch verversen?
    autoRefresh: true,
    // Moet de kaart volgen op geselecteerde treinen?
    followSelectedTrains: true,
    // Maximum aantal treinen om te tonen
    maxTrainsToShow: 50
  };
});