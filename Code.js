const CACHE_EXPIRATION_SEC = 15;  // Cache-levensduur in seconden

function doGet(e) {
  if (e.parameter && e.parameter.action == "getData") {
    // Endpoint voor het ophalen van treinposities
    const data = getTreinPosities();
    return ContentService.createTextOutput(JSON.stringify(data))
                         .setMimeType(ContentService.MimeType.JSON);
  } else if (e.parameter && e.parameter.action == "getJourney") {
    // Endpoint voor het ophalen van journey-details voor een specifiek treinnummer
    var trainNumber = e.parameter.train;
    var journey = getJourneyDetails(trainNumber);
    return ContentService.createTextOutput(JSON.stringify(journey))
                         .setMimeType(ContentService.MimeType.JSON);
  } else {
    // Serveer de HTML-interface
    let htmlOutput = HtmlService.createHtmlOutputFromFile('Index')
                                .addMetaTag('viewport', 'width=device-width, initial-scale=1')
                                .setTitle('Live Treinposities');
    return htmlOutput;
  }
}

function getTreinPosities(trainId) {
  const cacheKey = "trainPositions";
  const cache = CacheService.getScriptCache();
  let cached = cache.get(cacheKey);
  let treinen;
  if (cached) {
    treinen = JSON.parse(cached);
  } else {
    var apiKey = PropertiesService.getScriptProperties().getProperty("NS_API_KEY");
    var url = "https://gateway.apiportal.ns.nl/virtual-train-api/api/vehicle?lat=0&lng=0&features=trein";
    var options = {
      method: "get",
      headers: {
        "Ocp-Apim-Subscription-Key": apiKey
      },
      muteHttpExceptions: true
    };

    try {
      var response = UrlFetchApp.fetch(url, options);
      if (response.getResponseCode() !== 200) {
        throw new Error("Response code: " + response.getResponseCode());
      }
      var data = JSON.parse(response.getContentText());
      treinen = [];
      if (data.payload && data.payload.treinen) {
        treinen = data.payload.treinen;
      }
      Logger.log("Aantal treinen ontvangen: " + treinen.length);
      cache.put(cacheKey, JSON.stringify(treinen), CACHE_EXPIRATION_SEC);
    } catch (error) {
      Logger.log("❌ Fout bij ophalen treinposities: " + error.message);
      return { error: error.message };
    }
  }
  
  if (trainId) {
    treinen = treinen.filter(train => String(train.ritId) === String(trainId));
  }
  return treinen;
}

function getJourneyDetails(trainNumber) {
  var apiKey = PropertiesService.getScriptProperties().getProperty("NS_API_KEY");
  var url = "https://gateway.apiportal.ns.nl/reisinformatie-api/api/v2/journey?train=" + trainNumber + "&omitCrowdForecast=false";
  var options = {
    method: "get",
    headers: {
      "Ocp-Apim-Subscription-Key": apiKey
    },
    muteHttpExceptions: true
  };
  try {
    var response = UrlFetchApp.fetch(url, options);
    if (response.getResponseCode() !== 200) {
      throw new Error("Journey API response code: " + response.getResponseCode());
    }
    var data = JSON.parse(response.getContentText());
    var result = { nextStopDestination: "", delayInSeconds: 0 };
    if (data.payload && data.payload.stops && data.payload.stops.length > 1) {
      var nextStop = data.payload.stops[1];
      result.nextStopDestination = nextStop.destination || "";
      if (nextStop.departures && nextStop.departures.length > 0) {
        result.delayInSeconds = nextStop.departures[0].delayInSeconds || 0;
      } else if (nextStop.arrivals && nextStop.arrivals.length > 0) {
        result.delayInSeconds = nextStop.arrivals[0].delayInSeconds || 0;
      }
    }
    return result;
  } catch (error) {
    Logger.log("Error in getJourneyDetails: " + error.message);
    return { error: error.message };
  }
}