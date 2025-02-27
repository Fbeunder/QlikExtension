/*
 * LiveTrainExtension - Een Qlik Sense extensie voor het live volgen van treinen
 * Hoofdmodule voor de extensie
 */
define([
  'qlik',
  'jquery',
  './initialProperties',
  './lib/js/qlik-style',
  './api/trainDataService',
  './api/apiConfig',
  'css!./lib/css/style.css'
], function(qlik, $, initialProperties, QlikStyle, trainDataService, apiConfig) {
  'use strict';

  // Extensie definities
  return {
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

      // Huidige selecties ophalen
      var selections = layout.qHyperCube && layout.qHyperCube.qDataPages[0] ? 
                      layout.qHyperCube.qDataPages[0].qMatrix : [];
      
      // Treinnummers uit selecties ophalen als deze beschikbaar zijn
      var trainNumbers = [];
      if (selections.length > 0) {
        trainNumbers = selections.map(function(row) {
          return row[0].qText; // Aanname: eerste kolom bevat treinnummer
        });
      }

      // HTML voor de extensie
      var html = '<div class="train-extension-container">';
      
      // Informatie sectie
      html += '<div class="train-info-section">';
      html += '<h2>Live Trein Tracker</h2>';
      
      if (trainNumbers.length > 0) {
        html += '<p>Actieve filters op treinnummers: ' + trainNumbers.join(", ") + '</p>';
      } else {
        html += '<p>Geen filters op treinnummers actief. Selecteer een treinnummer om specifieke treinen te volgen.</p>';
      }
      
      // Voeg laatst bijgewerkt tijd toe indien beschikbaar
      var lastUpdate = trainDataService.getLastUpdateTime();
      if (lastUpdate) {
        html += '<p class="last-update">Laatst bijgewerkt: ' + lastUpdate.toLocaleTimeString() + '</p>';
      }

      // Voeg refresh knop toe
      html += '<button class="qlik-button refresh-button" id="refreshTrainData">Ververs gegevens</button>';
      
      html += '</div>';
      
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
          filteredData = trainData.filter(function(train) {
            return trainNumbers.indexOf(train.number) !== -1;
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
          
          html += '<tr class="' + statusClass + '">';
          html += '<td>' + train.number + '</td>';
          html += '<td>' + train.details.type + '</td>';
          html += '<td>' + train.details.origin + '</td>';
          html += '<td>' + train.details.destination + '</td>';
          html += '<td>' + train.status + '</td>';
          html += '<td>' + train.details.delay + ' min</td>';
          html += '<td>' + Math.round(train.speed) + ' km/h</td>';
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
      
      // Kaart container voor toekomstige implementatie
      html += '<div id="train-map-container" class="train-map-container">';
      html += '<p>Kaart wordt in een toekomstige versie geïmplementeerd</p>';
      html += '</div>';
      
      html += '</div>'; // Einde train-extension-container

      // Weergeven in het element
      $element.html(html);
      
      // Registreer event handlers
      $element.find('#refreshTrainData').on('click', function() {
        self.refreshTrainData(trainNumbers, $element);
      });

      // Eerste keer gegevens laden als automatische verversing actief is
      if (layout.autoRefresh && !trainDataService.getCachedData()) {
        self.refreshTrainData(trainNumbers, $element);
      }

      // Promise teruggeven dat tekenen is voltooid
      return qlik.Promise.resolve();
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
      
      // Haal de traingegevens op
      trainDataService.getTrainLocations(trainNumbers)
        .then(function(data) {
          // Herrender de extensie om de nieuwe gegevens te tonen
          self.paint($element, self.$scope.layout);
        })
        .catch(function(error) {
          // Toon foutmelding
          $element.find('.train-data-section').html(
            '<div class="error-message">' +
            '<p>Er is een fout opgetreden bij het ophalen van de treingegevens:</p>' +
            '<p>' + error.message + '</p>' +
            '</div>'
          );
        });
    },
    
    controller: ['$scope', '$element', function($scope, $element) {
      // Referentie naar de scope voor hergebruik
      this.$scope = $scope;
      
      /**
       * Haalt treingegevens op en verwerkt ze
       * @param {Array} trainNumbers - Optionele lijst met treinnummers
       */
      $scope.getTrainData = function(trainNumbers) {
        trainDataService.getTrainLocations(trainNumbers)
          .then(function(data) {
            console.log('Treingegevens opgehaald:', data);
            // Data is nu beschikbaar in de service cache
          })
          .catch(function(error) {
            console.error('Fout bij ophalen treingegevens:', error);
          });
      };
      
      /**
       * Start automatische verversing
       */
      $scope.startAutoRefresh = function() {
        // Verversingsinterval ophalen uit layout (of standaard 30 seconden)
        var refreshInterval = $scope.layout.refreshInterval || 30;
        
        // Start verversing met callback
        trainDataService.startAutoRefresh(function(data) {
          // Bij elke update de extensie opnieuw renderen
          $scope.$apply(function() {
            $element.scope().object.paint($element, $scope.layout);
          });
        }, refreshInterval);
      };
      
      /**
       * Stop automatische verversing
       */
      $scope.stopAutoRefresh = function() {
        trainDataService.stopAutoRefresh();
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

      // Opruimen bij verwijderen van de extensie
      $scope.$on('$destroy', function() {
        // Stop automatische verversing
        $scope.stopAutoRefresh();
        console.log('Extensie wordt verwijderd, opruimen...');
      });
    }]
  };
});
