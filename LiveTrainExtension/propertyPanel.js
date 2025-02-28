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
        apiSettings: {
          type: 'items',
          label: 'API Configuratie',
          items: {
            apiKeySection: {
              component: 'text',
              label: 'NS API Instellingen',
              style: 'header'
            },
            apiKeyDescription: {
              component: 'text',
              label: 'API Key configuratie',
              style: 'hint',
              translation: 'Vul hier je NS API key in. Je kunt deze aanvragen via de NS Developer Portal.'
            },
            apiKey: {
              ref: 'apiKey',
              type: 'string',
              label: 'NS API Key',
              defaultValue: '',
              expression: 'optional'
            },
            corsSection: {
              component: 'text',
              label: 'CORS Configuratie',
              style: 'header'
            },
            corsSectionDescription: {
              component: 'text',
              label: 'CORS Proxy instellingen',
              style: 'hint',
              translation: 'Als je problemen hebt met CORS, kun je een proxy gebruiken.'
            },
            useCorsProxy: {
              ref: 'useCorsProxy',
              type: 'boolean',
              label: 'Gebruik CORS proxy',
              defaultValue: false
            },
            corsProxyUrl: {
              ref: 'corsProxyUrl',
              type: 'string',
              label: 'CORS proxy URL',
              defaultValue: '',
              expression: 'optional',
              show: function(data) {
                return data.useCorsProxy === true;
              }
            }
          }
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
                },
                trainNumberFieldName: {
                  ref: 'trainNumberFieldName',
                  type: 'string',
                  label: 'Treinnummer veldnaam',
                  defaultValue: '',
                  expression: 'optional',
                  show: function(data) {
                    return data.selectionMode !== 'none';
                  }
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
                zoomLimits: {
                  component: 'text',
                  label: 'Zoom limieten',
                  style: 'hint',
                  translation: 'Je kunt min/max zoom niveaus instellen om de gebruikerservaring te verbeteren'
                },
                minZoom: {
                  ref: 'minZoom',
                  type: 'number',
                  label: 'Minimum zoom niveau',
                  defaultValue: 6,
                  min: 1,
                  max: 18
                },
                maxZoom: {
                  ref: 'maxZoom',
                  type: 'number',
                  label: 'Maximum zoom niveau',
                  defaultValue: 18,
                  min: 1,
                  max: 19
                },
                defaultCenter: {
                  component: 'text',
                  label: 'Standaard middelpunt',
                  style: 'header'
                },
                defaultLat: {
                  ref: 'defaultLat',
                  type: 'number',
                  label: 'Standaard breedtegraad',
                  defaultValue: 52.1326,
                  expression: 'optional'
                },
                defaultLng: {
                  ref: 'defaultLng',
                  type: 'number',
                  label: 'Standaard lengtegraad',
                  defaultValue: 5.2913,
                  expression: 'optional'
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
                },
                showScale: {
                  ref: 'showScale',
                  type: 'boolean',
                  label: 'Toon schaalbalk',
                  defaultValue: true
                }
              }
            },
            updateSettings: {
              type: 'items',
              label: 'Update instellingen',
              items: {
                autoUpdateSection: {
                  component: 'text',
                  label: 'Automatische updates',
                  style: 'header'
                },
                autoRefresh: {
                  ref: 'autoRefresh',
                  type: 'boolean',
                  label: 'Automatisch verversen',
                  defaultValue: true
                },
                refreshIntervalType: {
                  ref: 'refreshIntervalType',
                  type: 'string',
                  component: 'dropdown',
                  label: 'Verversingsinterval',
                  options: [{
                    value: 'fast',
                    label: 'Snel (5 seconden)'
                  }, {
                    value: 'normal',
                    label: 'Normaal (15 seconden)'
                  }, {
                    value: 'slow',
                    label: 'Langzaam (30 seconden)'
                  }, {
                    value: 'custom',
                    label: 'Aangepast'
                  }],
                  defaultValue: 'normal',
                  show: function(data) {
                    return data.autoRefresh === true;
                  }
                },
                refreshInterval: {
                  ref: 'refreshInterval',
                  type: 'number',
                  label: 'Aangepast interval (seconden)',
                  defaultValue: 15,
                  min: 5,
                  max: 300,
                  show: function(data) {
                    return data.autoRefresh === true && data.refreshIntervalType === 'custom';
                  }
                },
                pauseRefreshWhenNotVisible: {
                  ref: 'pauseRefreshWhenNotVisible',
                  type: 'boolean',
                  label: 'Verversing pauzeren bij inactief venster',
                  defaultValue: true,
                  show: function(data) {
                    return data.autoRefresh === true;
                  }
                },
                refreshOnSelection: {
                  ref: 'refreshOnSelection',
                  type: 'boolean',
                  label: 'Verversen bij selectie wijziging',
                  defaultValue: true
                },
                showUpdateIndicator: {
                  ref: 'showUpdateIndicator',
                  type: 'boolean',
                  label: 'Toon update-indicator',
                  defaultValue: true
                },
                updateTableOnRefresh: {
                  ref: 'updateTableOnRefresh',
                  type: 'boolean',
                  label: 'Tabel bijwerken bij automatische verversing',
                  defaultValue: false,
                  show: function(data) {
                    return data.autoRefresh === true;
                  }
                },
                animationSection: {
                  component: 'text',
                  label: 'Animatie instellingen',
                  style: 'header'
                },
                animateUpdates: {
                  ref: 'animateUpdates',
                  type: 'boolean',
                  label: 'Animeer positie updates',
                  defaultValue: true
                },
                animationDuration: {
                  ref: 'animationDuration',
                  type: 'number',
                  label: 'Animatieduur (milliseconden)',
                  defaultValue: 1000,
                  min: 100,
                  max: 5000,
                  show: function(data) {
                    return data.animateUpdates === true;
                  }
                },
                animationEasing: {
                  ref: 'animationEasing',
                  type: 'string',
                  component: 'dropdown',
                  label: 'Animatie easing',
                  options: [{
                    value: 'linear',
                    label: 'Lineair'
                  }, {
                    value: 'easeIn',
                    label: 'Ease In'
                  }, {
                    value: 'easeOut',
                    label: 'Ease Out'
                  }, {
                    value: 'easeInOut',
                    label: 'Ease In/Out'
                  }],
                  defaultValue: 'linear',
                  show: function(data) {
                    return data.animateUpdates === true;
                  }
                },
                animationSmoothness: {
                  ref: 'animationSmoothness',
                  type: 'number',
                  label: 'Animatie vloeiendheid',
                  defaultValue: 1,
                  min: 0.5,
                  max: 3,
                  step: 0.5,
                  show: function(data) {
                    return data.animateUpdates === true;
                  }
                }
              }
            },
            dataSettings: {
              type: 'items',
              label: 'Data instellingen',
              items: {
                maxResults: {
                  ref: 'maxResults',
                  type: 'number',
                  label: 'Maximum aantal resultaten',
                  defaultValue: 100,
                  min: 10,
                  max: 500
                },
                filterBySelection: {
                  ref: 'filterBySelection',
                  type: 'boolean',
                  label: 'Alleen geselecteerde treinen ophalen',
                  defaultValue: false
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
