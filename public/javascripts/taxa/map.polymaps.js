window.colorScale = d3.scale.category10()
function classifyCounties(e) { classifyPlaces(e, {placeType: 'county'}) }
function classifyStates(e) { classifyPlaces(e, {placeType: 'state'}) }
function classifyCountries(e) { classifyPlaces(e, {placeType: 'country'}) }
function classifyPlaces(e, options) {
  var options = options || {},
      placeType = options.placeType || 'county'
      // visibleFeatures = []
  for (var i = e.features.length - 1; i >= 0; i--){
    var feature = e.features[i]
    if (feature.data.properties) {
      var placeId = feature.data.properties.place_id
    } else {
      continue
    }
    var listing
    switch (placeType) {
      case 'county':
        listing = countyListings[placeId]
        break;
      case 'state':
        listing = stateListings[placeId]
        break;
      case 'country':
        listing = countryListings[placeId]
        break;
    }
    if (listing) {
      var placeClass = 'place_' + listing.place_id
      feature.element.setAttribute('class', placeType + ' ' + placeClass + 
        ' ' + (listing.last_observation_id ? 'confirmed' : 'putative'))
      feature.element.setAttribute('data-place-id', listing.place_id)
      $(feature.element).hover(
        function() { $('path.place_'+$(this).attr('data-place-id')).css('opacity', 0.7) },
        function() { $('path.place_'+$(this).attr('data-place-id')).css('opacity', 0.5) }
      )
      $(feature.element).qtip({
        style: {
          classes: 'listed_taxon ui-tooltip-light ui-tooltip-shadow'
        },
        show: {
          event: 'click',
          solo: true
        },
        hide: {
          event: 'unfocus'
        },
        position: {
          viewport: $(window),
          my: 'bottom left',
          at: 'center center'
        },
        content: {
          title: {
            text: 'Listed taxon',
            button: true
          },
          text: '<span class="meta loading status">Loading..</span>',
          ajax: {
            url: '/listed_taxa/'+listing.id,
            method: 'GET',
            data: {partial: 'place_tip'}
          }
        }
      })
    }
  }
}
function handleObservations(e) {
  for (var i = e.features.length - 1; i >= 0; i--){
    var feature = e.features[i]
    if (!feature || !feature.element) {continue}
    feature.element.setAttribute('data-observation-id', feature.data.properties.observation_id || feature.data.properties.id)
    var cssClass = feature.data.properties.quality_grade
    if (feature.data.properties.quality_grade == 'research' || feature.data.properties.quality_grade == 'community') {
      cssClass += ' confirmed'
    } else {
      cssClass += ' putative'
    }
    feature.element.setAttribute('class', cssClass)
    $(feature.element).qtip({
      style: {
        classes: 'mini infowindow observations ui-tooltip-light ui-tooltip-shadow'
      },
      show: {
        event: 'click',
        solo: true
      },
      hide: {
        event: 'unfocus'
      },
      position: {
        viewport: $(window),
        my: 'bottom left',
        at: 'center center'
      },
      content: {
        title: {
          text: 'Observation',
          button: true
        },
        text: '<span class="meta loading status">Loading..</span>',
        ajax: {
          url: '/observations/'+feature.data.properties.id,
          method: 'GET',
          data: {partial: 'cached_component'}
        }
      }
    })
  }
}
function handleTaxonObservations(e) {
  // if (window.extent) { return };
  // window.extent = Polymaps.bounds(e.features)
  // window.map.extent(window.extent).zoomBy(-.5);
}
// function legend(e) {
//   var lyr = $(e.tile.element).parent().parent();
//   // console.log("$(e.tile.element).parents(): ", $(e.tile.element).parents());
//   if (lyr.length == 0) { return };
//   // console.log("lyr: ", lyr);
//   var klass = $(lyr).attr('id') || 'Unknown',
//       title = klass.replace(/[-_]/, ' ');
//   if ($('#legend .'+klass).length > 0) { return };
//   var li = $('<li></li>').addClass(klass),
//       symbol = $('<span></span>').addClass('symbol'),
//       label = $('<label></label>').html(title);
//   li.append(symbol, label)
//   $('#legend ul').append(li)
// }

