"use strict";

// Telemetry histograms.
var requiredMeasures = {
  "DNT_USAGE" : 0,
};

// Versions for which we have any data.
var channels = {
  nightly: [ "nightly/28", "nightly/29", "nightly/30", "nightly/31",
             "nightly/32", "nightly/33" ],
  aurora: [ "aurora/28", "aurora/29", "aurora/30", "aurora/31",
             "aurora/32", "aurora/33" ],
  beta: [ "beta/31", "beta/32", "beta/33" ],
};
var currentChannel = "nightly";

// Minimum volume for which to display data
var minVolume = 1000;

// Array of [[version, measure]] for requesting loadEvolutionOverBuilds.
var versionedMeasures = [];

// Set up our series
var tsSeries = {};
var volumeSeries = [];
var hostRates = [];
var hostVolume = [];
// Setup our highcharts on document-ready.
$(document).ready(function() {
  tsChart = new Highcharts.StockChart(tsOptions);
  volumeChart = new Highcharts.StockChart(volumeOptions);
});

// Print auxiliary function
function print(line) {
  document.querySelector('#output').textContent += line + "\n";
};

function changeView(channel) {
  // Unselect the old channel
  document.querySelector("#" + currentChannel)
      .setAttribute("style", "background-color:white");
  currentChannel = channel;
  makeGraphsForChannel(currentChannel);
  // Select the new channel. The highlighted button uses the same green color as
  // Highcharts.
  document.querySelector("#" + currentChannel)
    .setAttribute("style", "background-color:#90ed7d");
}

// Initialize telemetry.js
Telemetry.init(function() {
  // For nightly versions, we only have one release per date, so we can
  // construct a single graph for all versions of nightly.
  changeView("nightly");
});

function makeGraphsForChannel(channel) {
  tsSeries[0] = [];
  tsSeries[1] = [];
  tsSeries[2] = [];
  volumeSeries = [];

  makeTimeseries(channel, channels[channel]);
}
// Sort [date, {rate|volume}] pairs based on the date
function sortByDate(p1, p2)
{
  return p1[0] - p2[0];
}

// Filter duplicate dates to account for screwed up telemetry data
function filterDuplicateDates(series)
{
  // Work on a copy so we don't cause side-effects without realizing.
  var s = series;

  // Series is an array of pairs [[date, volume]]. If successive dates have the
  // same volume, delete
  for (var i = s.length - 1; i > 0; i--) {
    if (s[i][0] == s[i-1][0]) {
      s[i][0] = s[i][0] + s[i-1][0];
      s.splice(i - 1, 1);
    }
  }
  return s.sort(sortByDate);
}

function normalizeSeries(series)
{
  return filterDuplicateDates(series.sort(sortByDate));
}

// Returns a promise that resolves when all of the versions for all of the
// required measures have been stuffed into the timeseries.
function makeTimeseries(channel, versions)
{
  // construct a single graph for all versions of nightly
  var promises = [];
  versions.forEach(function(v) {
    promises.push(makeTimeseriesForVersion(v));
  });
  return Promise.all(promises)
    .then(function() {
      // Wait until all of the series data has been returned before redrawing
      // highcharts.
      for (var i in tsSeries) {
        tsSeries[i] = normalizeSeries(tsSeries[i]);
        tsChart.series[i].setData(tsSeries[i], true);
      }
      volumeSeries = normalizeSeries(volumeSeries);
      volumeChart.series[0].setData(volumeSeries, true);
    });
}

// Returns a promise that resolves when all of the requires measures from the
// given version have had their timeseries added.
function makeTimeseriesForVersion(v)
{
  var promises = [];
  var p = new Promise(function(resolve, reject) {
    Telemetry.measures(v, function(measures) {
      for (var m in measures) {
        // Telemetry.loadEvolutionOverBuilds(v, m) never calls the callback if
        // the given measure doesn't exist for that version, so we must make
        // sure to only call makeTimeseries for measures that exist.
        if (m in requiredMeasures) {
          promises.push(makeTimeseriesForMeasure(v, m));
        }
      }
      resolve(Promise.all(promises));
    });
  });
  return p;
}

// Returns a promise that resolves when all of the data has been loaded for a
// particular measure. Don't redraw highcharts here because appending to the
// existing series data will cause a race condition in the event of multiple
// versions.
function makeTimeseriesForMeasure(version, measure) {
  var p = new Promise(function(resolve, reject) {
    Telemetry.loadEvolutionOverBuilds(version, measure,
      function(histogramEvolution) {
        histogramEvolution.each(function(date, histogram) {
          var data = histogram.map(function(count, start, end, index) {
            return count;
          });
          // Skip dates with fewer than minVolume submissions
          date.setUTCHours(0);
          var volume = data[0] + data[1] + data[2];
          if (volume > minVolume) {
            // DoTrack = 0, DNT = 1, Don't care = 2
            tsSeries[0].push([date.getTime(), data[0] / volume]);
            tsSeries[1].push([date.getTime(), data[1] / volume]);
            tsSeries[2].push([date.getTime(), data[2] / volume]);
            volumeSeries.push([date.getTime(), volume]);
          }
        });
        // We've collected all of the data for this version, so resolve.
        resolve(true);
      }
    );
  });
  return p;
}
