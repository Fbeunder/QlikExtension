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
            },
            dimDescription: {
              component: 'text',
              label: 'Beschrijving',
              style: 'hint',
              translation: 'Kies een dimensie die de treinnummers bevat voor filtering'
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
            interactionSettings: {
              type: 'items',
              label: 'Interactie instellingen',
              items: {
                selectionMode: {
                  ref: 'selectionMode', 
                  type: 'string',
                  component: 'dropdown',
                  label: 'Selectie modus',
                  options: [{
                    value: 'click',
                    label: 'Klik (één trein selecteren)'
                  }, {
                    value: 'multiple',
                    label: 'Meervoudig (meerdere treinen selecteren)'
                  }, {
                    value: 'none',
                    label: 'Geen (selectie uitgeschakeld)'
                  }],
                  defaultValue: 'click'
                },
                allowSelectionFromMap: {
                  ref: 'allowSelectionFromMap',
                  type: 'boolean',
                  label: 'Selectie vanaf kaart toestaan',
                  defaultValue: true 
                },
                bidirectionalSelection: {
                  ref: 'bidirectionalSelection',
                  type: 'boolean',
                  label: 'Bidirectionele selectie',
                  defaultValue: true,
                  show: function(data) {
                    return data.selectionMode !== 'none';
                  }
                },
                highlightSelectedTrains: {
                  ref: 'highlightSelectedTrains',
                  type: 'boolean',
                  label: 'Geselecteerde treinen markeren',
                  defaultValue: true
                }
              }
            },
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
                },
                refreshOnSelection: {
                  ref: 'refreshOnSelection',
                  type: 'boolean',
                  label: 'Verversen bij selectie wijziging',
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