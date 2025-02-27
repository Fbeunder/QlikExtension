/*
 * LiveTrainExtension - Een Qlik Sense extensie voor het live volgen van treinen
 * API configuratie voor endpoints en authenticatie
 */
define([], function() {
  'use strict';
  
  /**
   * API configuratie-object met endpoints en parameters voor treindataverzoeken
   */
  var apiConfig = {
    // Basis URL voor de NS API
    baseUrl: 'https://gateway.apiportal.ns.nl/virtual-train-api/api',
    
    // Endpoints voor verschillende diensten
    endpoints: {
      trainLocations: '/vehicle',    // Endpoint voor treinlocaties
      trainDetails: '/vehicle',      // Endpoint voor details van specifieke treinen
      stations: '/stations'          // Endpoint voor stationsinformatie (indien beschikbaar)
    },
    
    // API authenticatie informatie
    auth: {
      method: 'apiKey',          // Authenticatiemethode
      headerName: 'Ocp-Apim-Subscription-Key',  // Naam van de header voor de NS API key
      key: ''                    // API-key waarde (moet door de gebruiker worden ingesteld)
    },
    
    // Standaard parameters voor API verzoeken
    defaultParams: {
      lat: 52.3676,     // Standaard latitude (Amsterdam)
      lng: 4.9041,      // Standaard longitude (Amsterdam)
      features: 'trein' // Filter op treintype
    },
    
    // Constanten voor API parameters
    constants: {
      // Verversingsintervals (in ms)
      REFRESH_INTERVALS: {
        MINIMUM: 5000,    // Minimale verversingstijd
        DEFAULT: 30000,   // Standaard verversingstijd
        MAXIMUM: 300000   // Maximale verversingstijd
      },
      
      // Status van treinen
      TRAIN_STATUS: {
        ON_TIME: 'ON_TIME',
        DELAYED: 'DELAYED',
        CANCELLED: 'CANCELLED',
        UNKNOWN: 'UNKNOWN'
      }
    },
    
    /**
     * Hulpfunctie voor het opbouwen van een volledige URL voor een API endpoint
     * @param {string} endpoint - Relatieve endpoint path
     * @returns {string} Volledige API URL
     */
    buildUrl: function(endpoint) {
      return this.baseUrl + (endpoint.startsWith('/') ? endpoint : '/' + endpoint);
    },
    
    /**
     * Methode om te configureren of te initialiseren wat nodig is
     * @param {Object} options - Configuratie opties
     */
    configure: function(options) {
      if (options) {
        // Overschrijf configuratie met opgegeven opties
        if (options.baseUrl) this.baseUrl = options.baseUrl;
        if (options.apiKey) this.auth.key = options.apiKey;
        
        // Update default parameters indien opgegeven
        if (options.lat) this.defaultParams.lat = options.lat;
        if (options.lng) this.defaultParams.lng = options.lng;
      }
    }
  };
  
  return apiConfig;
});
