const router = require("express").Router();
const controller = require("../controllers/priceController");

router.post("/predict", controller.predict);

module.exports = router;
