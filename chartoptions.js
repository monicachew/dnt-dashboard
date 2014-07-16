"use strict";

$(function() {
  Highcharts.setOptions({
    chart: {
      type: 'spline'
    },
    title: {
      x: -20 //center
    },
    xAxis: {
      type: 'datetime',
      minTickInterval: 24 * 3600 * 1000,
      // Why is this breaking?
      // min: minDate.getTime()
    },
    yAxis: {
      min: 0
    },
  })
});

var tsChart;
var tsOptions = {
  legend: {
    enabled: true,
    layout: 'vertical',
    align: 'right',
    verticalAlign: 'middle',
    borderWidth: 2
  },
  chart: {
    renderTo: 'timeseries'
  },
  title: {
    text: 'DNT dashboard'
  },
  yAxis: {
    title: {
      text: 'DNT dashboard'
    },
  },
  series: [{ name: 'Do Track' },
           { name: 'DNT' },
           { name: 'Unspecified' }]
};

var volumeChart;
var volumeOptions = {
  legend: {
    enabled: true,
    layout: 'vertical',
    align: 'right',
    verticalAlign: 'middle',
    borderWidth: 2
  },
  chart: {
    renderTo: 'volume'
  },
  title: {
    text: 'Volume'
  },
  yAxis: {
    title: {
      text: 'Volume'
    }
  },
  series: [{ name: 'Volume' }]
};
