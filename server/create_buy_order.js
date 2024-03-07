const { authenticate } = require('./authentication');
const { createBuyOrderController } = require('./firestore')

async function createBuyOrder(req, res) {
  const user = await authenticate(req, res)
  if (!user) {
    return
  }
  console.log(user.id, user.wallet.address)
  const user_id = user.id

  const buy_amount = req.body.buy_amount
  const p2p_platform = req.body.p2p_platform
  const chain = req.body.chain
  if (!buy_amount || !p2p_platform || !chain) {
    res.status(400).json({
      "message": 'Bad request'
    });
    return;
  }

  const buy_order_info = await createBuyOrderController(BigInt(buy_amount * 1e6), user_id, p2p_platform, chain)

  if (typeof buy_order_info == 'undefined') {
    return {
      'success': false
    }
  } else {
    return {
      'success': true,
      'recipient_id': buy_order_info.recipient_id,
      'buy_order_id': buy_order_info.buy_order_id,
    }
  }
}

module.exports = { createBuyOrder }