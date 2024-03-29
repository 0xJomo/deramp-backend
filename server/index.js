// server/index.js

const PORT = process.env.SERVER_PORT;
const express = require("express");
const app = express();
app.use(express.json({ limit: '1mb' }));

const functions = require("firebase-functions");

const cors = require('cors');
// Automatically allow cross-origin requests
app.use(cors({ origin: true }));

const { createBuyOrder } = require('./create_buy_order')
const { verifyBuyOrder } = require('./verify_buy_order')
const { cancelBuyOrder } = require('./cancel_buy_order');
const { checkToken } = require("./authentication");

app.post("/api/auth/check", (req, res) => {
  checkToken(req, res).then((response) => {
    if (response) {
      res.json(response);
    }
  });
});

app.post("/api/orders/buy/create", (req, res) => {
  console.log(req.body)
  createBuyOrder(req, res).then((response) => {
    if (response) {
      res.json(response);
    }
  });
});

app.post("/api/orders/buy/verify", (req, res) => {
  // console.log(req.body)
  verifyBuyOrder(req, res).then((response) => {
    if (response) {
      res.json(response);
    }
  });
});

app.post("/api/orders/buy/cancel", (req, res) => {
  console.log(req.body)
  cancelBuyOrder(req, res).then((response) => {
    if (response) {
      res.json(response);
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});

// Expose Express API as a single Cloud Function:
exports.backend_apis = functions
  .runWith({
    // Ensure the function has enough memory and time
    // to process large files
    timeoutSeconds: 540,
    memory: "2GB",
  })
  .https.onRequest(app);