/*
 * LiveTrainExtension - Een Qlik Sense extensie voor het live volgen van treinen
 * Hoofdmodule voor de extensie
 * Aangepast voor betere Qlik Cloud compatibiliteit
 */
define([
  'qlik',
  'jquery',
  './initialProperties',
  './propertyPanel',
  './lib/js/qlik-style',
  './api/trainDataService',
  './api/apiConfig',
  './ui/mapRenderer',
  './ui/trainVisualizer',
  'css!./lib/css/style.css'
], function(qlik, $, initialProperties, propertyPanel, QlikStyle, trainDataService, apiConfig, mapRenderer, trainVisualizer) {
  'use strict';

  /**
   * Helper functie om tekst te escapen voor gebruik in HTML
   * @param {string} str - String om te escapen
   * @returns {string} - Geescapede string
   */
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  
  /**
   * Helper functie om eigenschappen veilig op te halen uit objecten
   * @param {object} obj - Object om eigenschap uit op te halen
   * @param {string} path - Pad naar eigenschap (dot notation)
   * @param {any} defaultValue - Standaardwaarde indien pad niet bestaat
   */
  function safeGetProperty(obj, path, defaultValue) {
    if (!obj) return defaultValue;
    
    var parts = path.split('.');
    var current = obj;
    
    for (var i = 0; i < parts.length; i++) {
      if (current === undefined || current === null) {
        return defaultValue;
      }
      current = current[parts[i]];
    }
    
    return current !== undefined ? current : defaultValue;
  }
  
  /**
   * Helper functie om element events op te ruimen
   * @param {jQuery} $element - jQuery element
   * @param {string} namespace - Namespace voor events (optioneel)
   */
  function cleanupEvents($element, namespace) {
    if (!$element) return;
    
    try {
      if (namespace) {
        // Ruim alleen events binnen namespace op
        $element.off('.' + namespace);
        
        // Ruim specifieke element events op met delegatie
        $element.find('.train-extension-container').off('.' + namespace);
      } else {
        // Ruim alle events op op het root element
        $element.off();
      }
    } catch (e) {
      console.error('Fout bij opruimen van events:', e);
    }
  }
  
  /**
   * Helper functie om te detecteren of we in Qlik Cloud omgeving draaien
   * @returns {boolean} True als we in Qlik Cloud draaien
   */
  function isQlikCloudEnvironment() {
    // Delegeer aan trainDataService die al de detectie implementeert
    if (trainDataService && typeof trainDataService.isQlikCloudEnvironment === 'function') {
      return trainDataService.isQlikCloudEnvironment();
    }
    
    // Fallback detectie indien trainDataService niet beschikbaar is
    try {
      // Probeer te detecteren via qlik object
      if (qlik && qlik.config) {
        var isCloud = qlik.config.isCloud || false;
        if (isCloud) return true;
      }
      
      // Probeer te detecteren via hostname
      if (window && window.location && window.location.hostname) {
        var hostname = window.location.hostname;
        if (hostname.indexOf('qlikcloud.com') !== -1) {
          return true;
        }
      }
    } catch (e) {
      console.warn('Fout bij detecteren Qlik Cloud omgeving:', e);
    }
    
    return false;
  }
  
  /**
   * Helper functie om efficiënt DOM elementen te creëren
   * @param {string} tag - HTML tag naam
   * @param {object} attrs - Object met attributen
   * @param {string|array} content - Inhoud (tekst of array van child elementen)
   * @returns {HTMLElement} Gemaakte element
   */
  function createElement(tag, attrs, content) {
    var element = document.createElement(tag);
    
    // Voeg attributen toe
    if (attrs) {
      Object.keys(attrs).forEach(function(key) {
        if (key === 'className') {
          element.className = attrs[key];
        } else if (key === 'style' && typeof attrs[key] === 'object') {
          Object.keys(attrs[key]).forEach(function(styleKey) {
            element.style[styleKey] = attrs[key][styleKey];
          });
        } else if (key.startsWith('data-')) {
          element.setAttribute(key, attrs[key]);
        } else {
          element[key] = attrs[key];
        }
      });
    }
    
    // Voeg content toe
    if (content) {
      if (Array.isArray(content)) {
        content.forEach(function(child) {
          if (child) {
            element.appendChild(
              typeof child === 'string' 
                ? document.createTextNode(child) 
                : child
            );
          }
        });
      } else if (typeof content === 'string') {
        element.textContent = content;
      } else {
        element.appendChild(content);
      }
    }
    
    return element;
  }
  
  /**
   * Helper functie om een button element te maken met standaard styling
   * @param {string} text - Tekst op de knop
   * @param {string} id - ID voor de knop
   * @param {string} className - Extra CSS klassen
   * @returns {HTMLElement} Button element
   */
  function createButton(text, id, className) {
    return createElement('button', {
      id: id,
      className: 'qlik-button ' + (className || '')
    }, text);
  }
  
  /**
   * Helper functie om een trein tabel te bouwen
   * @param {Array} trainData - Array van treingegevens
   * @param {Array} selectedTrainIds - Array van geselecteerde trein IDs
   * @param {Object} layout - Layout object met configuratie
   * @returns {HTMLElement} Tabel element
   */
  function buildTrainTable(trainData, selectedTrainIds, layout) {
    // Container voor tabel
    var tableContainer = createElement('div', {
      className: 'train-data-table'
    });
    
    if (!trainData || trainData.length === 0) {
      var noDataMsg = createElement('p', {}, 
        'Geen treingegevens beschikbaar. Klik op "Ververs gegevens" om gegevens op te halen.'
      );
      tableContainer.appendChild(noDataMsg);
      return tableContainer;
    }
    
    // Filter de gegevens op basis van geselecteerde treinnummers indien nodig
    var filteredData = trainData;
    var selectedTrainSet;
    
    if (selectedTrainIds && selectedTrainIds.length > 0 && layout.filterBySelection) {
      // Gebruik een Set voor efficiëntere lookups
      selectedTrainSet = new Set(selectedTrainIds.map(function(num) {
        return String(num).trim();
      }));
      
      filteredData = trainData.filter(function(train) {
        return train.number && selectedTrainSet.has(String(train.number).trim());
      });
    }
    
    // Toon maximaal het aantal ingestelde treinen
    var maxTrainsToShow = layout.maxTrainsToShow || 50;
    filteredData = filteredData.slice(0, maxTrainsToShow);
    
    // Maak de tabel
    var table = createElement('table', {});
    
    // Maak de tabel header
    var thead = createElement('thead', {});
    var headerRow = createElement('tr', {});
    
    // Header kolommen
    ['Treinnr', 'Type', 'Herkomst', 'Bestemming', 'Status', 'Vertraging', 'Snelheid'].forEach(function(title) {
      headerRow.appendChild(createElement('th', {}, title));
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Maak de tabel body
    var tbody = createElement('tbody', {});
    
    // Voeg rijen toe voor elke trein
    filteredData.forEach(function(train) {
      var statusClass = '';
      switch (train.status) {
        case apiConfig.constants.TRAIN_STATUS.ON_TIME:
          statusClass = 'status-on-time';
          break;
        case apiConfig.constants.TRAIN_STATUS.DELAYED:
          statusClass = 'status-delayed';
          break;
        case apiConfig.constants.TRAIN_STATUS.CANCELLED:
          statusClass = 'status-cancelled';
          break;
        case apiConfig.constants.TRAIN_STATUS.DIVERTED:
          statusClass = 'status-diverted';
          break;
        default:
          statusClass = 'status-unknown';
      }
      
      // Voeg selected class toe indien deze trein is geselecteerd
      var selectedClass = '';
      if (train.number && selectedTrainSet && 
          selectedTrainSet.has(String(train.number).trim()) && 
          layout.highlightSelectedTrains) {
        selectedClass = ' selected-train';
      }
      
      // Maak de rij met juiste klassen en ID
      var row = createElement('tr', {
        className: statusClass + selectedClass,
        'data-train-id': train.number
      });
      
      // Voeg cellen toe
      [
        train.number || '',
        train.details && train.details.type || '',
        train.details && train.details.origin || '',
        train.details && train.details.destination || '',
        train.status || '',
        (train.details && train.details.delay !== undefined ? train.details.delay : 0) + ' min',
        (train.speed !== undefined ? Math.round(train.speed) : 0) + ' km/h'
      ].forEach(function(cellContent) {
        row.appendChild(createElement('td', {}, cellContent));
      });
      
      tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    tableContainer.appendChild(table);
    
    // Voeg info toe over aantal treinen
    var countInfo = createElement('p', {}, 
      'Toont ' + filteredData.length + ' van ' + trainData.length + ' treinen.'
    );
    tableContainer.appendChild(countInfo);
    
    return tableContainer;
  }

  // Extensie definities
  return {
    definition: propertyPanel.getDefinition(),
    initialProperties: initialProperties,
    support: {
      snapshot: true,
      export: true,
      exportData: true
    },
    
    /**
     * Hoofdfunctie voor het renderen van de extensie
     * @param {jQuery} $element - jQuery element waar de visualisatie in geplaatst wordt
     * @param {Object} layout - Layout configuratie van Qlik Sense
     * @returns {Promise} - Promise die wordt opgelost wanneer het tekenen is voltooid
     */
    paint: function($element, layout) {
      // Referentie naar this voor gebruik binnen functies
      var self = this;
      var app = qlik.currApp();
      
      // Verwijder bestaande event handlers om memory leaks te voorkomen
      cleanupEvents($element, 'trainExt');
      
      // Controle op Qlik Cloud omgeving voor optimalisaties
      var isCloud = isQlikCloudEnvironment();

      // Huidige selecties ophalen uit hyperCube
      var trainNumbers = self.getSelectedTrainNumbers(layout);
      
      try {
        // Configureer de API met gegevens uit eigenschappen
        if (layout.apiKey) {
          apiConfig.configure({
            apiKey: layout.apiKey,
            useCorsProxy: layout.useCorsProxy === true,
            corsProxyUrl: layout.corsProxyUrl || ''
          });
        }
        
        // Maak de container voor de extensie
        var container = createElement('div', {
          className: 'train-extension-container'
        });
        
        // Informatie sectie
        var infoSection = createElement('div', {
          className: 'train-info-section'
        });
        
        // Titel
        infoSection.appendChild(createElement('h2', {}, 'Live Trein Tracker'));
        
        // Valideer API configuratie
        var apiValidation = apiConfig.validate();
        if (!apiValidation.isValid) {
          // Toon API foutmeldingen
          var errorDiv = createElement('div', {
            className: 'api-error'
          });
          
          errorDiv.appendChild(createElement('p', {}, 'Er zijn problemen met de API configuratie:'));
          
          var errorList = createElement('ul', {});
          apiValidation.errors.forEach(function(error) {
            errorList.appendChild(createElement('li', {}, error));
          });
          
          errorDiv.appendChild(errorList);
          errorDiv.appendChild(createElement('p', {}, 'Controleer de instellingen in het eigenschappen paneel.'));
          
          infoSection.appendChild(errorDiv);
        } else {
          // API configuratie is geldig, toon normale UI
          if (trainNumbers.length > 0) {
            infoSection.appendChild(createElement('p', {}, 
              'Actieve filters op treinnummers: ' + trainNumbers.join(", ")
            ));
            
            // Voeg knop toe om alle selecties te wissen
            infoSection.appendChild(createButton('Wis selecties', 'clearTrainSelections', 'clear-button'));
          } else {
            infoSection.appendChild(createElement('p', {}, 
              'Geen filters op treinnummers actief. Selecteer een treinnummer om specifieke treinen te volgen.'
            ));
          }
          
          // Voeg laatst bijgewerkt tijd toe indien beschikbaar
          var lastUpdate = trainDataService.getLastUpdateTime();
          if (lastUpdate) {
            infoSection.appendChild(createElement('p', {
              className: 'last-update'
            }, 'Laatst bijgewerkt: ' + lastUpdate.toLocaleTimeString()));
          }

          // Voeg refresh controls toe
          var refreshControls = createElement('div', {
            className: 'refresh-controls'
          });
          
          // Refresh knop
          refreshControls.appendChild(createButton('Ververs gegevens', 'refreshTrainData', 'refresh-button'));
          
          // Auto-refresh toggle
          var autoRefreshToggle = createElement('div', {
            className: 'auto-refresh-toggle'
          });
          
          autoRefreshToggle.appendChild(createElement('label', {
            htmlFor: 'autoRefreshToggle'
          }, 'Auto-refresh: '));
          
          var toggleClass = 'qlik-button toggle-button' + (layout.autoRefresh ? ' active' : '');
          autoRefreshToggle.appendChild(createButton(
            layout.autoRefresh ? 'Aan' : 'Uit', 
            'autoRefreshToggle', 
            toggleClass
          ));
          
          refreshControls.appendChild(autoRefreshToggle);
          infoSection.appendChild(refreshControls);
        }
        
        container.appendChild(infoSection);
        
        // Flex container voor layout trein data en kaart
        var flexContainer = createElement('div', {
          className: 'train-flex-container'
        });
        
        // Trein data sectie
        var dataSection = createElement('div', {
          className: 'train-data-section'
        });
        
        dataSection.appendChild(createElement('h3', {}, 'Actuele treingegevens'));
        
        // Haal treingegevens op (direct of uit cache)
        var trainData = trainDataService.getCachedData();
        
        // Bouw de trein tabel en voeg toe aan de data sectie
        dataSection.appendChild(buildTrainTable(trainData, trainNumbers, layout));
        
        // Voeg data sectie toe aan de flex container
        flexContainer.appendChild(dataSection);
        
        // Kaart container
        var mapContainer = createElement('div', {
          id: 'train-map-container',
          className: 'train-map-container'
        });
        
        flexContainer.appendChild(mapContainer);
        container.appendChild(flexContainer);
        
        // Leeg het element en voeg nieuwe container toe
        $element.empty().append(container);
        
        // Initialiseer de kaart als API configuratie geldig is
        if (apiValidation.isValid) {
          self.initMap($element, layout);
          
          // Update de treinen op de kaart als er data beschikbaar is
          if (trainData && trainData.length > 0) {
            self.updateTrainVisualization(trainData, trainNumbers, layout);
          }
          
          // Configureer animatie instellingen
          self.configureAnimationSettings(layout);
          
          // Event delegatie gebruiken voor betere performance in Qlik Cloud
          var $container = $element.find('.train-extension-container');
          
          // Gebruik event delegatie voor buttons en tabel
          $container.on('click.trainExt', '#refreshTrainData', function() {
            var currentTrainNumbers = self.getSelectedTrainNumbers(self.$scope.layout);
            self.refreshTrainData(currentTrainNumbers, $element);
          });
          
          // Event handler voor de auto-refresh toggle
          $container.on('click.trainExt', '#autoRefreshToggle', function() {
            // Toggle auto-refresh status
            self.$scope.layout.autoRefresh = !self.$scope.layout.autoRefresh;
            
            // Update knop text en class
            $(this).text(self.$scope.layout.autoRefresh ? 'Aan' : 'Uit');
            $(this).toggleClass('active', self.$scope.layout.autoRefresh);
            
            // Start of stop auto-refresh
            if (self.$scope.layout.autoRefresh) {
              self.$scope.startAutoRefresh();
            } else {
              self.$scope.stopAutoRefresh();
            }
          });
          
          // Event handler voor wissen van selecties
          $container.on('click.trainExt', '#clearTrainSelections', function() {
            self.clearSelections();
          });
          
          // Event handlers voor tabelrijen (trein selecteren)
          if (layout.selectionMode !== 'none') {
            $container.on('click.trainExt', 'table tbody tr', function() {
              var trainId = $(this).data('train-id');
              if (trainId) {
                self.selectTrain(trainId, layout.selectionMode === 'multiple');
              }
            });
          }

          // Eerste keer gegevens laden als automatische verversing actief is en er nog geen data is
          if (layout.autoRefresh && !trainDataService.getCachedData()) {
            self.refreshTrainData(trainNumbers, $element);
          }
        }
      } catch (e) {
        console.error('Fout bij renderen van extensie:', e);
        $element.html('<div class="error-message">Er is een fout opgetreden bij het renderen van de extensie: ' + 
                     escapeHtml(e.message) + '</div>');
      }

      // Promise teruggeven dat tekenen is voltooid
      return qlik.Promise.resolve();
    },
    
    /**
     * Initialiseert de kaart en configureert deze
     * @param {jQuery} $element - jQuery element met de extensie
     * @param {Object} layout - Layout object met configuratie
     */
    initMap: function($element, layout) {
      var self = this;
      var mapContainer = $element.find('#train-map-container')[0];
      
      if (!mapContainer) {
        console.error("Kan de map container niet vinden!");
        return;
      }
      
      // Haal kaartopties op uit de layout
      var mapOptions = {
        center: [
          layout.defaultLat || 52.3702, 
          layout.defaultLng || 4.8952
        ],
        zoom: layout.defaultZoom || 7,
        minZoom: layout.minZoom || 6,
        maxZoom: layout.maxZoom || 18
      };
      
      // Initialiseer de kaart
      var map = mapRenderer.initMap(mapContainer, mapOptions);
      
      // Pas thema toe op basis van Qlik Sense thema
      if (map) {
        mapRenderer.applyQlikTheme();
        
        // Voeg schaal toe indien gewenst
        if (layout.showScale) {
          mapRenderer.addScaleControl();
        }
        
        // Initialiseer de trainVisualizer
        trainVisualizer.init(map);
      }
    },
    
    /**
     * Configureer animatie instellingen voor treinvisualisatie
     * @param {Object} layout - Layout object met configuratie
     */
    configureAnimationSettings: function(layout) {
      // Controleer of layout geldig is om fouten te voorkomen
      if (!layout) return;
      
      // Configureer animatie instellingen op basis van layout
      trainVisualizer.configureAnimation({
        enabled: layout.animateUpdates !== undefined ? layout.animateUpdates : true,
        duration: layout.animationDuration || 1000,
        easing: layout.animationEasing || 'linear',
        smoothness: layout.animationSmoothness || 1
      });
    },
    
    /**
     * Update de trein visualisatie op de kaart
     * @param {Array} trainData - Array met treingegevens
     * @param {Array} selectedTrainIds - Array met geselecteerde trein IDs
     * @param {Object} layout - Layout object met configuratie
     */
    updateTrainVisualization: function(trainData, selectedTrainIds, layout) {
      if (!trainData) return;
      
      // Haal kaart op of return als er geen kaart is
      var map = mapRenderer.getMap();
      if (!map) return;
      
      // Als showUpdateIndicator is ingesteld, toon de indicator
      if (layout && layout.showUpdateIndicator) {
        trainVisualizer.showUpdateIndicator(map);
      }
      
      // Filter de gegevens op basis van geselecteerde treinnummers indien nodig
      var filteredTrainData = trainData;
      if (selectedTrainIds && selectedTrainIds.length > 0 && layout && layout.filterBySelection) {
        // Gebruik een Set voor efficiëntere lookups
        var selectedTrainSet = new Set(selectedTrainIds.map(function(id) {
          return String(id).trim();
        }));
        
        filteredTrainData = trainData.filter(function(train) {
          return train.number && selectedTrainSet.has(String(train.number).trim());
        });
      }
      
      // Update de treinposities op de kaart
      trainVisualizer.updateTrainPositions(
        map, 
        filteredTrainData, 
        selectedTrainIds, 
        this.selectTrain.bind(this)
      );
    },
    
    /**
     * Haalt geselecteerde treinnummers op uit de hypercube
     * @param {Object} layout - Layout object
     * @returns {Array} Array van geselecteerde treinnummers
     */
    getSelectedTrainNumbers: function(layout) {
      var trainNumbers = [];
      
      try {
        // Controleer of we een hypercube hebben met data
        if (layout && layout.qHyperCube && 
            layout.qHyperCube.qDataPages && 
            layout.qHyperCube.qDataPages.length > 0 &&
            layout.qHyperCube.qDataPages[0].qMatrix) {
            
          // Haal alle waarden op
          var matrix = layout.qHyperCube.qDataPages[0].qMatrix;
          
          // Extraheer treinnummers waarbij we controleren op geldige waarden
          trainNumbers = matrix.map(function(row) {
            return row[0].qText;  // Aanname: eerste kolom bevat treinnummer
          }).filter(function(value) {
            return value !== undefined && value !== null && value !== '';
          });
        }
      } catch (e) {
        console.error('Fout bij ophalen geselecteerde treinnummers:', e);
      }
      
      return trainNumbers;
    },
    
    /**
     * Selecteert een treinnummer in Qlik Sense
     * @param {string} trainId - Treinnummer om te selecteren 
     * @param {boolean} multiSelect - Of meerdere selecties moeten worden toegestaan
     */
    selectTrain: function(trainId, multiSelect) {
      if (!trainId) return;
      
      try {
        var self = this;
        var app = qlik.currApp();
        
        // Verkrijg de naam van het veld uit de configuratie
        var fieldName = self.getTrainNumberFieldName();
        if (!fieldName) return;
        
        var field = app.field(fieldName);
        
        // Selecteer de waarde in het veld
        if (field) {
          if (!multiSelect) {
            // Begin met wissen van eerdere selecties als we niet in multiselect modus zijn
            field.clear();
          }
          
          // Selecteer de waarde
          field.selectValues([{
            qText: trainId
          }], true, true);
        }
      } catch (e) {
        console.error('Fout bij selecteren trein:', e);
      }
    },
    
    /**
     * Haalt de veldnaam op voor treinnummers uit de configuratie
     * @returns {string} Veldnaam voor treinnummers
     */
    getTrainNumberFieldName: function() {
      var self = this;
      
      try {
        // Controleer of we een specifiek veld hebben geconfigureerd in propertyPanel
        if (self.$scope && 
            self.$scope.layout && 
            self.$scope.layout.trainNumberFieldName) {
          return self.$scope.layout.trainNumberFieldName;
        }
        
        // Fallback naar de eerste dimensie in de hypercube
        if (self.$scope && 
            self.$scope.layout && 
            self.$scope.layout.qHyperCube && 
            self.$scope.layout.qHyperCube.qDimensionInfo &&
            self.$scope.layout.qHyperCube.qDimensionInfo.length > 0) {
          
          var fieldName = self.$scope.layout.qHyperCube.qDimensionInfo[0].qFallbackTitle;
          if (fieldName) {
            return fieldName;
          }
        }
      } catch (e) {
        console.error('Fout bij ophalen veldnaam voor treinnummers:', e);
      }
      
      // Default veldnaam als laatste resort
      return 'Train Number';
    },
    
    /**
     * Wist alle actieve selecties
     */
    clearSelections: function() {
      try {
        var app = qlik.currApp();
        app.clearAll();
      } catch (e) {
        console.error('Fout bij wissen selecties:', e);
      }
    },
    
    /**
     * Ververst de treingegevens en updatet de UI
     * @param {Array} trainNumbers - Array met treinnummers om te filteren
     * @param {jQuery} $element - jQuery element om te updaten
     */
    refreshTrainData: function(trainNumbers, $element) {
      var self = this;
      
      // Valideer API configuratie voor we data ophalen
      var apiValidation = apiConfig.validate();
      if (!apiValidation.isValid) {
        $element.find('.train-data-section').html(
          '<div class="api-error">' +
          '<p>Kan geen treingegevens ophalen vanwege ongeldige API configuratie:</p>' +
          '<ul><li>' + escapeHtml(apiValidation.errors.join('</li><li>')) + '</li></ul>' +
          '</div>'
        );
        return;
      }
      
      // Toon laden indicator
      $element.find('.train-data-section').html('<p>Treingegevens worden opgehaald...</p>');
      
      // Controleer of $scope is geïnitialiseerd
      if (!self.$scope || !self.$scope.layout) {
        console.error('$scope of layout is niet beschikbaar');
        return;
      }
      
      // Gebruik filterBySelection instelling om te bepalen of we filteren
      var useTrainFilter = self.$scope.layout.filterBySelection && trainNumbers && trainNumbers.length > 0;
      var trainFilter = useTrainFilter ? trainNumbers : null;
      
      // Haal status op om oneindige lus te voorkomen
      var isAutoRefreshing = self.$scope.layout.autoRefresh;
      
      // Haal de traingegevens op
      trainDataService.getTrainLocations(trainFilter)
        .then(function(data) {
          // Markeer dat we niet in een auto-refresh zitten
          var wasAutoRefreshing = isAutoRefreshing;
          
          // Herrender de extensie om de nieuwe gegevens te tonen
          // Voorkom oneindige lus door autoRefresh tijdelijk uit te schakelen
          if (wasAutoRefreshing) {
            self.$scope.layout.autoRefresh = false;
          }
          
          self.paint($element, self.$scope.layout);
          
          // Herstel de autoRefresh status
          if (wasAutoRefreshing) {
            self.$scope.layout.autoRefresh = true;
            self.$scope.startAutoRefresh();
          }
        })
        .catch(function(error) {
          // Verwerk fouten op een veilige manier
          var errorMsg = error && error.message ? error.message : 'Onbekende fout';
          
          // Toon foutmelding
          $element.find('.train-data-section').html(
            '<div class="error-message">' +
            '<p>Er is een fout opgetreden bij het ophalen van de treingegevens:</p>' +
            '<p>' + escapeHtml(errorMsg) + '</p>' +
            '<button class="qlik-button retry-button" id="retryGetData">Opnieuw proberen</button>' +
            '</div>'
          );
          
          // Voeg event handler toe voor de retry knop
          $element.find('#retryGetData').on('click.trainExt', function() {
            self.refreshTrainData(trainNumbers, $element);
          });
        });
    },
    
    /**
     * Controller voor de extensie
     */
    controller: ['$scope', '$element', function($scope, $element) {
      // Referentie naar de scope voor hergebruik
      this.$scope = $scope;
      var self = this;
      
      // Helper functie om op een veilige manier object properties te checken
      $scope.safeGetProperty = safeGetProperty;
      
      // Bepaal verversingsinterval op basis van instelling
      $scope.getRefreshInterval = function() {
        if (!$scope.layout) return 15; // Default
        
        switch ($scope.layout.refreshIntervalType) {
          case 'fast':
            return isQlikCloudEnvironment() ? 10 : 5; // Minimum 10s in Qlik Cloud
          case 'normal':
            return 15;
          case 'slow':
            return 30;
          case 'custom':
            var interval = Math.max(5, Math.min(300, $scope.layout.refreshInterval || 15));
            return isQlikCloudEnvironment() ? Math.max(10, interval) : interval; // Minimum 10s in Qlik Cloud
          default:
            return 15;
        }
      };
      
      /**
       * Haalt treingegevens op en verwerkt ze
       * @param {Array} trainNumbers - Optionele lijst met treinnummers
       */
      $scope.getTrainData = function(trainNumbers) {
        // Bepaal of we moeten filteren op treinnummers
        var useTrainFilter = $scope.layout && $scope.layout.filterBySelection && 
                            trainNumbers && trainNumbers.length > 0;
        var trainFilter = useTrainFilter ? trainNumbers : null;
        
        trainDataService.getTrainLocations(trainFilter)
          .then(function(data) {
            console.log('Treingegevens opgehaald:', data.length ? data.length + ' treinen' : 'geen data');
            
            // Gebruik consistente methode voor scope toegang
            var obj = $scope.$parent.object;
            if (obj) {
              var currentTrainNumbers = obj.getSelectedTrainNumbers($scope.layout);
              obj.updateTrainVisualization(data, currentTrainNumbers, $scope.layout);
            } else {
              console.error('Object niet gevonden in scope');
            }
          })
          .catch(function(error) {
            console.error('Fout bij ophalen treingegevens:', error && error.message ? error.message : 'Onbekende fout');
          });
      };
      
      /**
       * Start automatische verversing
       */
      $scope.startAutoRefresh = function() {
        // Verversingsinterval ophalen uit layout
        var refreshInterval = $scope.getRefreshInterval();
        
        // Stop eerst eventuele bestaande timer
        $scope.stopAutoRefresh();
        
        // Start verversing met callback
        trainDataService.startAutoRefresh(function(data) {
          // Check of de layout en object nog bestaan
          if (!$scope.layout) return;
          
          // Verkrijg de juiste referentie naar het object met de getSelectedTrainNumbers functie
          var obj = null;
          
          // Probeer eerst vanuit de parent scope
          if ($scope.$parent && $scope.$parent.object && 
              typeof $scope.$parent.object.getSelectedTrainNumbers === 'function') {
            obj = $scope.$parent.object;
          } 
          // Als fallback, gebruik het object dat hangt aan $element.data('object')
          else if ($element && $element.data && typeof $element.data === 'function') {
            obj = $element.data('object');
            // Controleer of dit object de benodigde methode heeft
            if (!obj || typeof obj.getSelectedTrainNumbers !== 'function') {
              // Laatste poging: gebruik $scope.$parent.$parent.object
              if ($scope.$parent && $scope.$parent.$parent && $scope.$parent.$parent.object &&
                  typeof $scope.$parent.$parent.object.getSelectedTrainNumbers === 'function') {
                obj = $scope.$parent.$parent.object;
              } else {
                console.error('Geen geldig object met getSelectedTrainNumbers functie gevonden');
                return;
              }
            }
          }
          
          if (!obj) {
            console.error('Kan geen geldig object vinden met getSelectedTrainNumbers functie');
            return;
          }
          
          // Update train markers bij nieuwe data
          var currentTrainNumbers = obj.getSelectedTrainNumbers($scope.layout);
          obj.updateTrainVisualization(data, currentTrainNumbers, $scope.layout);
          
          // Update het tijdstip van laatste update in de UI via de scope
          var lastUpdate = trainDataService.getLastUpdateTime();
          if (lastUpdate) {
            $scope.lastUpdateTime = lastUpdate.toLocaleTimeString();
            
            // Update binnen Angular digest cycle
            $scope.$applyAsync(function() {
              var $lastUpdateEl = $element.find('.last-update');
              if ($lastUpdateEl.length) {
                $lastUpdateEl.text('Laatst bijgewerkt: ' + $scope.lastUpdateTime);
              }
            });
          }
          
          // Bij elke update de extensie opnieuw renderen als dat nodig is
          // We gebruiken applyAsync om beter te presteren met veel updates
          if (self.$scope && self.$scope.layout && self.$scope.layout.updateTableOnRefresh) {
            $scope.$applyAsync(function() {
              if ($scope.layout && $scope.layout.autoRefresh) {
                // Gebruik het eerder gevonden object
                obj.paint($element, $scope.layout);
              }
            });
          }
        }, refreshInterval);
      };
      
      /**
       * Stop automatische verversing
       */
      $scope.stopAutoRefresh = function() {
        trainDataService.stopAutoRefresh();
      };
      
      /**
       * Handler voor wijzigingen in venstergrootte
       */
      $scope.handleResize = function() {
        // Pas de kaartgrootte aan
        mapRenderer.resizeMap();
      };
      
      /**
       * Handler voor wijzigingen in documentvisibiliteit
       */
      $scope.handleVisibilityChange = function() {
        if ($scope.layout && $scope.layout.pauseRefreshWhenNotVisible) {
          if (document.hidden) {
            // Pauzeer updates wanneer document niet zichtbaar is
            $scope.stopAutoRefresh();
            console.log('Auto-refresh gepauzeerd vanwege inactief venster');
          } else if ($scope.layout.autoRefresh) {
            // Hervat updates wanneer document weer zichtbaar wordt
            $scope.startAutoRefresh();
            console.log('Auto-refresh hervat na activeren venster');
          }
        }
      };

      // Bij initialisatie
      $scope.$watch('layout.autoRefresh', function(newValue) {
        // Start of stop automatische verversing op basis van de instellingen
        if (newValue) {
          $scope.startAutoRefresh();
        } else {
          $scope.stopAutoRefresh();
        }
      });
      
      // Luisteren naar wijzigingen in refreshIntervalType of refreshInterval
      $scope.$watchGroup(['layout.refreshIntervalType', 'layout.refreshInterval'], function() {
        // Herstart autorefresh indien actief om nieuw interval toe te passen
        if ($scope.layout && $scope.layout.autoRefresh) {
          $scope.startAutoRefresh();
        }
      });
      
      // Luisteren naar wijzigingen in animateUpdates, animationDuration of animationEasing
      $scope.$watchGroup(['layout.animateUpdates', 'layout.animationDuration', 'layout.animationEasing', 'layout.animationSmoothness'], function() {
        // Update animatie instellingen
        if ($scope.layout) {
          // Gebruik de extensie instance direct in plaats van via parent scope
          // FIX: Vervang $scope.$parent.object door this.$parent om TypeError op te lossen
          var extensionInstance = $element.data('object');
          if (extensionInstance && typeof extensionInstance.configureAnimationSettings === 'function') {
            extensionInstance.configureAnimationSettings($scope.layout);
          } else {
            // Alternatieve oplossing als data('object') niet beschikbaar is
            trainVisualizer.configureAnimation({
              enabled: $scope.layout.animateUpdates !== undefined ? $scope.layout.animateUpdates : true,
              duration: $scope.layout.animationDuration || 1000,
              easing: $scope.layout.animationEasing || 'linear',
              smoothness: $scope.layout.animationSmoothness || 1
            });
          }
        }
      });
      
      // Luisteren naar wijzigingen in selecties als automatisch verversen bij selectie is ingeschakeld
      if ($scope.layout && $scope.layout.refreshOnSelection && $scope.backendApi) {
        $scope.backendApi.getProperties().then(function(reply) {
          var dimensions = safeGetProperty(reply, 'qHyperCubeDef.qDimensions', []);
          if (dimensions.length > 0) {
            var fieldName = safeGetProperty(dimensions[0], 'qDef.qFieldDefs[0]', '');
            fieldName = fieldName.replace(/[\[\]]/g, ''); // Verwijder eventuele haakjes
            
            if (!fieldName) return;
            
            // Monitor selecties voor dit veld
            var app = qlik.currApp();
            var field = app.field(fieldName);
            
            if (field && field.OnData && typeof field.OnData.bind === 'function') {
              field.OnData.bind(function() {
                // Gebruik de parent scope object
                var obj = $scope.$parent.object;
                if (!obj) return;
                
                // Ververs gegevens als er een selectie wijziging is
                var currentTrainNumbers = obj.getSelectedTrainNumbers($scope.layout);
                var trainData = trainDataService.getCachedData();
                
                // Update markers op basis van nieuwe selecties
                if (trainData) {
                  obj.updateTrainVisualization(trainData, currentTrainNumbers, $scope.layout);
                }
                
                if ($scope.layout.refreshOnSelection) {
                  obj.refreshTrainData(currentTrainNumbers, $element);
                } else {
                  // Alleen UI verversen zonder nieuwe data op te halen
                  obj.paint($element, $scope.layout);
                }
              });
            }
          }
        });
      }
      
      // Registreer window event handlers met delegatie en namespace voor betere performance
      $(window).on('resize.trainExtension', $scope.handleResize);
      
      // Registreer document event handlers
      $(document).on('visibilitychange.trainExtension', $scope.handleVisibilityChange);

      // Opruimen bij verwijderen van de extensie
      $scope.$on('$destroy', function() {
        // Stop automatische verversing
        $scope.stopAutoRefresh();
        
        // Verwijder event handlers met namespaces
        $(window).off('resize.trainExtension');
        $(document).off('visibilitychange.trainExtension');
        
        // Verwijder element event handlers
        cleanupEvents($element, 'trainExt');
        
        // Ruim trainVisualizer resources op
        if (mapRenderer.getMap()) {
          trainVisualizer.cleanup(mapRenderer.getMap());
        }
        
        // Ruim kaart op
        mapRenderer.destroyMap();
        
        console.log('Extensie wordt verwijderd, opruimen...');
      });
    }]
  };
});