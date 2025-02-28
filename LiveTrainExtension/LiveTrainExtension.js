/*
 * LiveTrainExtension - Een Qlik Sense extensie voor het live volgen van treinen
 * Hoofdmodule voor de extensie
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
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
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
    paint: function($element, layout) {
      // Referentie naar this voor gebruik binnen functies
      var self = this;
      var app = qlik.currApp();

      // Verwijder bestaande event handlers om memory leaks te voorkomen
      $element.find('#refreshTrainData').off('click');
      $element.find('#autoRefreshToggle').off('click');
      $element.find('#clearTrainSelections').off('click');
      $element.find('table tbody tr').off('click');

      // Huidige selecties ophalen uit hyperCube
      var trainNumbers = self.getSelectedTrainNumbers(layout);
      
      // HTML voor de extensie
      var html = '<div class="train-extension-container">';
      
      // Informatie sectie
      html += '<div class="train-info-section">';
      html += '<h2>Live Trein Tracker</h2>';
      
      if (trainNumbers.length > 0) {
        html += '<p>Actieve filters op treinnummers: ' + escapeHtml(trainNumbers.join(", ")) + '</p>';
        
        // Voeg knop toe om alle selecties te wissen
        html += '<button class="qlik-button clear-button" id="clearTrainSelections">Wis selecties</button>';
      } else {
        html += '<p>Geen filters op treinnummers actief. Selecteer een treinnummer om specifieke treinen te volgen.</p>';
      }
      
      // Voeg laatst bijgewerkt tijd toe indien beschikbaar
      var lastUpdate = trainDataService.getLastUpdateTime();
      if (lastUpdate) {
        html += '<p class="last-update">Laatst bijgewerkt: ' + lastUpdate.toLocaleTimeString() + '</p>';
      }

      // Voeg refresh knop en auto-refresh controls toe
      html += '<div class="refresh-controls">';
      html += '<button class="qlik-button refresh-button" id="refreshTrainData">Ververs gegevens</button>';
      
      // Auto-refresh toggle knop
      html += '<div class="auto-refresh-toggle">';
      html += '<label for="autoRefreshToggle">Auto-refresh: </label>';
      html += '<button class="qlik-button toggle-button' + (layout.autoRefresh ? ' active' : '') + '" id="autoRefreshToggle">' + 
              (layout.autoRefresh ? 'Aan' : 'Uit') + '</button>';
      html += '</div>';
      
      html += '</div>';
      
      html += '</div>';
      
      // Flex container voor layout trein data en kaart
      html += '<div class="train-flex-container">';
      
      // Trein data sectie voor het tonen van actuele gegevens
      html += '<div class="train-data-section">';
      html += '<h3>Actuele treingegevens</h3>';
      
      // Gegevens tabel voor treinlocaties
      html += '<div class="train-data-table">';
      
      // Ophalen van treingegevens (direct of uit cache)
      var trainData = trainDataService.getCachedData();
      
      if (trainData && trainData.length > 0) {
        // Toon treingegevens in een tabel
        html += '<table>';
        html += '<thead><tr>';
        html += '<th>Treinnr</th>';
        html += '<th>Type</th>';
        html += '<th>Herkomst</th>';
        html += '<th>Bestemming</th>';
        html += '<th>Status</th>';
        html += '<th>Vertraging</th>';
        html += '<th>Snelheid</th>';
        html += '</tr></thead>';
        html += '<tbody>';
        
        // Filter de gegevens op basis van geselecteerde treinnummers indien nodig
        var filteredData = trainData;
        if (trainNumbers.length > 0) {
          // Gebruik een Set voor efficiëntere lookups
          var selectedTrainSet = new Set(trainNumbers);
          filteredData = trainData.filter(function(train) {
            return selectedTrainSet.has(train.number);
          });
        }
        
        // Toon maximaal het aantal ingestelde treinen
        var maxTrainsToShow = layout.maxTrainsToShow || 50;
        filteredData = filteredData.slice(0, maxTrainsToShow);
        
        // Bouw de tabelrijen
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
            default:
              statusClass = 'status-unknown';
          }
          
          // Voeg selected class toe indien deze trein is geselecteerd
          var selectedClass = '';
          if (selectedTrainSet.has(train.number) && layout.highlightSelectedTrains) {
            selectedClass = ' selected-train';
          }
          
          // Zorg ervoor dat alles geescaped wordt
          var trainNumber = escapeHtml(train.number);
          var trainType = escapeHtml(train.details.type || '');
          var trainOrigin = escapeHtml(train.details.origin || '');
          var trainDestination = escapeHtml(train.details.destination || '');
          var trainStatus = escapeHtml(train.status || '');
          var trainDelay = train.details.delay !== undefined ? train.details.delay : 0;
          var trainSpeed = train.speed !== undefined ? Math.round(train.speed) : 0;
          
          html += '<tr class="' + statusClass + selectedClass + '" data-train-id="' + trainNumber + '">';
          html += '<td>' + trainNumber + '</td>';
          html += '<td>' + trainType + '</td>';
          html += '<td>' + trainOrigin + '</td>';
          html += '<td>' + trainDestination + '</td>';
          html += '<td>' + trainStatus + '</td>';
          html += '<td>' + trainDelay + ' min</td>';
          html += '<td>' + trainSpeed + ' km/h</td>';
          html += '</tr>';
        });
        
        html += '</tbody></table>';
        
        // Toon het aantal gevonden treinen
        html += '<p>Toont ' + filteredData.length + ' van ' + trainData.length + ' treinen.</p>';
        
      } else {
        html += '<p>Geen treingegevens beschikbaar. Klik op "Ververs gegevens" om gegevens op te halen.</p>';
      }
      
      html += '</div>'; // Einde train-data-table
      
      html += '</div>'; // Einde train-data-section
      
      // Kaart container
      html += '<div id="train-map-container" class="train-map-container"></div>';
      
      html += '</div>'; // Einde train-flex-container
      
      html += '</div>'; // Einde train-extension-container

      // Weergeven in het element
      $element.html(html);
      
      // Initialiseer de kaart
      self.initMap($element, layout);
      
      // Update de treinen op de kaart als er data beschikbaar is
      if (trainData && trainData.length > 0) {
        self.updateTrainVisualization(trainData, trainNumbers, layout);
      }
      
      // Configureer animatie instellingen
      self.configureAnimationSettings(layout);
      
      // Registreer event handlers
      // Gebruik closure die de huidige waarde ophaalt bij aanroep, om up-to-date data te garanderen
      $element.find('#refreshTrainData').on('click', function() {
        var currentTrainNumbers = self.getSelectedTrainNumbers(self.$scope.layout);
        self.refreshTrainData(currentTrainNumbers, $element);
      });
      
      // Event handler voor de auto-refresh toggle
      $element.find('#autoRefreshToggle').on('click', function() {
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
      $element.find('#clearTrainSelections').on('click', function() {
        self.clearSelections();
      });
      
      // Event handlers voor tabelrijen (trein selecteren)
      if (layout.selectionMode !== 'none') {
        $element.find('table tbody tr').on('click', function() {
          var trainId = $(this).data('train-id');
          self.selectTrain(trainId, layout.selectionMode === 'multiple');
        });
      }

      // Eerste keer gegevens laden als automatische verversing actief is en er nog geen data is
      if (layout.autoRefresh && !trainDataService.getCachedData()) {
        self.refreshTrainData(trainNumbers, $element);
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
        center: [52.3702, 4.8952], // Amsterdam standaard
        zoom: layout.defaultZoom || 7
      };
      
      // Initialiseer de kaart
      var map = mapRenderer.initMap(mapContainer, mapOptions);
      
      // Gebruik event-based resizing indien beschikbaar, anders fallback naar timeout
      if (map) {
        if (map.on && typeof map.on === 'function') {
          // Leaflet ondersteunt events
          map.on('load', function() {
            mapRenderer.resizeMap();
          });
        } else {
          // Fallback naar setTimeout
          setTimeout(function() {
            mapRenderer.resizeMap();
          }, 250);
        }
      }
      
      // Pas thema toe op basis van Qlik Sense thema
      mapRenderer.applyQlikTheme();
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
        easing: 'linear' // Standaard easing, kan worden uitgebreid
      });
    },
    
    /**
     * Update de trein visualisatie op de kaart
     * @param {Array} trainData - Array met treingegevens
     * @param {Array} selectedTrainIds - Array met geselecteerde trein IDs
     * @param {Object} layout - Layout object met configuratie
     */
    updateTrainVisualization: function(trainData, selectedTrainIds, layout) {
      var self = this;
      var map = mapRenderer.getMap();
      
      if (!map || !trainData) return;
      
      // Als showUpdateIndicator is ingesteld, toon de indicator
      if (layout && layout.showUpdateIndicator) {
        trainVisualizer.showUpdateIndicator(map);
      }
      
      // Filter de gegevens op basis van geselecteerde treinnummers indien nodig
      var filteredTrainData = trainData;
      if (selectedTrainIds && selectedTrainIds.length > 0 && layout && layout.filterBySelection) {
        // Gebruik een Set voor efficiëntere lookups
        var selectedTrainSet = new Set(selectedTrainIds);
        filteredTrainData = trainData.filter(function(train) {
          return selectedTrainSet.has(train.number);
        });
      }
      
      // Update de treinposities op de kaart
      trainVisualizer.updateTrainPositions(
        map, 
        filteredTrainData, 
        selectedTrainIds, 
        function(trainId) {
          // Callback voor trein marker klik - selecteert de trein
          self.selectTrain(trainId, layout.selectionMode === 'multiple');
        }
      );
    },
    
    /**
     * Haalt geselecteerde treinnummers op uit de hypercube
     * @param {Object} layout - Layout object
     * @returns {Array} Array van geselecteerde treinnummers
     */
    getSelectedTrainNumbers: function(layout) {
      var trainNumbers = [];
      
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
      
      return trainNumbers;
    },
    
    /**
     * Selecteert een treinnummer in Qlik Sense
     * @param {string} trainId - Treinnummer om te selecteren 
     * @param {boolean} multiSelect - Of meerdere selecties moeten worden toegestaan
     */
    selectTrain: function(trainId, multiSelect) {
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
    },
    
    /**
     * Haalt de veldnaam op voor treinnummers uit de configuratie
     * @returns {string} Veldnaam voor treinnummers
     */
    getTrainNumberFieldName: function() {
      var self = this;
      
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
      
      // Default veldnaam als laatste resort
      return 'Train Number';
    },
    
    /**
     * Wist alle actieve selecties
     */
    clearSelections: function() {
      var app = qlik.currApp();
      app.clearAll();
    },
    
    /**
     * Ververst de treingegevens en updatet de UI
     * @param {Array} trainNumbers - Array met treinnummers om te filteren
     * @param {jQuery} $element - jQuery element om te updaten
     */
    refreshTrainData: function(trainNumbers, $element) {
      var self = this;
      
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
            '</div>'
          );
        });
    },
    
    controller: ['$scope', '$element', function($scope, $element) {
      // Referentie naar de scope voor hergebruik
      this.$scope = $scope;
      var self = this;
      
      // Helper functie om op een veilige manier object properties te checken
      $scope.safeGetProperty = function(obj, path, defaultValue) {
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
      };
      
      // Bepaal verversingsinterval op basis van instelling
      $scope.getRefreshInterval = function() {
        if (!$scope.layout) return 15; // Default
        
        switch ($scope.layout.refreshIntervalType) {
          case 'fast':
            return 5;
          case 'normal':
            return 15;
          case 'slow':
            return 30;
          case 'custom':
            return Math.max(5, Math.min(300, $scope.layout.refreshInterval || 15));
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
          
          var obj = $scope.$parent.object;
          if (!obj) return;
          
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
          $scope.$applyAsync(function() {
            if ($scope.layout && $scope.layout.autoRefresh) {
              // Gebruik de parent scope object in plaats van element.scope()
              obj.paint($element, $scope.layout);
            }
          });
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
      
      // Luisteren naar wijzigingen in animateUpdates of animationDuration
      $scope.$watchGroup(['layout.animateUpdates', 'layout.animationDuration'], function() {
        // Update animatie instellingen
        if ($scope.layout) {
          // Gebruik het object zelf via parent scope
          $scope.$parent.object.configureAnimationSettings($scope.layout);
        }
      });
      
      // Luisteren naar wijzigingen in selecties
      if ($scope.layout && $scope.layout.refreshOnSelection && $scope.backendApi) {
        $scope.backendApi.getProperties().then(function(reply) {
          var dimensions = $scope.safeGetProperty(reply, 'qHyperCubeDef.qDimensions', []);
          if (dimensions.length > 0) {
            var fieldName = $scope.safeGetProperty(dimensions[0], 'qDef.qFieldDefs[0]', '');
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
      
      // Registreer resize handler - Gebruik namespaced events
      $(window).on('resize.trainExtension', $scope.handleResize);
      
      // Registreer visibility change handler voor browser tab wisselen - Gebruik namespaced events
      $(document).on('visibilitychange.trainExtension', $scope.handleVisibilityChange);

      // Opruimen bij verwijderen van de extensie
      $scope.$on('$destroy', function() {
        // Stop automatische verversing
        $scope.stopAutoRefresh();
        
        // Verwijder event handlers met namespaced selectors
        $(window).off('resize.trainExtension');
        $(document).off('visibilitychange.trainExtension');
        
        // Verwijder eventuele element event handlers
        if ($element) {
          $element.find('#refreshTrainData').off('click');
          $element.find('#autoRefreshToggle').off('click');
          $element.find('#clearTrainSelections').off('click');
          $element.find('table tbody tr').off('click');
        }
        
        // Ruim kaart op
        mapRenderer.destroyMap();
        
        console.log('Extensie wordt verwijderd, opruimen...');
      });
    }]
  };
});