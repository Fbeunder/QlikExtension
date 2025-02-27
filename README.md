# QlikExtension - NS Treinposities

Dit project is een kopie van een Google Apps Script applicatie die live treinposities van de Nederlandse Spoorwegen (NS) visualiseert.

## Bestanden

- `appsscript.json`: Configuratiebestand voor Google Apps Script
- `Code.js`: Server-side JavaScript voor de applicatie
- `Index.html`: Frontend HTML/CSS/JavaScript voor de kaartweergave

## Functionaliteit

- Toont live posities van treinen op een interactieve kaart
- Mogelijkheid om te filteren op treinnummer
- Volgmodus om een specifieke trein te volgen
- Kleurt treinen op basis van vertraging

## API Gebruik

De applicatie maakt gebruik van de NS API's:
- Virtual Train API voor treinposities
- Reisinformatie API voor vertraginingen en volgende stations

*Let op: Voor het gebruik van deze code is een API sleutel van NS nodig.*