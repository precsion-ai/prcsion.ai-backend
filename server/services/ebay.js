const EbayAuthToken = require('ebay-oauth-nodejs-client');
require('dotenv').config();




const ebayAuthToken = new EbayAuthToken({
    clientId: process.env.EBAY_ID,
    clientSecret: process.env.EBAY_SECRET,
    redirectUri: 'https://www.ebay.com/redirect?ruName=Quang_Tran-QuangTra-Resell-jumolja',
});

(async () => {
    try {
        const token = await ebayAuthToken.getApplicationToken('SANDBOX');
        console.log('[eBay] Access Token:', token.access_token);
    } catch (error) {
        console.error('[eBay] Failed to get access token:', error.message);
    }
})();