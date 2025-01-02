const pool = require("../config/db");
const bcrypt = require("bcrypt");
const setProfile = async (req, res) => {
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
  };
  
const getProfile= async (req, res) => {
 
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
  };
  const putAvatar = async (req, res) => {
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
  };

module.exports = { setProfile, getProfile, putAvatar };
