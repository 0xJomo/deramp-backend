const {cencelBuyOrderController} = require('./firestore')

async function cancelBuyOrder (req, res) {
  const buy_order_id = req.body.buy_order_id
  if (!buy_order_id) {
    res.status(400).json({
      "message": 'Bad request'
    });
    return;
  }

  const result = await cencelBuyOrderController(buy_order_id) 

  if (typeof result == 'undefined') {
    return {
      'success': false
    }
  } else {
    return {
      'success': true
    }
  }
}

module.exports = { cancelBuyOrder }