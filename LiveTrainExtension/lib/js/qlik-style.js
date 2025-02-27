/*
 * LiveTrainExtension - Een Qlik Sense extensie voor het live volgen van treinen
 * Hulpprogramma voor integratie met Qlik stijlen
 */
define(['qlik'], function(qlik) {
  'use strict';
  
  // Stijlhelper voor Qlik Sense integratie
  var QlikStyle = {
    /**
     * Verkrijg de huidige Qlik Theme CSS klasse
     * @returns {string} Huidige thema CSS klasse
     */
    getCurrentTheme: function() {
      var theme = 'qlik-light';
      try {
        var configTheme = qlik.theme.current().properties.theme;
        if (configTheme) {
          if (configTheme.toLowerCase().indexOf('dark') !== -1) {
            theme = 'qlik-dark';
          }
        }
      } catch (e) {
        console.error('Error retrieving current theme:', e);
      }
      return theme;
    },
    
    /**
     * Pas elementen aan op basis van Qlik thema
     * @param {jQuery} $element - Het jQuery element om aan te passen
     * @param {string} theme - Theme naam ('qlik-light' of 'qlik-dark')
     */
    applyTheme: function($element, theme) {
      if (!theme) {
        theme = this.getCurrentTheme();
      }
      
      $element.removeClass('qlik-light qlik-dark').addClass(theme);
      
      if (theme === 'qlik-dark') {
        // Pas donker thema stijlen toe
        $element.find('.train-info-section').css({
          'background-color': '#333',
          'border-color': '#555'
        });
        
        $element.find('.train-info-section h2').css('color', '#f5f5f5');
        $element.find('.train-info-section p').css('color', '#ccc');
        
        $element.find('.train-map-container').css({
          'background-color': '#444',
          'color': '#aaa'
        });
      }
    }
  };
  
  return QlikStyle;
});