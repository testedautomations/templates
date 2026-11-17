# Lead system template (Make + HubSpot + Telegram)

Someone fills in your Google Form. A few seconds later they are a contact in HubSpot with a `hot`, `warm` or `cold` tier, the row in your sheet says `created`, and if the lead is hot you get a Telegram message and an email.

- `make-blueprint.json`: the Make scenario
- `form-to-make.gs`: 16 lines of Apps Script that send each new form row to Make
- `test-data.csv`: 55 fake leads to practise on, including a broken email address and two duplicates

Everything here runs on free plans: Make Free, HubSpot's free CRM, Google Forms and Sheets, Telegram.

This template only moves form answers into a CRM and notifies you. It is not legal advice about collecting or storing personal data.

## Before you connect your accounts

- **What the blueprint contains.** Seven modules: one Webhooks trigger, one HubSpot CRM module, two Google Sheets modules, one Tools module that builds the email, one Gmail module and one Telegram Bot module. It contains no web address and no HTTP request module. If your import shows anything else, the file did not come from this repository. Don't run it.
- **What the script does.** `form-to-make.gs` reads your response sheet and posts each unsent row to one address: the webhook address you paste into its first line. Read it before you run it. It is short.
- **Download only from this repository.** A link to an "updated" template in a comment is not from me.
- **What you are granting.** When I connected HubSpot, Make asked to view contacts, to create, delete or change contacts, and to view owner and account details. Make's Google Sheets connection asked for all of Google Drive as well as spreadsheets. Read each consent screen. The Gmail step only needs permission to send.
- **Treat the webhook address like a password.** Anyone who has it can push fake leads into your CRM and use up your credits. If it leaks, create a new webhook in the first module and paste the new address into the script.

## What happens to each lead

1. The form adds a row to the response sheet. The script writes `queued` in that row and posts it to Make.
2. Make creates the HubSpot contact, or updates it if the email already exists. `lead_tier` is set from the budget answer: `over $2,000` is hot, `$500–2,000` is warm, anything else (including no answer) is cold.
3. Make writes `created` or `updated` and the time back to the row. If HubSpot rejects the lead, it writes `crm failed` instead and stops there for that lead.
4. Hot leads only: an email to you and a Telegram message with the lead's details.

Rows that already have something in `crm_status` are never sent again, so running the script twice does not create duplicates.

## Set up, in this order

### 1. HubSpot: one custom property

In HubSpot go to **Settings**, then **Properties**, and create a contact property:

- Label: `Lead tier`
- Internal name: `lead_tier` (HubSpot fills this in from the label; check that it matches exactly)
- Field type: **Single-line text**

Use single-line text, not a dropdown. With a dropdown, HubSpot rejects the whole contact when a value doesn't match an option.

The other fields the template writes (email, first name, last name, company name, message) are standard HubSpot contact properties.

### 2. Telegram: a bot and your chat ID

1. In Telegram, open a chat with **@BotFather** and send `/newbot`. Give it a name and a username ending in `bot`. BotFather replies with a token. Keep it private.
2. Open a chat with your new bot and press **Start**. A bot cannot message you until you have done this.
3. Get your chat ID: send your bot any message, then open `https://api.telegram.org/bot<TOKEN>/getUpdates` in a browser, with your token in place of `<TOKEN>`. In the reply, find `"chat":{"id":` followed by a number. That number is your chat ID. The address in your browser now contains your token, so don't screenshot or share it.

If the address in step 3 or Make's connection keeps answering with a timeout, create a second bot with `/newbot` and use that one. My first bot kept returning a gateway timeout; a second bot created the same way worked straight away.

### 3. Google Form and response sheet

Create a form with these five questions, in this order:

1. `name`: Short answer
2. `email`: Short answer
3. `company`: Short answer
4. `budget`: Dropdown with three options, `under $500`, `$500–2,000` and `over $2,000`
5. `message`: Paragraph

- The budget options must match exactly, including the dash in `$500–2,000` (an en dash, not a hyphen). Copy them from here. The scenario compares the text.
- On the email question, turn on **Response validation**, then **Text**, then **Email**, and make the question required. Without it a typo such as a missing `@` reaches HubSpot, HubSpot rejects it, and the row ends as `crm failed`.
- On the **Responses** tab choose **Link to Sheets** to create the response sheet.
- In the response sheet, type `crm_status` in G1 and `synced_at` in H1. The sheet must then read, left to right: Timestamp, name, email, company, budget, message, crm_status, synced_at. The order matters: the script and the scenario find columns by position.

### 4. Make: import and connect

1. Create a new scenario. Open the three-dot menu at the top right of the editor, choose **Import blueprint**, pick `make-blueprint.json`, and click **Import blueprint**.

   You get seven modules. Five show a red badge: HubSpot CRM, both Google Sheets modules, Gmail and Telegram Bot.

