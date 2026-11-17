const HOOK = 'PASTE_YOUR_MAKE_WEBHOOK_URL_HERE';
function sendPending() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  const sheet = SpreadsheetApp.getActive().getSheets()[0];
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    const [, name, email, company, budget, message, status] = rows[i];
    if (status) continue;
    sheet.getRange(i + 1, 7).setValue('queued');
    SpreadsheetApp.flush();
    const payload = JSON.stringify({row: i + 1, name, email, company, budget, message});
    UrlFetchApp.fetch(HOOK, {method: 'post', contentType: 'application/json', payload});
  }
  lock.releaseLock();
}
