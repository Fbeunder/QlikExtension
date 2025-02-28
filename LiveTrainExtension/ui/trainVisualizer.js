/**
 * LiveTrainExtension - Een Qlik Sense extensie voor het live volgen van treinen
 * Train Visualizer Module
 * 
 * Verantwoordelijk voor het visualiseren van treinen op de kaart
 * Gebruikt Leaflet voor het toevoegen en beheren van markers
 */
define([
    'jquery',
    '../lib/leaflet/leaflet' // Direct import of bundled leaflet library
], function($, L) { // Note: L is now explicitly included as a parameter
    'use strict';

    // Module scope variabelen
    let trainMarkers = {};         // Opslag voor alle train markers op de kaart
    let previousPositions = {};    // Opslag voor vorige treinposities (voor animatie)
    let runningAnimations = {};    // Houdt actieve animaties bij
    let updateIndicator = null;    // Update indicator element
    let isUpdating = false;        // Update indicator status
    let markerLayer = null;        // Layer group voor alle markers
    
    // Animatie instellingen
    const animationSettings = {
        enabled: true,
        duration: 1000,            // Standaard animatieduur in ms
        easing: 'linear',          // Animatie easing functie
        smoothness: 1,             // Factor voor animatie vloeiendheid (hogere waarde = vloeiender, maar resourceintensief)
    };
    
    // Configuratie voor markers
    const markerConfig = {
        radius: 8,
        defaultColor: '#3388ff',
        selectedColor: '#ff3333',
        delayedColor: '#ff8800',
        onTimeColor: '#00cc44',
        unknownStatusColor: '#999999',
        cancelledColor: '#cc0000',
        divertedColor: '#cc44cc',
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
    };

    /**
     * Veilige manier om markerAnimatie frame te annuleren
     * @param {string} trainId - ID van de trein waarvoor animatie moet worden gestopt
     * @private
     */
    function _cancelAnimationFrame(trainId) {
        if (runningAnimations[trainId]) {
            window.cancelAnimationFrame(runningAnimations[trainId]);
            runningAnimations[trainId] = null;
            delete runningAnimations[trainId];
        }
    }
    
    /**
     * Update marker stijl gebaseerd op trainstatus
     * @param {Object} marker - Leaflet marker object
     * @param {Object} train - Treingegevens object
     * @param {Array} selectedTrainIds - Array met geselecteerde trein IDs
     * @private
     */
    function _updateMarkerStyle(marker, train, selectedTrainIds) {
        if (!marker || !train) return;
        
        const isSelected = selectedTrainIds && selectedTrainIds.includes(train.number);
        
        if (isSelected) {
            marker.setStyle({
                fillColor: markerConfig.selectedColor,
                color: '#ffffff'
            });
            return;
        }
        
        let fillColor = markerConfig.defaultColor;
        
        // Bepaal kleur op basis van status
        switch (train.status) {
            case 'DELAYED':
                fillColor = markerConfig.delayedColor;
                break;
            case 'ON_TIME':
                fillColor = markerConfig.onTimeColor;
                break;
            case 'CANCELLED':
                fillColor = markerConfig.cancelledColor;
                break;
            case 'DIVERTED':
                fillColor = markerConfig.divertedColor;
                break;
            case 'UNKNOWN':
                fillColor = markerConfig.unknownStatusColor;
                break;
            default:
                // Check vertraging als expliciete status ontbreekt
                if (train.details && train.details.delay > 0) {
                    fillColor = markerConfig.delayedColor;
                } else {
                    fillColor = markerConfig.onTimeColor;
                }
        }
        
        marker.setStyle({
            fillColor: fillColor,
            color: '#ffffff'
        });
    }

    /**
     * TrainVisualizer module
     */
    return {
        /**
         * Initialiseer de train visualizer
         * @param {Object} map - Leaflet kaart object
         */
        init: function(map) {
            if (!map) return;
            
            // Ruim eventuele bestaande resources op
            this.cleanup(map);
            
            // Maak een nieuwe marker layer group
            markerLayer = L.layerGroup().addTo(map);
        },
        
        /**
         * Update de positie van treinen op de kaart
         * Voegt nieuwe markers toe, verwijdert oude en werkt bestaande bij
         * 
         * @param {Object} map - Leaflet kaart object
         * @param {Array} trainData - Array met treingegevens
         * @param {Array} selectedTrainIds - Array met geselecteerde trein IDs
         * @param {Function} onMarkerClick - Callback voor klikken op marker
         */
        updateTrainPositions: function(map, trainData, selectedTrainIds, onMarkerClick) {
            if (!map || !trainData) return;
            
            // Zorg dat we een marker layer hebben
            if (!markerLayer) {
                this.init(map);
            }
            
            // Toon update indicator
            this.showUpdateIndicator(map);
            
            // Bijhouden welke treinen zijn bijgewerkt
            const updatedTrains = new Set();
            
            // Valideer en filter de trainData om ongeldige items te voorkomen
            const validTrainData = trainData.filter(train => 
                train && train.number && train.position && 
                typeof train.position.lat === 'number' && 
                typeof train.position.lng === 'number'
            );
            
            // Voeg of update markers voor elke trein
            validTrainData.forEach(train => {
                const trainId = train.number;
                updatedTrains.add(trainId);
                
                // Opslaan van huidige positie voor animatie
                const newPosition = [train.position.lat, train.position.lng];
                
                // Als de marker al bestaat, update de positie
                if (trainMarkers[trainId]) {
                    const marker = trainMarkers[trainId];
                    
                    try {
                        // Stop eventuele lopende animatie voor deze marker
                        _cancelAnimationFrame(trainId);
                        
                        const oldPosition = marker.getLatLng();
                        
                        // Als animatie ingeschakeld is en we hebben een vorige positie, voer vloeiende overgang uit
                        if (animationSettings.enabled && previousPositions[trainId] && 
                            this._shouldAnimate(oldPosition, newPosition)) {
                            this.animateMarkerTransition(marker, oldPosition, newPosition, trainId);
                        } else {
                            // Anders direct de positie updaten
                            marker.setLatLng(newPosition);
                        }
                        
                        // Update popup inhoud als deze bestaat
                        if (marker.getPopup()) {
                            marker.setPopupContent(this.createPopupContent(train));
                        }
                        
                        // Update marker kleur gebaseerd op status
                        _updateMarkerStyle(marker, train, selectedTrainIds);
                        
                    } catch (e) {
                        console.error('Fout bij updaten van marker voor trein ' + trainId, e);
                        // Herstel bij fout door een nieuwe marker te maken
                        this.removeTrainMarker(map, trainId);
                        this.addTrainMarker(map, train, selectedTrainIds, onMarkerClick);
                    }
                } 
                // Anders, maak een nieuwe marker
                else {
                    this.addTrainMarker(map, train, selectedTrainIds, onMarkerClick);
                }
                
                // Bewaar de huidige positie voor de volgende update
                previousPositions[trainId] = newPosition;
            });
            
            // Verwijder markers voor treinen die niet meer aanwezig zijn
            Object.keys(trainMarkers).forEach(trainId => {
                if (!updatedTrains.has(trainId)) {
                    this.removeTrainMarker(map, trainId);
                    delete previousPositions[trainId];
                }
            });
            
            // Verberg update indicator na korte vertraging
            setTimeout(() => {
                this.hideUpdateIndicator(map);
            }, 500);
        },
        
        /**
         * Voeg een marker toe voor een specifieke trein
         * 
         * @param {Object} map - Leaflet kaart object
         * @param {Object} train - Treingegevens object
         * @param {Array} selectedTrainIds - Array met geselecteerde trein IDs
         * @param {Function} onMarkerClick - Callback voor klikken op marker
         */
        addTrainMarker: function(map, train, selectedTrainIds, onMarkerClick) {
            if (!map || !train || !train.position || !train.position.lat || !train.position.lng) return;
            
            // Zorg dat we een marker layer hebben
            if (!markerLayer) {
                this.init(map);
            }
            
            const trainId = train.number;
            
            // Controleer of de marker niet al bestaat, zo ja, update in plaats van toevoegen
            if (trainMarkers[trainId]) {
                const oldMarker = trainMarkers[trainId];
                this.removeTrainMarker(map, trainId);
            }
            
            // Maak een cirkelmarker voor de trein
            const marker = L.circleMarker([train.position.lat, train.position.lng], {
                radius: markerConfig.radius,
                weight: markerConfig.weight,
                opacity: markerConfig.opacity,
                fillOpacity: markerConfig.fillOpacity
            });
            
            // Update marker stijl gebaseerd op status
            _updateMarkerStyle(marker, train, selectedTrainIds);
            
            // Voeg popup toe met treingegevens
            marker.bindPopup(this.createPopupContent(train));
            
            // Voeg een tooltip toe met treinnummer voor snelle identificatie
            marker.bindTooltip(train.number, {
                permanent: false,
                direction: 'top',
                className: 'train-tooltip'
            });
            
            // Voeg click event toe
            if (onMarkerClick && typeof onMarkerClick === 'function') {
                marker.on('click', function(e) {
                    L.DomEvent.stopPropagation(e);
                    onMarkerClick(trainId);
                });
            }
            
            // Voeg richtingsindicator toe als de heading beschikbaar is
            if (train.heading !== undefined && train.heading !== null && typeof train.heading === 'number') {
                this._addDirectionIndicator(marker, train.heading);
            }
            
            // Voeg marker toe aan de layer group in plaats van direct aan de kaart
            if (markerLayer) {
                marker.addTo(markerLayer);
            } else {
                marker.addTo(map);
            }
            
            // Sla marker op in trainMarkers object
            trainMarkers[trainId] = marker;
        },
        
        /**
         * Bepalen of een marker animatie nodig heeft gebaseerd op afstand
         * @param {Object} oldPos - Oude positie (LatLng object)
         * @param {Array} newPos - Nieuwe positie [lat, lng]
         * @returns {boolean} True als animatie nodig is
         * @private
         */
        _shouldAnimate: function(oldPos, newPos) {
            // Controleer voor null of undefined waarden
            if (!oldPos || !newPos) return false;
            
            // Bereken afstand tussen oude en nieuwe positie
            try {
                const distThreshold = 0.001; // ~100m in lat/lng
                const latDiff = Math.abs(oldPos.lat - newPos[0]);
                const lngDiff = Math.abs(oldPos.lng - newPos[1]);
                
                // Animeer alleen als er een merkbare beweging is, maar niet te groot
                // Om te voorkomen dat treinen over de hele kaart springen bij grote positiewijziging
                return (latDiff > 0.00001 || lngDiff > 0.00001) && 
                       (latDiff < 0.5 && lngDiff < 0.5);
            } catch (e) {
                console.error('Fout bij berekenen animatie afstand', e);
                return false;
            }
        },
        
        /**
         * Voeg richtingsindicator toe aan marker
         * @param {Object} marker - Leaflet marker
         * @param {number} heading - Koers in graden (0-360)
         * @private
         */
        _addDirectionIndicator: function(marker, heading) {
            // Implementatie als eenvoudige tekst in tooltip voor nu
            // In toekomstige implementatie zou dit een roterende pijl kunnen zijn
            if (marker && typeof heading === 'number') {
                let direction = Math.round(heading);
                let tooltip = marker.getTooltip();
                
                if (tooltip) {
                    let content = tooltip.getContent();
                    if (typeof content === 'string') {
                        marker.setTooltipContent(content + ' (' + direction + '°)');
                    }
                }
            }
        },
        
        /**
         * Animeer de overgang van een marker van oude naar nieuwe positie
         * 
         * @param {Object} marker - Leaflet marker object
         * @param {Object} startPosition - Oude positie (LatLng)
         * @param {Array} endPosition - Nieuwe positie [lat, lng]
         * @param {string} trainId - ID van de trein voor animatiebeheer
         */
        animateMarkerTransition: function(marker, startPosition, endPosition, trainId) {
            if (!marker || !startPosition || !endPosition || !trainId) return;
            
            // Bereken animatie eigenschappen
            const startTime = Date.now();
            const duration = animationSettings.duration;
            
            // Stop eventuele lopende animatie
            _cancelAnimationFrame(trainId);
            
            // Animatie functie met requestAnimationFrame
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Bereken nieuwe positie met easing
                let easedProgress = progress;
                
                // Eenvoudige easing functie
                switch (animationSettings.easing) {
                    case 'easeInOut':
                        easedProgress = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
                        break;
                    case 'easeOut':
                        easedProgress = 1 - Math.pow(1 - progress, 2);
                        break;
                    // Standaard is linear
                }
                
                try {
                    // Bereken nieuwe positie met interpolatie
                    const lat = startPosition.lat + (endPosition[0] - startPosition.lat) * easedProgress;
                    const lng = startPosition.lng + (endPosition[1] - startPosition.lng) * easedProgress;
                    
                    // Update marker positie
                    marker.setLatLng([lat, lng]);
                    
                    // Doorgaan met animatie tot voltooid
                    if (progress < 1) {
                        runningAnimations[trainId] = window.requestAnimationFrame(animate);
                    } else {
                        // Zet definitieve positie en ruim op
                        marker.setLatLng(endPosition);
                        _cancelAnimationFrame(trainId);
                    }
                } catch (e) {
                    console.error('Fout tijdens marker animatie', e);
                    // Bij fout, zet direct naar eindpositie en stop animatie
                    try {
                        marker.setLatLng(endPosition);
                    } catch (e2) {
                        console.error('Kon marker positie niet instellen na animatiefout', e2);
                    }
                    _cancelAnimationFrame(trainId);
                }
            };
            
            // Start de animatie
            runningAnimations[trainId] = window.requestAnimationFrame(animate);
        },
        
        /**
         * Verwijder een marker van de kaart
         * 
         * @param {Object} map - Leaflet kaart object
         * @param {String} trainId - ID van de trein om te verwijderen
         */
        removeTrainMarker: function(map, trainId) {
            if (!trainId || !trainMarkers[trainId]) return;
            
            try {
                // Stop lopende animaties voor deze marker
                _cancelAnimationFrame(trainId);
                
                // Verwijder van de layer group indien beschikbaar
                if (markerLayer) {
                    markerLayer.removeLayer(trainMarkers[trainId]);
                } else if (map) {
                    map.removeLayer(trainMarkers[trainId]);
                }
                
                // Verwijder referenties
                delete trainMarkers[trainId];
            } catch (e) {
                console.error('Fout bij verwijderen van marker voor trein ' + trainId, e);
                // Zelfs bij fout, probeer de referentie op te schonen
                trainMarkers[trainId] = null;
                delete trainMarkers[trainId];
            }
        },
        
        /**
         * Markeer een specifieke trein als geselecteerd/niet-geselecteerd
         * 
         * @param {String} trainId - ID van de trein om te markeren
         * @param {Boolean} shouldHighlight - Of de trein moet worden gemarkeerd
         * @param {Object} train - Treingegevens object (optioneel)
         */
        highlightTrainMarker: function(trainId, shouldHighlight, train) {
            if (!trainId || !trainMarkers[trainId]) return;
            
            const marker = trainMarkers[trainId];
            
            if (shouldHighlight) {
                marker.setStyle({
                    fillColor: markerConfig.selectedColor,
                    color: '#ffffff'
                });
            } else if (train) {
                _updateMarkerStyle(marker, train, []);
            } else {
                // Als geen treindata, gebruik default style
                marker.setStyle({
                    fillColor: markerConfig.defaultColor,
                    color: '#ffffff'
                });
            }
        },
        
        /**
         * Update alle markers gebaseerd op selectiestatus
         * 
         * @param {Array} selectedTrainIds - Array met geselecteerde trein IDs
         * @param {Array} trainData - Array met treingegevens
         */
        updateSelectedMarkers: function(selectedTrainIds, trainData) {
            if (!selectedTrainIds && !trainData) return;
            
            const trainDataMap = {};
            
            // Maak een map van treindata voor snelle lookup
            if (trainData && trainData.length) {
                trainData.forEach(train => {
                    if (train && train.number) {
                        trainDataMap[train.number] = train;
                    }
                });
            }
            
            // Update elke marker
            Object.keys(trainMarkers).forEach(trainId => {
                if (!trainMarkers[trainId]) return;
                
                const isSelected = selectedTrainIds && selectedTrainIds.includes(trainId);
                const train = trainDataMap[trainId];
                
                this.highlightTrainMarker(trainId, isSelected, train);
            });
        },
        
        /**
         * Maak popup content met treingegevens
         * 
         * @param {Object} train - Treingegevens object
         * @return {String} HTML content voor de popup
         */
        createPopupContent: function(train) {
            if (!train) return '';
            
            try {
                const hasDelay = train.details && train.details.delay && train.details.delay > 0;
                const status = hasDelay ? 
                    `<span class="delayed">Vertraagd (${train.details.delay} min)</span>` : 
                    '<span class="on-time">Op tijd</span>';
                
                // Bouw een veilige HTML string
                let html = '<div class="train-popup">';
                html += `<h4>Trein ${train.number}</h4>`;
                
                if (train.details) {
                    html += `<p><strong>Type:</strong> ${train.details.type || 'Onbekend'}</p>`;
                    
                    if (train.details.origin) {
                        html += `<p><strong>Van:</strong> ${train.details.origin}</p>`;
                    }
                    
                    if (train.details.destination) {
                        html += `<p><strong>Naar:</strong> ${train.details.destination}</p>`;
                    }
                    
                    html += `<p><strong>Status:</strong> ${status}</p>`;
                    
                    if (train.details.platform) {
                        html += `<p><strong>Platform:</strong> ${train.details.platform}</p>`;
                    }
                }
                
                if (typeof train.speed === 'number') {
                    html += `<p><strong>Snelheid:</strong> ${Math.round(train.speed)} km/u</p>`;
                }
                
                html += '</div>';
                return html;
            } catch (e) {
                console.error('Fout bij maken van popup content', e);
                return '<div class="train-popup"><p>Fout bij laden van treingegevens</p></div>';
            }
        },
        
        /**
         * Verwijder alle markers van de kaart
         * 
         * @param {Object} map - Leaflet kaart object
         */
        clearAllMarkers: function(map) {
            if (!map) return;
            
            // Stop alle lopende animaties
            Object.keys(runningAnimations).forEach(trainId => {
                _cancelAnimationFrame(trainId);
            });
            
            // Verwijder alle markers
            if (markerLayer) {
                markerLayer.clearLayers();
            } else {
                Object.keys(trainMarkers).forEach(trainId => {
                    if (trainMarkers[trainId]) {
                        map.removeLayer(trainMarkers[trainId]);
                    }
                });
            }
            
            // Reset alle datastores
            trainMarkers = {};
            previousPositions = {};
            runningAnimations = {};
        },
        
        /**
         * Toon visuele indicator dat data wordt bijgewerkt
         * 
         * @param {Object} map - Leaflet kaart object
         */
        showUpdateIndicator: function(map) {
            if (!map || isUpdating) return;
            
            isUpdating = true;
            
            // Maak een update indicator als deze nog niet bestaat
            if (!updateIndicator) {
                const UpdateControl = L.Control.extend({
                    options: {
                        position: 'bottomleft'
                    },
                    
                    onAdd: function() {
                        const container = L.DomUtil.create('div', 'update-indicator-container');
                        container.innerHTML = '<div class="update-indicator">Data wordt bijgewerkt...</div>';
                        return container;
                    }
                });
                
                updateIndicator = new UpdateControl();
                updateIndicator.addTo(map);
            } else if (updateIndicator._map !== map) {
                // Als de indicator al bestaat maar op een andere kaart, voeg toe aan nieuwe kaart
                updateIndicator.remove();
                updateIndicator.addTo(map);
            }
            
            // Voeg update class toe voor pulsing effect
            $('.update-indicator').addClass('updating').parent().show();
        },
        
        /**
         * Verberg de update indicator
         * 
         * @param {Object} map - Leaflet kaart object
         */
        hideUpdateIndicator: function(map) {
            if (!map || !isUpdating || !updateIndicator) return;
            
            isUpdating = false;
            
            // Verwijder animatieklasse en verberg na korte fade-out
            $('.update-indicator').removeClass('updating');
            
            // Verberg de indicator met kleine vertraging voor fade-out effect
            setTimeout(() => {
                if (!isUpdating) {
                    $('.update-indicator').parent().hide();
                }
            }, 500);
        },
        
        /**
         * Configureer animatie instellingen
         * 
         * @param {Object} settings - Configuratie voor animatie
         */
        configureAnimation: function(settings) {
            if (!settings) return;
            
            // Update enable/disable status
            if (typeof settings.enabled === 'boolean') {
                animationSettings.enabled = settings.enabled;
                
                // Als animatie is uitgeschakeld, stop lopende animaties
                if (!animationSettings.enabled) {
                    Object.keys(runningAnimations).forEach(trainId => {
                        _cancelAnimationFrame(trainId);
                    });
                }
            }
            
            // Update duur met validatie
            if (settings.duration !== undefined) {
                const duration = parseInt(settings.duration, 10);
                if (!isNaN(duration) && duration >= 0) {
                    animationSettings.duration = Math.max(100, Math.min(5000, duration));
                }
            }
            
            // Update easing functie
            if (settings.easing && typeof settings.easing === 'string') {
                const validEasings = ['linear', 'easeIn', 'easeOut', 'easeInOut'];
                if (validEasings.includes(settings.easing)) {
                    animationSettings.easing = settings.easing;
                }
            }
            
            // Update animatie vloeiendheid
            if (settings.smoothness !== undefined) {
                const smoothness = parseFloat(settings.smoothness);
                if (!isNaN(smoothness) && smoothness > 0) {
                    animationSettings.smoothness = Math.max(0.1, Math.min(3, smoothness));
                }
            }
        },
        
        /**
         * Krijg huidige animatie instellingen
         * 
         * @returns {Object} Animatie configuratie
         */
        getAnimationSettings: function() {
            return { ...animationSettings };
        },
        
        /**
         * Geef aantal actieve markers terug
         * 
         * @returns {number} Aantal actieve markers
         */
        getMarkerCount: function() {
            return Object.keys(trainMarkers).length;
        },
        
        /**
         * Ruim alle resources op
         * 
         * @param {Object} map - Leaflet kaart object (optioneel)
         */
        cleanup: function(map) {
            // Stop alle animaties
            Object.keys(runningAnimations).forEach(trainId => {
                _cancelAnimationFrame(trainId);
            });
            
            // Verwijder alle markers
            this.clearAllMarkers(map);
            
            // Verwijder update indicator
            if (updateIndicator) {
                try {
                    updateIndicator.remove();
                } catch (e) {
                    console.error('Fout bij verwijderen update indicator', e);
                }
                updateIndicator = null;
            }
            
            // Verwijder marker layer
            if (markerLayer && map) {
                try {
                    markerLayer.remove();
                } catch (e) {
                    console.error('Fout bij verwijderen marker layer', e);
                }
            }
            
            // Reset alle datastores
            markerLayer = null;
            trainMarkers = {};
            previousPositions = {};
            runningAnimations = {};
            isUpdating = false;
        }
    };
});
