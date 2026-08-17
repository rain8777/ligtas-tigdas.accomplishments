/**
 * LIGTAS TIGDAS — Apps Script data bridge (optional)
 *
 * Only needed if your Google Workspace admin has disabled "Publish to web"
 * (common on government/school accounts). See guide.md, Part 2, for the
 * full step-by-step setup.
 *
 * This file itself is just for reference / version control — Apps Script
 * doesn't run code you "upload"; you paste this into the online editor at
 * Extensions -> Apps Script inside your Google Sheet. See guide.md for the
 * exact steps.
 *
 * What it does: serves the current sheet's data as plain CSV text, in the
 * same shape Google's own "export as CSV" would give — so the dashboard's
 * existing CSV parser reads it with no other changes needed.
 */
function doGet(e) {
  var gid = (e.parameter.gid || "0");
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  var sheet = sheets.filter(function (s) {
    return String(s.getSheetId()) === String(gid);
  })[0] || sheets[0];

  var data = sheet.getDataRange().getValues();
  var csv = data.map(function (row) {
    return row.map(function (cell) {
      var v = (cell === null || cell === undefined) ? "" : String(cell);
      if (v.indexOf(",") > -1 || v.indexOf('"') > -1 || v.indexOf("\n") > -1) {
        v = '"' + v.replace(/"/g, '""') + '"';
      }
      return v;
    }).join(",");
  }).join("\n");

  return ContentService.createTextOutput(csv)
    .setMimeType(ContentService.MimeType.CSV);
}