2. **Webhooks, Custom webhook** (no badge, but it still needs you): open it, click **Create a webhook**, name it, and save. Make shows the new webhook's address. Copy it for step 5, then click **Save** in the module. You don't need to send sample data; the template already knows the six fields.
3. **HubSpot CRM, Create or Update a Contact**: pick or add your HubSpot connection and click **Save**. The six **Key** dropdowns may all display "Email". That is only how the panel draws them. I saved the module in that state and checked the saved scenario: the six keys were still email, firstname, lastname, company, lead_tier and message. Don't change them.
4. **Google Sheets, Update a Row** (two of them: one writes `created` or `updated`, the other writes `crm failed`). In each one: pick your Google connection, click **Spreadsheet Name** and choose your response sheet (the picker has a search box), then choose the tab in **Sheet Name**. Sheet Name goes empty when you change the spreadsheet, so you have to pick it even if your tab is called `Form Responses 1`. The row number and the two column values stay filled in. Click **Save**.
5. **Tools, Set variable**: replace `YOUR_EMAIL_ADDRESS` with the address that should receive hot-lead emails. You can edit the subject and text here too. Click **Save**.
6. **Gmail, Make an API call**: pick or add your Gmail connection and click **Save**. It sends through the Gmail API, so the connection only needs permission to send, not to read your mailbox.
7. **Telegram Bot, Send a Text Message or a Reply**: add a connection with the token from BotFather, replace `YOUR_TELEGRAM_CHAT_ID` with your chat ID, and click **Save**.
8. Save the scenario. All red badges should be gone.

A badge only clears after you click **Save** in that module, even when Make has already filled in a connection for you.

### 5. Apps Script: send new rows to Make

In the response sheet open **Extensions**, then **Apps Script**. Delete what is there, paste this, and put your webhook address between the quotes on the first line:

```javascript
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
```

The same code is in `form-to-make.gs`. It works on the first tab of the spreadsheet, so keep the response tab first.

Then add the trigger. In the Apps Script editor open **Triggers** (the clock icon) and click **Add Trigger**:

- Function: `sendPending`
- Event source: **From spreadsheet**
- Event type: **On form submit**

Save it. Google asks you to authorise the script the first time; it needs access to the spreadsheet and permission to connect to an external service (your webhook).

### 6. Turn it on and try it

1. In Make, switch the scenario on. The schedule should read **Immediately as data arrives**.
2. Submit your form once with `over $2,000` as the budget.
3. Check three places: the row says `created` with a time, the contact is in HubSpot with `Lead tier` set to `hot`, and the Telegram message and the email arrived.

To try the 55 fake leads, paste the five columns of `test-data.csv` into columns B to F and run `sendPending` once from the Apps Script editor. It sends every row that has an empty `crm_status`, and those 55 leads used 219 credits when I ran them, so check your remaining credits first.

## What it costs to run

Measured on 55 test leads on Make's Free plan in November 2026:

- 3 credits per lead. A hot lead costs 6, because of the email and Telegram steps. A lead HubSpot rejects costs 3.
- 55 leads, 18 of them hot, used 219 credits: 3.98 per lead on average.
- At that mix the Free plan's 1,000 credits a month cover about 250 leads. With no hot leads it is 333; if every lead is hot, 166.
- A scenario that waits on a webhook uses nothing while no one fills in the form. The first version of this scenario checked the sheet on a schedule instead, and one check that found nothing cost 2 credits. Every 15 minutes that is 2,880 checks a month.
- From pressing Submit on the form to the status appearing in the sheet took 5 to 8 seconds in three tries. Sending all 55 rows at once took 2 minutes 47 seconds, because Make handles them one at a time.
- HubSpot's free CRM holds 1,000 contacts and allows 10 custom properties in total (HubSpot's product catalog pages, read in November 2026). This template uses one.
- Make's Free plan allows two active scenarios. This is one of them.

## Things worth knowing

- **The same email twice updates one contact.** The second submission overwrites the first one's name, company, tier and message, and the row says `updated`. No second contact is created.
- **`created` or `updated` is decided by timestamps.** If HubSpot's created and updated times are less than 2 seconds apart, the row says `created`. Two submissions with the same email inside 2 seconds could both say `created`.
- **A broken email address does not stop anything.** That row gets `crm failed`, and the following leads are processed normally. Fix the address in the sheet, clear the `crm_status` cell, and run `sendPending` from the Apps Script editor.
- **A row stuck on `queued`** means the script could not reach Make. Clear the cell and run `sendPending` again.
- **Clearing a status re-sends that lead.** For a hot lead you get the email and the Telegram message again.
- **If you change the budget options or the tier rule**, change it in two places: the `lead_tier` value in the HubSpot module and the "hot leads only" filter before the Tools module.
- **Names are split at the first space.** "Maria Lopez Garcia" becomes first name Maria, last name Lopez Garcia. Accented and non-Latin names, and a 615-character message, went through without errors.
- **The webhook has no API key.** The address is the only protection. Make lets you add API keys to a webhook if you want a second lock; the script would then need to send that key as a header.
