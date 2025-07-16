const express = require('express');
const router = express.Router();
const facebook = require('../services/facebook');

/**
 * Handles a POST request to upload a listing and forward it to Facebook.
 */
router.post('/', async (req, res) => {
    try {
        console.log('[POST /post] Body:', req.body);
        console.log('[POST /post] Files:', req.files);

        const fbResult = await facebook.postListing(req.body, req.files);

        res.json({
            success: true,
            message: 'Listing sent to Facebook.',
            result: fbResult
        });
    } catch (error) {
        console.error('[POST /post] Error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to post listing to Facebook.',
            error: error.message
        });
    }
});

module.exports = router;