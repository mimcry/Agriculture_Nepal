const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticate } = require('../middleware/authentication');
const  { setProfile, getProfile, putAvatar} = require('../controllers/profileController');

// Setup multer storage for avatars
const uploadsPath = path.join(__dirname, '..', 'uploads', 'avatars');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsPath); // Save files in the 'uploads/avatars' folder
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // Use a unique filename (timestamp)
  },
});

const upload = multer({ storage: storage });

// Initialize router
const router = express.Router();

// Profile Routes
router.get('/:id', authenticate, getProfile);
router.put('/:id', authenticate, setProfile);
router.put('/:id/avatar', authenticate, upload.single('avatar'), putAvatar);

module.exports = router;
