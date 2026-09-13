// app.js - Main Application Controller & UI Logic

class FloraCampusApp {
  constructor() {
    this.trees = [];
    this.filteredTrees = [];
    this.currentView = "split"; // "split" | "map" | "grid" | "analytics"
    this.currentTheme = localStorage.getItem("flora_theme") || "light";
    this.currentLang = localStorage.getItem("flora_lang") || "si";
    this.cameraStream = null;
    this.currentImageBase64 = null;
    this.qrInstance = null;

    this.init();
  }

  async init() {
    this.initPreloader();
    this.initHeroVideo();
    this.applyTheme(this.currentTheme);
    this.setLanguage(this.currentLang, false);
    this.initEventListeners();

    // Initialize Leaflet Map
    campusMap.init("campus-map", [6.7148, 80.7872], 16);

    // Load trees from IndexedDB
    await this.loadTrees();

    // Listen to data-changed events from DB
    window.addEventListener("flora:data-changed", async () => {
      await this.loadTrees();
    });

    // Check URL parameters (e.g. if opened via QR Code scan like ?treeId=tree-001)
    const urlParams = new URLSearchParams(window.location.search);
    const treeIdParam = urlParams.get("treeId");
    if (treeIdParam) {
      setTimeout(() => this.openTreeDetails(treeIdParam), 500);
    }
  }

  // Botanical Preloader Splash Controller
  initPreloader() {
    const preloader = document.getElementById("app-preloader");
    const progressFill = document.getElementById("preloader-progress-fill");
    const counterText = document.getElementById("preloader-counter");
    const skipBtn = document.getElementById("btn-skip-preloader");
    if (!preloader) return;

    let progress = 12;
    const updateProgress = (val) => {
      progress = Math.min(100, Math.max(progress, val));
      if (progressFill) progressFill.style.width = `${progress}%`;
      if (counterText) counterText.textContent = `${Math.round(progress)}%`;
      if (progress >= 100) {
        setTimeout(() => {
          preloader.classList.add("fade-out");
        }, 400);
      }
    };

    const interval = setInterval(() => {
      if (progress < 85) {
        updateProgress(progress + Math.floor(Math.random() * 12) + 6);
      }
    }, 180);

    window.addEventListener("flora:data-ready", () => {
      clearInterval(interval);
      updateProgress(100);
    });

    setTimeout(() => {
      clearInterval(interval);
      updateProgress(100);
    }, 2400);

    skipBtn?.addEventListener("click", () => {
      clearInterval(interval);
      preloader.classList.add("fade-out");
    });
  }

