const express = require('express');
const router = express.Router();
const { signup, login, verifyotp, resendOtp } = require('../controllers/authController'); // Ensure the path is correct
const weathers=require('../services/weather')
router.post('/signup', signup);
router.post('/login', login);
router.post('/verify-otp', verifyotp);
router.post('/resend-otp', resendOtp);


module.exports = router;
