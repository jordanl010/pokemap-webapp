(function () {
'use strict';

var CONFIG = window.CONFIG;
var google = null;

document.addEventListener("DOMContentLoaded", function () {
    if (!Notification) {
        console.warning('could not load notifications');
        return;
    }

    if (Notification.permission !== "granted") {
        Notification.requestPermission();
    }
});

var $selectExclude = $("#exclude-pokemon");
var $selectNotify = $("#notify-pokemon");

var idToPokemon = {};

$.getJSON("static/locales/pokemon." + document.documentElement.lang + ".json").done(function(data) {
    var pokeList = [];

    $.each(data, function(key, value) {
        pokeList.push( { id: key, text: value } );
        idToPokemon[key] = value;
    });

    // setup the filter lists
    $selectExclude.select2({
        placeholder: "Select Pokémon",
        data: pokeList
    });
    $selectNotify.select2({
        placeholder: "Select Pokémon",
        data: pokeList
    });

    // recall saved lists
    if (localStorage.getItem('remember_select_exclude')) {
        $selectExclude.val(JSON.parse(localStorage.remember_select_exclude)).trigger("change");
    }
    if (localStorage.getItem('remember_select_notify')) {
        $selectNotify.val(JSON.parse(localStorage.remember_select_notify)).trigger("change");
    }
});

var excludedPokemon = [];
var notifiedPokemon = [];

$selectExclude.on("change", function (/*e*/) {
    excludedPokemon = $selectExclude.val().map(Number);
    clearStaleMarkers();
    localStorage.remember_select_exclude = JSON.stringify(excludedPokemon);
});

$selectNotify.on("change", function (/*e*/) {
    notifiedPokemon = $selectNotify.val().map(Number);
    localStorage.remember_select_notify = JSON.stringify(notifiedPokemon);
});

var map;

var light2Style=[{"elementType":"geometry","stylers":[{"hue":"#ff4400"},{"saturation":-68},{"lightness":-4},{"gamma":0.72}]},{"featureType":"road","elementType":"labels.icon"},{"featureType":"landscape.man_made","elementType":"geometry","stylers":[{"hue":"#0077ff"},{"gamma":3.1}]},{"featureType":"water","stylers":[{"hue":"#00ccff"},{"gamma":0.44},{"saturation":-33}]},{"featureType":"poi.park","stylers":[{"hue":"#44ff00"},{"saturation":-23}]},{"featureType":"water","elementType":"labels.text.fill","stylers":[{"hue":"#007fff"},{"gamma":0.77},{"saturation":65},{"lightness":99}]},{"featureType":"water","elementType":"labels.text.stroke","stylers":[{"gamma":0.11},{"weight":5.6},{"saturation":99},{"hue":"#0091ff"},{"lightness":-86}]},{"featureType":"transit.line","elementType":"geometry","stylers":[{"lightness":-48},{"hue":"#ff5e00"},{"gamma":1.2},{"saturation":-23}]},{"featureType":"transit","elementType":"labels.text.stroke","stylers":[{"saturation":-64},{"hue":"#ff9100"},{"lightness":16},{"gamma":0.47},{"weight":2.7}]}];
var darkStyle=[{"featureType":"all","elementType":"labels.text.fill","stylers":[{"saturation":36},{"color":"#b39964"},{"lightness":40}]},{"featureType":"all","elementType":"labels.text.stroke","stylers":[{"visibility":"on"},{"color":"#000000"},{"lightness":16}]},{"featureType":"all","elementType":"labels.icon","stylers":[{"visibility":"off"}]},{"featureType":"administrative","elementType":"geometry.fill","stylers":[{"color":"#000000"},{"lightness":20}]},{"featureType":"administrative","elementType":"geometry.stroke","stylers":[{"color":"#000000"},{"lightness":17},{"weight":1.2}]},{"featureType":"landscape","elementType":"geometry","stylers":[{"color":"#000000"},{"lightness":20}]},{"featureType":"poi","elementType":"geometry","stylers":[{"color":"#000000"},{"lightness":21}]},{"featureType":"road.highway","elementType":"geometry.fill","stylers":[{"color":"#000000"},{"lightness":17}]},{"featureType":"road.highway","elementType":"geometry.stroke","stylers":[{"color":"#000000"},{"lightness":29},{"weight":0.2}]},{"featureType":"road.arterial","elementType":"geometry","stylers":[{"color":"#000000"},{"lightness":18}]},{"featureType":"road.local","elementType":"geometry","stylers":[{"color":"#181818"},{"lightness":16}]},{"featureType":"transit","elementType":"geometry","stylers":[{"color":"#000000"},{"lightness":19}]},{"featureType":"water","elementType":"geometry","stylers":[{"lightness":17},{"color":"#525252"}]}];
var pGoStyle=[{"featureType":"landscape.man_made","elementType":"geometry.fill","stylers":[{"color":"#a1f199"}]},{"featureType":"landscape.natural.landcover","elementType":"geometry.fill","stylers":[{"color":"#37bda2"}]},{"featureType":"landscape.natural.terrain","elementType":"geometry.fill","stylers":[{"color":"#37bda2"}]},{"featureType":"poi.attraction","elementType":"geometry.fill","stylers":[{"visibility":"on"}]},{"featureType":"poi.business","elementType":"geometry.fill","stylers":[{"color":"#e4dfd9"}]},{"featureType":"poi.business","elementType":"labels.icon","stylers":[{"visibility":"off"}]},{"featureType":"poi.park","elementType":"geometry.fill","stylers":[{"color":"#37bda2"}]},{"featureType":"road","elementType":"geometry.fill","stylers":[{"color":"#84b09e"}]},{"featureType":"road","elementType":"geometry.stroke","stylers":[{"color":"#fafeb8"},{"weight":"1.25"}]},{"featureType":"road.highway","elementType":"labels.icon","stylers":[{"visibility":"off"}]},{"featureType":"water","elementType":"geometry.fill","stylers":[{"color":"#5ddad6"}]}];

function initMapHelper(center_lat, center_lng, cb) {
    if (!CONFIG.mapReady) {
      console.log('ignore map init - google.maps object not yet loaded');
      return;
    }
    if (map) {
      if (cb) {
        cb();
      }
      return;
    }

    $('.js-geolocation-container').hide();
    $('.js-map').show();

    if (0 === center_lat || !center_lat) {
      console.warn("Tried to init, but no lat/lng location given yet.");
      return;
    }

    map = new google.maps.Map(document.getElementById('map'), {
        center: {
            lat: center_lat,
            lng: center_lng
        },
        zoom: 16,
        fullscreenControl: true,
        streetViewControl: false,
        mapTypeControl: true,
        mapTypeControlOptions: {
          style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,
          position: google.maps.ControlPosition.RIGHT_TOP,
          mapTypeIds: [
              google.maps.MapTypeId.ROADMAP,
              google.maps.MapTypeId.SATELLITE,
              'dark_style',
              'style_light2',
              'style_pgo'
          ]
        }
    });

    var style_dark = new google.maps.StyledMapType(darkStyle, {name: "Dark"});
    map.mapTypes.set('dark_style', style_dark);

    var style_light2 = new google.maps.StyledMapType(light2Style, {name: "Light2"});
    map.mapTypes.set('style_light2', style_light2);

    var style_pgo = new google.maps.StyledMapType(pGoStyle, {name: "PokemonGo"});
    map.mapTypes.set('style_pgo', style_pgo);

    map.addListener('maptypeid_changed', function(/*s*/) {
      localStorage.setItem('map_style', this.mapTypeId);
    });

    if (!localStorage.getItem('map_style') || localStorage.getItem('map_style') === 'undefined') {
      localStorage.setItem('map_style', 'roadmap');
    }

    map.setMapTypeId(localStorage.getItem('map_style'));

    var marker = new google.maps.Marker({
      draggable: true,
      position: {
        lat: center_lat,
        lng: center_lng
      },
      map: map,
      animation: google.maps.Animation.DROP
    });

    google.maps.event.addListener(marker, "dragend", function (event) {
      var lat = event.latLng.lat();
      var lng = event.latLng.lng();

      updateLoc(lat, lng);
    });

    google.maps.event.addListener(map, 'click', function (event) {
      var lat = event.latLng.lat();
      var lng = event.latLng.lng();

      CONFIG.marker.setPosition(new google.maps.LatLng(CONFIG.latitude, CONFIG.longitude));

      updateLoc(lat, lng);
    });

    CONFIG.marker = marker;

    initSidebar();
    cb();
}

function initMap() {
  CONFIG.mapReady = true;
  google = window.google;

  // NOTE: used by Google Maps and on document load
  if (CONFIG.requireLogin && !CONFIG.accessToken) {
    return;
  }

  updateMap();

  // wait for user to click to update
  /*
  if (localStorage.geoIsAllowed) {
    updateGeolocation();
  }
  */
}

function initSidebar() {
    $('#gyms-switch').prop('checked', localStorage.showGyms === 'true');
    $('#pokemon-switch').prop('checked', localStorage.showPokemon === 'true');
    $('#pokestops-switch').prop('checked', localStorage.showPokestops === 'true');
    $('#scanned-switch').prop('checked', localStorage.showScanned === 'true');
    $('#sound-switch').prop('checked', localStorage.playSound === 'true');

    var searchBox = new google.maps.places.SearchBox(document.getElementById('next-location'));

    searchBox.addListener('places_changed', function() {
        var places = searchBox.getPlaces();

        if (0 === places.length) {
            return;
        }

        var loc = places[0].geometry.location;
        updateLoc(loc.lat(), loc.lng());
        $.post("next_loc?lat=" + loc.lat() + "&lon=" + loc.lng(), {}).done(function (/*data*/) {
            $("#next-location").val("");
            map.setCenter(loc);
            CONFIG.marker.setPosition(loc);
        });
    });
}

var pad = function (number) { return number <= 99 ? ("0" + number).slice(-2) : number; };


function pokemonLabel(name, disappear_time, id, latitude, longitude) {
    var disappear_date = new Date(disappear_time);

    // TODO template properly with jQuery
    var contentstring = ""
      + "<div>"
        + "<b>" + name + "</b>"
        + "<span> - </span>"
        + "<small>"
          + "<a href='http://www.pokemon.com/us/pokedex/" + id + "' target='_blank' title='View in Pokedex'>#" + id + "</a>"
        + "</small>"
      + "</div>"
      + "<div>"
        + "Disappears at " + pad(disappear_date.getHours())
          + ":" + pad(disappear_date.getMinutes())
          + ":" + pad(disappear_date.getSeconds())
        + "<span class='label-countdown' disappears-at='" + disappear_time + "'>(00m00s)</span></div>"
      + "<div>"
        + "<a href='https://www.google.com/maps/dir/Current+Location/" + latitude + "," + longitude + "'"
            + " target='_blank' title='View in Maps'>Get directions</a>"
      + "</div>";

    return contentstring;
}

function gymLabel(team_name, team_id, gym_points) {
    var gym_color = [
      "0, 0, 0, .4"
    , "74, 138, 202, .6"
    , "240, 68, 58, .6"
    , "254, 217, 40, .6"
    ];
    var str;
    if (0 === team_id) {
        str = "<div><center>"
          + "<div>"
            + "<b style='color:rgba(" + gym_color[team_id] + ")'>" + team_name + "</b><br>"
            + "<img height='70px' style='padding: 5px;' src='static/forts/" + team_name + "_large.png'>"
          + "</div>"
        + "</center></div>";
    }
    else {
        str = "<div><center>"
          + "<div style='padding-bottom: 2px'>Gym owned by:</div>"
          + "<div>"
            + "<b style='color:rgba(" + gym_color[team_id] + ")'>Team " + team_name + "</b><br>"
            + "<img height='70px' style='padding: 5px;' src='static/forts/" + team_name + "_large.png'>"
          + "</div>"
          + "<div>Prestige: " + gym_points + "</div>"
          + "</center></div>";
    }

    return str;
}

function pokestopLabel(lured, last_modified, active_pokemon_id, latitude, longitude) {
    var str;
    if (lured) {
        var active_pokemon = idToPokemon[active_pokemon_id];

        var last_modified_date = new Date(last_modified);
        var current_date = new Date();

        var time_until_expire = current_date.getTime() - last_modified_date.getTime();

        var expire_date = new Date(current_date.getTime() + time_until_expire);
        var expire_time = expire_date.getTime();

        str = "<div><b>Lured Pokéstop</b></div>"
          + "<div>Lured Pokémon: " + active_pokemon + "<span> - </span> <small>"
            + "<a href='http://www.pokemon.com/us/pokedex/" + active_pokemon_id + "'"
              + " target='_blank' title='View in Pokedex'>#" + active_pokemon_id + "</a></small>"
          + "</div>"
          + "<div>"
            + "Lure expires at " + pad(expire_date.getHours())
              + ":" + pad(expire_date.getMinutes()) + ":" + pad(expire_date.getSeconds())
              + "<span class='label-countdown' disappears-at='" + expire_time + "'>(00m00s)</span></div>"
          + "<div>"
          + "<div>"
            + "<a href='https://www.google.com/maps/dir/Current+Location/" + latitude + "," + longitude + "'"
              + " target='_blank' title='View in Maps'>Get directions</a>"
          + "</div>";
    } else {
        str = "<div><b>Pokéstop</b></div>"
          + "<div>"
            + "<a href='https://www.google.com/maps/dir/Current+Location/" + latitude + "," + longitude + "'"
              + " target='_blank' title='View in Maps'>Get directions</a>"
          + "</div>";
    }

    return str;
}

/*
function scannedLabel(last_modified) {
    var scanned_date = new Date(last_modified);
    var pad = function (number) { return number <= 99 ? ("0" + number).slice(-2) : number; };

    var contentstring = "<div>"
      + "Scanned at " + pad(scanned_date.getHours())
        + ":" + pad(scanned_date.getMinutes()) + ":" + pad(scanned_date.getSeconds())
      + "</div>";
    return contentstring;
}
*/

// Dicts
var map_pokemons = {}; // Pokemon
var map_gyms = {}; // Gyms
var map_pokestops = {}; // Pokestops
var map_scanned = {}; // Pokestops
var gym_types = ["Uncontested", "Mystic", "Valor", "Instinct"];
var audio = new Audio('https://github.com/AHAAAAAAA/PokemonGo-Map/raw/develop/static/sounds/ding.mp3');

function setupPokemonMarker(item) {
    var marker = new google.maps.Marker({
        position: {
            lat: item.latitude,
            lng: item.longitude
        },
        map: map,
        icon: 'static/icons/' + item.pokemon_id + '.png'
    });

    marker.infoWindow = new google.maps.InfoWindow({
        content: pokemonLabel(item.pokemon_name, item.disappear_time, item.pokemon_id, item.latitude, item.longitude)
    });

    if (notifiedPokemon.indexOf(item.pokemon_id) > -1) {
        if(localStorage.playSound === 'true'){
          audio.play();
        }
        sendNotification('A wild ' + item.pokemon_name + ' appeared!', 'Click to load map', 'static/icons/' + item.pokemon_id + '.png');
    }

    addListeners(marker);
    return marker;
}

function setupGymMarker(item) {
    var marker = new google.maps.Marker({
        position: {
            lat: item.latitude,
            lng: item.longitude
        },
        map: map,
        icon: 'static/forts/' + gym_types[item.team_id] + '.png'
    });

    marker.infoWindow = new google.maps.InfoWindow({
        content: gymLabel(gym_types[item.team_id], item.team_id, item.gym_points)
    });

    addListeners(marker);
    return marker;
}

function setupPokestopMarker(item) {
    var imagename = item.lure_expiration ? "PstopLured" : "Pstop";
    var marker = new google.maps.Marker({
        position: {
            lat: item.latitude,
            lng: item.longitude
        },
        map: map,
        icon: 'static/forts/' + imagename + '.png',
    });

    marker.infoWindow = new google.maps.InfoWindow({
        content: pokestopLabel(!!item.lure_expiration, item.last_modified, item.active_pokemon_id, item.latitude, item.longitude)
    });

    addListeners(marker);
    return marker;
}

function getColorByDate(value){
    //Changes the Color from Red to green over 15 mins
    var diff = (Date.now() - value) / 1000 / 60 / 15;

    if(diff > 1){
        diff = 1;
    }

    //value from 0 to 1 - Green to Red
    var hue=((1-diff)*120).toString(10);
    return ["hsl(",hue,",100%,50%)"].join("");
}

function setupScannedMarker(item) {
    var circleCenter = new google.maps.LatLng(item.latitude, item.longitude);

    var marker = new google.maps.Circle({
        map: map,
        center: circleCenter,
        radius: 100,    // 10 miles in metres
        fillColor: getColorByDate(item.last_modified),
        strokeWeight: 1
    });

    // marker.infoWindow = new google.maps.InfoWindow({
    //     content: scannedLabel(item.last_modified),
    //     position: circleCenter
    // });

    //addListeners(marker);
    return marker;
}

function addListeners(marker) {
    marker.addListener('click', function() {
        marker.infoWindow.open(map, marker);
        updateLabelDiffTime();
        marker.persist = true;
    });

    google.maps.event.addListener(marker.infoWindow, 'closeclick', function() {
        marker.persist = null;
    });

    marker.addListener('mouseover', function() {
        marker.infoWindow.open(map, marker);
        updateLabelDiffTime();
    });

    marker.addListener('mouseout', function() {
        if (!marker.persist) {
            marker.infoWindow.close();
        }
    });
    return marker;
}

function clearStaleMarkers() {
    $.each(map_pokemons, function(key/*, value*/) {

        if (map_pokemons[key].disappear_time < new Date().getTime() ||
                excludedPokemon.indexOf(map_pokemons[key].pokemon_id) >= 0) {
            map_pokemons[key].marker.setMap(null);
            delete map_pokemons[key];
        }
    });

    $.each(map_scanned, function(key/*, value*/) {
        //If older than 15mins remove
        if (map_scanned[key].last_modified < (new Date().getTime() - 15 * 60 * 1000)) {
            map_scanned[key].marker.setMap(null);
            delete map_scanned[key];
        }
    });
}

function updateMap() {
  if (!CONFIG.pokemap) {
    console.log('updateMap ignored - waiting for first heartbeat');
    return;
  }

  initMapHelper(CONFIG.latitude, CONFIG.longitude, function () {

  var result = CONFIG.pokemap;

  CONFIG.marker.setPosition(new google.maps.LatLng(CONFIG.latitude, CONFIG.longitude));

  $.each(result.pokemons, function(i, item){
    if (!localStorage.showPokemon) {
        return false; // in case the checkbox was unchecked in the meantime.
    }
    if (!(item.encounter_id in map_pokemons) &&
              excludedPokemon.indexOf(item.pokemon_id) < 0) {
        // add marker to map and item to dict
        if (item.marker) { item.marker.setMap(null); }
        item.marker = setupPokemonMarker(item);
        map_pokemons[item.encounter_id] = item;
    }
  });

  $.each(result.pokestops, function(i, item) {
      if (!localStorage.showPokestops) {
          return false;
      } else if (!(item.pokestop_id in map_pokestops)) { // add marker to map and item to dict
          // add marker to map and item to dict
          if (item.marker) { item.marker.setMap(null); }
          item.marker = setupPokestopMarker(item);
          map_pokestops[item.pokestop_id] = item;
      }

  });

  $.each(result.gyms, function(i, item){
      if (!localStorage.showGyms) {
          return false; // in case the checkbox was unchecked in the meantime.
      }

      if (item.gym_id in map_gyms) {
          // if team has changed, create new marker (new icon)
          if (map_gyms[item.gym_id].team_id !== item.team_id) {
              map_gyms[item.gym_id].marker.setMap(null);
              map_gyms[item.gym_id].marker = setupGymMarker(item);
          } else { // if it hasn't changed generate new label only (in case prestige has changed)
              map_gyms[item.gym_id].marker.infoWindow = new google.maps.InfoWindow({
                  content: gymLabel(gym_types[item.team_id], item.team_id, item.gym_points)
              });
          }
      }
      else { // add marker to map and item to dict
          if (item.marker) { item.marker.setMap(null); }
          item.marker = setupGymMarker(item);
          map_gyms[item.gym_id] = item;
      }

  });

  $.each(result.scanned, function(i, item) {
      if (!localStorage.showScanned) {
          return false;
      }

      if (item.scanned_id in map_scanned) {
          map_scanned[item.scanned_id].marker.setOptions({fillColor: getColorByDate(item.last_modified)});
      }
      else { // add marker to map and item to dict
          if (item.marker) { item.marker.setMap(null); }
          item.marker = setupScannedMarker(item);
          map_scanned[item.scanned_id] = item;
      }

  });

  clearStaleMarkers();

  });
}

function heartbeat() {
  if (!CONFIG.latitude || !CONFIG.longitude) {
    console.log('heartbeat ignored - waiting for lat/lng update');
    return;
  }

  CONFIG.latitude = CONFIG.scan[CONFIG.scanIndex][0];
  CONFIG.longitude = CONFIG.scan[CONFIG.scanIndex][1];
  CONFIG.scanIndex += 1;
  if (CONFIG.scanIndex >= CONFIG.scan.length) {
    CONFIG.scanIndex = 0;
  }

  localStorage.showPokemon = localStorage.showPokemon || true;
  localStorage.showGyms = localStorage.showGyms || true;
  localStorage.showPokestops = localStorage.showPokestops || false;
  localStorage.showScanned = localStorage.showScanned || false;

  $.ajax({
      url: "raw_data",
      method: 'GET',
      data: {
          'latitude': CONFIG.latitude,
          'longitude': CONFIG.longitude,
          'pokemon': localStorage.showPokemon,
          'pokestops': localStorage.showPokestops,
          'gyms': localStorage.showGyms,
          'scanned': localStorage.showScanned
      },
      headers: {
        'Authorization': 'Bearer ' + CONFIG.accessToken
      },
      dataType: "json"
  }).done(function(result) {
    CONFIG.pokemap = result;
    return updateMap();
  });
}
function startHeartbeat() {
  window.clearInterval(CONFIG.heartbeatInterval);
  CONFIG.heartbeatInterval = window.setInterval(heartbeat, CONFIG.heartbeatInterval);
}

function updateLoc(lat, lng) {
  if (lat && lng && 'number' === typeof lat && 'number' === typeof lng) {
    if (!CONFIG.scan || lat !== CONFIG.latitude || lng !== CONFIG.longitude) {
      CONFIG.latitude = lat;
      CONFIG.longitude = lng;
      CONFIG.scanIndex = 0;
      console.warn(CONFIG.latitude, CONFIG.longitude);
      CONFIG.scan = window.generateLocationSteps(
        [CONFIG.latitude, CONFIG.longitude]
      , CONFIG.ringSteps
      , CONFIG.pulseRadius
      );
    }
  }

  return updateMap();
}

document.getElementById('gyms-switch').onclick = function() {
    localStorage.setItem("showGyms", this.checked);
    if (this.checked) {
        return updateMap();
    }

    $.each(map_gyms, function(key/*, value*/) {
        map_gyms[key].marker.setMap(null);
    });
    map_gyms = {};
};

$('#pokemon-switch').change(function() {
    localStorage.setItem("showPokemon", this.checked);
    if (this.checked) {
        return updateMap();
    }

    $.each(map_pokemons, function(key/*, value*/) {
        map_pokemons[key].marker.setMap(null);
    });
    map_pokemons = {};
});

$('#pokestops-switch').change(function() {
    localStorage.setItem("showPokestops", this.checked);
    if (this.checked) {
        return updateMap();
    }

    $.each(map_pokestops, function(key/*, value*/) {
        map_pokestops[key].marker.setMap(null);
    });
    map_pokestops = {};
});

$('#sound-switch').change(function() {
    localStorage.setItem("playSound", this.checked);
});

$('#scanned-switch').change(function() {
    localStorage.setItem("showScanned", this.checked);
    if (this.checked) {
        updateMap();
    }

    $.each(map_scanned, function(key/*, value*/) {
        map_scanned[key].marker.setMap(null);
    });
    map_scanned = {};
});

var updateLabelDiffTime = function() {
    $('.label-countdown').each(function(index, element) {
        var disappearsAt = new Date(parseInt(element.getAttribute("disappears-at")));
        var now = new Date();

        var difference = Math.abs(disappearsAt - now);
        var hours = Math.floor(difference / 36e5);
        var minutes = Math.floor((difference - (hours * 36e5)) / 6e4);
        var seconds = Math.floor((difference - (hours * 36e5) - (minutes * 6e4)) / 1e3);
        var timestring;

        if (disappearsAt < now) {
            timestring = "(expired)";
        } else {
            timestring = "(";
            if (hours > 0) {
                timestring = hours + "h";
            }

            timestring += ("0" + minutes).slice(-2) + "m";
            timestring += ("0" + seconds).slice(-2) + "s";
            timestring += ")";
        }

        $(element).text(timestring);
    });
};

window.setInterval(updateLabelDiffTime, 1000);

function sendNotification(title, text, icon) {
    if (Notification.permission !== "granted") {
        Notification.requestPermission();
    } else {
        var notification = new Notification(title, {
            icon: icon,
            body: text,
            sound: 'sounds/ding.mp3'
        });

        notification.onclick = function () {
            window.open(window.location.href);
        };
    }
}

function logout() {
  CONFIG.accessToken = null;
  localStorage.removeItem('accessToken');
  //clearInterval(CONFIG.updateMapInterval);
  $('.js-map').hide();
  //$('.js-geolocation').hide();
  $('.js-login-container').show();
  $('.js-geolocation-container').hide();
}

function updateGeolocation() {

  function updatePos(position) {
    console.log("Got geolocation from browser :D");
    console.info(position);

    if (!localStorage.geoIsAllowed) {
      $('.js-geolocation-container').hide();
      localStorage.geoIsAllowed = 'true';
    }

    initMapHelper(position.coords.latitude, position.coords.longitude, function () {
      CONFIG.marker.setPosition(new google.maps.LatLng(CONFIG.latitude, CONFIG.longitude));
      // http://stackoverflow.com/questions/10917648/google-maps-api-v3-recenter-the-map-to-a-marker
      map.setCenter(CONFIG.marker.getPosition());
      updateLoc(position.coords.latitude, position.coords.longitude);
    });
  }

  console.log("Waiting for geolocation from browser");
  window.navigator.geolocation.getCurrentPosition(
    updatePos
  , function (/*err*/) {
      window.alert("No new location.");
    }
  , { enableHighAccuracy: true
    , timeout: 10 * 1000
    , maximumAge: 0
    }
  );

  if (!CONFIG.watchGeo) {
    CONFIG.watchGeo = navigator.geolocation.watchPosition(updatePos);
  }
}

$(function () {
  // default state, show nothing
  $('.js-login-container').hide();
  $('.js-geolocation-container').hide();
  $('.js-map').hide();
//  $('.js-geolocation').hide();

  $('body').on('click', '.js-geolocation', function (ev) {
    ev.preventDefault();
    ev.stopPropagation();

    updateGeolocation();
  });

  $('body').on('click', '.js-manual-location', function (ev) {
    ev.preventDefault();
    ev.stopPropagation();

    var geocoder = new google.maps.Geocoder();
    var address = $('.js-location').val();

    geocoder.geocode({ 'address': address }, function (results, status) {
      if (status !== google.maps.GeocoderStatus.OK) {
        window.alert('Geocode was not successful for the following reason: ' + status);
      }

      updateLoc(results[0].geometry.location.lat(), results[0].geometry.location.lng());
    });
  });

  $('body').on('click', 'js-logout', function (ev) {
    ev.preventDefault();
    ev.stopPropagation();

    logout();
  });

  $('body').on('submit', 'form.js-login-form', function (ev) {
    ev.preventDefault();
    ev.stopPropagation();

    startHeartbeat();

    $.ajax({
        url: "/api/com.pokemon.go/login",
        method: 'POST',
        data: JSON.stringify({
          username: $('.js-login-container .js-username').val()
        , password: $('.js-login-container .js-password').val()
        , provider: $('.js-login-container .js-provider').val() || 'ptc'
        }),
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        },
        dataType: "json"
    }).then(function (result) {
        console.log('DEBUG Login Result:');
        console.log(result);

        result.accessToken = result.accessToken || result.access_token;

        if (!result.accessToken) {
          // TODO show 'bad credentials'
          $('.js-login-container .js-password').val('');
          return;
        }

        CONFIG.accessToken = result.accessToken;
        localStorage.setItem('accessToken', result.accessToken);

        // You can try using the default key... but it won't work for you, or not for long
        if ('AIzaSyB0Dqa90ZCmlwh7oPHkgfr2-cMMkufLBQE' !== CONFIG.gmaps_key) {
          $('.js-google-maps-key').hide();
        }

        $('.js-login-container').hide();

        // TODO
        if (localStorage.geoIsAllowed) {
          $('.js-geolocation-container').hide();
          updateGeolocation();
        } else {
          $('.js-geolocation-container').show();
        }
    });
  });

  $('.js-map').hide();
  if (CONFIG.requireLogin && !CONFIG.accessToken) {
    $('.js-login-container').show();
    return;
  }
  else {
    startHeartbeat();
    // this init is also called by Google Maps load
    $('.js-geolocation-container').show();
  }

});

// exported for Google Maps api
window.initMap = initMap;
}());
