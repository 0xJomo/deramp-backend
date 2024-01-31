const { PrivyClient } = require('@privy-io/server-auth')

async function authenticate(req, res) {
  const authToken = req.headers.authorization.replace('Bearer ', '');
  try {
    const privy = new PrivyClient('clr6j8vo90019jw0gabarq45g', '5ZmtqJu6UtQQFmXrYXm8YAEkCDzZbHFunXW59hJKae1iJoGHVhnQoLeRsf4hCpfUWi7y3vxjPFSBgD77xRWUgXEJ');
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