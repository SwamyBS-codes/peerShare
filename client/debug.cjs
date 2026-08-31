const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER ERROR:', msg.text());
    }
  });

  page.on('pageerror', error => {
    console.log('PAGE ERROR:', error.message, error.stack);
  });

  await page.goto('http://localhost:3000');
  
  // Login
  await page.fill('input[type="email"]', 'bharathms@example.com');
  await page.fill('input[type="password"]', 'password');
  await page.click('button[type="submit"]');

  await page.waitForTimeout(2000);
  
  // Click friend (the first one)
  const friendButton = await page.$('text=bharathms');
  if (friendButton) {
    console.log("Clicking friend...");
    await friendButton.click();
    await page.waitForTimeout(2000);
  } else {
    console.log("Friend not found");
  }

  await browser.close();
})();
