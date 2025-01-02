const jwt = require('jsonwebtoken');

const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'your-refresh-token-secret';
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret';

const refreshToken = async (req, res) => {
  console.log(req.body);

  const refreshToken = req.body.token;

  if (!refreshToken) {
    return res.status(401).json({ error: "Refresh token missing" });
  }

  try {
    // Verify the refresh token
    const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);

    const accessToken = jwt.sign(
      { id: decoded.id, username: decoded.username },
      JWT_SECRET,
      { expiresIn: "7d" } // New access token expires in 1 hour
    );

    res.json({ accessToken });
  } catch (error) {
    res.status(403).json({ error: "Invalid or expired refresh token" });
  }
};

module.exports = { refreshToken };
