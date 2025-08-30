const express = require('express');
const router = express.Router();
const facebook = require('../services/facebook');

/**
 * @route POST /post
 * @desc Handles uploading a listing and posting to Facebook Marketplace
 */
router.post('/', async (req, res) => {
    try {
        console.log('[POST /post] Request Body:', req.body);
        console.log('[POST /post] Uploaded Files:', req.files);

        const result = await facebook.postListing(req.body, req.files);

        return res.status(200).json({
            success: true,
            message: 'Listing successfully posted to Facebook.',
            data: result
        });
    } catch (error) {
        console.error('[POST /post] Error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to post listing to Facebook.',
            error: error.message
        });
    }
});

module.exports = router;