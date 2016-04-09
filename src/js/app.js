angular.module('cookieMonster', ['ngMaterial', 'ngAnimate', 'ngMessages'])

// parent controller for extension views
.controller('popup', function($scope) {
  $scope.view = {status : true, text : 'Cookie Monster'}; //{ status : false, text : 'Report Card'};
  $scope.toggleView = function() {
    $scope.view.status = !$scope.view.status;
    $scope.view.text = $scope.view.status ? 'Cookie Monster' : 'Report Card' ;
  };
})

// controller for WoT report card section
.controller('report', function($scope, $http) {
  $scope.req = 'http://api.mywot.com/0.4/public_link_json2?hosts=';
  $scope.info = { '&key=' : 'aac42146ef84f207eda6922c397768d57043c5f5' };
  $scope.history = [];
  $scope.reportCard = {
    finalScore : 0,
    finalGrade : '',
    trustScore : 0,
    trustGrade : '',
    childScore : 0,
    childGrade : '',
    count      : 0,
    concerns   : {},
    elements   : {}
  };

  // functions for computing browsing history scores & grades
  $scope.computeScore = function(res, param) {
    var scores  = [], score = 0.0, normalizer = 0.0;
    var weights = [3.0, 2.0, 1.5, 1.1, 1.0];
    var classified = {
      very_poor      : [],
      poor           : [],
      unsatisfactory : [],
      good           : [],
      excellent      : []
    };
    // sort reputation scores based on param
    Object.keys(res).forEach( function(key) {
      var reputation = res[key][param][0];
      switch(true) {
        case (reputation >= 80):
          classified.excellent.push(res[key]);
          break;
        case (reputation >= 60):
          classified.good.push(res[key]);
          break;
        case (reputation >= 40):
          classified.unsatisfactory.push(res[key]);
          break;
        case (reputation >= 20):
          classified.poor.push(res[key]);
          break;
        default:
          classified.very_poor.push(res[key]);
          break;
      }
    });
    Object.keys(classified).forEach( function(category) {
      scores.push($scope.computeNormalizedScore(classified[category], param));
    });
    // compute weighted final score
    for (var i = 0; i < weights.length; i++) {
      score += scores[i] * weights[i];
      if (scores[i] !== 0.0) normalizer += weights[i];
    }
    return (normalizer === 0.0) ? 100 : Math.floor(score / normalizer);
  };
  $scope.computeNormalizedScore = function(res, param) {
    // compute sum of confidence scores
    var score = 0, totalConfidence = 0;
    res.forEach( function(ret) { totalConfidence += ret[param][1] * $scope.reportCard.elements[ret.target].visited; });
    res.forEach( function(ret) { score += ret[param][0] * $scope.reportCard.elements[ret.target].visited * ( ret[param][1] / totalConfidence ); });
    return score;
  };
  $scope.computeGrade = function(score) {
    switch(true) {
      case (score >= 97): return 'A+';
      case (score >= 93): return 'A';
      case (score >= 90): return 'A-';
      case (score >= 87): return 'B+';
      case (score >= 83): return 'B';
      case (score >= 80): return 'B-';
      case (score >= 77): return 'C+';
      case (score >= 73): return 'C';
      case (score >= 70): return 'C-';
      case (score >= 65): return 'D+';
      case (score >= 60): return 'D';
    }
    return 'E+';
  };

  // get chrome history report card
  chrome.history.search({'text' : ''}, function (history) {
    // get list of stripped target domains for WoT API
    $scope.$apply( function() {
      history.forEach( function(site) {
        if (site.url.match(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/i)) {
          var url = site.url.match(/:\/\/(.[^/]+)/)[1];
          if ($scope.history.indexOf(url) === -1) {
            $scope.history.push(url);
            $scope.reportCard.count++;
            $scope.reportCard.elements[url.replace(/^www\./, '')] = { visited : 1 };
          } else {
            $scope.reportCard.elements[url.replace(/^www\./, '')].visited++;
          }
        }
      });
    });

    // generate report card if non-empty
    if ($scope.history.length > 0) {
      $scope.req += $scope.history.join('/') + '/';
      for (var param in $scope.info) $scope.req += param + $scope.info[param];

      // get WoT scores & process
      $http.get($scope.req)
      .success( function(res) {
        // generate trustworthiness and child safety score
        $scope.reportCard.trustScore = $scope.computeScore(res, '0');
        $scope.reportCard.childScore = $scope.computeScore(res, '4');
        $scope.reportCard.finalScore = ($scope.reportCard.trustScore + $scope.reportCard.childScore) / 2;

        // generate grade for scores
        $scope.reportCard.trustGrade = $scope.computeGrade($scope.reportCard.trustScore);
        $scope.reportCard.childGrade = $scope.computeGrade($scope.reportCard.childScore);
        $scope.reportCard.finalGrade = $scope.computeGrade($scope.reportCard.finalScore);

        // generate potential concerns negative/questionable

        // generate potential concerns neutral

        // generate good site score

        console.log(JSON.stringify($scope.reportCard));
      })
      .error( function(res) { console.log(JSON.stringify(res)); });
    }
  });
})

// controller for cookie monster section
.controller('cookie', function($scope) {
  $scope.cookieMonster = true; // get from chrome.storage
  $scope.cookieColor = $scope.cookieMonster ? '#3F51B5' : '#dddddd';
  $scope.toggleCookieMonster = function() {
    $scope.cookieMonster = !$scope.cookieMonster;
    if ($scope.cookieMonster) {
      $('#power-button').css('color', '#3F51B5');
    } else {
      $('#power-button').css('color', '#dddddd');
    }
    // set in chrome.storage + save
  };

  $scope.eatenNow = 0;
  $scope.eatenAll = 0;   // get from chrome.storage
  $scope.whitelist = []; // get from chrome.storage
  $scope.currentTab = [];

  // get all cookies in browser + eat against whitelist
  chrome.cookies.getAll({}, function(cookies) {
    //console.log('cookies :' + JSON.stringify(cookies));
  });

  // get all cookies for current tab
  chrome.tabs.query({"status" : "complete", "windowId" : chrome.windows.WINDOW_ID_CURRENT, "active" : true}, function(tabs) {
    chrome.cookies.getAll({"url" : tabs[0].url}, function(cookies) {
      console.log(JSON.stringify(cookies));
      cookies.forEach( function(cookie) {
        if ($scope.currentTab.indexOf(cookie.domain) === -1) $scope.currentTab.push(cookie.domain);
      });
    });
  });
})


// directive for color-coding and popping confidence meters
.directive('colorCodeConfidence', function() {
  return {
    link : function(scope, elem, attrs) {
      attrs.$observe( 'colorCodeConfidence', function(confidence) {
      var value = attrs.value;
      var updateColor = function(val) {
        elem.removeClass();
        switch(true) {
          case (val >= 80):
            elem.addClass('md-primary');
            break;
          case (val >= 60):
            elem.addClass('md-primary md-hue-1');
            break;
          case (val >= 40):
            elem.addClass('md-warn md-hue-3');
            break;
          case (val >= 20):
            elem.addClass('md-warn md-hue-1');
            break;
          default:
            elem.addClass('md-warn md-hue-2');
            break;
        }
      };
      var risingProgress = setInterval( function() {
        if (attrs.value == confidence) { clearInterval(risingProgress); }
        value = Math.min(confidence, value + 1);
        attrs.$set('value', value);
        updateColor(value);
      }, 10);
      });
    }
  };
});
