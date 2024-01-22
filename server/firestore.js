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

async function createBuyOrderController(buy_amount) {
  const sellOrdersRef = db.collection('sell_orders')
  const buyOrderRef = db.collection('buy_orders')
  var sell_order_id = 0

  // In the case of a concurrent edit, Cloud Firestore runs the entire transaction again. 
  // For example, if a transaction reads documents and another client modifies any of those documents, 
  // Cloud Firestore retries the transaction. 
  // This feature ensures that the transaction runs on up-to-date and consistent data.
  await db.runTransaction(async (t) => {
    // get an open order that satisfy the buy_amount
    const sellOrders= await t.get(sellOrdersRef.where('amount', '>=', buy_amount).where('state', '==', 'open').limit(1));

    if (sellOrders._size == 0) {
      console.log('No sell orders satisfy.');
      return
    }
    const sellOrder = sellOrders.docs[0]
    sell_order_id = sellOrder.id
    console.log('Found order:', sellOrder.data())

    // update the sell order, mark the state from open to pending, add a reserved amount field
    const sellOrderRef = sellOrdersRef.doc(sell_order_id)
    t.update(sellOrderRef, {'state': 'pending', 'pending_amount': buy_amount})
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
    state: 'reserved',
  }
  await db.collection('buy_orders').doc(buy_order_id).set(buy_order);

}



module.exports = { createBuyOrderController };