const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const GSTIN = '19MAJPS4713H1Z3';
const TARGET_FY = '2026-2027';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  console.log('==================================================');
  console.log('GST Portal Automation Starting...');
  console.log('GSTIN:', GSTIN);
  console.log('Financial Year:', TARGET_FY);
  console.log('==================================================');

  // Clean previous session files
  if (fs.existsSync('captcha_code.txt')) fs.unlinkSync('captcha_code.txt');
  if (fs.existsSync('captcha.png')) fs.unlinkSync('captcha.png');
  if (fs.existsSync('captcha.mp3')) fs.unlinkSync('captcha.mp3');

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-gpu'
    ]
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
    viewport: { width: 1366, height: 900 }
  });

  const page = await context.newPage();

  let taxpayerApiResponse = null;
  let finYearsApiResponse = null;
  let filingTableApiResponse = null;

  page.on('response', async res => {
    const url = res.url();
    try {
      if (url.includes('/services/api/search/taxpayerDetails')) {
        const text = await res.text();
        try { taxpayerApiResponse = JSON.parse(text); } catch (e) {}
      } else if (url.includes('/services/api/dropdownfinyear')) {
        const text = await res.text();
        try { finYearsApiResponse = JSON.parse(text); } catch (e) {}
      } else if (url.includes('/services/api/search/taxpayerReturnDetails')) {
        const text = await res.text();
        try { filingTableApiResponse = JSON.parse(text); } catch (e) {}
      } else if (url.includes('/services/audiocaptcha')) {
        const buf = await res.body();
        fs.writeFileSync('captcha.mp3', buf);
        console.log('[AUDIO] captcha.mp3 saved, size:', buf.length);
      }
    } catch (e) {
      // ignore
    }
  });

  console.log('Navigating to https://services.gst.gov.in/services/searchtp...');
  await page.goto('https://services.gst.gov.in/services/searchtp', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3000);

  console.log('Entering GSTIN:', GSTIN);
  const gstinInput = page.locator('#for_gstin');
  await gstinInput.waitFor({ state: 'visible', timeout: 15000 });
  await gstinInput.click();
  await gstinInput.pressSequentially(GSTIN, { delay: 60 });
  await page.waitForTimeout(2000);

  // Captcha submission loop
  let searchSuccess = false;
  let attempts = 0;

  while (!searchSuccess && attempts < 10) {
    attempts++;
    console.log(`\n--- Captcha Attempt #${attempts} ---`);

    const captchaImg = page.locator('#imgCaptcha');
    await captchaImg.waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(1000);

    // Save screenshot of captcha
    await captchaImg.screenshot({ path: 'captcha.png' });
    console.log('[IMAGE] Captcha screenshot saved to captcha.png');

    // Also click audio button to get mp3 audio captcha
    const audioBtn = page.locator('button[ng-click="play()"]');
    if (await audioBtn.count() > 0) {
      try {
        await audioBtn.click();
        await page.waitForTimeout(1000);
      } catch (err) {}
    }

    console.log('STATUS: WAITING_FOR_CAPTCHA');
    console.log('Please write the 6-digit captcha into captcha_code.txt');

    // Wait for captcha_code.txt
    let code = '';
    while (true) {
      if (fs.existsSync('captcha_code.txt')) {
        const content = fs.readFileSync('captcha_code.txt', 'utf8').trim();
        if (content.length === 6) {
          code = content;
          break;
        }
      }
      await sleep(500);
    }

    console.log('Captcha code received:', code);
    fs.unlinkSync('captcha_code.txt'); // remove consumed file

    const captchaInput = page.locator('#fo-captcha');
    await captchaInput.click();
    await captchaInput.fill('');
    await captchaInput.pressSequentially(code, { delay: 40 });
    await page.waitForTimeout(500);

    console.log('Clicking SEARCH button (#lotsearch)...');
    const searchBtn = page.locator('#lotsearch');
    await searchBtn.click();

    // Wait and check if success or invalid captcha
    await page.waitForTimeout(3000);

    const hasError = await page.evaluate(() => {
      const el = document.querySelector('.err:not(.ng-hide)');
      return el ? el.innerText.trim() : null;
    });

    if (hasError && (hasError.toLowerCase().includes('captcha') || hasError.toLowerCase().includes('characters') || hasError.toLowerCase().includes('letters'))) {
      console.log('Captcha rejected:', hasError);
      console.log('Retrying with new captcha...');
      await page.waitForTimeout(2000);
      continue;
    }

    // Check if result section appeared
    const resultVisible = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      return bodyText.includes('Search Result based on GSTIN/UIN') ||
             bodyText.includes('Legal Name of Business') ||
             bodyText.includes('Trade Name');
    });

    if (resultVisible || taxpayerApiResponse) {
      console.log('Search SUCCESSFUL! Taxpayer details displayed.');
      searchSuccess = true;
      break;
    } else {
      console.log('Waiting for search result to render...');
      await page.waitForTimeout(4000);
      const recheck = await page.evaluate(() => {
        return document.body.innerText.includes('Search Result based on GSTIN/UIN') ||
               document.body.innerText.includes('Legal Name of Business');
      });
      if (recheck || taxpayerApiResponse) {
        console.log('Search SUCCESSFUL!');
        searchSuccess = true;
        break;
      }
    }
  }

  if (!searchSuccess) {
    console.error('Failed to complete search after maximum attempts.');
    await browser.close();
    process.exit(1);
  }

  console.log('\n==================================================');
  console.log('EXTRACTING TAXPAYER DETAILS...');
  console.log('==================================================');

  // Extract Taxpayer on-screen details
  const taxpayerDetailsOnScreen = await page.evaluate(() => {
    const data = {};
    // Extract key-value pairs
    document.querySelectorAll('.row, .panel, table tr').forEach(row => {
      const labels = row.querySelectorAll('label, th, p.m-cir, .text-bold, strong');
      labels.forEach(lbl => {
        const labelText = lbl.innerText.trim();
        if (labelText && labelText.length > 2 && labelText.length < 50) {
          // Find following sibling or next element or parent text
          let valEl = lbl.nextElementSibling;
          if (valEl) {
            const valText = valEl.innerText.trim();
            if (valText && !data[labelText]) data[labelText] = valText;
          }
        }
      });
    });

    // Also grab all visible text under Search Result section
    const resContainer = document.querySelector('[data-ng-show*="searchresult"], [ng-show*="searchresult"]') ||
                          document.querySelector('.taxpayer-details') ||
                          document.querySelector('form[name="searchtaxp"]');
    data._fullText = resContainer ? resContainer.innerText.trim() : document.body.innerText.trim();
    return data;
  });

  console.log('Extracted on-screen details length:', JSON.stringify(taxpayerDetailsOnScreen).length);
  if (taxpayerApiResponse) {
    console.log('API Taxpayer response captured successfully.');
  }

  fs.writeFileSync('taxpayer_details.json', JSON.stringify({
    gstin: GSTIN,
    apiData: taxpayerApiResponse,
    onScreenData: taxpayerDetailsOnScreen
  }, null, 2));

  console.log('\n==================================================');
  console.log('CLICKING "SHOW FILING TABLE"...');
  console.log('==================================================');

  // Scroll to and click #filingTable
  const filingTableBtn = page.locator('#filingTable');
  await filingTableBtn.scrollIntoViewIfNeeded();
  await filingTableBtn.click();
  console.log('Clicked #filingTable, waiting for financial year dropdown/options...');
  await page.waitForTimeout(4000);

  // Take screenshot to see current state
  await page.screenshot({ path: 'filing_table_opened.png' });

  // Inspect available financial years in dropdown
  const dropdownInfo = await page.evaluate(() => {
    const selects = [];
    document.querySelectorAll('select').forEach(sel => {
      const options = Array.from(sel.options).map(o => ({ value: o.value, text: o.text.trim() }));
      selects.push({ id: sel.id, name: sel.name, className: sel.className, options });
    });
    return selects;
  });
  console.log('Dropdown elements found:', JSON.stringify(dropdownInfo, null, 2));

  // Find the financial year select
  let selectedYear = null;
  const selectLocator = page.locator('select').first();
  if (await selectLocator.count() > 0) {
    const options = await selectLocator.evaluate(sel => Array.from(sel.options).map(o => ({ val: o.value, txt: o.text.trim() })));
    console.log('Available FY options:', options);

    // Look for TARGET_FY (2026-2027) or closest match
    let match = options.find(o => o.txt.includes(TARGET_FY) || o.val.includes(TARGET_FY));
    if (!match) {
      console.log(`Target FY "${TARGET_FY}" not found directly. Options available:`, options.map(o => o.txt));
      // Pick first non-empty option or latest year
      match = options.find(o => o.val && o.val !== '?') || options[0];
    }

    if (match) {
      selectedYear = match.txt || match.val;
      console.log(`Selecting Financial Year: ${selectedYear} (value: ${match.val})`);
      await selectLocator.selectOption(match.val);
      await selectLocator.dispatchEvent('change');
      await page.waitForTimeout(1000);
    }
  }

  // Find the SEARCH button next to the financial year dropdown
  console.log('Searching for filing table Search button...');
  const searchFilingBtn = await page.evaluate(() => {
    // Look for button near select or with search text
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => {
      const t = b.innerText.trim().toLowerCase();
      const parent = b.parentElement;
      return (t === 'search' || t === 'get filing data' || t === 'submit') && b.id !== 'lotsearch';
    });
    if (btn) {
      btn.click();
      return { clicked: true, text: btn.innerText.trim(), id: btn.id };
    }
    return { clicked: false };
  });

  console.log('Filing Search button click result:', searchFilingBtn);
  if (!searchFilingBtn.clicked) {
    // Try clicking any button inside the filing table container
    const anySearchBtn = page.locator('button:has-text("Search"):not(#lotsearch)');
    if (await anySearchBtn.count() > 0) {
      await anySearchBtn.first().click();
      console.log('Clicked button:has-text("Search")');
    }
  }

  console.log('Waiting for filing table data to load...');
  await page.waitForTimeout(5000);

  // Extract filing table data
  const filingTableData = await page.evaluate(() => {
    const tables = [];
    document.querySelectorAll('table').forEach((tbl, tIdx) => {
      const rows = [];
      tbl.querySelectorAll('tr').forEach(tr => {
        const cells = Array.from(tr.querySelectorAll('th, td')).map(c => c.innerText.trim());
        if (cells.length > 0) rows.push(cells);
      });
      if (rows.length > 1) {
        tables.push({ index: tIdx, className: tbl.className, rows });
      }
    });

    // Also get text of filing section
    const filingSec = document.querySelector('#filingTable') ? document.querySelector('#filingTable').closest('.row') : null;
    const allText = document.body.innerText;
    return { tables, allText };
  });

  fs.writeFileSync('filing_table.json', JSON.stringify({
    gstin: GSTIN,
    selectedYear,
    apiData: filingTableApiResponse,
    tables: filingTableData.tables
  }, null, 2));

  console.log('Saved filing table data. Found tables:', filingTableData.tables.length);

  // Save final screenshot
  await page.screenshot({ path: 'final_result.png' });
  console.log('Final screenshot saved to final_result.png');

  console.log('\n==================================================');
  console.log('AUTOMATION FINISHED SUCCESSFULLY!');
  console.log('==================================================');

  await browser.close();
})();
