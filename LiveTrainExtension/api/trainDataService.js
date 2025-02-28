/*
 * LiveTrainExtension - Een Qlik Sense extensie voor het live volgen van treinen
 * Service voor het ophalen van treingegevens van externe API's
 */
define(['jquery', './apiConfig'], function($, apiConfig) {
  'use strict';
  
  /**
   * Service voor het ophalen en verwerken van treingegevens
   */
  return (function() {
    // Private variabelen
    var refreshTimer = null;
    var lastUpdate = null;
    var cachedData = null;
    var isRefreshing = false;
    var errorCount = 0;
    var MAX_ERROR_COUNT = 5;
    var refreshCallbacks = [];
    
    /**
     * Maakt de request headers aan voor API verzoeken
     * @returns {Object} Headers object
     */
    function getRequestHeaders() {
      var headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      
      // Voeg autorisatie toe als er een API key is geconfigureerd
      if (apiConfig.auth && apiConfig.auth.key) {
        headers[apiConfig.auth.headerName] = apiConfig.auth.key;
      }
      
      return headers;
    }
    
    /**
     * Voert de API call uit om treinlocaties op te halen
     * @param {Array} trainNumbers - Optionele array met treinnummers om te filteren
     * @returns {Promise} Promise die resolvet naar treinlocatie data
     */
    function fetchTrainLocationsFromAPI(trainNumbers) {
      // Bouw de API URL op
      var url = apiConfig.buildUrl(apiConfig.endpoints.trainLocations);
      
      // Maak query parameters aan
      var params = Object.assign({}, apiConfig.defaultParams);
      
      // Voer de AJAX request uit
      return $.ajax({
        url: url,
        type: 'GET',
        data: params,
        headers: getRequestHeaders(),
        timeout: 15000 // 15 seconden timeout voor de NS API
      }).then(function(response) {
        // Reset error teller bij succesvolle call
        errorCount = 0;
        
        // Controleer of response geldig is
        if (!response) {
          throw new Error('Empty response received from API');
        }
        
        // Filter resultaten op treinnummers als die zijn opgegeven
        if (trainNumbers && trainNumbers.length > 0) {
          return filterByTrainNumbers(response, trainNumbers);
        }
        
        return response;
      }).catch(function(error) {
        // Houd bij hoeveel errors er zijn opgetreden
        errorCount++;
        console.error('Error fetching train data:', error);
        
        // Stop automatische verversing bij teveel errors
        if (errorCount >= MAX_ERROR_COUNT) {
          stopAutoRefresh();
          console.error('Stopped auto refresh after ' + MAX_ERROR_COUNT + ' consecutive errors');
        }
        
        // Geef fout door aan aanroeper
        throw error;
      });
    }
    
    /**
     * Filtert de API respons op specifieke treinnummers
     * @param {Object} response - De originele API respons
     * @param {Array} trainNumbers - Array met treinnummers om te filteren
     * @returns {Object} Gefilterde respons
     */
    function filterByTrainNumbers(response, trainNumbers) {
      if (!response || !response.payload || !Array.isArray(response.payload.treinen)) {
        return { payload: { treinen: [] } };
      }
      
      // Maak een set van treinnummers voor effectieve lookup
      var trainNumberSet = new Set();
      trainNumbers.forEach(function(num) {
        // Zorg ervoor dat nummers als strings worden opgeslagen
        trainNumberSet.add(String(num).trim());
      });
      
      // Filter de treinen op treinnummer
      var filteredTrains = response.payload.treinen.filter(function(train) {
        return train.treinNummer && trainNumberSet.has(String(train.treinNummer).trim());
      });
      
      // Maak een nieuwe response met alleen de gefilterde treinen
      var filteredResponse = {
        payload: {
          treinen: filteredTrains
        }
      };
      
      return filteredResponse;
    }
    
    /**
     * Transformeert de API respons naar een bruikbaar formaat
     * @param {Object} response - Respons van de API
     * @returns {Array} Array met verwerkte treinlocaties
     */
    function transformAPIResponse(response) {
      // Verbeterde validatie van de API response
      if (!response) {
        console.warn('Received empty response');
        return [];
      }
      
      if (!response.payload) {
        console.warn('Response missing payload property');
        return [];
      }
      
      if (!Array.isArray(response.payload.treinen)) {
        console.warn('Response payload.treinen is not an array');
        return [];
      }
      
      // Transformeer de NS API data naar een bruikbaar formaat
      return response.payload.treinen.map(function(item) {
        // Bepaal de status op basis van beschikbare data
        var status = determineTrainStatus(item);
        
        // Basis treinobject met informatie
        var train = {
          id: item.treinNummer || 'unknown_' + Math.random().toString(36).substr(2, 9),
          number: item.treinNummer || 'Onbekend',
          position: {
            lat: parseFloat(item.lat || 0),
            lng: parseFloat(item.lng || 0)
          },
          speed: parseFloat(item.snelheid || 0),
          heading: parseFloat(item.richting || 0),
          timestamp: new Date(item.tijd || Date.now()),
          status: status,
          details: {
            type: item.type || 'Onbekend',
            operator: item.vervoerder || 'NS',
            origin: item.herkomst || 'Onbekend',
            destination: item.bestemming || 'Onbekend',
            platform: item.spoor || 'Onbekend',
            delay: calculateDelayInMinutes(item)
          }
        };
        
        // Voeg eventuele extra gegevens toe
        if (item.info) {
          train.details.info = item.info;
        }
        
        if (item.materieel && Array.isArray(item.materieel)) {
          train.details.materieel = item.materieel.join(', ');
        }
        
        return train;
      });
    }
    
    /**
     * Berekent de vertraging in minuten op basis van de API data
     * @param {Object} trainData - Treingegevens uit de API
     * @returns {number} Vertraging in minuten
     */
    function calculateDelayInMinutes(trainData) {
      // Als er geen data is of geen vertraging, return 0
      if (!trainData || !trainData.vertraging) {
        return 0;
      }
      
      // NS API geeft vertraging als string, bijv. "PT5M" (5 minuten)
      var delayString = trainData.vertraging;
      
      // Controleer op null of undefined
      if (!delayString) {
        return 0;
      }
      
      // Extraheer de minuten uit de ISO8601 duration string
      var minutesMatch = delayString.match(/PT(\d+)M/);
      if (minutesMatch && minutesMatch[1]) {
        return parseInt(minutesMatch[1], 10);
      }
      
      // Probeer ook uren te extraheren indien aanwezig (bijv. PT1H30M)
      var hoursMatch = delayString.match(/PT(\d+)H/);
      if (hoursMatch && hoursMatch[1]) {
        var hours = parseInt(hoursMatch[1], 10);
        // Converteer uren naar minuten en voeg eventuele minuten toe
        return hours * 60 + (minutesMatch && minutesMatch[1] ? parseInt(minutesMatch[1], 10) : 0);
      }
      
      return 0;
    }
    
    /**
     * Bepaalt de status van een trein op basis van de API data
     * @param {Object} trainData - Treingegevens uit de API
     * @returns {string} Statuscode
     */
    function determineTrainStatus(trainData) {
      // Als er geen data is, is de status onbekend
      if (!trainData) {
        return apiConfig.constants.TRAIN_STATUS.UNKNOWN;
      }
      
      // Uitgebreidere status bepaling
      if (!trainData.status) {
        // Geen status informatie beschikbaar
        return apiConfig.constants.TRAIN_STATUS.UNKNOWN;
      }
      
      // Normaliseer de status string voor vergelijking
      var normalizedStatus = trainData.status.toUpperCase();
      
      if (normalizedStatus === 'NIET-GEPLAND' || normalizedStatus === 'CANCELLED') {
        return apiConfig.constants.TRAIN_STATUS.CANCELLED;
      } else if (normalizedStatus === 'DELAYED' || normalizedStatus === 'VERTRAAGD') {
        return apiConfig.constants.TRAIN_STATUS.DELAYED;
      } else if (normalizedStatus === 'DIVERTED' || normalizedStatus === 'OMGELEID') {
        return apiConfig.constants.TRAIN_STATUS.DIVERTED;
      } else if (trainData.vertraging) {
        // Er is vertraging, zelfs als de status dat niet aangeeft
        return apiConfig.constants.TRAIN_STATUS.DELAYED;
      } else if (normalizedStatus === 'ON_TIME' || normalizedStatus === 'OP_TIJD') {
        return apiConfig.constants.TRAIN_STATUS.ON_TIME;
      } else {
        // Standaard op tijd als er geen andere status is opgegeven
        return apiConfig.constants.TRAIN_STATUS.ON_TIME;
      }
    }
    
    /**
     * Haalt de meest recente treinlocatie gegevens op
     * @param {Array} trainNumbers - Optionele array met treinnummers om te filteren
     * @returns {Promise} Promise die resolvet naar treinlocatie data
     */
    function getTrainLocations(trainNumbers) {
      return fetchTrainLocationsFromAPI(trainNumbers)
        .then(function(response) {
          // Update timestamp van laatste update
          lastUpdate = new Date();
          
          // Transformeer de data
          var transformed = transformAPIResponse(response);
          
          // Cache de getransformeerde data
          cachedData = transformed;
          
          return transformed;
        });
    }
    
    /**
     * Start automatische verversing van treingegevens
     * @param {Function} callback - Functie die wordt aangeroepen bij elke update
     * @param {number} intervalSeconds - Interval in seconden (min 5)
     */
    function startAutoRefresh(callback, intervalSeconds) {
      // Registreer de callback voor verversing als deze nog niet bestaat
      if (callback && typeof callback === 'function' && refreshCallbacks.indexOf(callback) === -1) {
        refreshCallbacks.push(callback);
      }
      
      // Als er al een timer loopt, alleen de nieuwe callback toevoegen
      if (refreshTimer) {
        console.log('Auto refresh already running, added new callback');
        return;
      }
      
      // Valideer de interval
      var interval = (intervalSeconds || 30) * 1000; // Converteer naar milliseconden
      var refreshInterval = Math.max(
        apiConfig.constants.REFRESH_INTERVALS.MINIMUM,
        interval || apiConfig.constants.REFRESH_INTERVALS.DEFAULT
      );
      
      // Start nieuwe timer voor automatische updates
      refreshTimer = setInterval(function performRefresh() {
        // Voorkom overlappende verversingen
        if (isRefreshing) {
          return;
        }
        
        isRefreshing = true;
        
        // Direct gegevens ophalen zonder filter
        getTrainLocations()
          .then(function(data) {
            isRefreshing = false;
            // Roep alle geregistreerde callbacks aan
            refreshCallbacks.forEach(function(cb) {
              try {
                cb(data);
              } catch (e) {
                console.error('Error in refresh callback:', e);
              }
            });
          })
          .catch(function(error) {
            isRefreshing = false;
            console.error('Error during auto refresh:', error);
          });
      }, refreshInterval);
      
      console.log('Auto refresh started with interval: ' + refreshInterval + 'ms');
    }
    
    /**
     * Stopt de automatische verversing van treingegevens
     */
    function stopAutoRefresh() {
      if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
        console.log('Auto refresh stopped');
      }
    }
    
    /**
     * Ruimt alle resources op en reset de service naar initiële staat
     */
    function cleanup() {
      // Stop timer voor auto refresh
      stopAutoRefresh();
      
      // Reset alle variabelen
      lastUpdate = null;
      cachedData = null;
      isRefreshing = false;
      errorCount = 0;
      refreshCallbacks = [];
      
      console.log('Train data service cleaned up');
    }
    
    // Returneer publieke API
    return {
      getTrainLocations: getTrainLocations,
      startAutoRefresh: startAutoRefresh,
      stopAutoRefresh: stopAutoRefresh,
      cleanup: cleanup,
      
      /**
       * Haalt het tijdstip van de laatste update op
       * @returns {Date|null} Tijdstip van laatste update of null indien geen update
       */
      getLastUpdateTime: function() {
        return lastUpdate;
      },
      
      /**
       * Haalt gecachte treingegevens op zonder nieuwe API call
       * @returns {Array|null} Gecachte treingegevens of null indien geen cache
       */
      getCachedData: function() {
        return cachedData;
      },
      
      /**
       * Configureert de API-instellingen
       * @param {Object} options - Configuratie opties
       */
      configure: function(options) {
        apiConfig.configure(options);
      },
      
      /**
       * Verwijdert een specifieke callback uit de refresh lijst
       * @param {Function} callback - De callback functie om te verwijderen
       * @returns {boolean} true als de callback is verwijderd, anders false
       */
      removeRefreshCallback: function(callback) {
        var index = refreshCallbacks.indexOf(callback);
        if (index !== -1) {
          refreshCallbacks.splice(index, 1);
          return true;
        }
        return false;
      }
    };
  })();
});