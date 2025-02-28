# Qlik Cloud Compatibiliteit Richtlijnen

Dit document bevat richtlijnen en best practices voor het optimaliseren van de LiveTrainExtension voor gebruik in Qlik Cloud omgevingen.

## Overzicht

Qlik Cloud heeft specifieke veiligheids- en prestatievereisten die verschillen van Qlik Sense Desktop of on-premise implementaties. De wijzigingen die zijn doorgevoerd in deze extensie zorgen voor compatibiliteit met Qlik Cloud door:

1. Verbeterde API key beveiliging 
2. CORS-compatibiliteit
3. CSP (Content Security Policy) naleving
4. Verbeterde foutenafhandeling
5. Prestatieoptimalisaties

## 1. API Key Beheer

In Qlik Cloud worden API keys anders beheerd dan in lokale omgevingen.

### Verbeteringen:
- API keys kunnen nu worden opgeslagen als Qlik variabelen (`NS_API_KEY`, `TRAIN_API_KEY`, of `API_KEY`)
- Methode toegevoegd om API keys uit Qlik variabelen te laden
- Verbeterde validatie om gebruikers te helpen bij het configureren van de juiste API instellingen
- Gescheiden bestand voor API keys zodat deze niet in versiecontrole terechtkomen

### Gebruik:
- Maak een Qlik variabele `NS_API_KEY` aan in uw Qlik Cloud app
- De extensie zal automatisch deze variabele gebruiken als geen lokale API key is ingesteld
- Voor lokale ontwikkeling: gebruik het `apiKey.js` bestand

## 2. CORS-compatibiliteit

Qlik Cloud heeft een strikte CORS-beleid (Cross-Origin Resource Sharing) dat kan voorkomen dat externe API's worden aangeroepen.

### Verbeteringen:
- Implementatie van moderne `fetch` API met fallback naar `$.ajax`
- Detectie van Qlik Cloud omgeving met aangepaste CORS-instellingen
- Toevoeging van extra headers voor cross-origin verzoeken
- Verbose logging voor CORS-gerelateerde problemen
- Verbeterde foutmeldingen die duidelijk aangeven wanneer CORS-problemen optreden

### Gebruik:
- Als de NS API CORS-fouten geeft, overweeg:
  - Gebruik van een CORS proxy 
  - Instellen van de juiste CORS headers aan serverzijde (indien u controle heeft over de API)
  - Gebruik van de Qlik Cloud Backend Integration Service voor het relayeren van API verzoeken

## 3. CSP Naleving

Qlik Cloud heeft striktere CSP (Content Security Policy) regels die bepaalde JavaScript-operaties en DOM-manipulatie beperken.

### Verbeteringen:
- Verbeterde HTML escaping voor alle dynamisch gegenereerde content
- Beperking van directe DOM-manipulatie buiten de toegewezen container
- Gebruik van gecontroleerde event delegation
- Veiligere invoervalidatie

### Gebruik:
- Houd alle DOM-interacties beperkt tot het element dat door Qlik wordt verstrekt
- Gebruik altijd escaping voor dynamische content

## 4. Prestatie Optimalisaties

### Verbeteringen:
- Intelligente caching van API-resultaten
- Set-based filtering voor efficiëntere gegevensverwerking
- Aangepaste verversingsfrequentie voor Qlik Cloud omgevingen
- Geoptimaliseerde DOM-updates om hernieuwingen te minimaliseren
- Verbeterde resource cleanup om memory leaks te voorkomen

### Gebruik:
- In Qlik Cloud is het aanbevolen de verversingsfrequentie niet lager in te stellen dan 10 seconden
- Overweeg het filteren van gegevens op de server wanneer mogelijk om dataoverdracht te minimaliseren

## 5. Externe Bibliotheken

In Qlik Cloud moeten externe bibliotheken via beveiligde HTTPS-verbindingen worden geladen en bij voorkeur worden gebundeld met de extensie.

### Aanbevelingen:
- Gebruik volledige HTTPS URLs voor alle externe bronnen
- Bundel externe bibliotheken (zoals Leaflet) in het extensiepakket
- Specificeer versienummers bij het laden van externe bibliotheken

## 6. Fallback Mechanismen

De geïmplementeerde wijzigingen omvatten intelligente fallback mechanismen die de extensie robuuster maken:

- Automatische omschakeling tussen fetch en ajax bij netwerkmislukkingen
- Gelaagde API key verwerving (bestand -> Qlik variabelen -> properties)
- Progressieve afschakeling van functionaliteit indien bepaalde aspecten niet beschikbaar zijn

## 7. Bekende Beperkingen

### Qlik Cloud CSP Beperkingen:
- Sommige externe API's kunnen CORS-beperkingen opleveren en vereisen een proxy
- Gebruik van WebSockets kan beperkt zijn
- Directe toegang tot lokale bronnen is niet mogelijk

## Testen in Qlik Cloud

Om te verifiëren dat de extensie correct werkt in Qlik Cloud:

1. Importeer de extensie in Qlik Cloud
2. Maak een `NS_API_KEY` variabele aan in uw app
3. Voeg de extensie toe aan een sheet
4. Configureer de extensie om uw eigen NS API key te gebruiken
5. Test of de data goed wordt weergegeven op de kaart
6. Valideer of de automatische verversing werkt

## Ondersteuning

Als u problemen ondervindt met de extensie in Qlik Cloud, controleer:

1. Dat uw API key correct is en werkt
2. De browser console op eventuele JavaScript fouten of CORS issues
3. Of de Qlik variabele correct is aangemaakt en toegankelijk is
4. Dat de extensie de juiste toegangsrechten heeft in Qlik Cloud
