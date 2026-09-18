// email.js - EmailJS Email Notification Module for DIGITAL ECO MANAYA
// Sends automatic confirmation emails to contributors when they submit tree data.
//
// ════════════════════════════════════════════════════════════
//  SETUP INSTRUCTIONS (One-time):
//  1. Go to https://www.emailjs.com/ → Create free account
//  2. Add an Email Service (Gmail recommended) → note SERVICE_ID
//  3. Create an Email Template with these variables:
//       {{to_name}}       - Recipient name
//       {{to_email}}      - Recipient email
//       {{tree_name}}     - Common name of tree
//       {{tree_sci}}      - Scientific name
//       {{tree_tag}}      - Tag ID (e.g. SUSL-ECO-101)
//       {{tree_zone}}     - Faculty / Zone
//       {{tree_health}}   - Health status
//       {{submitted_at}}  - Submission timestamp
//     → note TEMPLATE_ID
//  4. Go to Account → Public Key → note PUBLIC_KEY
//  5. Replace the 3 placeholder values below with your real IDs
// ════════════════════════════════════════════════════════════

const EMAILJS_CONFIG = {
  SERVICE_ID:  "YOUR_SERVICE_ID",   // e.g. "service_abc123"
  TEMPLATE_ID: "YOUR_TEMPLATE_ID",  // e.g. "template_xyz789"
  PUBLIC_KEY:  "YOUR_PUBLIC_KEY",   // e.g. "abcDEF123..."
};

class EmailNotifier {
  constructor() {
    this._initialized = false;
  }

  /** Initialize EmailJS SDK — call once after SDK is loaded */
  init() {
    if (typeof emailjs === "undefined") {
      console.warn("EmailJS SDK not loaded. Email notifications disabled.");
      return;
    }
    if (EMAILJS_CONFIG.PUBLIC_KEY === "YOUR_PUBLIC_KEY") {
      console.warn("EmailJS not configured. Skipping email init.");
      return;
    }
    emailjs.init({ publicKey: EMAILJS_CONFIG.PUBLIC_KEY });
    this._initialized = true;
    console.log("✉️ EmailJS initialized successfully.");
  }

  /**
   * Send submission confirmation email to the contributor.
   * @param {string} userEmail   - Recipient email address
   * @param {string} userName    - Recipient display name
   * @param {Object} treeData    - Tree record that was submitted
   */
  async sendSubmissionConfirmation(userEmail, userName, treeData) {
    if (!this._initialized) {
      console.warn("EmailJS not initialized — skipping email send.");
      return { ok: false, reason: "not_initialized" };
    }

    const submittedAt = new Date().toLocaleString("si-LK", {
      year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit"
    });

    const templateParams = {
      to_name:      userName || "Contributor",
      to_email:     userEmail,
      tree_name:    treeData.commonName    || "N/A",
      tree_sci:     treeData.scientificName || "N/A",
      tree_tag:     treeData.tagId          || "N/A",
      tree_zone:    treeData.zone           || "N/A",
      tree_health:  treeData.healthStatus   || "N/A",
      tree_height:  treeData.height ? `${treeData.height} m` : "N/A",
      tree_dbh:     treeData.dbh    ? `${treeData.dbh} cm`  : "N/A",
      submitted_at: submittedAt,
    };

    try {
      const response = await emailjs.send(
        EMAILJS_CONFIG.SERVICE_ID,
        EMAILJS_CONFIG.TEMPLATE_ID,
        templateParams
      );
      console.log("✉️ Confirmation email sent →", userEmail, response.status);
      return { ok: true, status: response.status };
    } catch (err) {
      console.error("EmailJS send error:", err);
      return { ok: false, reason: err.text || err.message };
    }
  }

  /** Check if EmailJS is configured and ready */
  isReady() {
    return this._initialized;
  }
}

// Global singleton
const emailNotifier = new EmailNotifier();
