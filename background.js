
// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
// Event listner for clicks on links in a browser action popup.
// Open the link in a new tab of the current window.
var finalData = {};
var web_data = [];
var web_name = [];
var list_color = [];

var ctx;

document.addEventListener('DOMContentLoaded', function () {
    buildTypedUrlList("typedUrl_div");
    ctx = document.getElementById('canvas').getContext('2d');
  });

  console.log(web_data);
  console.log(web_name);
  console.log(list_color);
  
  function createChart() {
    var config = {
        type: 'pie',
        data: {
            labels: web_name,
            datasets: [{
                data: web_data,
                backgroundColor: list_color
            }],
        },
        options: {
            responsive: true,
            events: ['click']
        }
    };
    window.myPie = new Chart(ctx, config);
    var canvas = document.getElementById("canvas");
    canvas.addEventListener(
        'mousedown',
        function(evt){
            var activePoint = window.myPie.getElementAtEvent(evt)[0];
            if (activePoint && activePoint._model) {
                var url = activePoint._model.label;
                onAnchorClick(url);
            }
        },
        false
    );

  }

  
function onAnchorClick(url) {
  chrome.tabs.create({
    selected: true,
    url: `https://${url}`
  });
}
// Search history to find up to ten links that a user has typed in,
// and show those links in a popup.
function buildTypedUrlList(divName) {
  // Track the number of callbacks from chrome.history.getVisits()
  // that we expect to get.  When it reaches zero, we have all results.
  var numRequestsOutstanding = 0;
  chrome.history.search({
      text: '',              // Return every history item....
    },
    function(historyItems) {
      // For each history item, get details on all visits.
      for (var i = 0; i < historyItems.length; ++i) {
        var url = historyItems[i].url;
        var processVisitsWithUrl = function(url) {
          // We need the url of the visited item to process the visit.
          // Use a closure to bind the  url into the callback's args.
          return function(visitItems) {
            processVisits(url, visitItems);
          };
        };
        chrome.history.getVisits({url: url}, processVisitsWithUrl(url));
        numRequestsOutstanding++;
      }
      if (!numRequestsOutstanding) {
        onAllVisitsProcessed();
      }
    });
  // Maps URLs to the amount of time spent on the site
  var urlToCount = {};
  // Maps general URL to aggregate time
  var urls = {};
  // Callback for chrome.history.getVisits().  Creates an aggregate amount of time
  // spent on the site
  var processVisits = function(url, visitItems) {
    // set a variable to add to for all time spent on a site
    for (var i = 0; i < visitItems.length; ++i) {
      if (!urlToCount[url]) {
        urlToCount[url] = visitItems[i].visitTime;
      }
      else {
        urlToCount[url] += visitItems[i].visitTime;
      }
    }
    // remove the excess info from the url, sorting only by base url
    for (var key in urlToCount) {
      s = key;
      if (s.includes("http://")) {
        s = s.substring(7);
      }
      else if (s.includes("https://")) {
        s = s.substring(8);
      }
      if (s.includes("www.")) {
        s = s.substring(4);
      }
      // grab just the domain name, without .com or anything
      s = s.substring(0, s.indexOf('/'));
      // if s not in the urls map, define as equal to time
      if (!urls[s]) {
        urls[s] = urlToCount[key];
      }
      else {
        urls[s] += urlToCount[key];
      }
    }
    // If this is the final outstanding call to processVisits(),
    // then we have the final results.  Use them to build the list
    // of URLs to show in the popup.
    if (!--numRequestsOutstanding) {
      onAllVisitsProcessed();
    }
  };
  // This function is called when we have the final list of URls to display.
  var onAllVisitsProcessed = function() {
    // Get the top scorring urls.
    urlArray = [];
    for (var url in urls) {
      urlArray.push(url);
    }
    // Sort the URLs by the amount of time the user browsed them.
    urlArray.sort(function(a,b) {
      return urls[b] - urls[a];
    });
    // create a map of the 10 most used urls and time
    var count = 0;
    while (count < 10) {
      finalData[urlArray[count]] = urls[urlArray[count]];
      count ++;
    }
    for(data in finalData) {
        sec = Math.floor((finalData[data]/1000) % 60);
        web_data.push(sec);
        web_name.push(data);
        var first = Math.round(Math.random() * 225);
        var second = Math.round(Math.random() * 225);
        var third = Math.round(Math.random() * 225);
        var rgba = [first, second, third, 1]
        list_color.push('rgba(' + rgba.toString() + ')')
    }
    // compare old to new list
    createChart();
  };
}