  replayPreloader() {
    const preloader = document.getElementById("app-preloader");
    const progressFill = document.getElementById("preloader-progress-fill");
    const counterText = document.getElementById("preloader-counter");
    if (!preloader) return;

    preloader.classList.remove("fade-out");
    if (progressFill) progressFill.style.width = "0%";
    if (counterText) counterText.textContent = "0%";

    let progress = 10;
    const interval = setInterval(() => {
      progress += 18;
      if (progressFill) progressFill.style.width = `${Math.min(100, progress)}%`;
      if (counterText) counterText.textContent = `${Math.min(100, progress)}%`;
      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => preloader.classList.add("fade-out"), 400);
      }
    }, 160);
  }

  // Campus Full-Width Video Banner Controller
  initHeroVideo() {
    const video = document.getElementById("campus-hero-video");
    const playBtn = document.getElementById("cvid-playpause");
    const muteBtn = document.getElementById("cvid-mute");
    const fsBtn   = document.getElementById("cvid-fullscreen");
    const playIcon = document.getElementById("cvid-play-icon");
    const muteIcon = document.getElementById("cvid-mute-icon");

    if (playBtn && video) {
      playBtn.addEventListener("click", () => {
        if (video.paused) {
          video.play();
          if (playIcon) playIcon.className = "fa-solid fa-pause";
        } else {
          video.pause();
          if (playIcon) playIcon.className = "fa-solid fa-play";
        }
      });
    }

    if (muteBtn && video) {
      muteBtn.addEventListener("click", () => {
        video.muted = !video.muted;
        if (muteIcon) {
          muteIcon.className = video.muted ? "fa-solid fa-volume-xmark" : "fa-solid fa-volume-high";
        }
      });
    }

    if (fsBtn && video) {
      fsBtn.addEventListener("click", () => {
        const stage = document.querySelector(".campus-video-stage");
        if (stage) {
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            stage.requestFullscreen && stage.requestFullscreen();
          }
        }
      });
    }
  }


  // Internationalization (i18n) Engine: Sinhala, Tamil, English
  setLanguage(lang = "si", showToast = true) {
    if (!TRANSLATIONS || !TRANSLATIONS[lang]) return;
    this.currentLang = lang;
    localStorage.setItem("flora_lang", lang);

    const t = TRANSLATIONS[lang];

    // Update all data-i18n elements
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (t[key]) {
        el.textContent = t[key];
      }
    });

    // Update all placeholder inputs
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const key = el.getAttribute("data-i18n-placeholder");
      if (t[key]) {
        el.setAttribute("placeholder", t[key]);
      }
    });

    // Update active button state
    document.querySelectorAll(".lang-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.getAttribute("data-lang") === lang);
    });

    if (showToast && t.toast_lang_changed) {
      this.showToast(t.toast_lang_changed, "success");
    }
  }

  // Load trees from database and refresh all components
  async loadTrees() {
    try {
      this.trees = await treeDB.getAllTrees();
      this.applyFilters();
      window.dispatchEvent(new CustomEvent("flora:data-ready"));
    } catch (err) {
      console.error("Error loading trees:", err);
      this.showToast("දත්ත ලබාගැනීමේ දෝෂයක් සිදු විය (Failed to load trees)", "error");
      window.dispatchEvent(new CustomEvent("flora:data-ready"));
    }
  }

  // Apply Search, Zone, Health, and Sort filters
  applyFilters() {
    const searchVal = (document.getElementById("global-search-input")?.value || "").toLowerCase().trim();
    const zoneFilter = document.getElementById("filter-zone")?.value || "all";
    const healthFilter = document.getElementById("filter-health")?.value || "all";
    const sortBy = document.getElementById("filter-sort")?.value || "newest";

    let results = [...this.trees];

    // Search filter
    if (searchVal) {
      results = results.filter((t) => {
        return (
          (t.commonName || "").toLowerCase().includes(searchVal) ||
          (t.scientificName || "").toLowerCase().includes(searchVal) ||
          (t.tagId || "").toLowerCase().includes(searchVal) ||
          (t.zone || "").toLowerCase().includes(searchVal) ||
          (t.caretaker || "").toLowerCase().includes(searchVal) ||
          (t.notes || "").toLowerCase().includes(searchVal)
        );
      });
    }

    // Zone filter
    if (zoneFilter !== "all") {
      results = results.filter((t) => (t.zone || "") === zoneFilter);
    }

    // Health filter
    if (healthFilter !== "all") {
      results = results.filter((t) => (t.healthStatus || "").toLowerCase() === healthFilter.toLowerCase());
    }

    // Sorting
    if (sortBy === "newest") {
      results.sort((a, b) => new Date(b.plantedDate || b.createdAt || 0) - new Date(a.plantedDate || a.createdAt || 0));
    } else if (sortBy === "name") {
      results.sort((a, b) => (a.commonName || "").localeCompare(b.commonName || ""));
    } else if (sortBy === "height") {
      results.sort((a, b) => (parseFloat(b.height) || 0) - (parseFloat(a.height) || 0));
    } else if (sortBy === "carbon") {
      results.sort((a, b) => (parseFloat(b.carbonOffsetKg) || 0) - (parseFloat(a.carbonOffsetKg) || 0));
    }

    this.filteredTrees = results;

    // Refresh UI components
    this.renderCatalogList();
    this.renderGridView();
    campusMap.renderTrees(this.filteredTrees);
    campusCharts.updateAnalytics(this.trees);

    // Update count badge
    const badge = document.getElementById("catalog-count-badge");
    if (badge) badge.textContent = `${this.filteredTrees.length} trees`;
  }

  // Render Catalog Cards in Split View
  renderCatalogList() {
    const container = document.getElementById("catalog-list");
    if (!container) return;

    if (this.filteredTrees.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-seedling"></i>
          <h4>පැල හමු නොවීය (No Trees Found)</h4>
          <p>සොයන නිර්ණායක වෙනස් කරන්න හෝ නව පැලයක් එක්කරන්න.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.filteredTrees
      .map((tree) => {
        const statusClass = (tree.healthStatus || "healthy").toLowerCase().replace(/\s+/g, "-");
        const defaultImg = "https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=400&q=80";
        return `
          <div class="tree-item-card" data-tree-id="${tree.id}" onclick="FloraApp.handleTreeCardClick('${tree.id}')">
            <div class="tree-item-thumb">
              <img src="${tree.imageUrl || defaultImg}" alt="${tree.commonName}" onerror="this.src='${defaultImg}'" />
            </div>
            <div class="tree-item-body">
              <div class="tree-item-top">
                <span class="tree-item-tag">${tree.tagId || "TREE"}</span>
                <span class="badge-pill badge-${statusClass}">${tree.healthStatus || "Healthy"}</span>
              </div>
              <h4 class="tree-item-name">${tree.commonName}</h4>
              <span class="tree-item-sci">${tree.scientificName || "Botanical species"}</span>
              <div class="tree-item-footer">
                <span class="tree-item-zone"><i class="fa-solid fa-location-dot"></i> ${tree.zone || "Campus"}</span>
                <span><i class="fa-solid fa-ruler-vertical"></i> ${tree.height ? tree.height + "m" : "-"}</span>
              </div>
            </div>
          </div>
        `;
      })
      .join("");
  }

  // Render Cards in Full Grid View
  renderGridView() {
    const container = document.getElementById("view-grid");
    if (!container) return;

    if (this.filteredTrees.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <i class="fa-solid fa-seedling"></i>
          <h4>පැල හමු නොවීය (No Trees Found)</h4>
          <p>සොයන නිර්ණායක වෙනස් කරන්න හෝ නව පැලයක් එක්කරන්න.</p>
        </div>
      `;
      return;
    }

    const defaultImg = "https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=600&q=80";

    container.innerHTML = this.filteredTrees
      .map((tree) => {
        const statusClass = (tree.healthStatus || "healthy").toLowerCase().replace(/\s+/g, "-");
        return `
          <div class="grid-tree-card">
            <div class="grid-card-media">
              <img src="${tree.imageUrl || defaultImg}" alt="${tree.commonName}" onerror="this.src='${defaultImg}'" />
              <span class="popup-status-badge badge-${statusClass}">${tree.healthStatus || "Healthy"}</span>
            </div>
            <div class="grid-card-content">
              <span class="tree-item-tag">${tree.tagId || "TREE"}</span>
              <h3 class="popup-title" style="font-size: 1.15rem;">${tree.commonName}</h3>
              <p class="popup-sci" style="margin-bottom: 0.5rem;"><em>${tree.scientificName || ""}</em></p>
              
              <div class="grid-card-specs">
                <div class="spec-item"><i class="fa-solid fa-location-dot"></i> <span>${tree.zone || "Campus"}</span></div>
                <div class="spec-item"><i class="fa-solid fa-ruler-vertical"></i> <span>Height: <strong>${tree.height || "-"}m</strong></span></div>
                <div class="spec-item"><i class="fa-solid fa-circle-notch"></i> <span>DBH: <strong>${tree.dbh || "-"}cm</strong></span></div>
                <div class="spec-item"><i class="fa-solid fa-cloud-arrow-down"></i> <span>CO₂: <strong>${tree.carbonOffsetKg || "-"}kg</strong></span></div>
              </div>

              <div class="grid-card-actions">
                <button type="button" class="btn btn-secondary btn-sm" onclick="FloraApp.focusOnMap('${tree.lat}', '${tree.lng}')" style="flex: 1;">
                  <i class="fa-solid fa-map-pin"></i> Map
                </button>
                <button type="button" class="btn btn-primary btn-sm" onclick="FloraApp.openTreeDetails('${tree.id}')" style="flex: 1.3;">
                  <i class="fa-solid fa-circle-info"></i> විස්තර (Details)
                </button>
                <button type="button" class="btn btn-secondary btn-sm btn-icon" onclick="FloraApp.openQRBadge('${tree.id}')" title="Print QR Badge">
                  <i class="fa-solid fa-qrcode"></i>
                </button>
              </div>
            </div>
          </div>
        `;
      })
      .join("");
  }

  // Handle tree card click in split view (smooth zoom into marker & popup)
  handleTreeCardClick(id) {
    const tree = this.trees.find((t) => t.id === id);
    if (!tree) return;

    if (tree.lat && tree.lng) {
      campusMap.focusTree(tree.lat, tree.lng, 18);
    }
  }

  // Focus directly on map from any view
  focusOnMap(lat, lng) {
    this.switchView("split");
    setTimeout(() => {
      campusMap.focusTree(parseFloat(lat), parseFloat(lng), 18);
    }, 250);
  }

  // Switch Active View Tab
  switchView(viewName) {
    this.currentView = viewName;
    const splitEl = document.getElementById("view-split");
    const gridEl = document.getElementById("view-grid");
    const analyticsEl = document.getElementById("view-analytics");
    const mapPanel = document.getElementById("map-panel-container");

    // Reset view styles
    if (splitEl) splitEl.style.display = "none";
    if (gridEl) gridEl.style.display = "none";
    if (analyticsEl) analyticsEl.style.display = "none";

    // Update tab classes
    document.querySelectorAll(".view-tab").forEach((tab) => {
      tab.classList.toggle("active", tab.getAttribute("data-view") === viewName);
    });

    if (viewName === "split") {
      if (splitEl) {
        splitEl.style.display = "grid";
        splitEl.style.gridTemplateColumns = "1.15fr 0.85fr";
      }
      if (mapPanel) mapPanel.style.display = "flex";
      campusMap.resize();
    } else if (viewName === "map") {
      if (splitEl) {
        splitEl.style.display = "grid";
        splitEl.style.gridTemplateColumns = "1fr";
      }
      const catalogPanel = document.querySelector(".catalog-panel");
      if (catalogPanel) catalogPanel.style.display = "none";
      if (mapPanel) mapPanel.style.display = "flex";
      campusMap.resize();
    } else if (viewName === "grid") {
      if (gridEl) gridEl.style.display = "grid";
    } else if (viewName === "analytics") {
      if (analyticsEl) analyticsEl.style.display = "flex";
      campusCharts.updateAnalytics(this.trees);
    }

    if (viewName !== "map") {
      const catalogPanel = document.querySelector(".catalog-panel");
      if (catalogPanel) catalogPanel.style.display = "flex";
    }
  }

  // Open Add / Edit Tree Modal
  openTreeForm(treeToEdit = null) {
    const form = document.getElementById("form-tree");
    const modalTitle = document.getElementById("form-modal-title");
    const previewImg = document.getElementById("tree-image-preview");

    form.reset();
    this.currentImageBase64 = null;

    if (treeToEdit) {
      modalTitle.innerHTML = `<i class="fa-solid fa-pen-to-square"></i> <span>පැල තොරතුරු සංස්කරණය (Edit Tree)</span>`;
      document.getElementById("tree-edit-id").value = treeToEdit.id;
      document.getElementById("tree-common-name").value = treeToEdit.commonName || "";
      document.getElementById("tree-scientific-name").value = treeToEdit.scientificName || "";
      document.getElementById("tree-tag-id").value = treeToEdit.tagId || "";
      document.getElementById("tree-zone").value = treeToEdit.zone || "Botanical Garden";
      document.getElementById("tree-health-status").value = treeToEdit.healthStatus || "Healthy";
      document.getElementById("tree-category").value = treeToEdit.category || "";
      document.getElementById("tree-height").value = treeToEdit.height || "";
      document.getElementById("tree-dbh").value = treeToEdit.dbh || "";
      document.getElementById("tree-planted-date").value = treeToEdit.plantedDate || "";
      document.getElementById("tree-caretaker").value = treeToEdit.caretaker || "";
      document.getElementById("tree-lat").value = treeToEdit.lat || "";
      document.getElementById("tree-lng").value = treeToEdit.lng || "";
      document.getElementById("tree-watering").value = treeToEdit.wateringSchedule || "";
      document.getElementById("tree-notes").value = treeToEdit.notes || "";
      document.getElementById("tree-image-url-input").value = treeToEdit.imageUrl || "";

      if (previewImg) previewImg.src = treeToEdit.imageUrl || "https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=400&q=80";
      this.currentImageBase64 = treeToEdit.imageUrl;
    } else {
      modalTitle.innerHTML = `<i class="fa-solid fa-seedling"></i> <span>නව පැලයක් එක්කිරීම (Register Tree)</span>`;
      document.getElementById("tree-edit-id").value = "";
      this.generateAutoTag();
      
      // Default to Sabaragamuwa University campus center
      const center = campusMap.map ? campusMap.map.getCenter() : { lat: 6.7148, lng: 80.7872 };
      document.getElementById("tree-lat").value = center.lat.toFixed(6);
      document.getElementById("tree-lng").value = center.lng.toFixed(6);

      const defaultImg = "https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=400&q=80";
      if (previewImg) previewImg.src = defaultImg;
      document.getElementById("tree-image-url-input").value = "";
    }

    this.openModal("modal-tree-form");
  }

  // Auto Generate Tag ID based on selected SUSL faculty / zone
  generateAutoTag() {
    const zone = document.getElementById("tree-zone")?.value || "ECO";
    let prefix = "SUSL-ECO-";
    if (zone.includes("Agricultural")) prefix = "SUSL-AGR-";
    else if (zone.includes("Applied")) prefix = "SUSL-APP-";
    else if (zone.includes("Geomatics")) prefix = "SUSL-GEO-";
    else if (zone.includes("Technology")) prefix = "SUSL-TEC-";
    else if (zone.includes("Management")) prefix = "SUSL-MAN-";
    else if (zone.includes("Medicine")) prefix = "SUSL-MED-";
    else if (zone.includes("Computing")) prefix = "SUSL-COM-";
    else if (zone.includes("Social")) prefix = "SUSL-SOC-";
    else if (zone.includes("Trail") || zone.includes("Heritage")) prefix = "SUSL-ECO-";

    const num = Math.floor(100 + Math.random() * 900);
    const tagInput = document.getElementById("tree-tag-id");
    if (tagInput) tagInput.value = `${prefix}${num}`;
  }

  // Handle Form Submission (Add or Update)
  async handleFormSubmit(e) {
    e.preventDefault();

    const editId = document.getElementById("tree-edit-id").value;
    const commonName = document.getElementById("tree-common-name").value.trim();
    const scientificName = document.getElementById("tree-scientific-name").value.trim();
    const tagId = document.getElementById("tree-tag-id").value.trim();
    const zone = document.getElementById("tree-zone").value;
    const healthStatus = document.getElementById("tree-health-status").value;
    const category = document.getElementById("tree-category").value.trim();
    const height = parseFloat(document.getElementById("tree-height").value) || null;
    const dbh = parseFloat(document.getElementById("tree-dbh").value) || null;
    const plantedDate = document.getElementById("tree-planted-date").value;
    const caretaker = document.getElementById("tree-caretaker").value.trim();
    const lat = parseFloat(document.getElementById("tree-lat").value);
    const lng = parseFloat(document.getElementById("tree-lng").value);
    const wateringSchedule = document.getElementById("tree-watering").value.trim();
    const notes = document.getElementById("tree-notes").value.trim();
    const urlInput = document.getElementById("tree-image-url-input").value.trim();

    if (!commonName || !scientificName || !tagId || isNaN(lat) || isNaN(lng)) {
      this.showToast("කරුණාකර අනිවාර්ය තොරතුරු සහ GPS Coordinates ඇතුලත් කරන්න.", "error");
      return;
    }

    const imageUrl = this.currentImageBase64 || urlInput || "https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=600&q=80";

    const treePayload = {
      commonName,
      scientificName,
      tagId,
      zone,
      healthStatus,
      category,
      height,
      dbh,
      plantedDate,
      caretaker,
      lat,
      lng,
      wateringSchedule,
      notes,
      imageUrl,
      lastInspected: new Date().toISOString().slice(0, 10)
    };

    try {
      if (editId) {
        treePayload.id = editId;
        await treeDB.updateTree(treePayload);
        this.showToast(`"${commonName}" පැලයේ තොරතුරු සාර්ථකව යාවත්කාලීන විය!`, "success");
      } else {
        await treeDB.addTree(treePayload);
        this.showToast(`"${commonName}" සාර්ථකව පද්ධතියට එක් කරන ලදී!`, "success");
      }

      this.closeModal("modal-tree-form");
      campusMap.disablePicker();
      document.getElementById("map-picker-banner")?.classList.remove("active");
    } catch (err) {
      console.error("Save tree error:", err);
      this.showToast("සුරැකීමේදී දෝෂයක් සිදු විය: " + err.message, "error");
    }
  }

  // Open Full Details Profile Modal
  async openTreeDetails(id) {
    const tree = await treeDB.getTreeById(id);
    if (!tree) return;

    const modalBody = document.getElementById("details-modal-body");
    const modalFooter = document.getElementById("details-modal-footer");
    const statusClass = (tree.healthStatus || "healthy").toLowerCase().replace(/\s+/g, "-");
    const defaultImg = "https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=800&q=80";

    modalBody.innerHTML = `
      <div class="details-hero">
        <img src="${tree.imageUrl || defaultImg}" alt="${tree.commonName}" onerror="this.src='${defaultImg}'">
        <div class="details-hero-overlay">
          <span class="details-hero-tag">${tree.tagId || "TREE"}</span>
          <h2 class="details-hero-title">${tree.commonName}</h2>
          <span class="details-hero-sci">${tree.scientificName || ""}</span>
        </div>
      </div>

      <div class="details-specs-grid">
        <div class="details-spec-card">
          <span class="details-spec-label">සෞඛ්‍ය තත්වය (Health)</span>
          <div class="details-spec-val">
            <span class="badge-pill badge-${statusClass}">${tree.healthStatus || "Healthy"}</span>
          </div>
        </div>
        <div class="details-spec-card">
          <span class="details-spec-label">පීඨය / කලාපය (Zone)</span>
          <div class="details-spec-val" style="font-size: 1rem;"><i class="fa-solid fa-location-dot" style="color: var(--primary-600);"></i> ${tree.zone || "Campus"}</div>
        </div>
        <div class="details-spec-card">
          <span class="details-spec-label">කාබන් අවශෝෂණය (CO₂ Offset)</span>
          <div class="details-spec-val" style="color: var(--primary-600);"><i class="fa-solid fa-cloud-arrow-down"></i> ${tree.carbonOffsetKg || 0} kg</div>
        </div>
        <div class="details-spec-card">
          <span class="details-spec-label">උස (Height)</span>
          <div class="details-spec-val">${tree.height ? tree.height + " m" : "N/A"}</div>
        </div>
        <div class="details-spec-card">
          <span class="details-spec-label">කඳෙහි වටය (DBH)</span>
          <div class="details-spec-val">${tree.dbh ? tree.dbh + " cm" : "N/A"}</div>
        </div>
        <div class="details-spec-card">
          <span class="details-spec-label">පැල කළ දිනය (Planted)</span>
          <div class="details-spec-val" style="font-size: 0.95rem;">${tree.plantedDate || "Unknown"}</div>
        </div>
      </div>

      <div class="details-notes-box">
        <h4 style="font-size: 0.9rem; font-weight: 700; color: var(--primary-700); margin-bottom: 0.35rem;">
          <i class="fa-solid fa-circle-info"></i> පාරිසරික සහ සත්කාර සටහන් (Notes &amp; Care Details)
        </h4>
        <p style="font-size: 0.9rem; color: var(--text-main);">${tree.notes || "විශේෂ සටහන් ඇතුලත් කර නොමැත."}</p>
        <div style="margin-top: 0.75rem; font-size: 0.82rem; color: var(--text-muted); display: flex; gap: 1.5rem; flex-wrap: wrap;">
          <span><strong><i class="fa-solid fa-user"></i> Caretaker:</strong> ${tree.caretaker || "Campus General"}</span>
          <span><strong><i class="fa-solid fa-droplet"></i> Watering:</strong> ${tree.wateringSchedule || "Seasonal"}</span>
          <span><strong><i class="fa-solid fa-calendar-check"></i> Last Checked:</strong> ${tree.lastInspected || "Recent"}</span>
        </div>
      </div>

      <div style="font-size: 0.85rem; color: var(--text-muted); display: flex; align-items: center; justify-content: space-between; padding-top: 0.5rem;">
        <span>GPS: ${tree.lat?.toFixed(5)}, ${tree.lng?.toFixed(5)}</span>
        <a href="https://www.google.com/maps/search/?api=1&query=${tree.lat},${tree.lng}" target="_blank" style="font-weight: 600; display: inline-flex; align-items: center; gap: 0.4rem;">
          <i class="fa-solid fa-arrow-up-right-from-square"></i> Open Google Maps
        </a>
      </div>
    `;

    modalFooter.innerHTML = `
      <button type="button" class="btn btn-secondary" onclick="FloraApp.openQRBadge('${tree.id}')">
        <i class="fa-solid fa-qrcode"></i> QR Badge Print
      </button>
      <button type="button" class="btn btn-secondary" onclick="FloraApp.focusOnMap('${tree.lat}', '${tree.lng}'); FloraApp.closeModal('modal-tree-details');">
        <i class="fa-solid fa-map-pin"></i> View on Map
      </button>
      <button type="button" class="btn btn-secondary" onclick="FloraApp.editTreeFromDetails('${tree.id}')">
        <i class="fa-solid fa-pen-to-square"></i> Edit
      </button>
      <button type="button" class="btn btn-secondary" style="color: var(--accent-rose);" onclick="FloraApp.confirmDeleteTree('${tree.id}')">
        <i class="fa-solid fa-trash-can"></i> Delete
      </button>
    `;

    this.openModal("modal-tree-details");
  }

  // Edit Tree from Details Modal
  async editTreeFromDetails(id) {
    this.closeModal("modal-tree-details");
    const tree = await treeDB.getTreeById(id);
    if (tree) this.openTreeForm(tree);
  }

  // Confirm and Delete Tree
  async confirmDeleteTree(id) {
    const tree = await treeDB.getTreeById(id);
    if (!tree) return;

    if (confirm(`ඔබට "${tree.commonName}" පැලය පිළිබඳ තොරතුරු මැකීමට අවශ්‍ය බව සහතිකද? (Are you sure you want to delete this tree record?)`)) {
      await treeDB.deleteTree(id);
      this.closeModal("modal-tree-details");
      this.showToast("පැලයේ වාර්තාව සාර්ථකව ඉවත් කරන ලදී.", "success");
    }
  }

  // Open Printable QR Code Badge Modal
  async openQRBadge(id) {
    const tree = await treeDB.getTreeById(id);
    if (!tree) return;

    document.getElementById("badge-display-tag").textContent = tree.tagId || "CAMPUS-TREE";
    document.getElementById("badge-display-name").textContent = tree.commonName || "";
    document.getElementById("badge-display-sci").textContent = tree.scientificName || "";
    document.getElementById("badge-display-zone").innerHTML = `<i class="fa-solid fa-location-dot"></i> ${tree.zone || "Campus"}`;
    document.getElementById("badge-display-caretaker").innerHTML = `<i class="fa-solid fa-user-shield"></i> Caretaker: ${tree.caretaker || "Team Green"}`;

    const qrContainer = document.getElementById("badge-qr-render");
    qrContainer.innerHTML = "";

    // Generate QR payload linking to this tree or direct details
    const currentOrigin = window.location.origin + window.location.pathname;
    const qrData = `${currentOrigin}?treeId=${encodeURIComponent(tree.id)}`;

    if (typeof QRCode !== "undefined") {
      this.qrInstance = new QRCode(qrContainer, {
        text: qrData,
        width: 140,
        height: 140,
        colorDark: "#064e3b",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
      });
    } else {
      qrContainer.innerHTML = `<p style="font-size:0.8rem; color:red;">QRCode library loading error.</p>`;
    }

    this.openModal("modal-qr-badge");
  }

  // Trigger browser print for badge
  printQRBadge() {
    window.print();
  }

  // Pin Dropper Mode on Map
  activateMapPicker() {
    this.closeModal("modal-tree-form");
    this.switchView("split");

    const banner = document.getElementById("map-picker-banner");
    if (banner) banner.classList.add("active");

    const currentLat = parseFloat(document.getElementById("tree-lat").value);
    const currentLng = parseFloat(document.getElementById("tree-lng").value);

    campusMap.enablePicker(currentLat, currentLng);
    this.showToast("Map එක මත ඔබගේ පැලය පිහිටි ස්ථානය Click කරන්න හෝ Pin එක Drag කරන්න.", "success");
  }

  finishMapPicker() {
    campusMap.disablePicker();
    const banner = document.getElementById("map-picker-banner");
    if (banner) banner.classList.remove("active");
    this.openModal("modal-tree-form");
  }

  // Camera Snapshot Handling
  async openCameraModal() {
    const video = document.getElementById("camera-video-stream");
    try {
      this.cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false
      });
      if (video) video.srcObject = this.cameraStream;
      this.openModal("modal-camera");
    } catch (err) {
      alert("Unable to access camera: " + err.message + "\nකරුණාකර කැමරා අවසරය ලබා දෙන්න හෝ File Upload භාවිතා කරන්න.");
    }
  }

  closeCameraModal() {
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach((t) => t.stop());
      this.cameraStream = null;
    }
    this.closeModal("modal-camera");
  }

  captureCameraSnapshot() {
    const video = document.getElementById("camera-video-stream");
    const canvas = document.getElementById("camera-canvas");
    if (!video || !canvas) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    this.currentImageBase64 = dataUrl;

    const previewImg = document.getElementById("tree-image-preview");
    if (previewImg) previewImg.src = dataUrl;

    this.closeCameraModal();
    this.showToast("ඡායාරූපය සාර්ථකව ලබා ගන්නා ලදී!", "success");
  }

  // File Upload to DataURL (IndexedDB compatible)
  handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("කරුණාකර ඡායාරූපයක් (Image file) තෝරන්න.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      this.currentImageBase64 = event.target.result;
      const previewImg = document.getElementById("tree-image-preview");
      if (previewImg) previewImg.src = event.target.result;
      this.showToast("පැලයේ ඡායාරූපය සාර්ථකව එක් විය!", "success");
    };
    reader.readAsDataURL(file);
  }

  // Toast Notification
  showToast(message, type = "success") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    const icon = type === "error" ? "fa-circle-exclamation" : "fa-circle-check";

    toast.innerHTML = `
      <i class="fa-solid ${icon} toast-icon"></i>
      <span class="toast-text">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(120%)";
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // Modal helpers
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add("active");
      document.body.style.overflow = "hidden";
      // Prevent iOS body scroll-through: lock touch events on the overlay itself
      // (but allow scrolling inside .modal-body)
      modal.addEventListener("touchmove", this._preventOverlayScroll, { passive: false });
    }
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove("active");
      modal.removeEventListener("touchmove", this._preventOverlayScroll);
      // Only restore body scroll if no other modals are active
      const anyActive = document.querySelector(".modal-overlay.active");
      if (!anyActive) {
        document.body.style.overflow = "";
      }
    }
  }

  // Prevent touch-scroll from leaking to body when touching outside .modal-body
  _preventOverlayScroll(e) {
    const modalBody = e.currentTarget.querySelector(".modal-body");
    if (modalBody && modalBody.contains(e.target)) {
      // Allow scroll inside modal-body - don't prevent
      return;
    }
    e.preventDefault();
  }

  // Theme Toggler
  applyTheme(theme) {
    this.currentTheme = theme;
    localStorage.setItem("flora_theme", theme);
    const themeIcon = document.getElementById("theme-icon");

    if (theme === "dark") {
      document.body.classList.add("dark-theme");
      if (themeIcon) {
        themeIcon.classList.remove("fa-moon");
        themeIcon.classList.add("fa-sun");
      }
    } else {
      document.body.classList.remove("dark-theme");
      if (themeIcon) {
        themeIcon.classList.remove("fa-sun");
        themeIcon.classList.add("fa-moon");
      }
    }

    campusCharts.refreshTheme(this.trees);
  }

  toggleTheme() {
    const nextTheme = this.currentTheme === "dark" ? "light" : "dark";
    this.applyTheme(nextTheme);
  }

  // Setup DOM Event Listeners
  initEventListeners() {
    // Search input
    document.getElementById("global-search-input")?.addEventListener("input", () => this.applyFilters());

    // Filters
    document.getElementById("filter-zone")?.addEventListener("change", () => this.applyFilters());
    document.getElementById("filter-health")?.addEventListener("change", () => this.applyFilters());
    document.getElementById("filter-sort")?.addEventListener("change", () => this.applyFilters());

    // View Switch Tabs
    document.querySelectorAll(".view-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        const view = tab.getAttribute("data-view");
        this.switchView(view);
      });
    });

    // Language Switcher Buttons (Sinhala, English, Tamil)
    document.querySelectorAll(".lang-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const lang = btn.getAttribute("data-lang");
        this.setLanguage(lang, true);
      });
    });

    // Theme Switcher
    document.getElementById("btn-toggle-theme")?.addEventListener("click", () => this.toggleTheme());

    // Add Tree Modal Buttons (Header and Hero)
    document.getElementById("btn-open-add-tree")?.addEventListener("click", () => this.openTreeForm());
    document.getElementById("btn-hero-add-tree")?.addEventListener("click", () => this.openTreeForm());

    // Nav Links Active State update on scroll
    const sections = document.querySelectorAll("section[id]");
    const navLinks = document.querySelectorAll(".nav-link");

    window.addEventListener("scroll", () => {
      let currentSection = "home-section";
      const scrollY = window.pageYOffset;

      sections.forEach((section) => {
        const sectionHeight = section.offsetHeight;
        const sectionTop = section.offsetTop - 120;
        if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
          currentSection = section.getAttribute("id");
        }
      });

      navLinks.forEach((link) => {
        link.classList.toggle("active", link.getAttribute("href") === `#${currentSection}`);
      });
    });

    // Auto Tag Generator Button in Form
    document.getElementById("btn-generate-tag")?.addEventListener("click", () => this.generateAutoTag());

    // Tree Zone change auto adjusts tag
    document.getElementById("tree-zone")?.addEventListener("change", () => this.generateAutoTag());

    // Location Dropper helper in Form
    document.getElementById("btn-pick-on-map")?.addEventListener("click", () => this.activateMapPicker());
    document.getElementById("btn-cancel-picker")?.addEventListener("click", () => this.finishMapPicker());

    // Current GPS in Form
    document.getElementById("btn-gps-current")?.addEventListener("click", () => {
      campusMap.locateUser();
      this.showToast("GPS දත්ත ලබා ගනිමින් පවතී...", "success");
    });

    // Image Upload trigger
    document.getElementById("btn-trigger-upload")?.addEventListener("click", () => {
      document.getElementById("tree-image-file-input")?.click();
    });
    document.getElementById("tree-image-file-input")?.addEventListener("change", (e) => this.handleFileUpload(e));

    // Live URL preview
    document.getElementById("tree-image-url-input")?.addEventListener("input", (e) => {
      const val = e.target.value.trim();
      const previewImg = document.getElementById("tree-image-preview");
      if (val && previewImg) previewImg.src = val;
    });

    // Camera buttons
    document.getElementById("btn-open-camera")?.addEventListener("click", () => this.openCameraModal());
    document.getElementById("btn-close-camera")?.addEventListener("click", () => this.closeCameraModal());
    document.getElementById("btn-cancel-camera")?.addEventListener("click", () => this.closeCameraModal());
    document.getElementById("btn-capture-camera")?.addEventListener("click", () => this.captureCameraSnapshot());

    // Form submit
    document.getElementById("form-tree")?.addEventListener("submit", (e) => this.handleFormSubmit(e));

    // Print Badge Button
    document.getElementById("btn-print-badge")?.addEventListener("click", () => this.printQRBadge());

    // Data Dropdown
    const dropdownWrapper = document.getElementById("data-dropdown-wrapper");
    document.getElementById("btn-data-options")?.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdownWrapper?.classList.toggle("open");
    });

    document.addEventListener("click", () => {
      dropdownWrapper?.classList.remove("open");
    });

    // Data Export JSON
    document.getElementById("action-export-json")?.addEventListener("click", async () => {
      await treeDB.exportJSON();
      this.showToast("JSON දත්ත සාර්ථකව බාගත විය (Exported JSON)!", "success");
    });

    // Data Export CSV
    document.getElementById("action-export-csv")?.addEventListener("click", async () => {
      await treeDB.exportCSV();
      this.showToast("Excel/CSV දත්ත සාර්ථකව බාගත විය (Exported CSV)!", "success");
    });

    // Data Import JSON
    const importInput = document.getElementById("import-json-file-input");
    document.getElementById("action-import-json-btn")?.addEventListener("click", () => {
      importInput?.click();
    });

    importInput?.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (file) {
        try {
          const count = await treeDB.importJSON(file);
          this.showToast(`${count} trees සාර්ථකව Import කරන ලදී!`, "success");
        } catch (err) {
          alert("Import Failed: " + err.message);
        }
      }
    });

    // Restore Demo Trees
    document.getElementById("action-reset-sample")?.addEventListener("click", async () => {
      if (confirm("පද්ධතිය නැවත පෙරනිමි Campus Demo Trees වලට Restore කිරීමට අවශ්‍යද?")) {
        await treeDB.resetToSample();
        this.showToast("පෙරනිමි Demo Trees සාර්ථකව ප්‍රතිස්ථාපනය විය!", "success");
      }
    });

    // Generic Modal Close Buttons
    document.querySelectorAll("[data-close-modal]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const targetModalId = btn.getAttribute("data-close-modal");
        this.closeModal(targetModalId);
      });
    });

    // Close modal when clicking overlay outside card
    document.querySelectorAll(".modal-overlay").forEach((overlay) => {
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
          overlay.classList.remove("active");
        }
      });
    });
  }
}

// Global FloraApp instance
document.addEventListener("DOMContentLoaded", () => {
  window.FloraApp = new FloraCampusApp();
});
