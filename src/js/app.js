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
    finalGrade : '-',
    trustScore : 0,
    trustGrade : '-',
    childScore : 0,
    childGrade : '-',
    count      : 0,
    elements   : {},
  };
  $scope.concerns = [];
  $scope.blacklists = [];

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
      // push reputation/confidence to $scope.reportcard.elements for url key
      var element = $scope.reportCard.elements[key.replace(/^www\./, '')];
      switch(param) {
        case '0':
          element.trustScore = res[key][param];
          break;
        case '4':
          element.childScore = res[key][param];
          break;
        default:
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
    return 'E';
  };
  $scope.derive = function(url, id, confidence) {
    var group = {
      '401' : 'Negative',
      '402' : 'Questionable',
      '403' : 'Questionable',
      '404' : 'Positive',
    };
    var categorize = {
      '101' : 'Malware or Viruses',
      '102' : 'Poor Customer Service',
      '103' : 'Phishing',
      '104' : 'Scam',
      '105' : 'Potentially Illegal',
      '201' : 'Misleading Claims or Unethical',
      '202' : 'Privacy Risks',
      '203' : 'Suspicious',
      '204' : 'Hate or Discrimination',
      '205' : 'Spam',
      '206' : 'Potentially Unwanted Programs',
      '207' : 'Ads/Pop-ups',
      '301' : 'Online Tracking',
      '302' : 'Alternative or Controversial Medicine',
      '303' : 'Opinions, Religion, or Politics',
      '304' : 'Other',
      '401' : 'Adult Content',
      '402' : 'Incidental Nudity',
      '403' : 'Gruesome or Shocking',
      '404' : 'Site for Kids',
    };
    switch(true) {
      case (id.match(/^10[1-5]/) !== null): return [url, 'Negative',     categorize[id], confidence];
      case (id.match(/^20[1-7]/) !== null): return [url, "Questionable", categorize[id], confidence];
      case (id.match(/^30[1-4]/) !== null): return [url, 'Neutral',      categorize[id], confidence];
      case (id.match(/^40[1-4]/) !== null): return [url,  group[id],     categorize[id], confidence];
      default:                              return [url, 'Positive',     'Good Site',    confidence];
    }
  };
  $scope.getClassificationContext = function(group) {
    switch(group) {
      case 'Negative':     return 'danger';
      case 'Questionable': return 'danger';
      case 'Neutral':      return 'info';
      default:             return "success";
    }
  };
  $scope.getScoreContext = function(score) {
    switch(true) {
      case (score >= 80): return 'success';
      case (score >= 60): return 'info';
      case (score >= 40): return 'danger';
      default:            return 'danger';
    }
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
            $scope.reportCard.elements[url.replace(/^www\./, '')] = {
              visited    : 1,
              trustScore : [0, 0],
              childScore : [0, 0],
              blacklists : []
            };
          } else { $scope.reportCard.elements[url.replace(/^www\./, '')].visited++; }
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
        $scope.reportCard.finalScore = 0.66 * $scope.reportCard.trustScore + 0.33 * $scope.reportCard.childScore;

        // generate grade for scores
        $scope.reportCard.trustGrade = $scope.computeGrade($scope.reportCard.trustScore);
        $scope.reportCard.childGrade = $scope.computeGrade($scope.reportCard.childScore);
        $scope.reportCard.finalGrade = $scope.computeGrade($scope.reportCard.finalScore);

        // generate potential concerns negative/questionable/neutral
        Object.keys(res).forEach( function(key) {
          var element = $scope.reportCard.elements[key.replace(/^www\./, '')];
          var concern = res[key].hasOwnProperty('categories') ? concern = res[key].categories : {};
          // push each mapped concern + confidence to element.concerns
          Object.keys(concern).forEach( function(id) { $scope.concerns.push( $scope.derive(key, id, concern[id]) ); });
          // push blacklists to element.blacklists
          if (res[key].hasOwnProperty('blacklists')) {
            Object.keys(res[key].blacklists).forEach( function(blacklist) {
              $scope.blacklists.push([key, blacklist]);
            });
          }
        });

        console.log(JSON.stringify($scope.reportCard));
      })
      .error( function(res) { console.log(JSON.stringify(res)); });
    } else {
      $scope.reportCard.trustScore = 100;
      $scope.reportCard.childScore = 100;
      $scope.reportCard.finalScore = 100;
    }
  });
})

