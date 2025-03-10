/**
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
            
            // Bijhouden welke treinen zijn bijgewerkt
            const updatedTrains = {};
            
            // Voeg of update markers voor elke trein
            trainData.forEach(train => {
                if (!train.trainNumber || !train.latitude || !train.longitude) return;
                
                updatedTrains[train.trainNumber] = true;
                
                // Als de marker al bestaat, update de positie
                if (trainMarkers[train.trainNumber]) {
                    const marker = trainMarkers[train.trainNumber];
                    marker.setLatLng([train.latitude, train.longitude]);
                    
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
            });
            
            // Verwijder markers voor treinen die niet meer aanwezig zijn
            for (const trainId in trainMarkers) {
                if (!updatedTrains[trainId]) {
                    this.removeTrainMarker(map, trainId);
                }
            }
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
            if (!map || !train || !train.latitude || !train.longitude) return;
            
            const isSelected = selectedTrainIds && selectedTrainIds.includes(train.trainNumber);
            
            // Maak een cirkelmarker voor de trein
            const marker = L.circleMarker([train.latitude, train.longitude], {
                radius: markerConfig.radius,
                weight: markerConfig.weight,
                opacity: markerConfig.opacity,
                fillOpacity: markerConfig.fillOpacity
            });
            
            // Update marker stijl gebaseerd op status
            this._updateMarkerStyle(marker, train, selectedTrainIds);
            
            // Voeg popup toe met treingegevens
            marker.bindPopup(this.createPopupContent(train));
            
            // Voeg click event toe
            if (onMarkerClick) {
                marker.on('click', function(e) {
                    L.DomEvent.stopPropagation(e);
                    onMarkerClick(train.trainNumber);
                });
            }
            
            // Voeg marker toe aan de kaart
            marker.addTo(map);
            
            // Sla marker op in trainMarkers object
            trainMarkers[train.trainNumber] = marker;
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
                    if (train.trainNumber) {
                        trainDataMap[train.trainNumber] = train;
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
            
            const hasDelay = train.delay && train.delay > 0;
            const status = hasDelay ? `<span class="delayed">Vertraagd (${train.delay} min)</span>` : '<span class="on-time">Op tijd</span>';
            
            return `
                <div class="train-popup">
                    <h3>Trein ${train.trainNumber}</h3>
                    <p><strong>Type:</strong> ${train.trainType || 'Onbekend'}</p>
                    <p><strong>Van:</strong> ${train.origin || 'Onbekend'}</p>
                    <p><strong>Naar:</strong> ${train.destination || 'Onbekend'}</p>
                    <p><strong>Status:</strong> ${status}</p>
                    ${train.platform ? `<p><strong>Platform:</strong> ${train.platform}</p>` : ''}
                    ${train.speed ? `<p><strong>Snelheid:</strong> ${train.speed} km/u</p>` : ''}
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
            
            const isSelected = selectedTrainIds && selectedTrainIds.includes(train.trainNumber);
            
            if (isSelected) {
                marker.setStyle({
                    fillColor: markerConfig.selectedColor,
                    color: '#ffffff'
                });
                return;
            }
            
            let fillColor = markerConfig.defaultColor;
            
            // Bepaal kleur op basis van status
            if (train.delay === undefined) {
                fillColor = markerConfig.unknownStatusColor;
            } else if (train.delay > 0) {
                fillColor = markerConfig.delayedColor;
            } else {
                fillColor = markerConfig.onTimeColor;
            }
            
            marker.setStyle({
                fillColor: fillColor,
                color: '#ffffff'
            });
        }
    };
});