function styleRange(e, child) {
  var fill = colorScale(child.id)
  var stroke = d3.rgb(fill).darker().toString()
  for (var i = e.features.length - 1; i >= 0; i--){
    var feature = e.features[i]
    feature.element.setAttribute('fill', fill)
    feature.element.setAttribute('stroke', stroke)
  }
}

function styleObservations(e, child) {
  var fill = colorScale(child.id)
  var stroke = fill.darken()
}

function addPlaces() {
  layers['countries_simple'] = po.geoJson()
    .id('countries_simple')
    .zoom(function(z) {
      if (z > 3) { return 100};
      return z;
    })
    .url(TILESTACHE_SERVER+"/countries_simplified/{Z}/{X}/{Y}.geojson")
    .on('load', classifyCountries)
  map.add(layers['countries_simple']);

  layers['states_simple'] = po.geoJson()
    .id('states_simple')
    .zoom(function(z) {
      if (z < 4) { return -100};
      if (z > 6) { return 100};
      return z;
    })
    .url(TILESTACHE_SERVER+"/states_simplified/{Z}/{X}/{Y}.geojson")
    .on('load', classifyStates)
  map.add(layers['states_simple']);

  layers['counties_simple'] = po.geoJson()
    .id('counties_simple')
    .zoom(function(z) {
      if (z < 7) { return -100};
      if (z > 11) { return 100};
      return z;
    })
    .url(TILESTACHE_SERVER+"/counties_simplified/{Z}/{X}/{Y}.geojson")
    .on('load', classifyCounties)
  map.add(layers['counties_simple']);

  layers['counties'] = po.geoJson()
    .id('counties')
    .zoom(function(z) {
      if (z < 12) { return -100};
      if (z > 13) { return 100};
      return z;
    })
    .url(TILESTACHE_SERVER+"/counties/{Z}/{X}/{Y}.geojson")
    .on('load', classifyCounties)
  map.add(layers['counties']);
}

function addObservations() {
  layers['observations'] = po.geoJson()
    .id('observations')
    .url("<%= observations_of_url(@taxon, :format => 'geojson') %>")
    .tile(false)
    .on('load', handleObservations)
    .on('load', handleTaxonObservations)
    .clip(false)
  map.add(layers['observations']);
}

function scaleLegend() {
  var scaleWidth  = $('#legend').outerWidth() > $(window).width() / 2,
      scaleHeight = $('#legend').outerHeight() > $(window).height() / 2
  if (scaleWidth || scaleHeight) {
    $('#legend .taxonimage').hide()
    if (scaleWidth) {
      $('#legend').width($(window).width() / 2)
    }
    $('#legend .small, #legend .meta').hide()
  } else {
    $('#legend .taxonimage').show()
    if (!scaleWidth) {
      $('#legend').width('auto')
    }
    $('#legend .small, #legend .meta').show()
  }
  window.windowResized = null
}

window.windowResizeHandler = function() {
  var now = (new Date()).getTime()
  if (windowResized && now - windowResized > 400) {
    scaleLegend()
  }
}

$(window).resize(function() {
  window.windowResized = (new Date()).getTime()
  setTimeout('windowResizeHandler()', 500)
})

$(document).ready(function() {
  window.layers = {}
  window.po = org.polymaps
  window.map = po.map()
    .container($('#map').get(0).appendChild(po.svg('svg')))
    .zoomRange([2, 15])
    .add(po.interact());
  if (window.location.hash.length > 0) {
    // let the po.hash() control handle it
  } else if (extent) {
    map.extent(extent).zoomBy(-0.5)
  } else {
    map.center({lat: 0, lon: 0}).zoom(3)
  }
  // map.center({lat: 37.5, lon: -121.5}).zoom(9)
  // map.center({lat: 0, lon: 0}).zoom(2)
  
  map.add(po.hash())
  
  if (CLOUDMADE_KEY) {
    window.cloudmadeLyr = po.image()
        .url(po.url("http://{S}tile.cloudmade.com"
        + "/"+CLOUDMADE_KEY
        + "/998/256/{Z}/{X}/{Y}.png")
        .hosts(["a.", "b.", "c.", ""]))
    map.add(cloudmadeLyr);
  }
  
  if (BING_KEY) {
    var script = document.createElement("script");
    script.setAttribute("type", "text/javascript");
    script.setAttribute("src", "http://dev.virtualearth.net"
        + "/REST/V1/Imagery/Metadata/AerialWithLabels"
        + "?key="+BING_KEY
        + "&jsonp=bingCallback");
    document.body.appendChild(script);
  } else {
    loadLayers()
    $('#basemap').hide()
  }
  
})

