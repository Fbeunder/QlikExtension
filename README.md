# Live Train Extension voor Qlik Sense

Een Qlik Sense extensie voor het live volgen van treinen in een dashboard.

## Overzicht

Deze extensie maakt het mogelijk om real-time treinposities te visualiseren in Qlik Sense. De extensie kan worden geïntegreerd met bestaande Qlik Sense-toepassingen en kan filteren op basis van treinnummers die in de applicatie zijn geselecteerd.

## Functies

- Visualiseer live treinposities op een interactieve kaart
- Filter treinen op basis van geselecteerde treinnummers in Qlik Sense
- Configureerbare verversingsfrequentie voor real-time updates
- Aanpasbare kaartinstellingen (zoom, centreren, etc.)

## Installatie

1. Download de laatste release van de extensie (zip-bestand)
2. Open Qlik Management Console (QMC)
3. Navigeer naar Extensions
4. Klik op Import
5. Selecteer het gedownloade zip-bestand
6. Klik op Import

Alternatief, voor ontwikkelaars:

1. Clone deze repository
2. Kopieer de `LiveTrainExtension` map naar de Qlik Sense Extensions directory:
   - Windows: `C:\\Users\\[USERNAME]\\Documents\\Qlik\\Sense\\Extensions\\`
   - Qlik Sense Server: `C:\\Program Files\\Qlik\\Sense\\Extensions\\`

## Gebruik

1. Open of maak een Qlik Sense applicatie
2. Zorg ervoor dat er een veld 'Treinnr' of een vergelijkbaar veld beschikbaar is in uw dataset
3. Ga naar het werkblad waar u de extensie wilt toevoegen
4. Open het Assets panel en vind de "Live Train Extension"
5. Sleep de extensie naar het werkblad
6. Configureer de extensie in het properties panel:
   - Koppel het treinnummer veld aan de dimensie
   - Pas de kaart- en data-instellingen aan zoals gewenst

## Configuratie

De extensie kan worden geconfigureerd via het eigenschappen paneel in Qlik Sense:

- **Kaart instellingen**:
  - Standaard zoom niveau (1-18)
  - Geselecteerde treinen volgen (aan/uit)
  - Maximum aantal treinen om weer te geven (1-200)

- **Data instellingen**:
  - Verversingsinterval in seconden (5-300)
  - Automatisch verversen (aan/uit)

## Ontwikkeling

### Vereisten

- Qlik Sense Desktop of Qlik Sense Enterprise
- Basiskennis van HTML, CSS en JavaScript
- Kennis van Qlik Sense Extension API

### Structuur

```
LiveTrainExtension/
├── LiveTrainExtension.js         # Hoofdmodule
├── LiveTrainExtension.qext       # Metadata bestand
├── initialProperties.js          # Initiële configuratie
├── propertyPanel.js              # Eigenschappen paneel
├── lib/
│   ├── css/
│   │   └── style.css             # Stylesheet
│   └── js/
│       └── qlik-style.js         # Qlik Sense stijl helper
```

### Bijdragen

1. Fork de repository
2. Maak een feature branch (`git checkout -b feature/amazing-feature`)
3. Commit uw wijzigingen (`git commit -m 'Add some amazing feature'`)
4. Push naar de branch (`git push origin feature/amazing-feature`)
5. Open een Pull Request

## Licentie

[Licentie informatie hier invullen]

## Contact

[Contactinformatie hier invullen]
