const express = require('express');
const router = express.Router();
const weathers=require('../services/weather')
router.get('/weather', weathers);
module.exports = router;
