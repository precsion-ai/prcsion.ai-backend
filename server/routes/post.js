const express = require('express')
const app = express()
const router = express.Router()
const facebook = require('../services/facebook')

router.post('/', async (req, res) => {
    res.json("message received")
    const result = await facebook.postListing(req.body, req.files)
    console.log('Body:', req.body);
    console.log('Files:', req.files);
    res.json({ status: 'done', result });
})

module.exports = router