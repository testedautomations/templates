# Invoice automation templates (Make and n8n)

Add a row to a Google Sheet, get a PDF invoice emailed to the client, and have the row marked as sent. Two templates that do the same job:

- `make-blueprint.json` for Make
- `n8n-workflow.json` for n8n
- `test-data.csv` with 120 fake invoices to practise on

These templates only generate and send documents. They are not tax, accounting, or legal advice.

## Before you connect your Google account

- **What these templates contain.** The Make blueprint uses only Google Sheets, Google Docs, Google Drive and Gmail modules, plus one Tools module that builds the email. The n8n workflow uses only Google Sheets, Google Drive, Google Docs and Gmail nodes, plus the built-in Manual Trigger, Filter, Limit and Loop Over Items nodes. Neither file contains a web address, an HTTP request, a webhook, or a code step. If your import shows anything else, the file did not come from this repository. Don't run it.
- **Download only from this repository.** A link to an "updated" template in a comment is not from me.
- **What you are granting.** When you connect Google, Make and n8n ask for more access than this workflow uses. On my account, Make's Google Sheets connection asked for all of Google Drive as well as spreadsheets. Read the consent screen. If that is more than you want to give, use a separate Google account that holds only the invoice folder.
- **Email.** The Gmail step needs permission to send, nothing else.

## What each run does

1. Reads rows where the `status` column is empty, up to the batch size (10 by default).
2. Copies your invoice template and fills in the row's values.
3. Exports the copy as a PDF and saves it to your folder.
4. Emails the PDF to the address in `client_email`.
5. Writes `sent` and the time back to the row. If the email fails, it writes `email failed` and moves on to the next row.

Because step 1 skips rows that already have a status, you can run it again at any time without sending duplicates.

## Before you import: three things in Google Drive

### 1. A folder

Create a new, empty folder. Invoices and PDFs are saved here.

### 2. A spreadsheet

Put it in that folder. Name the tab `invoices` and use these headers in row 1, in this order:

```
invoice_no | client_name | client_email | item | amount | date | status | sent_at
```

- Leave `status` and `sent_at` empty. The automation fills them in.
- The order matters: the Make template finds `status` by its position (column G).
- Format the `amount` column as a number with two decimals. The Make template prints the amount exactly as the sheet displays it, so `45` in the sheet becomes `45` on the invoice.
- To practise, import `test-data.csv` and replace `test+invoice@example.com` with an address you own.

### 3. An invoice template

Create a Google Doc in the same folder with this text. Style it however you like, but keep the tags exactly as written:

```
INVOICE
Invoice no: {{invoice_no}}
Date: {{date}}

Bill to: {{client_name}}
Email: {{client_email}}

Description: {{item}}
Amount due: USD {{amount}}

Thank you for your business.
```

Set this up before you start generating invoices. Make's file picker only lists the most recent files in a folder (about 100), so in a folder that already holds hundreds of invoices the template can no longer be picked from the list.

## Make

### Import

1. Create a new scenario.
2. Open the three-dot menu at the top right of the editor and choose **Import blueprint**.
3. Choose `make-blueprint.json`, then click **Import blueprint**.

You get eight modules. Seven of them show a red badge, which means they still need your connection or your files.

### Connect and point it at your files

Open each module with a red badge, in order. In every one, pick or add your Google connection in the **Connection** field and click **Save**. The badge only clears after you save, even when Make has already filled in a connection for you.

- **Google Sheets, Search Rows**: choose your spreadsheet and the `invoices` tab. The filter (`status` does not exist) and the limit are already set.
- **Google Docs, Create a Document from a Template**: it shows `File not found: YOUR_TEMPLATE_DOC_ID` until you pick your folder and then your template in **Document ID**. Leave the mode on **By Dropdown**; switching to **By Mapping** replaces the tag fields.
- **Google Docs, Download a Document**: connection only.
- **Google Drive, Upload a File**: replace `YOUR_FOLDER_ID` with your folder's ID, the last part of the folder's URL.
- **Gmail, Make an API call**: connection only. It sends through the Gmail API, so the connection only needs permission to send email, not to read your mailbox.
- **Google Sheets, Update a Row** (two of them, one for `sent` and one for `email failed`): choose your spreadsheet and the `invoices` tab in both.

