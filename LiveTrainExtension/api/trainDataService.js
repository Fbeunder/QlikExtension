/*
 * LiveTrainExtension - Een Qlik Sense extensie voor het live volgen van treinen
 * Service voor het ophalen van treingegevens van externe API's
 */
define(['jquery', './apiConfig'], function($, apiConfig) {
  'use strict';
  
  /**
   * Service voor het ophalen en verwerken van treingegevens
   */
  var trainDataService = function() {
    // Private variabelen
    var refreshTimer = null;
    var lastUpdate = null;
    var cachedData = null;
    var isRefreshing = false;
    var errorCount = 0;
    var MAX_ERROR_COUNT = 5;
    
    /**
     * Maakt de request headers aan voor API verzoeken
     * @returns {Object} Headers object
     */
    function getRequestHeaders() {
      var headers = {
        'Content-Type': 'application/json'
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
      
      // Voeg treinnummer filter toe als deze is opgegeven
      if (trainNumbers && trainNumbers.length > 0) {
        params.trainNumbers = trainNumbers.join(',');
      }
      
      // Voer de AJAX request uit
      return $.ajax({
        url: url,
        type: 'GET',
        data: params,
        headers: getRequestHeaders(),
        timeout: 10000 // 10 seconden timeout
      }).then(function(response) {
        // Reset error teller bij succesvolle call
        errorCount = 0;
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
     * Transformeert de API respons naar een bruikbaar formaat
     * @param {Object} response - Respons van de API
     * @returns {Array} Array met verwerkte treinlocaties
     */
    function transformAPIResponse(response) {
      if (!response || !response.data || !Array.isArray(response.data)) {
        return [];
      }
      
      // Transformeer de data naar een bruikbaar formaat
      return response.data.map(function(item) {
        // Basis treinobject met informatie
        var train = {
          id: item.trainNumber || item.id || 'unknown_' + Math.random().toString(36).substr(2, 9),
          number: item.trainNumber || 'Onbekend',
          position: {
            lat: parseFloat(item.latitude || 0),
            lng: parseFloat(item.longitude || 0)
          },
          speed: parseFloat(item.speed || 0),
          heading: parseFloat(item.heading || 0),
          timestamp: new Date(item.timestamp || Date.now()),
          status: determineTrainStatus(item),
          details: {
            type: item.trainType || 'Onbekend',
            operator: item.operator || 'Onbekend',
            origin: item.origin || 'Onbekend',
            destination: item.destination || 'Onbekend',
            platform: item.platform || 'Onbekend',
            delay: parseInt(item.delay || 0, 10)
          }
        };
        
        // Voeg eventuele extra gegevens toe
        if (item.extraData) {
          train.details.extraData = item.extraData;
        }
        
        return train;
      });
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
      
      // Bepaal status op basis van vertraging
      if (trainData.cancelled === true) {
        return apiConfig.constants.TRAIN_STATUS.CANCELLED;
      } else if (trainData.delay && parseInt(trainData.delay, 10) > 0) {
        return apiConfig.constants.TRAIN_STATUS.DELAYED;
      } else {
        return apiConfig.constants.TRAIN_STATUS.ON_TIME;
      }
    }
    
    /**
     * Start de automatische verversing van treingegevens
     * @param {Function} callback - Functie die wordt aangeroepen bij elke update
     * @param {number} interval - Interval in milliseconden (min 5000)
     */
    function startAutoRefresh(callback, interval) {
      // Stop eerst eventuele bestaande timer
      stopAutoRefresh();
      
      // Valideer de interval
      var refreshInterval = Math.max(
        apiConfig.constants.REFRESH_INTERVALS.MINIMUM,
        interval || apiConfig.constants.REFRESH_INTERVALS.DEFAULT
      );
      
      // Start nieuwe timer voor automatische updates
      refreshTimer = setInterval(function() {
        // Voorkom overlappende verversingen
        if (isRefreshing) {
          return;
        }
        
        isRefreshing = true;
        
        // Direct gegevens ophalen zonder filter
        getTrainLocations()
          .then(function(data) {
            isRefreshing = false;
            if (typeof callback === 'function') {
              callback(data);
            }
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
    
    // Publieke methoden
    return {
      /**
       * Haalt de meest recente treinlocatie gegevens op
       * @param {Array} trainNumbers - Optionele array met treinnummers om te filteren
       * @returns {Promise} Promise die resolvet naar treinlocatie data
       */
      getTrainLocations: function(trainNumbers) {
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
      },
      
      /**
       * Start automatische verversing van treingegevens
       * @param {Function} callback - Functie die wordt aangeroepen bij elke update
       * @param {number} intervalSeconds - Interval in seconden (min 5)
       */
      startAutoRefresh: function(callback, intervalSeconds) {
        var interval = (intervalSeconds || 30) * 1000; // Converteer naar milliseconden
        startAutoRefresh(callback, interval);
      },
      
      /**
       * Stopt automatische verversing van treingegevens
       */
      stopAutoRefresh: function() {
        stopAutoRefresh();
      },
      
      /**
       * Transformeert API-respons naar een bruikbaar formaat
       * @param {Object} response - API respons object
       * @returns {Array} Getransformeerde treingegevens
       */
      transformAPIResponse: transformAPIResponse,
      
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
      }
    };
  }();
  
  return trainDataService;
});
