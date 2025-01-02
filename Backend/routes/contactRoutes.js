const express = require("express");
const router = express.Router();
const { authenticate } = require('../middleware/authentication');
const transporter = require("../config/emailTransporter");  // Import your transporter configuration

// POST route to handle contact form submissions
router.post("/", authenticate, async (req, res) => {
  const { name, email, message } = req.body;

  console.log(req.body, "contactus");

  if (!name || !email || !message) {
    return res.status(400).json({ error: "All fields are required" });
  }

  const mailOptions = {
    from: email,
    to: "salongautam4@gmail.com",  // Replace with your email
    subject: "Contact Form Agri Nepal",
    text: `From: ${name}\nEmail: ${email}\nMessage: ${message}`,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).send("Message sent successfully!");
  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to send message.");
  }
});

module.exports = router;