The **Tools** module builds the email. Edit the subject and the message text there.

### Try it

Set the limit in **Search Rows** to 1, click **Run once**, then check three places: the row says `sent`, the email arrived with a PDF you can open, and the PDF is in your folder. Raise the limit when you are happy with it.

### What it costs to run

Measured on 100 test invoices on the Free plan:

- 6 operations per invoice, plus 1 per run. 100 invoices in 5 runs used 605 credits.
- About 7.5 seconds per invoice.
- The Free plan's 1,000 credits a month cover roughly 165 invoices.
- 1,000 invoices a month need about 6,100 credits. The smallest paid plan, Core, includes 10,000 credits for $10.59 a month, or $9 a month billed annually (make.com/pricing, November 2026).
- On the Free plan a single run is cut off after 5 minutes (40 minutes on paid plans). At 7.5 seconds per invoice, keep the limit at 25 or lower. Runs of 25 were tested and took about 3 minutes.

## n8n

### Import

1. Create a new workflow.
2. Open the three-dot menu next to the workflow's name and choose **Import**, then **From file**. Pick `n8n-workflow.json`.
3. If n8n asks "Importing this from an AI tool?", click **Skip**.

You get twelve nodes. Seven of them show a red warning triangle.

### Connect and point it at your files

The workflow uses four credentials: Google Sheets, Google Drive, Google Docs, and Gmail. Double-click each Google node and check the **Credential** field at the top. If you already have a credential of that type, n8n fills it in for you, but the warning only clears once you have opened the node. If you don't, create one from that field.

While you are in each node, replace the placeholders:

- **Get rows**, **Mark as sent**, and **Mark as failed**: put your spreadsheet's ID in **Document**, replacing `YOUR_SPREADSHEET_ID`. The ID is the long string in the spreadsheet's URL between `/d/` and `/edit`. **Sheet** is already set to `invoices`.
- **Copy template**: put your template's ID in **File**, replacing `YOUR_TEMPLATE_DOC_ID` (same place in the document's URL), and your folder's ID in **Parent Folder**, replacing `YOUR_FOLDER_ID`. The folder's ID is the last part of its URL.
- **Save PDF to folder**: put your folder's ID in **Parent Folder**.
- **Download as PDF**, **Fill in invoice**, and **Email invoice**: credential only.

Leave the dropdowns next to those fields on **By ID** and **By Name**. The column settings in the two "Mark as" nodes stay as they are when you change the spreadsheet.

**Max Items** in the **Batch size** node controls how many invoices one run handles.

### Try it

Set **Max Items** to 1, click **Execute**, and check the same three places as above. Every node should end with a green tick.

### What it costs to run

Measured on 100 test invoices on n8n Cloud:

- n8n counts executions, not steps. One execution can process a whole batch.
- Runs you start by hand with **Execute** do not count toward the plan's quota. Runs started by a schedule or another trigger do, one per run.
- n8n Cloud has a 14-day trial with 1,000 executions and no free plan after it. Starter is €24 a month, or €20 a month billed annually, with 2,500 executions (n8n Cloud plan page, November 2026).
- A schedule that fires every hour uses about 720 executions a month. Every 15 minutes is about 2,880, which is over Starter's quota.
- About 6.8 seconds per invoice.
- PDFs are saved to the folder after the whole batch has been emailed, not one by one.

## Things worth knowing

- **A wrong email address does not stop the run.** That row gets `email failed`, its document and PDF are still created, and the rest of the batch carries on. Fix the address, clear the `status` cell, and run again.
- **Clearing a status re-sends that invoice.** It also creates a second document and PDF for it.
- **Nothing checks for duplicates or odd values.** Two rows for the same client become two invoices, and an amount of 0 is sent as `USD 0.00`.
- **Long descriptions wrap.** A 12-item description took five lines and stayed on one page.
- **Names with accents or non-Latin characters come through intact** in the email body and the PDF.
- **Thousands separators differ.** Make prints what the sheet shows (`1,495.41`); the n8n template prints `1495.41`.
