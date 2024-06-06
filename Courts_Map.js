var map;

/**
 * Initializes the map and sets up the necessary layers and event handlers.
 */
function init() {
  // create map and set center and zoom level

  map = new L.map('mapid', {
    maxZoom:17
  });

  // create tile layer and add it to map
  var tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png');           
  tiles.addTo(map);

  var selection;
  var selectedLayer;

  // define the styles for the court layer (unselected and selected)
  function courtsStyle(feature) {
    return {
      fillColor: "#FFA500", // Orange color
      fillOpacity: 1,
      color: '#FFBF00', // Amber color
      weight: 1, // Outline thickness
      radius: 10, // Circle radius
      fill: true, // Fill the circle
      stroke: true, // Outline the circle
      shape: 'circle' // Shape of the marker
    };
  }

  function courtsSelectedStyle(feature) {
    return {
      fillColor: "#0000FF", // Orange color
      fillOpacity: 1,
      color: '#FFBF00', // Amber color
      weight: 1, // Outline thickness
      radius: 10, // Circle radius
      fill: true, // Fill the circle
      stroke: true, // Outline the circle
      shape: 'circle' // Shape of the marker
    };
  }

   // create icons for pantries (selected and unselected)
  var courtCentroidsIcon = L.icon({
    iconUrl: 'Court_Centroids.svg',
    iconSize: [20,20]
  });

  var courtCentroidsSelectedIcon = L.icon({
    iconUrl: 'Court_Centroids_Selected.svg',
    iconSize: [20,20]
  });

  // handle click events on court features
  function courtOnEachFeature(feature, layer) {
    layer.on({
      click: function(e) {
        if (selection) {            
          resetStyles();
          map.flyTo(e.latlng);
        }
        
        e.target.setStyle(courtsSelectedStyle());
        selection = e.target;
        selectedLayer = courtsLayer;

        L.DomEvent.stopPropagation(e); // stop click event from being propagated further
      }
    });
  }

  // handle click events on court centroid features
  function courtCentroidsOnEachFeature(feature, layer){
    layer.on({
      click: function(e) {
          if (selection) {
            resetStyles();
            map.flyTo(e.latlng);
          }
          e.target.setIcon(courtCentroidsSelectedIcon);
          selection = e.target;
          selectedLayer = courtCentroidsLayer;

          L.DomEvent.stopPropagation(e); // stop click event from being propagated further
        }
    });
  }
  
  // function to configure the layers based on the zoom level
  function configureZoomLayers() {
      var zoomLevel = map.getZoom();
      var zoomthreshold = 14;
      if (zoomLevel > zoomthreshold) {
          // If greater than this zoom level, hide courtCentroidsLayer and show courtsLayer
          if (map.hasLayer(courtClusters)) {
              map.removeLayer(courtClusters);
          }
          if (!map.hasLayer(courtsLayer)) {
              map.addLayer(courtsLayer);
          }
      }
      else {
          // otherwise, show courtCentroidsLayer and hide courtsLayer
          if (!map.hasLayer(courtClusters)) {
              map.addLayer(courtClusters);
          }
          if (map.hasLayer(courtsLayer)) {
              map.removeLayer(courtsLayer);
          }
      }
  };

  // function to configure the extent of the map based on the layers
  function configureExtentLayers() {
      var group = new L.featureGroup([courtsLayer, courtClusters]);

      map.fitBounds(group.getBounds());
  };

  // function to reload the layers, which intends to be used when the reset button is clicked or the sports dropdown is reset
  function reloadLayers() {
    courtsLayer.remove();
    courtsLayer = new L.geoJSON(courtJson, {
      style: courtsStyle,
      onEachFeature: courtOnEachFeature
    });
    map.addLayer(courtsLayer);
      courtsLayer.eachLayer(allPopup);

    courtClusters.remove();
    courtCentroidsLayer = L.geoJSON(courtCentroidJson, {
      pointToLayer: function (feature, latlng) {
            return L.marker(latlng, {icon: courtCentroidsIcon});
          },
      onEachFeature: courtCentroidsOnEachFeature
    });
    courtClusters = L.markerClusterGroup();
    courtClusters.addLayer(courtCentroidsLayer);
    map.addLayer(courtClusters);
    courtCentroidsLayer.eachLayer(allPopup);
    
    configureZoomLayers();
    configureExtentLayers();
    courtClusterPopup();
    updateCourtCount();
    resetButtonHighlightRemove();
  }

  // function to filter the layers based on the selected sports
  function filterLayers(selectedSports) {
    if (selectedSports.length === 0) {
      reloadLayers();
    } else {
      courtsLayer.remove();
      courtsLayer = L.geoJSON(courtJson, {
        style: courtsStyle,
        onEachFeature: courtOnEachFeature,
        filter: function(feature) {
          var sports = feature.properties.SPORTS;
          if (sports === null) {
            return false;
          } else {
            var sports_list = sports.split(',');
            return sports_list.every(function(sport) {
              return selectedSports.includes(sport.trim());
            });
          }
        }
      });
      map.addLayer(courtsLayer);
      courtsLayer.eachLayer(allPopup);

      courtClusters.remove();
      courtCentroidsLayer = L.geoJSON(courtCentroidJson, {
        pointToLayer: function (feature, latlng) {
              return L.marker(latlng, {icon: courtCentroidsIcon});
            },
        onEachFeature: courtCentroidsOnEachFeature,
        filter: function(feature) {
          var sports = feature.properties.SPORTS;
          if (sports === null) {
            return false;
          } else {
            var sports_list = sports.split(',');
            return sports_list.every(function(sport) {
              return selectedSports.includes(sport.trim());
            });
          }
        }
      });
      courtClusters = L.markerClusterGroup();
      courtClusters.addLayer(courtCentroidsLayer);
      map.addLayer(courtClusters);
      courtCentroidsLayer.eachLayer(allPopup);
    }

    configureZoomLayers();
    configureExtentLayers();
    courtClusterPopup();
    updateCourtCount();
    resetButtonHighlight();
  }

  // Function to highlight the reset button when the map is zoomed or moved
  function resetButtonHighlight() {
    document.getElementById('reset-button').classList.remove('unselected');
    document.getElementById('reset-button').classList.add('selected');
  };

  // Function to remove the highlight from the reset button
  function resetButtonHighlightRemove() {
    document.getElementById('reset-button').classList.remove('selected');
    document.getElementById('reset-button').classList.add('unselected');
  };

  // Function to update the feature count indicator
  function updateCourtCount() {
      // console.log(courtsLayer.getLayers());
      var courtCount = courtsLayer.getLayers().length; // Count the number of courts
      document.getElementById('courts-count').innerHTML = courtCount; // Update the HTML element
  }

  // Fetch the GeoJSON file for the courts layer
  var courtsLayer = new L.geoJSON(courtJson,{
      style: courtsStyle,
      onEachFeature: courtOnEachFeature
    });
  courtsLayer.addTo(map);

  // Fetch the GeoJSON file for the court centroids layer
  var courtCentroidsLayer = L.geoJSON(courtCentroidJson, {
    pointToLayer: function (feature, latlng) {
          return L.marker(latlng, {icon: courtCentroidsIcon});
         },
    onEachFeature: courtCentroidsOnEachFeature
  });

  // Create a marker cluster group for the court centroids layer
  var courtClusters = L.markerClusterGroup();
  courtClusters.addLayer(courtCentroidsLayer);
  courtCentroidsLayer.addTo(courtClusters);

  // handle clicks on the map that didn't hit a feature
  map.addEventListener('click', function(e) {
    if (selection) {
      resetStyles();
      selection = null;
    }
  });
  
  // function to set the old selected feature back to its original symbol. Used when the map or a feature is clicked.
  function resetStyles(){
    if (selectedLayer === courtCentroidsLayer) selection.setIcon(courtCentroidsIcon);
    else if (selectedLayer === courtsLayer) selectedLayer.resetStyle(selection);
  }
  
  // function to add popups to the courts features of both layers
  function allPopup(layer) {
      var popupContent = 
        "<div class='popup-content'>" +
        "<h3>Park Name: " + layer.feature.properties.PARK_NAME + "</h3>" +
        "<p><strong>Sport(s): </strong> " + layer.feature.properties.SPORTS + "</p>" +
        "<p><strong>Length: </strong> " + layer.feature.properties.LENGTH + " feet</p>" +
        "<p><strong>Width: </strong> " + layer.feature.properties.WIDTH + " feet</p>" +
        "<p><strong>Square Feet: </strong> " + layer.feature.properties.SQFT + " square feet</p>"
        + "</div>";
      layer.bindPopup(popupContent);
  };

  courtsLayer.eachLayer(allPopup);
  courtCentroidsLayer.eachLayer(allPopup);

  // function to sum the values of a given attribute for all markers in a layer
  function sumAttribute(markers, attribute) {
    let sum = 0;
    markers.forEach(marker => {
      sum += marker.feature.properties[attribute];
    });
    return sum;
  };

  // handle mouseover events on clusters
  function courtClusterPopup() {
    courtClusters.on('clustermouseover', function (a) {
      // a.layer is a cluster
      var childMarkers = a.layer.getAllChildMarkers();
      // sum the sports for all courts in the cluster
      var popupContent = 
      "<div class='popup-content'>" +
      "<h3>Total Courts: " + childMarkers.length + "</h3>" +
      "<p><strong>Basketball Courts: </strong> " + sumAttribute(childMarkers, 'BASKETBALL') + "</p>" +
      "<p><strong>Bocci Courts: </strong> " + sumAttribute(childMarkers, 'BOCCI') + "</p>" +
      "<p><strong>Futsal Courts: </strong> " + sumAttribute(childMarkers, 'FUTSAL') + "</p>" +
      "<p><strong>Handball Courts: </strong> " + sumAttribute(childMarkers, 'HANDBALL') + "</p>" +
      "<p><strong>Hockey Courts: </strong> " + sumAttribute(childMarkers, 'HOCKEY') + "</p>" +
      "<p><strong>Pickleball Courts: </strong> " + sumAttribute(childMarkers, 'PICKLEBALL') + "</p>" +
      "<p><strong>Shuffleboard Courts: </strong> " + sumAttribute(childMarkers, 'SHUFFLEBOA') + "</p>" +
      "<p><strong>Tai Chi Courts: </strong> " + sumAttribute(childMarkers, 'TAICHI') + "</p>" +
      "<p><strong>Tennis Courts: </strong> " + sumAttribute(childMarkers, 'TENNIS') + "</p>" +
      "<p><strong>Volleyball Courts: </strong> " + sumAttribute(childMarkers, 'VOLLEYBALL') + "</p>"
      + "</div>";
      a.layer.bindPopup(popupContent).openPopup();
    });
  };
  courtClusterPopup();

  // function to handle zoom level changes
  // reference: https://gis.stackexchange.com/questions/182628/leaflet-layers-on-different-zoom-levels-how
  if (!selection) { // do not configure zoom layers if a feature is selected to prevent whiplash
    map.on('zoomend', configureZoomLayers);
  }
  configureExtentLayers();
  updateCourtCount();
  map.on('zoomend', resetButtonHighlight);
  map.on('movestart', resetButtonHighlight);

  // Create a set of sports to populate the sports dropdown
  const sportsSet = new Set([
    'Basketball',
    'Bocci',
    'Futsal',
    'Handball',
    'Hockey',
    // 'Paddleball', none presently in the dataset
    'Pickleball',
    'Shuffleboard',
    'Tai Chi',
    'Tennis',
    'Volleyball'
  ]);

  var dropdown = document.getElementById('sports-dropdown');

  // Add a default option to the dropdown
  var defaultOption = document.createElement('option');
  defaultOption.text = "No Sports Selected";
  defaultOption.value = "";
  dropdown.add(defaultOption);

  sportsSet.forEach(function(sport) {
      var option = document.createElement('option');
      option.text = sport;
      option.value = sport;
      option.type = "checkbox";
      option.checked;
      dropdown.add(option);
  });

  // Add an event listener to the dropdown
  dropdown.addEventListener('change', function() {
      // Get the selected sports
      var selectedSports = Array.from(this.selectedOptions).map(function(option) {
          return option.value;
      });
      
      // If no sports are selected, select the default option
      if (selectedSports[0] === "") {
          defaultOption.selected = true;
          // Remove the current layer from the map
        reloadLayers();
      } else {
        filterLayers(selectedSports);
      }

  });
  
  // Add an event listener to the reset button
  document.getElementById('reset-button').addEventListener('click', function() {
      var dropdown = document.getElementById('sports-dropdown');
      for(var i=0; i<dropdown.options.length; i++) {
          dropdown.options[i].selected = false;
      }
      
      reloadLayers();
  });
}