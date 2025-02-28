# Changelog - Live Train Extension

## Versie 1.1.0 - 28 februari 2025

### Toegevoegd
- CORS proxy ondersteuning voor omzeilen van API beperkingen
- Uitgebreide animatie instellingen (easing functies, vloeiendheid)
- Verbeterde kaartconfiguratieopties (zoom limieten, schaalbalk)
- Mogelijkheid om API key via eigenschappen paneel in te stellen
- Update-indicator tijdens het laden van nieuwe gegevens
- Optie om tabel al dan niet bij te werken tijdens automatische verversing
- Meer opties voor het afhandelen van selecties
- Uitgebreide README met configuratie-instructies en API-informatie

### Verbeterd
- Memory management en resource gebruik (minder memory leaks)
- Betere foutafhandeling in alle modules
- Prestatieverbetering bij grote hoeveelheden treindata met Set-based filtering
- XSS-beveiliging bij het weergeven van treingegevens
- Efficiëntere event handling met namespaced events
- Verbeterde animaties voor positie-updates
- Robuustere AJAX requests met retry mechanisme
- Consistente scope toegang in controller 
- Betere validatie van API responses
- Betere ondersteuning voor verschillende Qlik Sense thema's

### Gerepareerd
- ReferenceError in trainDataService.startAutoRefresh functie
- Race conditions bij kaartinitialisatie
- Oneindige lussen door wederzijdse functieaanroepen
- DOM-manipulatie in de controller verplaatst naar render-functies
- Ongeldige coördinatenvalidatie toegevoegd
- Verbeterde cleanup van resources bij verwijderen extensie

## Versie 1.0.0 - Initiële release

- Basisimplementatie van Qlik Sense extensie voor het volgen van treinen
- Live weergave van treinposities op een interactieve kaart
- Filtering op basis van geselecteerde treinnummers in Qlik Sense
- Real-time updates van treinposities
- Configureerbare verversingsfrequentie
- Integratie met NS API
