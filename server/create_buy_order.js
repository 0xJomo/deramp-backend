const {createBuyOrderController} = require('./firestore')

async function createBuyOrder (req, res) {
  const buy_amount = req.body.buy_amount
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