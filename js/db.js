// db.js - Firebase Realtime Database Engine for DIGITAL ECO MANAYA

class TreeDatabase {
  constructor() {
    this.firebaseConfig = {
      apiKey: "AIzaSyB5Yj8ofZISYI-hWezwRcIN34ALBnCrsiE",
      authDomain: "digital-eco-manaya.firebaseapp.com",
      databaseURL: "https://digital-eco-manaya-default-rtdb.firebaseio.com",
      projectId: "digital-eco-manaya",
      storageBucket: "digital-eco-manaya.firebasestorage.app",
      messagingSenderId: "652892678519",
      appId: "1:652892678519:web:828ee44a97b0a4a9bad972"
    };

    // Initialize Firebase
    if (!firebase.apps.length) {
      firebase.initializeApp(this.firebaseConfig);
    }
    this.db = firebase.database();
    this.treesRef = this.db.ref('trees');

    this.cachedTrees = [];
    this.isFirstLoad = true;
    this.initPromise = this.initListener();
  }

  initListener() {
    return new Promise((resolve) => {
      this.treesRef.on('value', (snapshot) => {
        const data = snapshot.val();
        this.cachedTrees = [];
        
        if (data) {
          Object.keys(data).forEach(key => {
            this.cachedTrees.push(data[key]);
          });
        } else if (this.isFirstLoad && typeof INITIAL_CAMPUS_TREES !== "undefined") {
          // Auto-seed database if completely empty
          this.bulkInsert(INITIAL_CAMPUS_TREES);
        }
        
        this.isFirstLoad = false;
        
        // Broadcast change event to refresh UI on ALL devices instantly
        window.dispatchEvent(new CustomEvent("flora:data-changed", { detail: { action: "sync", count: this.cachedTrees.length } }));
        resolve(this.cachedTrees);
      });
    });
  }

  // Get all trees
  async getAllTrees() {
    await this.initPromise;
    return this.cachedTrees;
  }

  // Get single tree by ID
  async getTreeById(id) {
    await this.initPromise;
    return this.cachedTrees.find(t => t.id === id) || null;
  }

  // Add new tree
  async addTree(treeData) {
    if (!treeData.id) {
      treeData.id = "tree-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5);
    }
    if (!treeData.createdAt) {
      treeData.createdAt = new Date().toISOString();
    }
    if (!treeData.carbonOffsetKg) {
      treeData.carbonOffsetKg = this.estimateCarbon(treeData.height, treeData.dbh);
    }

    // Set to Firebase (this will automatically trigger onValue and update UI)
    await this.treesRef.child(treeData.id).set(treeData);
    return treeData;
  }

  // Update existing tree
  async updateTree(treeData) {
    if (!treeData.carbonOffsetKg) {
      treeData.carbonOffsetKg = this.estimateCarbon(treeData.height, treeData.dbh);
    }
    treeData.updatedAt = new Date().toISOString();

    await this.treesRef.child(treeData.id).set(treeData);
    return treeData;
  }

  // Delete tree by ID
  async deleteTree(id) {
    await this.treesRef.child(id).remove();
    return true;
  }

  // Bulk insert array of trees
  async bulkInsert(trees) {
    const updates = {};
    trees.forEach((t) => {
      if (!t.id) t.id = "tree-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5);
      updates[t.id] = t;
    });
    await this.treesRef.update(updates);
    return true;
  }

  // Reset database back to default sample records
  async resetToSample() {
    await this.treesRef.remove();
    if (typeof INITIAL_CAMPUS_TREES !== "undefined") {
      await this.bulkInsert(INITIAL_CAMPUS_TREES);
    }
    return true;
  }

  // Carbon absorption estimation formula
  estimateCarbon(heightM = 5, dbhCm = 25) {
    const h = parseFloat(heightM) || 5;
    const d = parseFloat(dbhCm) || 20;
    const biomass = 0.0673 * Math.pow(Math.pow(d, 2) * h, 0.976);
    const carbonKg = (biomass * 0.5 * 3.67) / 2.5;
    return Math.max(10, Math.round(carbonKg * 10) / 10);
  }

  // Export as JSON file download
  async exportJSON() {
    const trees = await this.getAllTrees();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(trees, null, 2));
    const dlAnchor = document.createElement("a");
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `digital_eco_manaya_susl_trees_${new Date().toISOString().slice(0, 10)}.json`);
    dlAnchor.click();
  }

  // Export as CSV (Excel compatible)
  async exportCSV() {
    const trees = await this.getAllTrees();
    if (!trees.length) return;

    const headers = [
      "Tag ID", "Common Name", "Scientific Name", "Faculty / Zone", "Health Status",
      "Height (m)", "Trunk DBH (cm)", "Planted Date", "Caretaker", "Latitude", "Longitude",
      "Watering Schedule", "Carbon Offset (kg)", "Notes"
    ];

    const rows = trees.map((t) => [
      `"${t.tagId || ""}"`, `"${(t.commonName || "").replace(/"/g, '""')}"`,
      `"${(t.scientificName || "").replace(/"/g, '""')}"`, `"${(t.zone || "").replace(/"/g, '""')}"`,
      `"${t.healthStatus || ""}"`, t.height || "", t.dbh || "", `"${t.plantedDate || ""}"`,
      `"${(t.caretaker || "").replace(/"/g, '""')}"`, t.lat || "", t.lng || "",
      `"${(t.wateringSchedule || "").replace(/"/g, '""')}"`, t.carbonOffsetKg || "",
      `"${(t.notes || "").replace(/"/g, '""')}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `digital_eco_manaya_susl_inventory_${new Date().toISOString().slice(0, 10)}.csv`);
    link.click();
    URL.revokeObjectURL(url);
  }

  // Import from JSON file
  async importJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const trees = JSON.parse(e.target.result);
          if (Array.isArray(trees)) {
            await this.bulkInsert(trees);
            resolve(trees.length);
          } else {
            reject(new Error("Invalid JSON format: Array expected."));
          }
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }
}

// Global treeDB instance
const treeDB = new TreeDatabase();
