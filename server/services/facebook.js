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
    await page.goto('https://www.facebook.com');
    page.pause()



    try {
        // await page.waitForSelector('text=Marketplace', { timeout: 3000 });
        await page.getByRole('link', { name: 'Marketplace' }).click()
        console.log('[Facebook] Clicked Marketplace');
    } catch (e1) {
        console.error('[Facebook] Could not find Marketplace button:', e1.message);
    }

    try {
        // await page.waitForSelector('text=Create new listing', { timeout: 3000 });
        await page.click('text=Create new listing');
        console.log('[Facebook] Clicked Create new listing');
    } catch (e2) {
        console.error('[Facebook] Could not find Create new listing:', e2.message);
    }

    try {
        // await page.waitForSelector('text=Item for sale', { timeout: 3000 });
        await page.click('text=Item for sale');
        console.log('[Facebook] Clicked Item for sale');
    } catch (e3) {
        console.error('[Facebook] Could not find Item for sale', e3.message);
    }

    //Adding photos
    try{
        for (let i = 0; i < images.length; i++) {
            let imagePaths =  images[i].path
            await page.getByRole('button', { name: 'Add photos or drag and drop' }).click();
            await page.waitForSelector('input[type="file"]');
            await page.setInputFiles('input[type="file"]', imagePaths);
        }
    }catch(e4){
        console.error('[Facebook] Could not upload pictures', e4.message);
    }



}

module.exports = { postListing };