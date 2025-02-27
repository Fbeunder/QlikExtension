/**
 * LiveTrainExtension - Een Qlik Sense extensie voor het live volgen van treinen
 * Train Visualizer Module
 * 
 * Verantwoordelijk voor het visualiseren van treinen op de kaart
 * Gebruikt Leaflet voor het toevoegen en beheren van markers
 */
define([
    'jquery'
], function($) {
    'use strict';

    // Opslag voor alle train markers op de kaart
    let trainMarkers = {};
    
    // Opslag voor vorige treinposities (voor animatie)
    let previousPositions = {};
    
    // Animatie instellingen
    const animationSettings = {
        enabled: true,
        duration: 1000, // Standaard animatieduur in ms
        easing: 'linear', // Animatie easing functie
    };
    
    // Configuratie voor markers
    const markerConfig = {
        radius: 8,
        defaultColor: '#3388ff',
        selectedColor: '#ff3333',
        delayedColor: '#ff8800',
        onTimeColor: '#00cc44',
        unknownStatusColor: '#999999',
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
    };
    
    // Update indicator status
    let isUpdating = false;
    let updateIndicator = null;

    /**
     * TrainVisualizer module
     */
    return {
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
            
            // Toon update indicator
            this.showUpdateIndicator(map);
            
            // Bijhouden welke treinen zijn bijgewerkt
            const updatedTrains = {};
            
            // Voeg of update markers voor elke trein
            trainData.forEach(train => {
                if (!train.number || !train.position || !train.position.lat || !train.position.lng) return;
                
                updatedTrains[train.number] = true;
                
                // Opslaan van huidige positie voor animatie
                const newPosition = [train.position.lat, train.position.lng];
                
                // Als de marker al bestaat, update de positie
                if (trainMarkers[train.number]) {
                    const marker = trainMarkers[train.number];
                    const oldPosition = marker.getLatLng();
                    
                    // Als animatie ingeschakeld is, voer vloeiende overgang uit
                    if (animationSettings.enabled && previousPositions[train.number]) {
                        this.animateMarkerTransition(marker, oldPosition, newPosition);
                    } else {
                        // Anders direct de positie updaten
                        marker.setLatLng(newPosition);
                    }
                    
                    // Update popup inhoud
                    if (marker.getPopup()) {
                        marker.setPopupContent(this.createPopupContent(train));
                    }
                    
                    // Update marker kleur gebaseerd op status
                    this._updateMarkerStyle(marker, train, selectedTrainIds);
                } 
                // Anders, maak een nieuwe marker
                else {
                    this.addTrainMarker(map, train, selectedTrainIds, onMarkerClick);
                }
                
                // Bewaar de huidige positie voor de volgende update
                previousPositions[train.number] = newPosition;
            });
            
            // Verwijder markers voor treinen die niet meer aanwezig zijn
            for (const trainId in trainMarkers) {
                if (!updatedTrains[trainId]) {
                    this.removeTrainMarker(map, trainId);
                    delete previousPositions[trainId];
                }
            }
            
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
            
            const isSelected = selectedTrainIds && selectedTrainIds.includes(train.number);
            
            // Maak een cirkelmarker voor de trein
            const marker = L.circleMarker([train.position.lat, train.position.lng], {
                radius: markerConfig.radius,
                weight: markerConfig.weight,
                opacity: markerConfig.opacity,
                fillOpacity: markerConfig.fillOpacity
            });
            
            // Update marker stijl gebaseerd op status
            this._updateMarkerStyle(marker, train, selectedTrainIds);
            
            // Voeg popup toe met treingegevens
            marker.bindPopup(this.createPopupContent(train));
            
            // Voeg een tooltip toe met treinnummer voor snelle identificatie
            marker.bindTooltip(train.number, {
                permanent: false,
                direction: 'top',
                className: 'train-tooltip'
            });
            
            // Voeg click event toe
            if (onMarkerClick) {
                marker.on('click', function(e) {
                    L.DomEvent.stopPropagation(e);
                    onMarkerClick(train.number);
                });
            }
            
            // Voeg richtingsindicator toe als de heading beschikbaar is
            if (train.heading !== undefined && train.heading !== null) {
                // Richtingsindicator implementeren als dat nodig is...
            }
            
            // Voeg marker toe aan de kaart
            marker.addTo(map);
            
            // Sla marker op in trainMarkers object
            trainMarkers[train.number] = marker;
        },
        
        /**
         * Animeer de overgang van een marker van oude naar nieuwe positie
         * 
         * @param {Object} marker - Leaflet marker object
         * @param {Object} startPosition - Oude positie (LatLng)
         * @param {Array} endPosition - Nieuwe positie [lat, lng]
         */
        animateMarkerTransition: function(marker, startPosition, endPosition) {
            if (!marker || !startPosition || !endPosition) return;
            
            // Bereken animatie eigenschappen
            const startTime = Date.now();
            const duration = animationSettings.duration;
            
            // Stop eventuele lopende animatie
            if (marker._animationId) {
                window.cancelAnimationFrame(marker._animationId);
            }
            
            // Animatie functie
            const animate = function() {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Bereken nieuwe positie met interpolatie
                const lat = startPosition.lat + (endPosition[0] - startPosition.lat) * progress;
                const lng = startPosition.lng + (endPosition[1] - startPosition.lng) * progress;
                
                // Update marker positie
                marker.setLatLng([lat, lng]);
                
                // Doorgaan met animatie tot voltooid
                if (progress < 1) {
                    marker._animationId = window.requestAnimationFrame(animate);
                } else {
                    marker._animationId = null;
                }
            };
            
            // Start de animatie
            marker._animationId = window.requestAnimationFrame(animate);
        },
        
        /**
         * Verwijder een marker van de kaart
         * 
         * @param {Object} map - Leaflet kaart object
         * @param {String} trainId - ID van de trein om te verwijderen
         */
        removeTrainMarker: function(map, trainId) {
            if (!map || !trainId || !trainMarkers[trainId]) return;
            
            map.removeLayer(trainMarkers[trainId]);
            delete trainMarkers[trainId];
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
                this._updateMarkerStyle(marker, train, []);
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
            const trainDataMap = {};
            
            // Maak een map van treindata voor snelle lookup
            if (trainData && trainData.length) {
                trainData.forEach(train => {
                    if (train.number) {
                        trainDataMap[train.number] = train;
                    }
                });
            }
            
            // Update elke marker
            for (const trainId in trainMarkers) {
                const isSelected = selectedTrainIds && selectedTrainIds.includes(trainId);
                const train = trainDataMap[trainId];
                
                this.highlightTrainMarker(trainId, isSelected, train);
            }
        },
        
        /**
         * Maak popup content met treingegevens
         * 
         * @param {Object} train - Treingegevens object
         * @return {String} HTML content voor de popup
         */
        createPopupContent: function(train) {
            if (!train) return '';
            
            const hasDelay = train.details && train.details.delay && train.details.delay > 0;
            const status = hasDelay ? 
                `<span class="delayed">Vertraagd (${train.details.delay} min)</span>` : 
                '<span class="on-time">Op tijd</span>';
            
            return `
                <div class="train-popup">
                    <h4>Trein ${train.number}</h4>
                    <p><strong>Type:</strong> ${train.details.type || 'Onbekend'}</p>
                    <p><strong>Van:</strong> ${train.details.origin || 'Onbekend'}</p>
                    <p><strong>Naar:</strong> ${train.details.destination || 'Onbekend'}</p>
                    <p><strong>Status:</strong> ${status}</p>
                    ${train.details.platform ? `<p><strong>Platform:</strong> ${train.details.platform}</p>` : ''}
                    ${train.speed ? `<p><strong>Snelheid:</strong> ${Math.round(train.speed)} km/u</p>` : ''}
                </div>
            `;
        },
        
        /**
         * Verwijder alle markers van de kaart
         * 
         * @param {Object} map - Leaflet kaart object
         */
        clearAllMarkers: function(map) {
            if (!map) return;
            
            for (const trainId in trainMarkers) {
                map.removeLayer(trainMarkers[trainId]);
            }
            
            trainMarkers = {};
            previousPositions = {};
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
            } else {
                // Als de indicator al bestaat, toon hem
                $('.update-indicator').parent().show();
            }
            
            // Voeg update class toe voor pulsing effect
            $('.update-indicator').addClass('updating');
        },
        
        /**
         * Verberg de update indicator
         * 
         * @param {Object} map - Leaflet kaart object
         */
        hideUpdateIndicator: function(map) {
            if (!map || !isUpdating || !updateIndicator) return;
            
            isUpdating = false;
            $('.update-indicator').removeClass('updating');
            
            // Verberg de indicator
            setTimeout(() => {
                $('.update-indicator').parent().hide();
            }, 500);
        },
        
        /**
         * Configureer animatie instellingen
         * 
         * @param {Object} settings - Configuratie voor animatie
         */
        configureAnimation: function(settings) {
            if (!settings) return;
            
            if (typeof settings.enabled === 'boolean') {
                animationSettings.enabled = settings.enabled;
            }
            
            if (settings.duration && typeof settings.duration === 'number') {
                animationSettings.duration = Math.max(100, Math.min(5000, settings.duration));
            }
            
            if (settings.easing && typeof settings.easing === 'string') {
                animationSettings.easing = settings.easing;
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
         * Update marker stijl gebaseerd op trainstatus
         * Privé helper functie
         * 
         * @param {Object} marker - Leaflet marker object
         * @param {Object} train - Treingegevens object
         * @param {Array} selectedTrainIds - Array met geselecteerde trein IDs
         */
        _updateMarkerStyle: function(marker, train, selectedTrainIds) {
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
            if (train.status === 'DELAYED' || (train.details && train.details.delay > 0)) {
                fillColor = markerConfig.delayedColor;
            } else if (train.status === 'ON_TIME') {
                fillColor = markerConfig.onTimeColor;
            } else if (train.status === 'CANCELLED') {
                fillColor = markerConfig.unknownStatusColor;
            }
            
            marker.setStyle({
                fillColor: fillColor,
                color: '#ffffff'
            });
        }
    };
});
