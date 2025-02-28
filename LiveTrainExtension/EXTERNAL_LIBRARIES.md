# Externe Bibliotheken in Qlik Cloud

Deze handleiding bevat instructies voor het correct bundelen en laden van externe bibliotheken voor gebruik in Qlik Cloud.

## Waarom bundelen?

In Qlik Cloud worden extensies uitgevoerd in een gecontroleerde sandbox-omgeving met strenge beveiligingsbeperkingen. Om betrouwbaar te werken in deze omgeving, worden externe bibliotheken idealiter:

1. **Gebundeld** met de extensie (in plaats van dynamisch geladen via CDN)
2. **Geladen via HTTPS** wanneer externe bronnen nodig zijn
3. **Stabiele versies** gebruikt in plaats van 'latest'

## Instructies voor bundelen

### 1. Leaflet.js

De LiveTrainExtension maakt gebruik van Leaflet.js voor kaartvisualisaties. Volg deze stappen om Leaflet te bundelen:

1. Download de nieuwste stable release van Leaflet vanaf: https://leafletjs.com/download.html
2. Plaats de gedownloade bestanden in de volgende structuur:
   ```
   LiveTrainExtension/
   ├── lib/
   │   ├── leaflet/
   │   │   ├── leaflet.js
   │   │   └── leaflet.css
   │   │   └── images/        # Marker afbeeldingen
   ```

3. Update de references in het mapRenderer.js bestand:

```javascript
// Verander CDN link:
// define(['leaflet'], function(L) { ... }
// Naar lokale bundel:
define(['../lib/leaflet/leaflet'], function(L) { ... }
```

4. Voeg CSS import toe in de hoofdmodule:

```javascript
// In LiveTrainExtension.js
define([
  // Bestaande imports...
  'css!./lib/leaflet/leaflet.css',
  'css!./lib/css/style.css'
], function(...) { ... });
```

### 2. jQuery

jQuery wordt meestal geladen door Qlik Sense zelf, maar om maximale compatibiliteit te garanderen:

1. Download jQuery (versie 3.6.0 of nieuwer) van: https://jquery.com/download/
2. Plaats in:
   ```
   LiveTrainExtension/
   ├── lib/
   │   ├── jquery/
   │   │   └── jquery.min.js
   ```

3. Voeg conditionele import toe:

```javascript
// In LiveTrainExtension.js
define([
  'qlik',
  './lib/jquery/jquery.min',  // Eerst lokale versie proberen
  'jquery',                   // Fallback naar Qlik's versie
  // Overige imports...
], function(qlik, $jquery1, $jquery2) {
  'use strict';
  
  // Gebruik beschikbare jQuery versie
  var $ = $jquery1 || $jquery2;
  
  // Extensie code...
}
```

## Externe bibliotheken via HTTPS

Wanneer je toch externe bibliotheken nodig hebt, gebruik uitsluitend HTTPS URLs. Vervang alle 'http://' URLs door 'https://'.

Voorbeeld van veilige externe referenties:

```javascript
// Onveilig:
var scriptUrl = 'http://cdn.example.com/script.js';

// Veilig:
var scriptUrl = 'https://cdn.example.com/script.js';
```

## Versie pinning

Specificeer altijd exacte versienummers voor externe bibliotheken in plaats van 'latest' of algemene verwijzingen.

```javascript
// Onveilig:
var leafletUrl = 'https://unpkg.com/leaflet/dist/leaflet.js';

// Veilig:
var leafletUrl = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
```

## Bibliotheken met bekende Qlik Cloud compatibiliteit

De volgende externe bibliotheken zijn getest en bevestigd compatibel met Qlik Cloud (mits via HTTPS geladen):

1. **Leaflet.js** (1.7.0+)
2. **D3.js** (7.0.0+)
3. **Chart.js** (3.7.0+)
4. **jQuery** (3.6.0+)
5. **Moment.js** (2.29.0+)
6. **Lodash** (4.17.0+)

## Aanbevolen CDN voor Qlik Cloud

Als bundeling niet mogelijk is, gebruik dan deze CDNs die betrouwbaar werken in Qlik Cloud:

1. **cdnjs**: https://cdnjs.cloudflare.com/
2. **jsdelivr**: https://jsdelivr.net/
3. **unpkg**: https://unpkg.com/

## Troubleshooting

Als je problemen ervaart met externe bibliotheken in Qlik Cloud:

1. Controleer de browser console op fouten
2. Kijk voor "Mixed Content" waarschuwingen die HTTP vs HTTPS issues aanduiden
3. Controleer op CORS (Cross-Origin Resource Sharing) fouten
4. Verifieer dat de bibliotheek toegang heeft tot het window-object als dat nodig is
5. Test de extensie in zowel Chrome als Edge, omdat er verschillen kunnen zijn in implementatie van de CSP