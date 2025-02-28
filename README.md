# Live Train Extension voor Qlik Sense

Een Qlik Sense extensie voor het live volgen van treinen in een dashboard met real-time updates.

## Overzicht

Deze extensie maakt het mogelijk om real-time treinposities te visualiseren in Qlik Sense. De extensie integreert naadloos met bestaande Qlik Sense-toepassingen en kan filteren op basis van treinnummers die in de applicatie zijn geselecteerd.

![Live Train Extension](https://via.placeholder.com/800x400?text=Live+Train+Extension+Screenshot)

## Functies

- **Live treinposities**: Visualiseer real-time treinposities op een interactieve kaart
- **Qlik Sense integratie**: Filter treinen op basis van geselecteerde treinnummers in Qlik Sense
- **Interactief**: Selecteer treinen op de kaart en stuur selecties door naar Qlik Sense
- **Automatische updates**: Configureerbare verversingsfrequentie voor real-time updates
- **Animaties**: Vloeiende animaties bij positie-updates
- **Responsief**: Past zich aan het formaat van het dashboard aan
- **Statusweergave**: Toon vertraging, snelheid en andere treinstatussen
- **Thema-ondersteuning**: Past zich aan het Qlik Sense thema aan (licht/donker)
- **Qlik Cloud Ready**: Geoptimaliseerd voor gebruik in Qlik Cloud-omgevingen

## Vereisten

- Qlik Sense Desktop (Februari 2023 of nieuwer)
- Qlik Sense Enterprise (Februari 2023 of nieuwer)
- Qlik Cloud (Februari 2023 of nieuwer)
- NS API Key (verkrijgbaar via [NS Developer Portal](https://apiportal.ns.nl/))
- Moderne webbrowser (Chrome, Firefox, Edge, Safari)

## Installatie

### Via QMC (Qlik Management Console)

1. Download de laatste release van de extensie (zip-bestand)
2. Open Qlik Management Console (QMC)
3. Navigeer naar Extensions
4. Klik op Import
5. Selecteer het gedownloade zip-bestand
6. Klik op Import

### Via Qlik Cloud

1. Download de laatste release van de extensie (zip-bestand)
2. Log in op uw Qlik Cloud tenant
3. Ga naar de Management Console
4. Selecteer "Extensions" onder "Content"
5. Klik op "Add" en selecteer het gedownloade zip-bestand
6. Klik op "Upload en activeer"

### Handmatige installatie (ontwikkelaars)

1. Clone deze repository
2. Kopieer de `LiveTrainExtension` map naar de Qlik Sense Extensions directory:
   - Windows (Desktop): `C:\\Users\\[USERNAME]\\Documents\\Qlik\\Sense\\Extensions\\`
   - Qlik Sense Server: `C:\\Program Files\\Qlik\\Sense\\Extensions\\`

## API Key Configuratie

De extensie gebruikt de NS API en vereist daarom een API key. Deze wordt nu veilig beheerd via een apart configuratiebestand of via Qlik variabelen:

### Optie 1: Via apiKey.js (aanbevolen voor ontwikkeling)

1. Ga naar de map `LiveTrainExtension/api/`
2. Kopieer het bestand `apiKey.template.js` naar een nieuw bestand genaamd `apiKey.js`
3. Open `apiKey.js` en voer uw NS API key in bij het veld `apiKey`
4. Sla het bestand op

### Optie 2: Via Qlik variabele (aanbevolen voor Qlik Cloud)

1. Maak een nieuwe variabele in uw Qlik app genaamd `NS_API_KEY`
2. Stel de waarde in op uw NS API key
3. De extensie zal automatisch deze variabele gebruiken in Qlik Cloud

**Voordelen van deze aanpak:**
- Veiligere opslag van API keys buiten de hoofdcode
- Eenvoudig te updaten zonder de hoofdcode aan te passen
- Voorkomt per ongeluk delen van API keys via versiebeheersystemen (apiKey.js is opgenomen in .gitignore)
- Ondersteunt verschillende keys voor ontwikkelings- en productieomgevingen
- Qlik Cloud compatibel via variabelen

**Voorbeeld van apiKey.js:**
```javascript
var apiKeyConfig = {
    apiKey: 'uw-ns-api-sleutel-hier',
    
    dev: {
        apiKey: 'ontwikkelomgeving-sleutel'
    },
    
    prod: {
        apiKey: 'productieomgeving-sleutel'
    },
    
    getApiKey: function(environment) {
        if (environment && this[environment] && this[environment].apiKey) {
            return this[environment].apiKey;
        }
        return this.apiKey;
    }
};
```

## Configuratie

De extensie configuratie is opgedeeld in vier hoofdonderdelen:

### 1. API Configuratie

De NS API vereist een geldige API key. Configureer deze in het eigenschappen paneel of in het aparte apiKey.js bestand (aanbevolen):

- **API Key**: Voer uw NS API key in (aanbevolen om dit in apiKey.js te doen of via Qlik variabele)
- **CORS Proxy**: Schakel deze optie in als u CORS-problemen ondervindt
- **CORS Proxy URL**: URL naar een CORS proxy (indien nodig)

### 2. Kaart instellingen

- **Standaard zoom**: Initieel zoom niveau (1-18)
- **Zoom limieten**: Minimum en maximum toegestane zoom levels
- **Startpositie**: Breedtegraad en lengtegraad van het middelpunt
- **Geselecteerde treinen volgen**: Centreert de kaart automatisch op geselecteerde treinen
- **Maximum aantal treinen**: Limiteert het aantal getoonde treinen voor betere prestaties
- **Toon schaalbalk**: Toont een afstandsindicator op de kaart

### 3. Update instellingen

- **Automatisch verversen**: Schakelt automatische data-updates in/uit
- **Verversingsinterval**: Hoe vaak de data wordt bijgewerkt (5-300 seconden)
- **Verversing pauzeren bij inactief venster**: Bespaart bandbreedte als het dashboard niet zichtbaar is
- **Verversen bij selectie wijziging**: Update data wanneer selecties veranderen
- **Toon update-indicator**: Toont een visuele indicator bij updates
- **Tabel bijwerken bij automatische verversing**: Bepaalt of de tabel ook wordt bijgewerkt bij auto-refresh

### 4. Animatie instellingen

- **Animeer positie updates**: Schakelt vloeiende animaties in/uit
- **Animatieduur**: Duur van positie-animaties (milliseconden)
- **Animatie easing**: Stijl van de animatie (lineair, ease-in, ease-out, etc.)
- **Animatie vloeiendheid**: Maakt animaties meer of minder gedetailleerd

## Integratie met Qlik Sense

### Dimensie Koppeling

Voor de beste resultaten:

1. Maak of selecteer een dimensie in uw Qlik Sense app die treinnummers bevat
2. In het eigenschappen paneel, koppel deze dimensie aan de extensie
3. Optioneel: Geef de exacte veldnaam op in de "Treinnummer veldnaam" instelling

### Filteren en Selecteren

De extensie ondersteunt bidirectionele selecties:

- Selecteer een trein op de kaart om deze te filteren in uw Qlik Sense app
- Selecteer een treinnummer in andere visualisaties om deze te highlighten op de kaart
- Gebruik de "Alleen geselecteerde treinen ophalen" optie om API-verzoeken te beperken tot geselecteerde treinen

## Qlik Cloud Compatibiliteit

De extensie is geoptimaliseerd voor Qlik Cloud met de volgende verbeteringen:

### API Key beheer
- Ondersteunt opslag van API key in Qlik variabelen (NS_API_KEY, TRAIN_API_KEY, of API_KEY)
- Qlik variabelen worden automatisch gedetecteerd en gebruikt indien beschikbaar

### CORS en beveiliging
- Verbeterde CORS handling voor Qlik Cloud's striktere beveiligingsbeleid
- Automatische detectie van Qlik Cloud omgeving met aangepaste instellingen
- Intelligente fallback mechanismen (fetch → ajax → jsonp) voor maximale compatibiliteit

### Performance
- Geoptimaliseerde DOM-manipulatie voor betere prestaties in Qlik Cloud
- Efficiëntere event handling via event delegatie
- Set-based filtering voor snellere gegevensverwerking
- Verhoogde minimale verversingsfrequentie (10s) in Qlik Cloud voor betere prestaties

### Bibliotheek bundeling
- Instructies voor bundeling van externe bibliotheken met de extensie
- Gebruik HTTPS voor alle externe resources
- Zie `EXTERNAL_LIBRARIES.md` voor gedetailleerde bundeling-instructies

## Bekende problemen en oplossingen

### CORS beperkingen

Als u CORS-fouten krijgt bij het ophalen van data in Qlik Cloud:

1. Schakel de "Gebruik CORS proxy" optie in
2. Voer een geldige CORS proxy URL in (bijv. `https://cors-anywhere.herokuapp.com/`)
3. Overweeg gebruik van de Qlik Cloud Backend Integration Service voor het relayeren van API verzoeken

### Prestatieproblemen

Als de extensie traag wordt in Qlik Cloud:

1. Verlaag het "Maximum aantal treinen" in de instellingen
2. Verhoog het verversingsinterval (minstens 10 seconden aanbevolen)
3. Schakel animaties uit bij veel markers
4. Gebruik selecties om alleen relevante treinen te tonen

## API Technische Informatie

Deze extensie maakt gebruik van de NS Virtual Train API:

**Endpoint**: `https://gateway.apiportal.ns.nl/virtual-train-api/api/vehicle`

**Authenticatie**: API Key via `Ocp-Apim-Subscription-Key` header

**Parameters**:
- `lat`: Breedtegraad van het centrum van het zoekgebied
- `lng`: Lengtegraad van het centrum van het zoekgebied
- `features`: Ingesteld op 'trein' om alleen treinen weer te geven

**Snelheidsbeperkingen**: Niet vaker dan eens per 5 seconden vernieuwen (10 seconden in Qlik Cloud)

## Voor ontwikkelaars

### Projectstructuur

```
LiveTrainExtension/
├── LiveTrainExtension.js         # Hoofdmodule
├── LiveTrainExtension.qext       # Metadata bestand
├── initialProperties.js          # Initiële configuratie
├── propertyPanel.js              # Eigenschappen paneel
├── QLIK_CLOUD_COMPATIBILITY.md   # Documentatie voor Qlik Cloud compatibiliteit
├── EXTERNAL_LIBRARIES.md         # Instructies voor bundelen van bibliotheken
├── api/
│   ├── trainDataService.js       # Service voor het ophalen van treingegevens
│   ├── apiConfig.js              # API configuratie en endpoints
│   ├── apiKey.js                 # Persoonlijke API Key (uitgesloten van versiecontrole)
│   └── apiKey.template.js        # Template voor het maken van apiKey.js
├── ui/
│   ├── mapRenderer.js            # Voor het weergeven van de kaart
│   └── trainVisualizer.js        # Voor het visualiseren van treinen
└── lib/
    ├── css/
    │   └── style.css             # Stylesheet
    └── js/
        └── qlik-style.js         # Qlik Sense stijl helper
```

### Technologieën

- **Leaflet.js**: Voor de interactieve kaart (geladen via Qlik Sense)
- **jQuery**: Voor DOM manipulatie en AJAX requests
- **Qlik API**: Voor integratie met Qlik Sense
- **NS API**: Voor het ophalen van treingegevens

### Ontwikkeling en aanpassingen

1. Clone de repository
2. Maak een apiKey.js bestand op basis van het template met uw eigen API sleutel
3. Wijzig bestanden naar wens
4. Test de extensie in Qlik Sense Desktop
5. Voor Qlik Cloud compatibiliteit, volg de instructies in QLIK_CLOUD_COMPATIBILITY.md
6. Verpak (zip) voor distributie (apiKey.js wordt automatisch uitgesloten via .gitignore)

### Debuggen

Gebruik de browser developer tools voor foutopsporing:

1. Open de console in de developer tools
2. Eventuele fouten worden gelogd met duidelijke foutmeldingen
3. De extensie logt belangrijke gebeurtenissen zoals data-updates

## Licentie

Dit project is gelicenseerd onder de MIT-licentie - zie het LICENSE-bestand voor details.

## Contact en ondersteuning

Voor vragen, suggesties of ondersteuning, neem contact op via:

- GitHub Issues: [GitHub.com/Fbeunder/QlikExtension/issues](https://github.com/Fbeunder/QlikExtension/issues)
- Email: [contact@example.com](mailto:contact@example.com)

---

Ontwikkeld door [Uw Naam/Bedrijf] - [Jaar]