// auth.js - Firebase Authentication Manager for DIGITAL ECO MANAYA
// Handles: User login, registration, logout, admin detection, auth state

class AuthManager {
  constructor() {
    // Initialize Firebase Auth
    if (!firebase.apps.length) {
      // Firebase already initialized in db.js — just get the auth instance
    }
    this.auth = firebase.auth();
    this.db   = firebase.database();
    this.currentUser = null;
    this._isAdmin = false;
    this._observers = [];

    // Monitor auth state changes
    this.auth.onAuthStateChanged(async (user) => {
      this.currentUser = user;
      if (user) {
        this._isAdmin = await this._checkAdminStatus(user);
      } else {
        this._isAdmin = false;
      }
      this._notifyObservers(user);
    });
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /** Register new user with email + password + display name */
  async register(email, password, displayName) {
    const credential = await this.auth.createUserWithEmailAndPassword(email, password);
    await credential.user.updateProfile({ displayName });
    const cleanEmail = email.toLowerCase().trim();
    const encKey = cleanEmail.replace(/\./g, ",");

    // Check if user was pre-assigned as admin
    let role = "contributor";
    if (cleanEmail === "lovindumadushanka03@gmail.com") {
      role = "admin";
    } else {
      try {
        const adminEmailSnap = await this.db.ref(`admin_emails/${encKey}`).once("value");
        if (adminEmailSnap.exists()) role = "admin";
      } catch (e) {
        console.warn("Could not check admin_emails:", e);
      }
    }

    // Save basic profile to DB
    await this.db.ref(`users/${credential.user.uid}`).set({
      email,
      displayName,
      createdAt: new Date().toISOString(),
      role: role
    });

    if (role === "admin") {
      await this.db.ref(`admins/${credential.user.uid}`).set({
        email: cleanEmail,
        name: displayName || cleanEmail.split("@")[0],
        role: "admin",
        addedAt: new Date().toISOString(),
        addedBy: "System Registration"
      });
    }

    return credential.user;
  }

  /** Login with email + password */
  async login(email, password) {
    const credential = await this.auth.signInWithEmailAndPassword(email, password);
    return credential.user;
  }

  /** Logout */
  async logout() {
    await this.auth.signOut();
  }

  /** Current logged in user */
  getUser() {
    return this.currentUser || this.auth.currentUser;
  }

  /** Current logged in user (alias) */
  getCurrentUser() {
    return this.currentUser || this.auth.currentUser;
  }

  /** Check if current user is admin */
  isAdmin() {
    return this._isAdmin;
  }

  /** Returns true if any user is logged in */
  isLoggedIn() {
    return !!(this.currentUser || this.auth.currentUser);
  }

  /** Subscribe to auth state changes: cb(user) */
  onAuthStateChanged(cb) {
    this._observers.push(cb);
    // Immediately call with current state
    cb(this.currentUser);
    return () => {
      this._observers = this._observers.filter(o => o !== cb);
    };
  }

  // ── Private Helpers ─────────────────────────────────────────────────────────

  async _checkAdminStatus(user) {
    if (!user) return false;
    const email = (user.email || "").toLowerCase().trim();
    if (email === "lovindumadushanka03@gmail.com") return true;

    // Check admins/${uid}
    try {
      const snap = await this.db.ref(`admins/${user.uid}`).once("value");
      const val = snap.val();
      if (snap.exists() && (val === true || val === "true" || val === 1 || (typeof val === "object" && val !== null))) {
        return true;
      }
    } catch {
      // Continue to next check
    }

    // Check admin_emails
    if (email) {
      try {
        const encKey = email.replace(/\./g, ",");
        const snap = await this.db.ref(`admin_emails/${encKey}`).once("value");
        if (snap.exists()) return true;
      } catch {
        // Continue
      }
    }

    // Check users/${uid}/role
    try {
      const snap = await this.db.ref(`users/${user.uid}/role`).once("value");
      if (snap.val() === "admin") return true;
    } catch {
      // Return false
    }

    return false;
  }

  _notifyObservers(user) {
    this._observers.forEach(cb => {
      try { cb(user); } catch (e) { console.warn("Auth observer error", e); }
    });
  }

  // ── Auth Error Messages (Sinhala) ───────────────────────────────────────────

  getFriendlyError(errorCode) {
    const messages = {
      "auth/user-not-found":       "මෙම email address ලියාපදිංචි නොවේ.",
      "auth/wrong-password":       "මුරපදය වැරදිය. නැවත උත්සාහ කරන්න.",
      "auth/email-already-in-use": "මෙම email address දැනටමත් භාවිතා වෙමින් ඇත.",
      "auth/weak-password":        "මුරපදය ශක්තිමත් නොවේ. අඩුම අකුරු 6ක් භාවිතා කරන්න.",
      "auth/invalid-email":        "Email address ආකෘතිය වැරදිය.",
      "auth/too-many-requests":    "Login උත්සාහයන් ඉතා වැඩිය. ටිකක් රැඳෙන්න.",
      "auth/network-request-failed": "Internet සම්බන්ධතාවය පරීක්ෂා කරන්න.",
      "auth/invalid-credential":   "Email හෝ මුරපදය වැරදිය.",
    };
    return messages[errorCode] || "දෝෂයක් ඇත. නැවත උත්සාහ කරන්න. (" + errorCode + ")";
  }
}

// Global singleton
const authManager = new AuthManager();
