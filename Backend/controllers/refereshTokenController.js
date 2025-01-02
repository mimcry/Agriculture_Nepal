const jwt = require('jsonwebtoken');
const refreshToken= async (req, res) => {
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
};
module.exports = { refreshToken };