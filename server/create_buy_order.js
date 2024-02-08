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
  if (!buy_amount) {
    res.status(400).json({
      "message": 'Bad request'
    });
    return;
  }

  const buy_order_id = await createBuyOrderController(buy_amount, user_id)

  if (typeof buy_order_id == 'undefined') {
    return {
      'success': false
    }
  } else {
    return {
      'success': true,
      'buy_order_id': buy_order_id,
    }
  }
}

module.exports = { createBuyOrder }