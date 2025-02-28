/*
 * LiveTrainExtension - Een Qlik Sense extensie voor het live volgen van treinen
 * API configuratie voor endpoints en authenticatie
 */
define(['./apiKey'], function(apiKeyConfig) {
  'use strict';
  
  /**
   * API configuratie-object met endpoints en parameters voor treindataverzoeken
   */
  var apiConfig = {
    // Basis URL voor de NS API
    baseUrl: 'https://gateway.apiportal.ns.nl/virtual-train-api/api',
    
    // CORS proxy URL wanneer nodig voor cross-origin verzoeken
    corsProxyUrl: '',
    
    // Flag om aan te geven of CORS proxy moet worden gebruikt
    useCorsProxy: false,
    
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
      key: ''                    // API-key waarde (wordt geladen uit apiKey.js)
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
        DIVERTED: 'DIVERTED',
        UNKNOWN: 'UNKNOWN'
      }
    },
    
    /**
     * Hulpfunctie voor het opbouwen van een volledige URL voor een API endpoint
     * @param {string} endpoint - Relatieve endpoint path
     * @returns {string} Volledige API URL
     */
    buildUrl: function(endpoint) {
      let url = this.baseUrl + (endpoint.startsWith('/') ? endpoint : '/' + endpoint);
      
      // Als CORS proxy is ingeschakeld, voeg deze toe aan de URL
      if (this.useCorsProxy && this.corsProxyUrl) {
        // Zorg ervoor dat we correcte URL encodering gebruiken
        return this.corsProxyUrl + encodeURIComponent(url);
      }
      
      return url;
    },
    
    /**
     * Laadt de API sleutel uit de apiKey.js configuratie
     * @param {string} [environment] - Optionele omgeving ('dev' of 'prod')
     */
    loadApiKey: function(environment) {
      if (apiKeyConfig && typeof apiKeyConfig.getApiKey === 'function') {
        this.auth.key = apiKeyConfig.getApiKey(environment);
        console.log('API sleutel geladen' + (environment ? ' voor omgeving: ' + environment : ''));
      } else {
        console.warn('Kan API sleutel niet laden uit apiKey.js. Controleer of de apiKey.js correct is geconfigureerd.');
      }
    },
    
    /**
     * Methode om te configureren of te initialiseren wat nodig is
     * @param {Object} options - Configuratie opties
     */
    configure: function(options) {
      // Laad eerst de API sleutel
      this.loadApiKey(options && options.environment);
      
      if (options) {
        // Overschrijf configuratie met opgegeven opties
        if (options.baseUrl) this.baseUrl = options.baseUrl;
        if (options.apiKey) this.auth.key = options.apiKey;
        
        // Update CORS proxy instellingen indien opgegeven
        if (options.corsProxyUrl !== undefined) this.corsProxyUrl = options.corsProxyUrl;
        if (options.useCorsProxy !== undefined) this.useCorsProxy = !!options.useCorsProxy;
        
        // Update default parameters indien opgegeven
        if (options.lat) this.defaultParams.lat = parseFloat(options.lat);
        if (options.lng) this.defaultParams.lng = parseFloat(options.lng);
        
        // Update API auth instellingen indien opgegeven
        if (options.authHeaderName) this.auth.headerName = options.authHeaderName;
      }
    },
    
    /**
     * Controleer of de API configuratie geldig is
     * @returns {Object} Object met validatiestatus en eventuele foutmelding
     */
    validate: function() {
      let result = {
        isValid: true,
        errors: []
      };
      
      // Controleer of er een API key is ingesteld
      if (!this.auth.key) {
        result.isValid = false;
        result.errors.push('Geen API key geconfigureerd. Voeg uw API sleutel toe in het bestand apiKey.js.');
      }
      
      // Controleer of de basis URL is ingesteld
      if (!this.baseUrl) {
        result.isValid = false;
        result.errors.push('Geen basis URL geconfigureerd.');
      }
      
      // Als CORS proxy is ingeschakeld, moet er een proxy URL zijn
      if (this.useCorsProxy && !this.corsProxyUrl) {
        result.isValid = false;
        result.errors.push('CORS proxy is ingeschakeld maar geen proxy URL geconfigureerd.');
      }
      
      return result;
    }
  };
  
  // Initialiseer de API sleutel bij het laden van de module
  apiConfig.loadApiKey();
  
  return apiConfig;
});