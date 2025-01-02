const pool = require("../config/db");
const bcrypt = require("bcrypt");
const otpGenerator = require("otp-generator");
const jwt = require("jsonwebtoken");
const transporter=require('../config/emailTransporter')

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";


const signup = async (req, res) => {
    const { firstname, lastname, email, password, address, contact_number, usertype } = req.body;
  
    if (!firstname || !lastname || !email || !password || !address || !contact_number || !usertype) {
      return res.status(400).json({ error: "All fields are required" });
    }
  
    try {
      // Check if the email is already verified
      const otpVerificationResult = await pool.query(
        "SELECT is_verified FROM otp_verification WHERE email = $1",
        [email]
      );
  
      if (otpVerificationResult.rows.length > 0) {
        const { is_verified } = otpVerificationResult.rows[0];
  
        // If the email is verified, don't allow registration again
        if (is_verified) {
          return res.status(400).json({ error: "Email is already verified" });
        } else {
          // If the email exists but is not verified, delete the record and proceed with signup
          await pool.query("DELETE FROM otp_verification WHERE email = $1", [email]);
        }
      }
  
      // Check if the email already exists in the users table
      const existingUser = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
      if (existingUser.rows.length > 0) {
        return res.status(400).json({ error: "Email already exists" });
      }
  
      // Generate OTP and set expiry time
      const otp = otpGenerator.generate(6, { upperCase: false, specialChars: false, alphabets: false, digits: true ,lowerCaseAlphabets:false,upperCaseAlphabets:false});
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
      
      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);
  
      // Send OTP email
      await transporter.sendMail({
        from: "your_email@gmail.com",
        to: email,
        subject: "Email Verification OTP",
        text: `Your OTP is ${otp}. It expires in 10 minutes.`,
      });
  
      // Insert the new user into the users table
      await pool.query(
        "INSERT INTO users (firstname, lastname, email, password, address, contact_number, usertype) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [firstname, lastname, email, hashedPassword, address, contact_number, usertype]
      );
  
      // Insert the OTP record into otp_verification table
      await pool.query("INSERT INTO otp_verification (email, otp, otp_expiry) VALUES ($1, $2, $3)", [email, otp, otpExpiry]);
  
      // Respond with a success message
      res.status(201).json({ message: "User registered. OTP sent." });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
  
const login= async (req, res) => {
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
};
const verifyotp= async (req, res) => {
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
      await pool.query("UPDATE otp_verification SET is_verified = TRUE WHERE email = $1", [email]);

      // OTP is valid, you can proceed with the next steps (e.g., activating the user account)
      res.status(200).json({ message: "OTP verified successfully" });
  
    } catch (error) {
      console.error("OTP verification error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
const resendOtp= async (req, res) => {
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
  };
  
module.exports = { signup,login,verifyotp,resendOtp };
