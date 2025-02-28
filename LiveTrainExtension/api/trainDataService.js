/*
 * LiveTrainExtension - Een Qlik Sense extensie voor het live volgen van treinen
 * Service voor het ophalen van treingegevens van externe API's
 * Aangepast voor betere Qlik Cloud compatibiliteit
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
    var lastApiValidationCheck = null;
    var API_VALIDATION_INTERVAL = 60000; // 1 minuut
    var usePolyfillFetch = false; // Flag voor het gebruiken van Ajax als polyfill voor fetch
    var isQlikCloud = false; // Detecteer of we in Qlik Cloud draaien
    
    /**
     * Detecteer of we in Qlik Cloud omgeving draaien
     * @returns {boolean} True als we in Qlik Cloud draaien
     */
    function detectQlikCloudEnvironment() {
      try {
        // Probeer te detecteren of we in Qlik Cloud draaien
        if (window && window.location && window.location.hostname) {
          var hostname = window.location.hostname;
          // Check of we op een Qlik Cloud domein zijn
          if (hostname.indexOf('qlikcloud.com') !== -1 || 
              hostname.indexOf('eu.qlikcloud.com') !== -1 || 
              hostname.indexOf('us.qlikcloud.com') !== -1 ||
              hostname.indexOf('ap.qlikcloud.com') !== -1) {
            return true;
          }
        }
        return false;
      } catch (e) {
        console.warn('Fout bij detecteren Qlik Cloud omgeving:', e);
        return false;
      }
    }
    
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
      
      // Voeg CORS headers toe als we in Qlik Cloud draaien
      if (isQlikCloud) {
        headers['X-Requested-With'] = 'XMLHttpRequest';
      }
      
      return headers;
    }
    
    /**
     * Controleer of de API configuratie geldig is
     * @returns {boolean} True als configuratie geldig is, anders false
     */
    function validateApiConfiguration() {
      // Voorkom te frequente validatie
      var now = Date.now();
      if (lastApiValidationCheck && (now - lastApiValidationCheck < API_VALIDATION_INTERVAL)) {
        return true;
      }
      
      // Markeer tijdstip van laatste validatie
      lastApiValidationCheck = now;
      
      // Valideer configuratie
      var validationResult = apiConfig.validate();
      
      if (!validationResult.isValid) {
        console.error('API configuratie ongeldig:', validationResult.errors.join(', '));
        return false;
      }
      
      return true;
    }
    
    /**
     * Voert de API call uit om treinlocaties op te halen met verbeterde CORS handling
     * @param {Array} trainNumbers - Optionele array met treinnummers om te filteren
     * @returns {Promise} Promise die resolvet naar treinlocatie data
     */
    function fetchTrainLocationsFromAPI(trainNumbers) {
      // Valideer API configuratie
      if (!validateApiConfiguration()) {
        return $.Deferred().reject(new Error('Ongeldige API configuratie. Controleer de API sleutel en instellingen.')).promise();
      }
      
      // Bouw de API URL op
      var url = apiConfig.buildUrl(apiConfig.endpoints.trainLocations);
      
      // Maak query parameters aan
      var params = Object.assign({}, apiConfig.defaultParams);
      
      // Voeg train_number filter toe als er treinnummers zijn opgegeven
      if (trainNumbers && trainNumbers.length > 0 && Array.isArray(trainNumbers)) {
        // Als de API een parameter voor treinnummer filter ondersteunt, voeg deze toe
        if (trainNumbers.length <= 10) { // Beperk aantal voor URL-lengte
          params.trainNumbers = trainNumbers.join(',');
        }
      }
      
      // Bepaal of we fetch of ajax gebruiken
      if (window.fetch && !usePolyfillFetch) {
        // Modern: Gebruik fetch API
        return fetchWithFetch(url, params);
      } else {
        // Legacy: Gebruik jQuery AJAX
        return fetchWithAjax(url, params);
      }
    }
    
    /**
     * Fetch implementatie met moderne fetch API
     * @param {string} url - De API URL
     * @param {Object} params - Query parameters
     * @returns {Promise} Promise met respons data
     */
    function fetchWithFetch(url, params) {
      // Converteer params naar query string
      var queryString = Object.keys(params)
        .map(function(key) {
          return encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
        })
        .join('&');
      
      // Voeg query string toe aan URL
      var fullUrl = url + (url.indexOf('?') === -1 ? '?' : '&') + queryString;
      
      // Headers voor het verzoek
      var headers = getRequestHeaders();
      
      // Fetch opties
      var fetchOptions = {
        method: 'GET',
        headers: headers,
        mode: isQlikCloud ? 'cors' : 'same-origin',
        cache: 'no-cache',
        credentials: 'same-origin',
        redirect: 'follow',
        referrerPolicy: 'no-referrer-when-downgrade',
        timeout: 20000
      };
      
      // Voer de fetch uit met retry mechanisme
      return executeWithRetry(function() {
        return new Promise(function(resolve, reject) {
          // Gebruik AbortController voor timeout (indien ondersteund)
          var controller = window.AbortController ? new AbortController() : null;
          var timeoutId = null;
          
          if (controller) {
            fetchOptions.signal = controller.signal;
            timeoutId = setTimeout(function() {
              controller.abort();
            }, 20000); // 20 seconden timeout
          }
          
          fetch(fullUrl, fetchOptions)
            .then(function(response) {
              if (timeoutId) clearTimeout(timeoutId);
              
              if (!response.ok) {
                throw new Error('Netwerk respons was niet ok: ' + response.status + ' ' + response.statusText);
              }
              return response.json();
            })
            .then(resolve)
            .catch(reject);
        });
      }, 2).then(processApiResponse(trainNumbers)).catch(handleApiError);
    }
    
    /**
     * Fetch implementatie met jQuery ajax
     * @param {string} url - De API URL
     * @param {Object} params - Query parameters
     * @returns {Promise} Promise met respons data
     */
    function fetchWithAjax(url, params) {
      // Verbeterde ajax opties voor Qlik Cloud
      var ajaxOptions = {
        url: url,
        type: 'GET',
        data: params,
        headers: getRequestHeaders(),
        timeout: 20000, // 20 seconden timeout
        dataType: 'json',
        cache: false
      };
      
      // Extra opties voor CORS in Qlik Cloud
      if (isQlikCloud) {
        ajaxOptions.xhrFields = {
          withCredentials: false
        };
        ajaxOptions.crossDomain = true;
      }
      
      // Voer de AJAX request uit met retry mechanisme
      return executeWithRetry(function() {
        return $.ajax(ajaxOptions);
      }, 2).then(processApiResponse(trainNumbers)).catch(handleApiError);
    }
    
    /**
     * Processor functie voor API respons
     * @param {Array} trainNumbers - Array met treinnummers om te filteren
     * @returns {Function} Functie die de respons verwerkt
     */
    function processApiResponse(trainNumbers) {
      return function(response) {
        // Reset error teller bij succesvolle call
        errorCount = 0;
        
        // Controleer of response geldig is
        if (!response) {
          throw new Error('Lege response ontvangen van API');
        }
        
        // Filter resultaten op treinnummers als die zijn opgegeven en niet in de API aanvraag zijn meegenomen
        if (trainNumbers && trainNumbers.length > 0) {
          return filterByTrainNumbers(response, trainNumbers);
        }
        
        return response;
      };
    }
    
    /**
     * Error handler voor API calls
     * @param {Error} error - De opgetreden fout
     * @throws {Error} Gooit een fout met informatieve boodschap
     */
    function handleApiError(error) {
      // Houd bij hoeveel errors er zijn opgetreden
      errorCount++;
      console.error('Fout bij ophalen treingegevens:', error);
      
      // Stop automatische verversing bij teveel errors
      if (errorCount >= MAX_ERROR_COUNT) {
        stopAutoRefresh();
        console.error('Automatische verversing gestopt na ' + MAX_ERROR_COUNT + ' opeenvolgende fouten');
      }
      
      // Geef fout door aan aanroeper met verbeterde foutinformatie
      var errorMessage = 'Er is een fout opgetreden bij het ophalen van treingegevens';
      
      // Poging om specifiekere foutmelding te extraheren
      if (error.status && error.statusText) {
        errorMessage += ': ' + error.status + ' ' + error.statusText;
      } else if (error.message) {
        errorMessage += ': ' + error.message;
      }
      
      // Als we in Qlik Cloud zijn, voeg extra informatie toe
      if (isQlikCloud && error.message && error.message.indexOf('CORS') !== -1) {
        errorMessage += ' (Mogelijk een CORS probleem in Qlik Cloud. Controleer de API configuratie en CORS instellingen.)';
      }
      
      throw new Error(errorMessage);
    }
    
    /**
     * Voert een functie uit met automatische retry bij falen
     * @param {Function} fn - Functie die een promise retourneert
     * @param {number} maxRetries - Maximaal aantal retries
     * @param {number} retryDelay - Vertraging tussen retries in ms
     * @param {number} currentRetry - Huidige retry (intern gebruik)
     * @returns {Promise} Promise die resolvet naar het resultaat van de functie
     */
    function executeWithRetry(fn, maxRetries, retryDelay, currentRetry) {
      // Standaardwaarden
      maxRetries = maxRetries || 2;
      retryDelay = retryDelay || 1000;
      currentRetry = currentRetry || 0;
      
      return fn().catch(function(error) {
        // Controleer of we nog een retry moeten doen
        if (currentRetry < maxRetries) {
          // Verhoog de retry teller
          currentRetry++;
          
          // Log de retry poging
          console.warn('API aanroep mislukt, opnieuw proberen (' + currentRetry + '/' + maxRetries + '):', error);
          
          // Wacht even voordat we opnieuw proberen
          return new Promise(function(resolve) {
            setTimeout(resolve, retryDelay);
          }).then(function() {
            // Als we in Qlik Cloud zijn en de eerste poging met fetch faalde, probeer ajax
            if (isQlikCloud && currentRetry === 1 && window.fetch && !usePolyfillFetch) {
              console.warn('Schakel over naar Ajax als fallback voor fetch in Qlik Cloud');
              usePolyfillFetch = true;
            }
            
            // Probeer opnieuw
            return executeWithRetry(fn, maxRetries, retryDelay, currentRetry);
          });
        }
        
        // Geen retries meer, gooi de fout door
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
        if (num !== null && num !== undefined) {
          trainNumberSet.add(String(num).trim());
        }
      });
      
      // Als er geen geldige treinnummers zijn, retourneer leeg resultaat
      if (trainNumberSet.size === 0) {
        return { payload: { treinen: [] } };
      }
      
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
        console.warn('Lege respons ontvangen');
        return [];
      }
      
      if (!response.payload) {
        console.warn('Respons mist payload eigenschap');
        return [];
      }
      
      if (!Array.isArray(response.payload.treinen)) {
        console.warn('Respons payload.treinen is geen array');
        return [];
      }
      
      // Transformeer de NS API data naar een bruikbaar formaat
      return response.payload.treinen.map(function(item) {
        try {
          // Bepaal de status op basis van beschikbare data
          var status = determineTrainStatus(item);
          
          // Verzeker dat er geldige numerieke waarden zijn voor coördinaten
          var lat = parseFloat(item.lat || 0);
          var lng = parseFloat(item.lng || 0);
          
          // Valideer coördinaten
          if (isNaN(lat) || isNaN(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
            lat = 0;
            lng = 0;
          }
          
          // Basis treinobject met informatie
          var train = {
            id: item.treinNummer || 'unknown_' + Math.random().toString(36).substr(2, 9),
            number: item.treinNummer || 'Onbekend',
            position: {
              lat: lat,
              lng: lng
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
        } catch (err) {
          console.error('Fout bij transformeren van trein data:', err, item);
          // Return een minimale geldig object om fouten te voorkomen
          return {
            id: item.treinNummer || 'error_' + Math.random().toString(36).substr(2, 9),
            number: item.treinNummer || 'Fout',
            position: { lat: 0, lng: 0 },
            status: apiConfig.constants.TRAIN_STATUS.UNKNOWN,
            details: { type: 'Fout', operator: 'Onbekend' }
          };
        }
      }).filter(function(train) {
        // Filter ongeldige treinen uit
        return train && train.id && train.position;
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
      
      try {
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
        
        // Alternatieve aanpak: probeer als een getal te parsen
        var numericDelay = parseFloat(delayString);
        if (!isNaN(numericDelay)) {
          return Math.max(0, Math.round(numericDelay));
        }
        
        return 0;
      } catch (err) {
        console.error('Fout bij berekenen van vertraging:', err);
        return 0;
      }
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
        // Geen status informatie beschikbaar, kijk naar vertraging
        if (trainData.vertraging) {
          return apiConfig.constants.TRAIN_STATUS.DELAYED;
        }
        return apiConfig.constants.TRAIN_STATUS.UNKNOWN;
      }
      
      // Normaliseer de status string voor vergelijking
      var normalizedStatus = String(trainData.status).toUpperCase();
      
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
      
      // Stop eerst eventuele bestaande timer
      stopAutoRefresh();
      
      // Valideer de interval
      var interval = (intervalSeconds || 30) * 1000; // Converteer naar milliseconden
      var refreshInterval = Math.max(
        apiConfig.constants.REFRESH_INTERVALS.MINIMUM,
        Math.min(apiConfig.constants.REFRESH_INTERVALS.MAXIMUM, interval)
      );
      
      // In Qlik Cloud, verlaag de verversingsfrequentie iets om de belasting te beperken
      if (isQlikCloud && refreshInterval < 10000) {
        console.log('Verhoog verversingsinterval naar minimum 10s voor Qlik Cloud');
        refreshInterval = 10000; // Minimum 10 seconden in Qlik Cloud
      }
      
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
                console.error('Fout in refresh callback:', e);
              }
            });
          })
          .catch(function(error) {
            isRefreshing = false;
            console.error('Fout tijdens automatische verversing:', error);
          });
      }, refreshInterval);
      
      console.log('Automatische verversing gestart met interval: ' + refreshInterval + 'ms');
    }
    
    /**
     * Stopt de automatische verversing van treingegevens
     */
    function stopAutoRefresh() {
      if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
        console.log('Automatische verversing gestopt');
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
      lastApiValidationCheck = null;
      
      console.log('Trein data service opgeschoond');
    }
    
    // Detecteer Qlik Cloud omgeving bij initialisatie
    isQlikCloud = detectQlikCloudEnvironment();
    if (isQlikCloud) {
      console.log('Qlik Cloud omgeving gedetecteerd. Qlik Cloud-specifieke instellingen worden toegepast.');
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
       * Valideert de huidige API configuratie
       * @returns {Object} Object met validatiestatus en eventuele foutmeldingen
       */
      validateApiConfig: function() {
        return apiConfig.validate();
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
      },
      
      /**
       * Geeft aan of de service in Qlik Cloud draait
       * @returns {boolean} true als in Qlik Cloud, anders false
       */
      isQlikCloudEnvironment: function() {
        return isQlikCloud;
      }
    };
  })();
});