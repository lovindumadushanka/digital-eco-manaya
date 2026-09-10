// map.js - Leaflet.js Interactive Campus Map Controller

class CampusMapController {
  constructor() {
    this.map = null;
    this.markersLayer = null;
    this.pickerMarker = null;
    this.pickerActive = false;
    this.activeTreePopupId = null;
    this.baseLayers = {};
  }

  // Initialize the Leaflet Map
  init(containerId = "campus-map", center = [6.7148, 80.7872], zoom = 16) {
    if (this.map) return;

    // Tile Layers
    const streetLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    });

    const satelliteLayer = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 19,
      attribution: "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
    });

    const darkLayer = L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>'
    });

    this.baseLayers = {
      "Leaf & Street": streetLayer,
      "Satellite View": satelliteLayer,
      "Clean Campus": darkLayer
    };

    // Initialize Map instance
    this.map = L.map(containerId, {
      center: center,
      zoom: zoom,
      layers: [streetLayer],
      zoomControl: false
    });

    // Custom positioned zoom control
    L.control.zoom({ position: "bottomright" }).addTo(this.map);

    // Layer Switcher Control
    L.control.layers(this.baseLayers, null, { position: "topright" }).addTo(this.map);

    // Layer for tree pins
    this.markersLayer = L.layerGroup().addTo(this.map);

    // Map Click Listener for Pin Dropper Mode
    this.map.on("click", (e) => {
      if (this.pickerActive) {
        this.setPickerPosition(e.latlng.lat, e.latlng.lng);
      }
    });

    // Add custom map buttons (Locate Me & Reset View)
    this.addCustomMapControls();
  }

  // Add custom control buttons to the map
  addCustomMapControls() {
    const customControl = L.control({ position: "bottomright" });
    customControl.onAdd = () => {
      const div = L.DomUtil.create("div", "leaflet-bar map-extra-controls");
      div.innerHTML = `
        <button type="button" id="btn-map-locate-user" class="map-ctrl-btn" title="Find My GPS Location">
          <i class="fa-solid fa-crosshairs"></i>
        </button>
        <button type="button" id="btn-map-fit-all" class="map-ctrl-btn" title="View All Campus Trees">
          <i class="fa-solid fa-expand"></i>
        </button>
      `;
      L.DomEvent.disableClickPropagation(div);
      return div;
    };
    customControl.addTo(this.map);

    setTimeout(() => {
      document.getElementById("btn-map-locate-user")?.addEventListener("click", () => this.locateUser());
      document.getElementById("btn-map-fit-all")?.addEventListener("click", () => this.fitAllTrees());
    }, 200);
  }

  // Render tree pins on the map
  renderTrees(trees) {
    if (!this.map || !this.markersLayer) return;
    this.markersLayer.clearLayers();

    if (!trees || !trees.length) return;

    const bounds = [];

    trees.forEach((tree) => {
      if (!tree.lat || !tree.lng) return;

      const marker = this.createTreeMarker(tree);
      marker.addTo(this.markersLayer);
      bounds.push([tree.lat, tree.lng]);
    });

    // Auto adjust bounds if trees exist and no single tree is selected
    if (bounds.length > 0 && !this.pickerActive) {
      this.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 17 });
    }
  }

  // Create custom marker icon according to health status
  createTreeMarker(tree) {
    const statusClass = (tree.healthStatus || "healthy").toLowerCase().replace(/\s+/g, "-");
    
    // Status colors
    const colorMap = {
      thriving: "#10b981", // Emerald
      healthy: "#22c55e",  // Green
      "needs-care": "#f59e0b", // Amber
      critical: "#ef4444" // Crimson
    };

    const pinColor = colorMap[statusClass] || "#10b981";

    const customIcon = L.divIcon({
      className: "custom-tree-pin-wrapper",
      html: `
        <div class="custom-tree-pin pin-${statusClass}" style="--pin-color: ${pinColor}">
          <div class="pin-pulse"></div>
          <div class="pin-body">
            <i class="fa-solid fa-tree"></i>
          </div>
          <div class="pin-tip"></div>
        </div>
      `,
      iconSize: [36, 46],
      iconAnchor: [18, 46],
      popupAnchor: [0, -42]
    });

    const marker = L.marker([tree.lat, tree.lng], { icon: customIcon });

    // Build popup content
    const popupContent = `
      <div class="tree-map-popup">
        <div class="popup-img-wrapper">
          <img src="${tree.imageUrl || 'assets/tree-placeholder.jpg'}" alt="${tree.commonName}" onerror="this.src='https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=400&q=80'" />
          <span class="popup-status-badge badge-${statusClass}">${tree.healthStatus || 'Healthy'}</span>
        </div>
        <div class="popup-content">
          <div class="popup-tag">${tree.tagId || 'CAMPUS-TREE'}</div>
          <h4 class="popup-title">${tree.commonName}</h4>
          <p class="popup-sci"><em>${tree.scientificName || ''}</em></p>
          <div class="popup-meta">
            <span><i class="fa-solid fa-location-dot"></i> ${tree.zone || 'Campus'}</span>
            <span><i class="fa-solid fa-ruler-vertical"></i> ${tree.height || '-'}m</span>
          </div>
          <div class="popup-actions">
            <button type="button" class="btn-popup-view" onclick="window.FloraApp.openTreeDetails('${tree.id}')">
              <i class="fa-solid fa-circle-info"></i> විස්තර බලන්න
            </button>
            <a href="https://www.google.com/maps/search/?api=1&query=${tree.lat},${tree.lng}" target="_blank" class="btn-popup-directions" title="Open Google Maps">
              <i class="fa-solid fa-diamond-turn-right"></i>
            </a>
          </div>
        </div>
      </div>
    `;

    marker.bindPopup(popupContent, {
      maxWidth: 280,
      className: "custom-leaflet-popup"
    });

    return marker;
  }

  // Pin Dropper for Add/Edit Form
  enablePicker(initialLat, initialLng) {
    this.pickerActive = true;
    const defaultCenter = this.map.getCenter();
    const lat = initialLat || defaultCenter.lat;
    const lng = initialLng || defaultCenter.lng;

    this.setPickerPosition(lat, lng);
    this.map.panTo([lat, lng]);
  }

  disablePicker() {
    this.pickerActive = false;
    if (this.pickerMarker) {
      this.map.removeLayer(this.pickerMarker);
      this.pickerMarker = null;
    }
  }

  setPickerPosition(lat, lng) {
    lat = parseFloat(lat.toFixed(6));
    lng = parseFloat(lng.toFixed(6));

    if (!this.pickerMarker) {
      const pickerIcon = L.divIcon({
        className: "picker-pin-wrapper",
        html: `
          <div class="picker-pin">
            <i class="fa-solid fa-location-crosshairs"></i>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });

      this.pickerMarker = L.marker([lat, lng], {
        icon: pickerIcon,
        draggable: true
      }).addTo(this.map);

      this.pickerMarker.on("dragend", (e) => {
        const pos = e.target.getLatLng();
        this.updateCoordinatesInputs(pos.lat, pos.lng);
      });
    } else {
      this.pickerMarker.setLatLng([lat, lng]);
    }

    this.updateCoordinatesInputs(lat, lng);
  }

  updateCoordinatesInputs(lat, lng) {
    const latInput = document.getElementById("tree-lat");
    const lngInput = document.getElementById("tree-lng");
    if (latInput) latInput.value = lat.toFixed(6);
    if (lngInput) lngInput.value = lng.toFixed(6);
  }

  // Geolocation for user's device
  locateUser() {
    if (!navigator.geolocation) {
      alert("GPS Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        this.map.flyTo([latitude, longitude], 18, { duration: 1.5 });
        if (this.pickerActive) {
          this.setPickerPosition(latitude, longitude);
        } else {
          L.circleMarker([latitude, longitude], {
            radius: 8,
            color: "#3b82f6",
            fillColor: "#60a5fa",
            fillOpacity: 0.8
          })
            .addTo(this.map)
            .bindPopup("Your Current Location (ඔබගේ වත්මන් ස්ථානය)")
            .openPopup();
        }
      },
      (err) => {
        alert("GPS Location error: " + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  // Fit all campus trees in view
  fitAllTrees() {
    if (!this.markersLayer) return;
    const layers = this.markersLayer.getLayers();
    if (layers.length > 0) {
      const group = L.featureGroup(layers);
      this.map.fitBounds(group.getBounds(), { padding: [50, 50] });
    }
  }

  // Center on a specific tree
  focusTree(lat, lng, zoom = 18) {
    if (!this.map) return;
    this.map.flyTo([lat, lng], zoom, { duration: 1.2 });
  }

  // Invalidate size to ensure Leaflet renders properly when tabs or modals open
  resize() {
    if (this.map) {
      setTimeout(() => this.map.invalidateSize(), 200);
    }
  }
}

// Global campusMap instance
const campusMap = new CampusMapController();
