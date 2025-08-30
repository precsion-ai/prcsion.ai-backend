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
        headless: false, // Set to true later in production
        args: ['--start-maximized'],
    });

    const context = await browser.newContext({
        storageState: 'server/services/fb-auth.json',
    });

    const page = await context.newPage();
    await page.goto('https://www.facebook.com');
    await page.pause();

    // Navigate to Marketplace
    try {
        await page.getByRole('link', { name: 'Marketplace' }).click();
        console.log('[Facebook] Clicked Marketplace');
    } catch (err) {
        console.error('[Facebook] Could not find Marketplace button:', err.message);
    }

    // Create a new listing
    try {
        await page.click('text=Create new listing');
        console.log('[Facebook] Clicked Create new listing');
    } catch (err) {
        console.error('[Facebook] Could not find Create new listing:', err.message);
    }

    // Select item type
    try {
        await page.click('text=Item for sale');
        console.log('[Facebook] Clicked Item for sale');
    } catch (err) {
        console.error('[Facebook] Could not find Item for sale:', err.message);
    }

    // Upload images
    try {
        const imagePaths = images.map(img => img.path);
        await page.waitForSelector('input[type="file"]', { timeout: 5000 });
        await page.setInputFiles('input[type="file"]', imagePaths);
        console.log('[Facebook] Uploaded images successfully');
    } catch (err) {
        console.error('[Facebook] Could not upload pictures:', err.message);
    }

    // Fill in product title
    try {
        const titleBox = await page.getByRole('textbox', { name: 'Title' });
        await titleBox.fill(listing.productName);
    } catch (err) {
        console.error('[Facebook] Could not fill in title:', err.message);
    }

    // Fill in price
    try {
        const priceBox = await page.getByRole('textbox', { name: 'Price' });
        await priceBox.fill(listing.price);
    } catch (err) {
        console.error('[Facebook] Could not fill in price:', err.message);
    }

    // Fill in category
    try {
        const categoryBox = await page.getByRole('combobox', { name: 'Category' });
        await categoryBox.fill(listing.category);
        await page.locator('div').filter({ hasText: listing.category }).nth(1).click();
    } catch (err) {
        console.error('[Facebook] Could not fill in category:', err.message);
    }

    // Fill in description
    try {
        const descriptionBox = await page.getByRole('textbox', { name: 'Description' });
        await descriptionBox.fill(listing.description);
    } catch (err) {
        console.error('[Facebook] Could not fill in description:', err.message);
    }

    // Fill in location
    try {
        const locationBox = await page.getByRole('combobox', { name: 'Location' });
        await locationBox.fill(listing.location);
    } catch (err) {
        console.error('[Facebook] Could not fill in location:', err.message);
    }

    // Optionally close browser at the end
    // await browser.close();
}

module.exports = { postListing };
