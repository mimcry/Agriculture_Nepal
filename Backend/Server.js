const express = require("express");
const axios = require("axios");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");
const cors = require("cors");
const multer = require("multer");
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const uploadsPath = path.join(__dirname, 'uploads', 'avatars');
const otpGenerator = require('otp-generator');

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
const apiKey = "d987d16258d01b0c60f0bc433eaa40f2";
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: "salongautam4@gmail.com", pass: "lrli yavn aiej qjxk" },
});
const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "postgres",
  password: process.env.DB_PASSWORD || "sql",
  port: process.env.DB_PORT || 5432,
});
pool.connect((err, client, release) => {
  if (err) {
    console.error("Error connecting to the database:", err.stack);
  } else {
    console.log("Database connected successfully!");
  }
  release(); // Release the client back to the pool
});
// Middleware
app.use(cors());
app.use(express.json()); // Parse JSON bodies
app.use(bodyParser.json());
// Secret for JWT
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";


app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// User Signup
app.post("/signup", async (req, res) => {
  const {
    firstname,
    lastname,
    email,
    password,
    address,
    contact_number,
    usertype,
  } = req.body;

  if (
    !firstname ||
    !lastname ||
    !email ||
    !password ||
    !address ||
    !contact_number ||
    !usertype
  ) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    // Check if the email already exists in the users table
    const existingUser = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

    if (existingUser.rows.length > 0) {
      // If the email already exists, send a response without generating OTP
      return res.status(400).json({ error: "Email already exists" });
    }

    // Generate OTP if email is new
    const otp = otpGenerator.generate(6, {
      upperCase: false,
      specialChars: false,
      alphabets: false,
      digits: true,
      lowerCaseAlphabets: false,
      upperCaseAlphabets: false,
    });
    console.log(`Generated OTP: ${otp}`);
    const otpExpiry = new Date(Date.now() + 60*10 * 1000); // 30 seconds from now

    const hashedPassword = await bcrypt.hash(password, 10);

    // Send OTP email
    await transporter.sendMail({
      from: 'salongautam4@gmail.com',
      to: email,
      subject: 'Email Verification OTP',
      text: `Your OTP is ${otp}. It will expire in 30 seconds.`,
    });
    console.log('OTP email sent successfully');
    console.log(transporter.options);

    // Insert the new user into the database
    const userResult = await pool.query(
      "INSERT INTO users (firstname, lastname, email, password, address, contact_number, usertype) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, firstname, lastname, email, address, contact_number, usertype",
      [
        firstname,
        lastname,
        email,
        hashedPassword,
        address,
        contact_number,
        usertype,
      ]
    );

    // Save the OTP in the database
    await pool.query(
      "INSERT INTO otp_verification (email, otp, otp_expiry) VALUES ($1, $2, $3)",
      [email, otp, otpExpiry]
    );

    res.status(201).json({
      message: "User registered successfully. OTP sent to email.",
      user: userResult.rows[0],
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(400).json({ error: "Email already exists" });
    }
    console.error("Signup error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: "Email and OTP are required" });
  }

  try {
    // Get OTP details from the database
    const result = await pool.query(
      "SELECT otp, otp_expiry FROM otp_verification WHERE email = $1 ORDER BY otp_expiry DESC LIMIT 1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "No OTP found for this email" });
    }

    const { otp: storedOtp, otp_expiry } = result.rows[0];

    // Check if OTP has expired
    if (new Date() > new Date(otp_expiry)) {
      return res.status(400).json({ error: "OTP has expired" });
    }

    // Compare the entered OTP with the stored OTP
    if (otp !== storedOtp) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    // OTP is valid, you can proceed with the next steps (e.g., activating the user account)
    res.status(200).json({ message: "OTP verified successfully" });

  } catch (error) {
    console.error("OTP verification error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
app.post("/resend-verification", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    // Check if the email exists in the users table
    const user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

    if (user.rows.length === 0) {
      return res.status(404).json({ error: "Email not found" });
    }

    // Check if an OTP exists for the email and whether it has expired
    const otpRecord = await pool.query("SELECT * FROM otp_verification WHERE email = $1 ORDER BY otp_expiry DESC LIMIT 1", [email]);

    let otp, otpExpiry;

    // If OTP exists and hasn't expired, resend it
    if (otpRecord.rows.length > 0 && otpRecord.rows[0].otp_expiry > new Date()) {
      otp = otpRecord.rows[0].otp;
      otpExpiry = otpRecord.rows[0].otp_expiry;
    } else {
      // Generate a new OTP if it's expired or not found
      otp = otpGenerator.generate(6, { upperCase: false, specialChars: false, alphabets: false, digits: true ,lowerCaseAlphabets:false,upperCaseAlphabets:false});
      otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // OTP expires in 10 minutes

      // Save the new OTP in the database
      await pool.query(
        "INSERT INTO otp_verification (email, otp, otp_expiry) VALUES ($1, $2, $3) ON CONFLICT (email) DO UPDATE SET otp = $2, otp_expiry = $3",
        [email, otp, otpExpiry]
      );
    }

    // Send OTP email
    await transporter.sendMail({
      from: 'salongautam4@gmail.com',
      to: email,
      subject: 'Email Verification OTP',
      text: `Your OTP is ${otp}. It will expire in 10 minutes.`,
    });

    res.status(200).json({ message: "OTP resent successfully" });
  } catch (error) {
    console.error("Resend verification error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


app.get("/profile/:id", authenticate, async (req, res) => {
 
  const { id } = req.params;
  const { user } = req;

  if (parseInt(id) !== user.id) {
    return res
      .status(403)
      .json({ error: "You are not authorized to view this profile" });
  }

  try {
    const userdetails = await pool.query("SELECT * FROM users WHERE id = $1", [
      id,
    ]);

    if (userdetails.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(userdetails.rows[0]);
  } catch (error) {
    console.error("Error fetching user details:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// User Login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    // Find user by email
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = result.rows[0];

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid password" });
    }
    const accessToken = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: "1h" } // Access token expires in 1 hour
    );
    // Generate the refresh token
    const refreshToken = jwt.sign(
      { id: user.id, username: user.username },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" } // Refresh token expires in 7 days
    );

    // Store refresh token in the database (or in-memory, Redis, etc. for scaling)
    // Optionally store it in the database for later invalidation if needed.

    // Set the refresh token in HTTP-only cookie
    res.cookie("refresh_token", refreshToken, {
      httpOnly: true, // Ensures the cookie cannot be accessed by JavaScript
      secure: process.env.NODE_ENV === "production", // Only send cookies over HTTPS in production
      sameSite: "Strict", // Protect against CSRF
      maxAge: 7 * 24 * 60 * 60 * 1000, // Refresh token expires in 7 days
    });

    // Send the access token in the response body (client-side will use this)
    res.json({ message: "Login successful", accessToken, userId: user.id });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Weather API (requires authentication)
app.get("/weather", async (req, res) => {
  const city = req.query.city || "dhulikhel";

  const weatherUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&appid=${apiKey}`;

  try {
    const response = await axios.get(weatherUrl);
    const data = response.data;

    // Extract daily forecast
    const dailyForecast = data.list
      .filter((_, index) => index % 8 === 0)
      .slice(0, 7)
      .map((day) => ({
        date: new Date(day.dt * 1000).toLocaleDateString(),
        description: day.weather[0].description,
        temperature: day.main.temp,
        humidity: day.main.humidity,
        wind_speed: day.wind.speed * 3.6, // Convert m/s to km/h
        rainprobability: day.pop,
        main: day.weather[0].main,
      }));
    const currentDate = new Date().toLocaleDateString(); // Today's date
    const hourlyForecast = data.list
      .filter((item) => {
        const itemDate = new Date(item.dt * 1000).toLocaleDateString();
        return itemDate === currentDate;
      })
      .map((hour) => ({
        date: new Date(hour.dt * 1000).toLocaleString(), // Full date and time
        description: hour.weather[0].description,
        temperature: hour.main.temp,
        humidity: hour.main.humidity,
        wind_speed: hour.wind.speed * 3.6, // Convert m/s to km/h
        rainprobability: hour.pop,
        main: hour.weather[0].main,
      }));
    res.json({ forecast: dailyForecast, hourlyForecast: hourlyForecast });
  } catch (error) {
    console.error("Error fetching weather data:", error);
    res.status(500).json({ error: "Error fetching weather data" });
  }
});
app.put("/profile/:id", authenticate, async (req, res) => {
  const { id } = req.params;
  const { firstname, lastname, address, contact_number } = req.body; // Extract fields from request body
  const { user } = req;

  if (parseInt(id) !== user.id) {
    return res.status(403).json({ error: "You are not authorized to update this profile" });
  }

  try {
    // Update user details in the database
    const updatedUser = await pool.query(
      "UPDATE users SET firstname = $1, lastname = $2, address = $3, contact_number = $4 WHERE id = $5 RETURNING *",
      [firstname, lastname, address, contact_number, id]
    );

    if (updatedUser.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      message: "Profile updated successfully",
      user: updatedUser.rows[0],
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
// Route to handle avatar upload
app.put("/profile/:id/avatar", authenticate, upload.single("avatar"), async (req, res) => {
  const { id } = req.params;
  const { user } = req;

  if (parseInt(id) !== user.id) {
    return res.status(403).json({ error: "You are not authorized to update this profile" });
  }

  if (!req.file) {
    return res.status(400).json({ error: "No avatar file uploaded" });
  }

  // Construct the avatar URL
  const avatarUrl = `/uploads/avatars/${req.file.filename}`;

  try {
    // Update user's avatar in the database
    const result = await pool.query(
      "UPDATE users SET avatar = $1 WHERE id = $2 RETURNING id, firstname, lastname, email, avatar",
      [avatarUrl, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      message: "Avatar updated successfully",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating avatar:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/contactus",authenticate, async (req, res) => {
  const { name, email, message } = req.body;
console.log(req.body,"contactus")
 
  if (!name || !email || !message) {
    return res.status(400).json({ error: "All fields are required" });
  }
  const mailOptions = {
    from: email, 
    to: "salongautam3@gmail.com",
    subject:  "Contact Form Agri Nepal",
    text: `From: ${name}\nEmail: ${email}\nMessage: ${message}`,
  };
  try {
    await transporter.sendMail(mailOptions);
    res.status(200).send("Message sent successfully!");
  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to send message.");
  }
})
// Authentication Middleware
function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1]; // Get token from Authorization header


  if (!token) {
    return res.status(401).json({ error: "Authentication token required" });
  }

 
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      if (err.name === "TokenExpiredError") {
        console.log("Token expired");
        return res.status(401).json({ message: "Token expired" });
      }
      return res.status(403).json({ message: "Invalid token" });
    }
   
    req.user = decoded; // Store decoded token data in the request object
    next();
  });
}
// Refresh token route
app.post("/refresh-token", async (req, res) => {
  console.log(req.body)
  const refreshToken =req.body.token; // Get refresh token from request body
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
// Logout route
app.post("/logout", (req, res) => {
  // Clear the refresh token cookie
  res.clearCookie("refresh_token", {
    httpOnly: true,
    secure: true,
    sameSite: "Strict",
  });

  res.json({ message: "Logged out successfully" });
});

// Start the server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
