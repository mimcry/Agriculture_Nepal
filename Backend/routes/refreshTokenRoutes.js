const express = require('express');
const router = express.Router();
const { refreshToken } = require('../controllers/refreshTokenController');

// Define the refresh-token route
router.post('/refresh-token', refreshToken);

module.exports = router;
