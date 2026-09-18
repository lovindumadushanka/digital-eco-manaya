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
  SERVICE_ID:  "service_owg8uh9",
  TEMPLATE_ID: "template_77ctc9g",
  PUBLIC_KEY:  "NzG3WPXgs3MIJkw6L",
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
    try {
      if (typeof emailjs.init === "function") {
        emailjs.init({ publicKey: EMAILJS_CONFIG.PUBLIC_KEY });
      }
      this._initialized = true;
      console.log("✉️ EmailJS initialized successfully with Service ID:", EMAILJS_CONFIG.SERVICE_ID);
    } catch (e) {
      console.warn("EmailJS init exception, fallback to direct send:", e);
      this._initialized = true;
    }
  }

  /**
   * Send submission confirmation email to the contributor.
   * @param {string} userEmail   - Recipient email address
   * @param {string} userName    - Recipient display name
   * @param {Object} treeData    - Tree record that was submitted
   * @param {string} [lecturerEmail] - Optional lecturer email to CC
   */
  async sendSubmissionConfirmation(userEmail, userName, treeData, lecturerEmail) {
    if (!this._initialized && typeof emailjs === "undefined") {
      console.warn("EmailJS not available — skipping email send.");
      return { ok: false, reason: "not_available" };
    }

    const submittedAt = new Date().toLocaleString("en-LK", {
      year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit"
    });

    const templateParams = {
      to_email:     userEmail,
      email:        userEmail,
      user_email:   userEmail,
      to:           userEmail,
      recipient:    userEmail,
      reply_to:     "lovindumadushanka03@gmail.com",
      to_name:      userName || userEmail.split("@")[0] || "Contributor",
      name:         userName || userEmail.split("@")[0],
      user_name:    userName || userEmail.split("@")[0],
      tree_name:    treeData.commonName    || "N/A",
      tree_sci:     treeData.scientificName || "N/A",
      tree_tag:     treeData.tagId          || "N/A",
      tree_zone:    treeData.zone           || "N/A",
      tree_health:  treeData.healthStatus   || "N/A",
      tree_height:  treeData.height ? `${treeData.height} m` : "N/A",
      tree_dbh:     treeData.dbh    ? `${treeData.dbh} cm`  : "N/A",
      submitted_at: submittedAt,
      message:      `Tree submission received for ${treeData.commonName} (${treeData.tagId}).`
    };

    try {
      console.log("✉️ Sending confirmation email to:", userEmail, "via EmailJS...");
      const response = await emailjs.send(
        EMAILJS_CONFIG.SERVICE_ID,
        EMAILJS_CONFIG.TEMPLATE_ID,
        templateParams,
        EMAILJS_CONFIG.PUBLIC_KEY
      );
      console.log("✉️ Confirmation email sent successfully! Status:", response.status, response.text);

      if (lecturerEmail) {
        console.log("✉️ Sending CC confirmation email to lecturer:", lecturerEmail);
        const lecturerParams = { ...templateParams, to_email: lecturerEmail, to_name: "Lecturer/Supervisor" };
        await emailjs.send(
          EMAILJS_CONFIG.SERVICE_ID,
          EMAILJS_CONFIG.TEMPLATE_ID,
          lecturerParams,
          EMAILJS_CONFIG.PUBLIC_KEY
        );
      }
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