// controller for cookie monster section
.controller('cookie', function($scope, $mdDialog) {
  // variable and data structure placeholders
  $scope.cookieMonster = chrome.extension.getBackgroundPage().cookieMonsterStatus;
  $scope.cookieColor = $scope.cookieMonster ? '#3F51B5' : '#dddddd';
  $scope.toggleCookieMonster = function() {
    $scope.cookieMonster = !$scope.cookieMonster;
    if ($scope.cookieMonster) {
      $('#power-button').css('color', '#3F51B5');
    } else {
      $('#power-button').css('color', '#dddddd');
    }
    chrome.extension.getBackgroundPage().cookieMonsterStatus = $scope.cookieMonster;
  };

  // functions for generated dialog messages
  $scope.generateAlert = function(title, text) {
    $mdDialog.show(
      $mdDialog.alert()
        .clickOutsideToClose(true)
        .title(title)
        .textContent(text)
        .ariaLabel('Alert Dialog')
        .ok('Got it!')
    );
  };

  // non-persistent or derived variables
  $scope.percentage = '0%';
  $scope.pageTotal  = chrome.extension.getBackgroundPage().cookiePageTotal;
  $scope.eatenNow   = chrome.extension.getBackgroundPage().cookiePageEaten;
  $scope.currentTab = [];
  $scope.whitelist  = [];

  // persistent variables
  $scope.eatenAll        = chrome.extension.getBackgroundPage().cookiesSinceInstall;
  $scope.cookiesByDomain = chrome.extension.getBackgroundPage().cookiesByDomain;

  // functions for setting whitelist valued -- set when whitelist is loaded
  $scope.domainColor     = function(domain) { return ($scope.whitelist.indexOf(domain) !== -1) ? 'red' : 'black'; };
  $scope.whitelistSite   = function(domain) { return; };
  $scope.addWhitelist    = function(domain) { return; };
  $scope.deleteWhitelist = function(idx, domain) { return; };
  $scope.clearWhitelist  = function() { return; };
  $scope.importWhitelist = function() { return; };
  $scope.exportWhitelist = function() { return; };

  $scope.exportForm = false;
  $scope.importForm = false;
  $scope.toggleExportForm = function() {
    if ($scope.importForm) $scope.importForm = false;
    $scope.exportForm = !$scope.exportForm;
  };
  $scope.toggleImportForm = function() {
    if ($scope.exportForm) $scope.exportForm = false;
    $scope.importForm = !$scope.importForm;
  };

  // compute or filter results to render to popup
  $scope.cookiesByDomain.forEach( function(domain) { if ($scope.currentTab.indexOf(domain) === -1) $scope.currentTab.push(domain); });
  if ($scope.pageTotal > 0) $scope.percentage = Math.floor(($scope.eatenNow / $scope.pageTotal) * 100) + '%';

  // load whitelist for updates
  chrome.storage.sync.get(['whitelist'], function(result) {
    $scope.whitelist = result.whitelist;
    // load functions for modifying whitelist
    $scope.whitelistSite = function(domain) {
      if ($scope.whitelist.indexOf(domain) === -1) {
        $scope.whitelist.push(domain);
      } else {
        $scope.whitelist.splice($scope.whitelist.indexOf(domain), 1);
      }
      console.log($scope.whitelist);
      chrome.storage.sync.set({'whitelist' : $scope.whitelist});
    };
    $scope.addWhitelist = function(domain) {
      $scope.domain = undefined;
      if ($scope.whitelist.indexOf(domain) === -1) {
        $scope.domain = '';
        $scope.whitelist.push(domain);
        chrome.storage.sync.set({'whitelist' : $scope.whitelist});
      } else {
        $scope.generateAlert('Nope.', 'The domain ' + domain + ' is already whitelisted. Maybe try another.');
      }
    };
    $scope.deleteWhitelist = function(idx, domain) {
      var confirm = $mdDialog.confirm()
      .clickOutsideToClose(true)
      .title('Are you sure?')
      .textContent('The domain ' + domain + ' will be removed from your whitelist. This cannot be undone.')
      .ariaLabel('Remove Answer')
      .ok('Yes')
      .cancel('No');
      $mdDialog.show(confirm).then(function() {
        $scope.whitelist.splice(idx, 1);
        chrome.storage.sync.set({'whitelist' : $scope.whitelist});
      }, function() {});
    };
    $scope.clearWhitelist = function(idx, domain) {
      var confirm = $mdDialog.confirm()
      .clickOutsideToClose(true)
      .title('Are you sure?')
      .textContent('This will delete your ENTIRE whitelist. This cannot be undone. Consider exporting first.')
      .ariaLabel('Remove Answer')
      .ok('Yes')
      .cancel('No');
      $mdDialog.show(confirm).then(function() {
        $scope.whitelist = [];
        chrome.storage.sync.set({'whitelist' : $scope.whitelist});
      }, function() {});
    };
    $scope.exportWhitelist = function(password) {
      // erase sensitive information
      $scope.password = undefined;
      var text = '';
      var filename = "cookie-monster-whitelist.txt";
      // encrypt and export
      try {
        text = sjcl.encrypt(password, $scope.whitelist.join(' '));
      } catch(err) {
        $scope.generateAlert('Export Failed', 'You must enter an encryption key.');
        return;
      }
      // download if encryption was successful
      var pom = document.createElement('a');
      pom.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
      pom.setAttribute('download', filename);
      if (document.createEvent) {
        var event = document.createEvent('MouseEvents');
        event.initEvent('click', true, true);
        pom.dispatchEvent(event);
      } else {
        pom.click();
      }
    };
    $scope.importWhitelist = function(hash, password) {
      // clear sensitive information
      $scope.importList = undefined;
      $scope.password =   undefined;
      // decrypt and import
      if (hash && password) {
        try {
          var domains = sjcl.decrypt(password, hash).split(' ');
          domains.forEach( function(domain) { if ($scope.whitelist.indexOf(domain) === -1) $scope.whitelist.push(domain); });
          chrome.storage.sync.set({'whitelist' : $scope.whitelist});
        } catch (err) {
          $scope.generateAlert('Decryption Failed', 'Either your encrypted whitelist or encryption key is wrong.');
          return;
        }
      } else {
        $scope.generateAlert('Import Failed', 'You must enter your whitelist AND your encryption key.');
      }
    };
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
