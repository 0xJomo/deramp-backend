const { commitBuyOrderController, getBuyOrderData, getSellOrderData } = require('./firestore')
const { verifyProofs } = require("../wasm_verifier_lib/pkg")
const { ethers } = require('ethers');
const derampAbi = require('./abi.js');
const { getData, setData } = require('./firebase.js');
const { authenticate } = require('./authentication.js');

async function verifyBuyOrder(req, res) {
  const user = await authenticate(req, res)
  if (!user) {
    return
  }
  const user_id = user.id

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

  const notarize_result = JSON.parse(verifyProofs(session_proof, substrings_proof, body_start))
  const notarized_json = JSON.parse(notarize_result.received)

  // if verfication passed
  // get data from db
  const buy_order_data = await getBuyOrderData(buy_order_id)
  const sell_order_id = buy_order_data["sell_order_id"]
  const sell_order_data = await getSellOrderData(sell_order_id)
  const seller_address = sell_order_data["receiver_address"]
  const chain_name = sell_order_data["chain"]
  const platform = sell_order_data["payment_platform"]

  var transfer_amount = parseFloat(buy_order_data["amount"] / 1e18)

  // Verify the everything with the order matches
  // 1. amount matches or smaller than buy order amount
  transfer_amount = Math.min(transfer_amount, amount)

  // 2. amount matches or smaller than notarized amount
  if (platform === "revolut") {
    const notarized_amount = parseFloat((0 - notarized_json[0].amount) / 100.00)
    transfer_amount = Math.min(transfer_amount, notarized_amount)
  }
  if (platform === "venmo") {
    const notarized_amount = notarized_json.stories[0].amount
    if (!notarized_amount.startsWith("- $")) {
      return {
        success: false,
        reason: "Transfer amount mismatch",
      }
    }
    transfer_amount = Math.min(transfer_amount, parseFloat(notarized_amount.substring(3)))
  }

  // 3. order not already completed
  if (buy_order_data.state === "completed") {
    return {
      success: false,
      reason: "This order has already been fulfilled",
    }
  }

  // 4. user id matches with logged in user
  if (user_id !== buy_order_data.user_id) {
    return {
      success: false,
      reason: "Order not under current account",
    }
  }

  // 5. notarized platform and recipient matches with sell order
  var recipient_match = true
  if (platform === "revolut") {
    const sender_account_id = notarized_json[0].account?.id
    const expected_sent = `GET https://app.revolut.com/api/retail/user/current/transactions/last?count=1&internalPocketId=${sender_account_id}`
    if (!notarize_result.sent.startsWith(expected_sent)) {
      recipient_match = false
    }
    if (notarized_json[0].recipient?.code !== sell_order_data.payment_id) {
      recipient_match = false
    }
  }
  if (platform === "venmo") {
    const sender_account_id = notarized_json.stories[0].title.sender.id
    const receiver_account_id = notarized_json.stories[0].title.receiver.id
    const expected_sent = `GET https://account.venmo.com/api/stories?feedType=betweenYou&otherUserId=${receiver_account_id}&externalId=${sender_account_id}`
    if (!notarize_result.sent.startsWith(expected_sent)) {
      recipient_match = false
    }
    if (notarized_json.stories[0].title.receiver.username !== sell_order_data.payment_id) {
      recipient_match = false
    }
  }

  if (!recipient_match) {
    return {
      success: false,
      reason: "Recipient mismatch",
    }
  }

  // 6. notarized transaction id is unique
  var transaction_id = ""
  if (platform === "revolut") transaction_id = notarized_json[0].id
  if (platform === "venmo") transaction_id = notarized_json.stories[0].id
  const lookupRes = await getData(`used_transaction_id/${platform}/${transaction_id}`)
  if (lookupRes) {
    return {
      success: false,
      reason: "Duplicate transaction",
    }
  }

  // 7. notarized currency is USD
  // 8. notarized category is "transfers"
  // 9. notarized state is "COMPLETED"
  if (platform === "revolut") {
    if (notarized_json[0].currency !== "USD" || notarized_json[0].category !== "transfers" || notarized_json[0].state !== "COMPLETED") {
      return {
        success: false,
        reason: "Wrong transaction metadata",
      }
    }
  }

  // 10. TODO notarized complete date later than order creation date

  // Get the correct node settings to prepare for contract interaction
  const nodeUri = {
    "Sepolia": process.env.ETH_NODE_URI_SEPOLIA,
    "BlastSepolia": process.env.ETH_NODE_URI_BLAST_SEPOLIA,
    "Arbitrum": process.env.ETH_NODE_URI_ARBITRUM,
  }[chain_name]
  const ownerPrivateKey = {
    "Sepolia": process.env.CONTRACT_OWNER_PRIVATE_KEY_SEPOLIA,
    "BlastSepolia": process.env.CONTRACT_OWNER_PRIVATE_KEY_BLAST_SEPOLIA,
    "Arbitrum": process.env.CONTRACT_OWNER_PRIVATE_KEY_ARBITRUM,
  }[chain_name]
  const contractAddress = {
    "Sepolia": process.env.CONTRACT_ADDRESS_SEPOLIA,
    "BlastSepolia": process.env.CONTRACT_ADDRESS_BLAST_SEPOLIA,
    "Arbitrum": process.env.CONTRACT_ADDRESS_ARBITRUM,
  }[chain_name]

  if (!nodeUri) {
    res.status(400).json({
      "message": 'Unsupported chain'
    });
    return;
  }

  // call smart contract onramp
  const contractAbi = derampAbi;
  const provider = new ethers.providers.JsonRpcProvider(nodeUri);
  const wallet = new ethers.Wallet(ownerPrivateKey, provider);
  const contract = new ethers.Contract(contractAddress, contractAbi, wallet);
  const functionName = 'onramp';

  try {
    // Call the function
    const result = await contract[functionName](BigInt(transfer_amount * 1e18), seller_address, receiver_address);

    console.log('Function result:', result);
  } catch (error) {
    console.error('Error calling contract function:', error.message);
    return {
      'success': false,
      'reason': error.message,
    }
  }

  // Write complete notarized data into db to archive
  if (platform === "revolut") {
    setData('completed_orders/' + buy_order_id, {
      timestamp: Date.now(),
      transfer_amount: transfer_amount,
      payment_platform: platform,
      fee: fee,
      notarized_data: {
        id: transaction_id,
        currency: notarized_json[0].currency,
        category: notarized_json[0].category,
        state: notarized_json[0].state,
        amount: notarized_json[0].amount,
        account: notarized_json[0].account,
        recipient: {
          id: notarized_json[0].recipient.id,
          code: notarized_json[0].recipient.code,
        }
      }
    })
  }
  if (platform === "venmo") {
    setData('completed_orders/' + buy_order_id, {
      timestamp: Date.now(),
      transfer_amount: transfer_amount,
      payment_platform: platform,
      fee: fee,
      notarized_data: {
        id: transaction_id,
        amount: notarized_json.stories[0].amount,
        date: notarized_json.stories[0].date,
        type: notarized_json.stories[0].type,
        title: notarized_json.stories[0].title,
      }
    })
  }
  setData(`used_transaction_id/${platform}/${transaction_id}`, {
    "used": true
  })

  // mark the buy order state from pending to complete
  const result = await commitBuyOrderController(buy_order_id)

  if (typeof result == 'undefined') {
    console.log('failed result:', result);
    return {
      'success': false,
      'reason': "Unknown"
    }
  } else {
    console.log('success result:', result);
    return {
      'success': true
    }
  }

}

module.exports = { verifyBuyOrder }