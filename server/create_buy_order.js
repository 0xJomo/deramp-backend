const {createBuyOrderController} = require('./firestore')

async function createBuyOrder (req, res) {
  const buy_amount = req.body.buy_amount
  await createBuyOrderController(buy_amount)

  // @yuzhang add return details
  return {
  }
}

module.exports = { createBuyOrder }