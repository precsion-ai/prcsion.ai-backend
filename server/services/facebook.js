const chromium = require('playwright')
const email = process.env["FB_EMAIL "]
const password = process.env["FB_PASS "]
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
require('dotenv').config()

async function postListing(listing, images){
    const browser = await chromium.launch({headless: false});
    const page = await browser.newPage();
    await page.goto("https://www.facebook.com/login");

    await page.fill('#email',email )
    await page.fill('#password', password)

    await Promise.all([
        page.click('[name="login"]'),
        page.waitForNavigation({ waitUntil: 'networkidle' })
    ]);

    console.log("login successful")
}

module.exports= {postListing}