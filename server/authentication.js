const { PrivyClient } = require('@privy-io/server-auth')

async function authenticate(req, res) {
  const authToken = req.headers.authorization.replace('Bearer ', '');
  try {
    const privy = new PrivyClient('cls2dzxim025hkx0nr1s1xo44', '5hQySB6RTYD4PH4cU1Nw1Ymf6JQ1gkkjyBJrWf4s3T5q2NyJpPhquHCKxBFuaLjzHE2WwdjP4V6uUGS6HYMPV19u');
    const verifiedClaims = await privy.verifyAuthToken(authToken);
    const user = await privy.getUser(verifiedClaims.userId);
    return user
  } catch (error) {
    console.log(`JWT failed to verify with error ${error}.`);
    res.status(401).json({
      "message": 'Not authorized'
    });
    return;
  }
}

module.exports = { authenticate }