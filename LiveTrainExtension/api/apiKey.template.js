/*
 * LiveTrainExtension - Een Qlik Sense extensie voor het live volgen van treinen
 * API Key configuratie template - Kopieer dit bestand naar apiKey.js en pas het aan
 */
define([], function() {
  'use strict';
  
  /**
   * Dit object bevat de API sleutel voor de NS API.
   * Houd deze sleutel privé en voeg dit bestand toe aan .gitignore om te voorkomen
   * dat deze in publieke repositories terecht komt.
   * 
   * Gebruik:
   * 1. Kopieer dit bestand naar apiKey.js
   * 2. Vul uw persoonlijke API sleutel in
   * 3. apiKey.js is al toegevoegd aan .gitignore zodat het niet in de versiecontrole komt
   */
  var apiKeyConfig = {
    /**
     * API sleutel voor NS API
     * Verkrijg een sleutel via de NS Developer Portal:
     * https://apiportal.ns.nl/
     */
    apiKey: 'UW-NS-API-SLEUTEL-HIER',
    
    /**
     * Voeg hier eventuele omgevingsspecifieke configuraties toe
     * zoals verschillende API sleutels voor ontwikkeling/productie
     */
    dev: {
      apiKey: ''
    },
    
    prod: {
      apiKey: ''
    },
    
    /**
     * Haalt de API sleutel op voor de opgegeven omgeving, of de standaard sleutel
     * @param {string} [environment] - Optionele omgeving ('dev' of 'prod')
     * @returns {string} API sleutel
     */
    getApiKey: function(environment) {
      if (environment && this[environment] && this[environment].apiKey) {
        return this[environment].apiKey;
      }
      return this.apiKey;
    }
  };
  
  return apiKeyConfig;
});