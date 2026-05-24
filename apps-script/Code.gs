/**
 * Forever Forward — Web App backend
 *
 * Handles:
 *   1) Public speaking-inquiry form (emails Jacob + logs to Inquiries sheet)
 *   2) Admin dashboard at /admin.html (password-gated)
 *
 * Script Properties required (Project Settings → Script properties):
 *   - ADMIN_PASSWORD  — the password Jacob enters at /admin.html
 *   - SHEET_ID        — the ID portion of the Google Sheet URL
 *                       (between /d/ and /edit). Sheet should be created
 *                       once; this script will auto-create the tabs
 *                       "Clients", "Sessions", "Inquiries" on first use.
 *
 * After editing this file, click Deploy → Manage deployments → pencil icon
 * → "Version: New version" → Deploy. The /exec URL stays the same.
 */

const PROPS = PropertiesService.getScriptProperties();
const NOTIFY_EMAIL = "jacob@foreverforwardcoaching.com";

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action || "speakingInquiry";

    // Public action — no auth
    if (action === "speakingInquiry") {
      return handleSpeakingInquiry(data);
    }

    // Everything else is admin-only
    if (!verifyAuth(data.token)) {
      return json({ success: false, error: "unauthorized" });
    }

    switch (action) {
      case "addClient": return handleAddClient(data);
      case "logSession": return handleLogSession(data);
      case "deleteClient": return handleDeleteClient(data);
      case "deleteSession": return handleDeleteSession(data);
      default: return json({ success: false, error: "unknown action" });
    }
  } catch (err) {
    return json({ success: false, error: String(err) });
  }
}

function doGet(e) {
  try {
    const action = e.parameter.action;
    if (!verifyAuth(e.parameter.token)) {
      return json({ success: false, error: "unauthorized" });
    }

    switch (action) {
      case "clients": return json({ success: true, clients: getClients() });
      case "inquiries": return json({ success: true, inquiries: getInquiries() });
      case "ping": return json({ success: true });
      default: return json({ success: false, error: "unknown action" });
    }
  } catch (err) {
    return json({ success: false, error: String(err) });
  }
}

function verifyAuth(token) {
  const stored = PROPS.getProperty("ADMIN_PASSWORD");
  return Boolean(token) && Boolean(stored) && String(token) === String(stored);
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet(tabName) {
  const sheetId = PROPS.getProperty("SHEET_ID");
  if (!sheetId) throw new Error("SHEET_ID script property is not set");
  const ss = SpreadsheetApp.openById(sheetId);
  let tab = ss.getSheetByName(tabName);
  if (!tab) {
    tab = ss.insertSheet(tabName);
    if (tabName === "Clients") {
      tab.appendRow(["id", "name", "email", "package", "sessionsPaid", "createdAt", "notes"]);
    } else if (tabName === "Sessions") {
      tab.appendRow(["id", "clientId", "date", "notes"]);
    } else if (tabName === "Inquiries") {
      tab.appendRow(["date", "name", "organization", "email", "details"]);
    }
  }
  return tab;
}

function handleSpeakingInquiry(data) {
  const name = data.name || "Unknown";
  const org = data.organization || "—";
  const email = data.email || "—";
  const details = data.details || "—";

  try {
    const sheet = getSheet("Inquiries");
    sheet.appendRow([new Date().toISOString(), name, org, email, details]);
  } catch (e) {
    // Continue even if sheet write fails — email is the primary delivery.
  }

  const subject = "New speaking engagement request — Forever Forward";
  const body =
    "New speaking engagement inquiry from foreverforwardcoaching.com\n\n" +
    "Name: " + name + "\n" +
    "Organization: " + org + "\n" +
    "Email: " + email + "\n\n" +
    "Details:\n" + details + "\n";

  GmailApp.sendEmail(NOTIFY_EMAIL, subject, body, {
    replyTo: email,
    name: "Forever Forward Website"
  });

  return json({ success: true });
}

function handleAddClient(data) {
  if (!data.name) return json({ success: false, error: "name required" });
  const sheet = getSheet("Clients");
  const id = Utilities.getUuid();
  sheet.appendRow([
    id,
    data.name,
    data.email || "",
    data.package || "",
    Number(data.sessionsPaid) || 0,
    new Date().toISOString(),
    data.notes || ""
  ]);
  return json({ success: true, id: id });
}

function handleLogSession(data) {
  if (!data.clientId) return json({ success: false, error: "clientId required" });
  const sheet = getSheet("Sessions");
  const id = Utilities.getUuid();
  const date = data.date ? new Date(data.date).toISOString() : new Date().toISOString();
  sheet.appendRow([id, data.clientId, date, data.notes || ""]);
  return json({ success: true, id: id });
}

function handleDeleteClient(data) {
  return deleteById_(getSheet("Clients"), data.id);
}

function handleDeleteSession(data) {
  return deleteById_(getSheet("Sessions"), data.id);
}

function deleteById_(sheet, id) {
  if (!id) return json({ success: false, error: "id required" });
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      return json({ success: true });
    }
  }
  return json({ success: false, error: "not found" });
}

function getClients() {
  const clientsSheet = getSheet("Clients");
  const sessionsSheet = getSheet("Sessions");
  const clientRows = clientsSheet.getDataRange().getValues();
  const sessionRows = sessionsSheet.getDataRange().getValues();

  const sessionsByClient = {};
  for (let i = 1; i < sessionRows.length; i++) {
    const cid = String(sessionRows[i][1]);
    if (!sessionsByClient[cid]) sessionsByClient[cid] = [];
    sessionsByClient[cid].push({
      id: sessionRows[i][0],
      date: sessionRows[i][2] instanceof Date ? sessionRows[i][2].toISOString() : sessionRows[i][2],
      notes: sessionRows[i][3] || ""
    });
  }

  const clients = [];
  for (let i = 1; i < clientRows.length; i++) {
    const row = clientRows[i];
    if (!row[0]) continue;
    const id = String(row[0]);
    const sessions = sessionsByClient[id] || [];
    const paid = Number(row[4]) || 0;
    clients.push({
      id: id,
      name: row[1],
      email: row[2],
      package: row[3],
      sessionsPaid: paid,
      completed: sessions.length,
      remaining: paid - sessions.length,
      createdAt: row[5] instanceof Date ? row[5].toISOString() : row[5],
      notes: row[6] || "",
      sessions: sessions
    });
  }
  return clients;
}

function getInquiries() {
  const sheet = getSheet("Inquiries");
  const rows = sheet.getDataRange().getValues();
  const inquiries = [];
  for (let i = rows.length - 1; i >= 1; i--) {
    inquiries.push({
      date: rows[i][0] instanceof Date ? rows[i][0].toISOString() : rows[i][0],
      name: rows[i][1],
      organization: rows[i][2],
      email: rows[i][3],
      details: rows[i][4]
    });
  }
  return inquiries;
}
