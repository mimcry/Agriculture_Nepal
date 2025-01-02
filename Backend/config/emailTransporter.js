const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",  // or any other email service you use (e.g., SendGrid, Outlook, etc.)
  auth: {
    user: "salongautam4@gmail.com", // your email address
    pass: "lrli yavn aiej qjxk"   // your email password or an app password (for Gmail, use app passwords)
  }
});

module.exports = transporter;