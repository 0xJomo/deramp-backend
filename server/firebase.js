// server/firebase.js

// const admin = require('firebase-admin');
// var serviceAccount = require('../firebase_admin.json');
// const app = admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount)
// })

const { app } = require('./firestore.js')

const DATABASE_URL = `https://${process.env.PROJECT_ID}-${process.env.RUNTIME_ENV == "dev" ? "default-rtdb" : process.env.RUNTIME_ENV}.firebaseio.com`
const DATABASE_PATH = `${process.env.TEST_ENV_NAME == "" ? "/" : process.env.TEST_ENV_NAME + "/"}`


function getDB() {
  if (process.env.RUNTIME_ENV != "test" && process.env.TEST_ENV_NAME != "") {
    console.log("Invalid ENV settings for database.")
    return null
  }
  if (process.env.RUNTIME_ENV == "test" && process.env.TEST_ENV_NAME == "") {
    console.log("Invalid ENV settings for database.")
    return null
  }
  return app.database(DATABASE_URL)
}

async function getData(path) {
  var data = await getDB().ref(DATABASE_PATH + path).once("value");
  return data.val()
}

async function setData(path, obj) {
  await getDB().ref(DATABASE_PATH + path).update(obj);
}

async function pushToList(path, obj) {
  await getDB().ref(DATABASE_PATH + path).push(obj);
}

async function batchUpdate(updates) {
  await getDB().ref(DATABASE_PATH).update(updates)
}

function registerHook(path, event_name, callback_function) {
  getDB().ref(DATABASE_PATH + path).on(event_name, callback_function)
}

function detachHook(path, event_name, callback_function) {
  getDB().ref(DATABASE_PATH + path).off(event_name, callback_function)
}

module.exports = { getData, setData, pushToList, batchUpdate, registerHook, detachHook }