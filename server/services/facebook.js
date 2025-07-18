const { chromium } = require('playwright');
require('dotenv').config();

const email = process.env.FB_EMAIL;
const password = process.env.FB_PASS;

/**
 * Automates the process of posting a listing on Facebook Marketplace.
 * @param {Object} listing - The listing data (title, price, etc.)
 * @param {Array} images - Array of uploaded image file objects
 */
async function postListing(listing, images) {
    console.log('[Facebook] Launching browser...');

    const browser = await chromium.launch({
        headless: false,  // Set to true later in production
        args: ['--start-maximized'],
    });
    // const context = await browser.newContext()
    // const page = await context.newPage()
    //
    // await page.goto('https://www.facebook.com/login');
    // await page.pause();
    // await context.storageState({ path: 'server/services/fb-auth.json' });
    //
    const context = await browser.newContext({
        storageState: 'services/fb-auth.json',
    });
    const page = await context.newPage();
    await page.goto('https://www.facebook.com/marketplace');


    // try {
    //     console.log('[Facebook] Navigating to login...');
    //     await page.goto('https://www.facebook.com/login', { waitUntil: 'networkidle' });
    //
    //     console.log('[Facebook] Entering credentials...');
    //     await page.type('#email', email);
    //     await page.type('#pass', password);

    //    await Promise.all([
    //         page.click('[name="login"]'),
    //         page.waitForNavigation({ waitUntil: 'networkidle' }),
    //     ]);
    //
    //     const url = page.url()
    //     if (url.includes('login')){
    //          throw new Error('Login failed: Check your Facebook credentials');
    //      }
    //
    //     console.log('[Facebook] Login successful.');
    //
    //     // TODO: Navigate to marketplace, create listing, upload image
    // } catch (error) {
    //     console.error('[Facebook] Error during login:', error.message);
    // } finally {
    //     // Don't close the browser yet so you can visually inspect the result
    //     await browser.close();
    // }
    //
    try{
        await page.waitForNavigation("text = Marketplace", {timeout : 3000})
        await page.click("text = Marketplace")
    } catch(error){
        console.error('[Facebook] Error during login:', error.message);
    }



}

module.exports = { postListing };