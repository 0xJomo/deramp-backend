const { commitBuyOrderController } = require('./firestore')
const { verifyProofs } = require("../wasm_verifier_lib/pkg")

async function verifyBuyOrder(req, res) {
  const session_proof = req.body.session_proof
  const substrings_proof = req.body.substrings_proof
  const body_start = req.body.body_start

  const buy_order_id = req.body.buy_order_id
  if (!buy_order_id) {
    res.status(400).json({
      "message": 'Bad request'
    });
    return;
  }
  // @yuzhang add verification logic

  const notarize_result = JSON.parse(verifyProofs(session_proof, substrings_proof, body_start))
  console.log(JSON.parse(notarize_result.received))

  // if verfication passed
  // mark the buy order state from pending to complete
  const result = await commitBuyOrderController(buy_order_id)

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

module.exports = { verifyBuyOrder }