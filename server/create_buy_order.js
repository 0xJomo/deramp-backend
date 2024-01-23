const {createBuyOrderController} = require('./firestore')

async function createBuyOrder (req, res) {
  const buy_amount = req.body.buy_amount
  if (!buy_amount) {
    res.status(400).json({
      "message": 'Bad request'
    });
    return;
  }
  const buy_order_id = await createBuyOrderController(buy_amount)

  if (typeof buy_order_id == 'undefined') {
    return {}
  } else {
    return {
      'buy_order_id': buy_order_id
    }
  }
}

module.exports = { createBuyOrder }