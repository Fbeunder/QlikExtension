/*
 * LiveTrainExtension - Een Qlik Sense extensie voor het live volgen van treinen
 * Configuratie van het eigenschappen paneel
 */
define([], function() {
  'use strict';
  
  /**
   * Geef de eigenschappen paneel definitie terug
   * @returns {Object} Properties panel definition
   */
  function getDefinition() {
    return {
      type: 'items',
      component: 'accordion',
      items: {
        dimensions: {
          uses: 'dimensions',
          min: 0,
          max: 1,
          items: {
            trainNumberDimension: {
              type: 'string',
              ref: 'qDef.trainNumberField',
              label: 'Treinnummer veld',
              expression: 'optional'
            }
          }
        },
        measures: {
          uses: 'measures',
          min: 0,
          max: 0
        },
        settings: {
          uses: 'settings',
          items: {
            mapSettings: {
              type: 'items',
              label: 'Kaart instellingen',
              items: {
                defaultZoom: {
                  ref: 'defaultZoom',
                  type: 'number',
                  label: 'Standaard zoom niveau',
                  defaultValue: 7,
                  min: 1,
                  max: 18
                },
                followSelectedTrains: {
                  ref: 'followSelectedTrains',
                  type: 'boolean',
                  label: 'Geselecteerde treinen volgen',
                  defaultValue: true
                },
                maxTrainsToShow: {
                  ref: 'maxTrainsToShow',
                  type: 'number',
                  label: 'Maximum aantal treinen',
                  defaultValue: 50,
                  min: 1,
                  max: 200
                }
              }
            },
            dataSettings: {
              type: 'items',
              label: 'Data instellingen',
              items: {
                refreshInterval: {
                  ref: 'refreshInterval',
                  type: 'number',
                  label: 'Verversingsinterval (seconden)',
                  defaultValue: 30,
                  min: 5,
                  max: 300
                },
                autoRefresh: {
                  ref: 'autoRefresh',
                  type: 'boolean',
                  label: 'Automatisch verversen',
                  defaultValue: true
                }
              }
            }
          }
        }
      }
    };
  }
  
  return {
    getDefinition: getDefinition
  };
});