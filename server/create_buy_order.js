const {createBuyOrderController} = require('./firestore')

async function createBuyOrder (req, res) {
  const buy_amount = req.body.buy_amount
  if (!buy_amount) {
    res.status(400).json({
      "message": 'Bad request'
    });
    return;
  }

  const randomCode = Math.floor(100000 + Math.random() * 900000);
  const sixDigitCode = randomCode.toString();

  const buy_order_id = await createBuyOrderController(buy_amount, sixDigitCode)

  if (typeof buy_order_id == 'undefined') {
    return {
      'success': false
    }
  } else {
    return {
      'success': true,
      'buy_order_id': buy_order_id,
      'code': sixDigitCode,
    }
  }
}

module.exports = { createBuyOrder }