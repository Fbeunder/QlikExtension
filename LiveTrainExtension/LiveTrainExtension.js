/*
 * LiveTrainExtension - Een Qlik Sense extensie voor het live volgen van treinen
 * Hoofdmodule voor de extensie
 */
define([
  'qlik',
  'jquery',
  './initialProperties',
  './lib/js/qlik-style',
  'css!./lib/css/style.css'
], function(qlik, $, initialProperties, QlikStyle) {
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
      
      html += '</div>';
      
      // Kaart container voor toekomstige implementatie
      html += '<div id="train-map-container" class="train-map-container">';
      html += '<p>Kaart wordt geladen...</p>';
      html += '</div>';
      
      html += '</div>';

      // Weergeven in het element
      $element.html(html);

      // Hier zou de logica komen voor het initialiseren van de kaart en het ophalen van treingegevens
      // Dit wordt in volgende implementatiestappen toegevoegd

      // Promise teruggeven dat tekenen is voltooid
      return qlik.Promise.resolve();
    },
    controller: ['$scope', '$element', function($scope, $element) {
      // Controller logica voor het beheren van de extensie levenscyclus
      $scope.getTrainData = function() {
        // Placeholder voor het ophalen van treingegevens
        console.log('Treingegevens ophalen...');
        // Implementatie volgt in een toekomstige stap
      };

      // Initialisatie
      $scope.$on('$destroy', function() {
        // Opruimen bij verwijderen van de extensie
        console.log('Extensie wordt verwijderd, opruimen...');
      });
    }]
  };
});