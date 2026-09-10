// db.js - IndexedDB Persistent Storage & Data Management Engine for DIGITAL ECO MANAYA

const DB_NAME = "DigitalEcoManayaDB_v2";
const DB_VERSION = 1;
const STORE_NAME = "trees";

class TreeDatabase {
  constructor() {
    this.db = null;
    this.initPromise = this.init();
  }

  // Initialize IndexedDB with versioning
  init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
          store.createIndex("tagId", "tagId", { unique: true });
          store.createIndex("zone", "zone", { unique: false });
          store.createIndex("healthStatus", "healthStatus", { unique: false });
          store.createIndex("commonName", "commonName", { unique: false });
        }
      };

      request.onsuccess = async (event) => {
        this.db = event.target.result;
        // Check if database is empty; if so, populate with default INITIAL_CAMPUS_TREES
        const count = await this.countTrees();
        if (count === 0 && typeof INITIAL_CAMPUS_TREES !== "undefined") {
          await this.bulkInsert(INITIAL_CAMPUS_TREES);
        }
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error("IndexedDB error:", event.target.error);
        reject(event.target.error);
      };
    });
  }

  async ensureDB() {
    if (!this.db) {
      await this.initPromise;
    }
    return this.db;
  }

  // Count total trees
  async countTrees() {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  // Get all trees
  async getAllTrees() {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  // Get single tree by ID
  async getTreeById(id) {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  // Add new tree
  async addTree(treeData) {
    const db = await this.ensureDB();
    if (!treeData.id) {
      treeData.id = "tree-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5);
    }
    if (!treeData.createdAt) {
      treeData.createdAt = new Date().toISOString();
    }
    if (!treeData.carbonOffsetKg) {
      treeData.carbonOffsetKg = this.estimateCarbon(treeData.height, treeData.dbh);
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.add(treeData);
      req.onsuccess = () => {
        window.dispatchEvent(new CustomEvent("flora:data-changed", { detail: { action: "add", tree: treeData } }));
        resolve(treeData);
      };
      req.onerror = () => reject(req.error);
    });
  }

  // Update existing tree
  async updateTree(treeData) {
    const db = await this.ensureDB();
    if (!treeData.carbonOffsetKg) {
      treeData.carbonOffsetKg = this.estimateCarbon(treeData.height, treeData.dbh);
    }
    treeData.updatedAt = new Date().toISOString();

    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(treeData);
      req.onsuccess = () => {
        window.dispatchEvent(new CustomEvent("flora:data-changed", { detail: { action: "update", tree: treeData } }));
        resolve(treeData);
      };
      req.onerror = () => reject(req.error);
    });
  }

  // Delete tree by ID
  async deleteTree(id) {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => {
        window.dispatchEvent(new CustomEvent("flora:data-changed", { detail: { action: "delete", id } }));
        resolve(true);
      };
      req.onerror = () => reject(req.error);
    });
  }

  // Bulk insert array of trees
  async bulkInsert(trees) {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], "readwrite");
      const store = tx.objectStore(STORE_NAME);
      trees.forEach((t) => store.put(t));
      tx.oncomplete = () => {
        window.dispatchEvent(new CustomEvent("flora:data-changed", { detail: { action: "bulk" } }));
        resolve(true);
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  // Reset database back to default sample records
  async resetToSample() {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const clearReq = store.clear();
      clearReq.onsuccess = () => {
        if (typeof INITIAL_CAMPUS_TREES !== "undefined") {
          INITIAL_CAMPUS_TREES.forEach((t) => store.add(t));
        }
      };
      tx.oncomplete = () => {
        window.dispatchEvent(new CustomEvent("flora:data-changed", { detail: { action: "reset" } }));
        resolve(true);
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  // Carbon absorption estimation formula based on forestry allometrics
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
      "Tag ID",
      "Common Name",
      "Scientific Name",
      "Faculty / Zone",
      "Health Status",
      "Height (m)",
      "Trunk DBH (cm)",
      "Planted Date",
      "Caretaker",
      "Latitude",
      "Longitude",
      "Watering Schedule",
      "Carbon Offset (kg)",
      "Notes"
    ];

    const rows = trees.map((t) => [
      `"${t.tagId || ""}"`,
      `"${(t.commonName || "").replace(/"/g, '""')}"`,
      `"${(t.scientificName || "").replace(/"/g, '""')}"`,
      `"${(t.zone || "").replace(/"/g, '""')}"`,
      `"${t.healthStatus || ""}"`,
      t.height || "",
      t.dbh || "",
      `"${t.plantedDate || ""}"`,
      `"${(t.caretaker || "").replace(/"/g, '""')}"`,
      t.lat || "",
      t.lng || "",
      `"${(t.wateringSchedule || "").replace(/"/g, '""')}"`,
      t.carbonOffsetKg || "",
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
