const { commitBuyOrderController } = require('./firestore')
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
  // call smart contract onramp
  const contractAbi = derampAbi;
  const contractAddress = '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0'; // Local Address
  const provider = new ethers.providers.JsonRpcProvider("http://localhost:8545");
  const wallet = new ethers.Wallet('2f947b5880d52f9198d0fcb89ca8e6d9f55029fce69fa70adcea6d5abd3abac4', provider);
  const contract = new ethers.Contract(contractAddress, contractAbi, wallet);
  const functionName = 'onramp';

  try {
    // Call the function
    const result = await contract[functionName](1, '0x90F79bf6EB2c4f870365E785982E1f101E93b906', '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC');

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