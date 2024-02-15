const { commitBuyOrderController, getBuyOrderSenderAddressController, getSellOrderReceiverAddressController } = require('./firestore')
const { verifyProofs } = require("../wasm_verifier_lib/pkg")
const { ethers } = require('ethers');
const derampAbi = require('./abi.js');

async function verifyBuyOrder(req, res) {
  const session_proof = req.body.session_proof
  const substrings_proof = req.body.substrings_proof
  const body_start = req.body.body_start

  const buy_order_id = req.body.buy_order_id
  const receiver_address = req.body.receiver_address
  const amount = req.body.amount
  const fee = req.body.fee
  if (!buy_order_id || !receiver_address || !amount) {
    res.status(400).json({
      "message": 'Bad request'
    });
    return;
  }
  // @yuzhang add verification logic

  const notarize_result = JSON.parse(verifyProofs(session_proof, substrings_proof, body_start))
  console.log(notarize_result.sent)
  console.log(JSON.parse(notarize_result.received))

  // TODO (@yuzhang): read the amount from JSON, validate it matches with the buy order
  const transfer_amount = BigInt(amount * 1e18)

  // if verfication passed
  // get data from db
  const [sender_address, sell_order_id] = await getBuyOrderSenderAddressController(buy_order_id)
  const seller_address = await getSellOrderReceiverAddressController(sell_order_id)
  // call smart contract onramp
  const contractAbi = derampAbi;
  const provider = new ethers.providers.JsonRpcProvider(process.env.ETH_NODE_URI);
  const wallet = new ethers.Wallet(process.env.CONTRACT_OWNER_PRIVATE_KEY, provider);
  const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, contractAbi, wallet);
  const functionName = 'onramp';

  try {
    // Call the function
    const result = await contract[functionName](transfer_amount, seller_address, receiver_address);

    console.log('Function result:', result);
  } catch (error) {
    console.error('Error calling contract function:', error.message);
    return {
      'success': false
    }
  }


  // mark the buy order state from pending to complete
  const result = await commitBuyOrderController(buy_order_id)

  if (typeof result == 'undefined') {
    console.log('failed result:', result);
    return {
      'success': false
    }
  } else {
    console.log('success result:', result);
    return {
      'success': true
    }
  }

}

module.exports = { verifyBuyOrder }