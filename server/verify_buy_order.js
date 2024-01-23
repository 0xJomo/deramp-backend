const {commitBuyOrderController} = require('./firestore')

async function verifyBuyOrder (req, res) {

  const buy_order_id = req.body.buy_order_id
  if (!buy_order_id) {
    res.status(400).json({
      "message": 'Bad request'
    });
    return;
  }
  // @yuzhang add verification logic

  // if verfication passed
  // mark the buy order state from pending to complete
  await commitBuyOrderController(buy_order_id)
  return {
    'success': true
  }
  
}

module.exports = { verifyBuyOrder }