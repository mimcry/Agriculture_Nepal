const express = require("express");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");
const uploadsPath = path.join(__dirname, "uploads", "avatars");
const authRoutes = require("./routes/authRoutes");
const weatherRoutes = require("./routes/weatherRoutes");
const profileRouter = require("./routes/profileRoutes");
const contactRouter = require("./routes/contactRoutes");
// Check if the directory exists, if not create it
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
require("dotenv").config();
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/avatars/"); // Save files in the 'uploads/avatars' folder
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // Use a unique filename (timestamp)
  },
});

// Initialize Multer
const upload = multer({ storage: storage });
const app = express();

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(cors());
app.use(express.json()); // Parse JSON bodies
app.use(bodyParser.json());
app.use("/api", authRoutes);
app.use("/api", weatherRoutes);
app.use("/profile", profileRouter);
app.use("/contactus", contactRouter);
// Refresh token route
app.post("/refresh-token", async (req, res) => {
  console.log(req.body);
  const refreshToken = req.body.token; // Get refresh token from request body
  // const ref reshToken = req.cookies.refresh_token; // Get refresh token from cookie

  // if (!refreshToken) {
  //   return res.status(401).json({ error: "Refresh token missing" });
  // }

  try {
    // Verify the refresh token
    const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);

    // Optionally: Check if refresh token exists in the database for invalidation
    // If valid, generate a new access token
    const accessToken = jwt.sign(
      { id: decoded.id, username: decoded.username },
      JWT_SECRET,
      { expiresIn: "1h" } // New access token expires in 1 hour
    );

    res.json({ accessToken });
  } catch (error) {
    res.status(403).json({ error: "Invalid or expired refresh token" });
  }
});


// Start the server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