function loadLayers() {
  if (children && children.length > 0) {
    $('#legend ul').html('')
    // addObservations()
    var styling = po.stylist()
      .style('visibility', 'visible')
      .style('fill', function(f) { return colorScale(f.properties.taxon_id) })
      .style('stroke', function(f) { return d3.rgb(colorScale(f.properties.taxon_id)).darker().toString() })
      
    $.each(children, function() {
      var child = this,
          rangeId = 'range_'+child.id,
          observationsId = 'observations_'+child.id;
      if (child.range_url) {
        layers[rangeId] = po.geoJson()
          .id(rangeId)
          .url(child.range_url)
          .tile(false)
          .clip(false)
          .on('load', styling)
        map.add(layers[rangeId])
      }

      var inputId = 'taxon_check_' + child.id
      var input = $('<input type="checkbox">')
        .attr('id', inputId)
        .attr('checked', 'checked')
        .click(function() { 
          if (layers[rangeId]) { layers[rangeId].visible(this.checked); }
          layers[observationsId].visible(this.checked)
        })
      var symbol = $('<div class="symbol"></div>').css({
        backgroundColor: colorScale(child.id),
        borderColor: d3.rgb(colorScale(child.id)).darker().toString(),
        borderStyle: 'solid',
        borderWidth: '1px'
      })
      var label = $('<label></label>').attr('for', inputId).html(child.name)
      var link = $('<a></a>').attr('href', '/taxa/'+child.id).html('(view)').addClass('small')
      var li = $('<li></li>').append(input, ' ', symbol, ' ', label, ' ', link)
      $('#legend ul').append(li)
    })
    
    $.each(children, function() {
      var child = this,
          rangeId = 'range_'+child.id,
          observationsId = 'observations_'+child.id;
      layers[observationsId] = po.geoJson()
        .id(observationsId)
        .url(child.observations_url)
        .tile(false)
        .clip(false)
        .on('load', handleObservations)
        .on('load', styling)
      map.add(layers[observationsId])
    })
    
  } else  {
    if (taxonRangeUrl) {
      layers['range'] = po.geoJson()
        .id('range')
        .tile(false)
        .url(taxonRangeUrl)
      map.add(layers['range'])
    }
    addPlaces()
    addObservations()
    $('#legend li').each(function() {
      var targetLayers = $(this).attr('rel').split(' ')
      $(this).find('input').click(function() {
        for (var i = targetLayers.length - 1; i >= 0; i--){
          if (layers[targetLayers[i]]) { layers[targetLayers[i]].visible(this.checked) }
        };
      })
    })
  }
  
  map.add(po.compass())
  scaleLegend()
  
  // open links in the parent window if this is an iframe
  if (self != top) {
    $('a').live('click', function() {
      parent.location = $(this).attr('href')
      return false;
    })
  }
}

function bingCallback(data) {

  /* Display each resource as an image layer. */
  var resourceSets = data.resourceSets;
  for (var i = 0; i < resourceSets.length; i++) {
    var resources = data.resourceSets[i].resources;
    for (var j = 0; j < resources.length; j++) {
      var resource = resources[j];
      window.bingLyr = po.image()
          .url(Polymaps.bingUrlTemplate(resource.imageUrl, resource.imageUrlSubdomains))
          .id('satellite')
          .visible(false)
      map.add(bingLyr
        ).tileSize({x: resource.imageWidth, y: resource.imageHeight});
    }
  }

  /* Display copyright notice. */
  document.getElementById("copyright").appendChild(document.createTextNode(data.copyright));
  loadLayers()
  $('#basemap_map').click(function() {
    cloudmadeLyr.visible(true)
    bingLyr.visible(false)
  })
  $('#basemap_sat').click(function() {
    cloudmadeLyr.visible(false)
    bingLyr.visible(true)
  })
}