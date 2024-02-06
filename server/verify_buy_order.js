const { commitBuyOrderController, getBuyOrderSenderAddressController, getSellOrderReceiverAddressController } = require('./firestore')
const { verifyProofs } = require("../wasm_verifier_lib/pkg")
const { ethers } = require('ethers');
const derampAbi = require('./abi.js'); 

async function verifyBuyOrder(req, res) {
  // const session_proof = req.body.session_proof
  // const substrings_proof = req.body.substrings_proof
  // const body_start = req.body.body_start

  const buy_order_id = req.body.buy_order_id
  if (!buy_order_id) {
    res.status(400).json({
      "message": 'Bad request'
    });
    return;
  }
  // @yuzhang add verification logic

  // const notarize_result = JSON.parse(verifyProofs(session_proof, substrings_proof, body_start))
  // console.log(JSON.parse(notarize_result.received))

  // if verfication passed
  // get data from db
  const [sender_address, sell_order_id] = await getBuyOrderSenderAddressController(buy_order_id)
  const receiver_address = await getSellOrderReceiverAddressController(sell_order_id)
  // call smart contract onramp
  const contractAbi = derampAbi;
  const contractAddress = '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0';
  const privateKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
  const provider = new ethers.providers.JsonRpcProvider("http://localhost:8545");
  const wallet = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(contractAddress, contractAbi, wallet);
  const functionName = 'onramp';

  try {
    // Call the function
    const result = await contract[functionName](1, receiver_address, sender_address);

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
    console.log('faled result:', result);
    return {
      'success': false
    }
  } else {
    console.log('faled result:', result);
    return {
      'success': true
    }
  }

}

module.exports = { verifyBuyOrder }