const admin = require('firebase-admin');
var serviceAccount = require('../firebase_admin.json');
const app = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})

const fetch = require('node-fetch');
const { Headers } = fetch;
const { getFirestore, Timestamp, FieldValue } = require('firebase-admin/firestore');
const db = getFirestore();

const uuid = require('uuid4');

async function createBuyOrderController(buy_amount, code) {
  const sellOrdersRef = db.collection('sell_orders')
  var sell_order_id = 0

  // In the case of a concurrent edit, Cloud Firestore runs the entire transaction again. 
  // For example, if a transaction reads documents and another client modifies any of those documents, 
  // Cloud Firestore retries the transaction. 
  // This feature ensures that the transaction runs on up-to-date and consistent data.
  await db.runTransaction(async (t) => {
    // get an open order that satisfy the buy_amount
    const sellOrders= await t.get(sellOrdersRef.where('balance', '>=', buy_amount).limit(1));

    if (sellOrders._size == 0) {
      console.log('No sell orders satisfy.');
      return
    }
    const sellOrder = sellOrders.docs[0]
    sell_order_id = sellOrder.id
    console.log('Found order:', sellOrder.data())

    // update the sell order, mark the state from open to pending, add a reserved amount field
    const sellOrderRef = sellOrdersRef.doc(sell_order_id)
    console.log(sellOrder.data()['balance'])
    t.update(
      sellOrderRef, 
      {
        'balance': sellOrder.data()['balance'] - buy_amount, 
      }
    )
  });

  // exit if cannot find qualified orders
  if (sell_order_id == 0) {
    return
  }

  // create buy order entry
  const buy_order_id = uuid(4).toString();
  const buy_order = {
    amount: buy_amount,
    sell_order_id: sell_order_id,
    state: 'pending',
    code: code,
  }
  await db.collection('buy_orders').doc(buy_order_id).set(buy_order);
  return buy_order_id;
}


async function commitBuyOrderController(buy_order_id) {
  const buyOrdersRef = db.collection('buy_orders')
  const buyOrderRef = await buyOrdersRef.doc(buy_order_id)
  const buyOrder = await buyOrderRef.get()


  if (buyOrder.data()['state'] != 'pending') {
    return
  }

  await buyOrderRef.set({
    state: 'completed'
  }, { merge: true });

  return buy_order_id;
}

async function cencelBuyOrderController(buy_order_id) {
  const buyOrdersRef = db.collection('buy_orders')
  const buyOrderRef = buyOrdersRef.doc(buy_order_id)
  const buyOrder = await buyOrderRef.get()

  console.log(buyOrder.data())

  if (buyOrder.data()['state'] != 'pending') {
    return
  }

  await db.runTransaction(async (t) => {
    const sellOrdersRef = db.collection('sell_orders')
    const sellOrderRef = sellOrdersRef.doc(buyOrder.data()['sell_order_id'])
    const sellOrder = await sellOrderRef.get();

    console.log('Found order:', sellOrder.data())

    t.update(
      sellOrderRef, 
      {
        'balance': sellOrder.data()['balance'] + buyOrder.data()['amount'], 
      }
    )

    await buyOrderRef.set({
      state: 'cancelled'
    }, { merge: true });
  });

  return buy_order_id;
}



module.exports = { createBuyOrderController, commitBuyOrderController, cencelBuyOrderController };