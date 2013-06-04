/*global $, alert */
/*jslint browser: true, indent: 2 */

var runApp = function () {

  var positionMenuHorizontally = function () {
    var left = ($(this).width() - $('#mainMenu').width()) / 2;
    $('#mainMenu').css('left', left + 'px');
  };

  var positionMenuVertically = function () {
    var mainMenu = $('#mainMenu');
    var bottom = 0 - $(document.body).scrollTop();
    mainMenu.css('bottom', bottom + 'px');
  };

  $('#homePage').on('vclick vmousedown', function () {
    ANYC.hideMainMenu();
  });

  $(window).on('resize', function (e) {
    positionMenuHorizontally.call(this);
  });

  $(window).on('scroll', function (e) {
    positionMenuVertically();
  });

  positionMenuHorizontally();
  positionMenuVertically();


  var xmlData, lines = {}, outages = [], transformXmlData, dataFetchError,
    helpers, url = "http://www.mta.info/developers/data/nyct/nyct_ene.xml";

  helpers = {
    capitalize:  function (string) {
      string = string.toLowerCase();
      return string.charAt(0).toUpperCase() + string.slice(1);
    }
  };

  transformXmlData = function (data) {
    lines = {};
    outages = [];
    var xmlData = data.responseText;
    $(xmlData).find('outage').each(function () {
      var i, trainnos, trains, outageIdx, outage = {};

      $(this).children().each(function () {
        outage[this.tagName.toLowerCase()] = this.textContent;
      });

      trainnos = outage.trainno;
      trains = trainnos.split('/');
      outageIdx = outages.length;

      for (i = trains.length; i--;) {
        var train = trains[i].toLowerCase();
        if (train) { // yeah, can be empty if they leave a trailing'/'.
          if (!lines[train]) {
            lines[train] = [];
          }
          lines[train].push(outageIdx);
        }
      }
      outages.push(outage);
    });
  };

  dataFetchError = function (error) {
    // TODO Do something :)
  };

  var isFirstRun = true;
  var isFirstFetch = true;
  var previousLine;

  dataFetch = function () {
    if (navigator.connection.type === Connection.NONE) {
      var message = "We need a network connection to retrieve some data :(";
      navigator.notification.alert(message, function () {
        // TODO Show disabled state in the UI
      }, 'Network Unavailable');
      return;
    }

    $.ajax({
      type: "GET",
      url: url,
      dataType: "xml",
      beforeSend: function () {
        $.mobile.showPageLoadingMsg('a', 'Fetching the Latest Data', false);
      },
      success: transformXmlData,
      error: dataFetchError,
      complete: function () {
        $.mobile.loading("hide");
        if (isFirstFetch) {
          $('abbr.timeago').attr('title', (new Date).toISOString());
          $(".timeago").timeago();
          isFirstFetch = false;
        } else {
          $(".timeago").timeago('update', (new Date).toISOString())
        }
      }
    });
  };

  dataFetch();

  $('.info').on('vclick', function (e) {
    $(this).fadeOut('slow');
  });

  $('#twitterLink').on('vclick', function (e) {
    var url = "http://www.twitter.com/eddflrs";
    navigator.app.loadUrl(url, {openExternal: true});
    return false;
  });


  $('#gittipLink').on('vclick', function (e) {
    var url = "https://www.gittip.com/eddflrs";
    navigator.app.loadUrl(url, {openExternal: true});
    return false;
  });


  $('#refresh-item').on('vclick', function (e) {
    e.stopPropagation();
    dataFetch();
    ANYC.hideMainMenu();
  });

  $('#about-item').on('vclick', function (e) {
    e.stopPropagation();
    $.mobile.changePage('#aboutPage', {transition: 'slide'});
    ANYC.hideMainMenu();
  });

  $('.refresh').on('vclick', function (e) {
    dataFetch();
    if (previousLine) {
      previousLine.click();
    }
  });

  $('.line').on('vclick', function (e) {
    var i,
      line = e.target.id,
      stationIdxs = lines[line] || [],
      outageStations = {},
      $notice = $('#notice-details');

    if (previousLine) {
      previousLine.removeClass(previousLine[0].id);
    }

    previousLine = $(this);

    if (isFirstRun) {
      // $('.intro').hide();
      isFirstRun = false;
    }

    $(this).addClass(line);

    $notice.html('');
    $notice.hide();

    if (stationIdxs.length === 0) {
      $notice.append($('<p>').addClass('announce success').html('No Reported Issues'));
      $notice.fadeIn();
      return;
    }

    for (i = stationIdxs.length; i--;) {
      var outageStation = outages[stationIdxs[i]];
      if (!outageStations[outageStation.station]) {
        outageStations[outageStation.station] = [];
      }
      outageStations[outageStation.station].push(outageStation);
    }

    for (outageStation in outageStations) {
      var $div = $('<div>');
      $div.append($('<h3>').html(outageStation.toLowerCase()));
      var outagesArr = outageStations[outageStation];
      var outagesLength = outagesArr.length;

      for (i = outagesLength; i--;) {
        var outage = outagesArr[i];
        /*
         * The <machineType> serving <serving> is out of service due to <reason>,
         * it is expected to service
         */
        var machine = (outage.equipmenttype === 'ES') ? 'escalator' : 'elevator';

        var msg = 'The <strong>' + machine + '</strong> serving <strong>' +
          outage.serving.toLowerCase() + '</strong> is out of service due to <strong>' +
          outage.reason.toLowerCase() + '</strong> until <strong>' +
          outage.estimatedreturntoservice.toLowerCase() + '</strong>.';

        $div.append($('<p>').html(msg));
      }

      $notice.append($div);
      $div.attr('data-role', 'collapsible');
    }

    $notice.collapsibleset('refresh');
    $notice.fadeIn();
  });
};


var ANYC = {
  isMenuShowing: false,
  hideMainMenu: function () {
    $('#mainMenu').hide();
    isMenuShowing = false;
  },
  showMainMenu: function () {
    $("#mainMenu").show();
    isMenuShowing = true;
  },
  onDeviceReady: function () {
    navigator.splashscreen.hide();
    window.document.addEventListener('menubutton', function () {
      if (ANYC.isMenuShowing) {
        ANYC.hideMainMenu();
      } else {
        ANYC.showMainMenu();
      }
    }, false);
    runApp();
  }
};

window.document.addEventListener('deviceready', ANYC.onDeviceReady, false);