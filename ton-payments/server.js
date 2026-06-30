import express from "express";
import crypto from "crypto";
import config from "./config.js";
import { createOrder, findUser, getOrder } from "./db.js";
import { startPaymentWorker } from "./paymentWorker.js";

const app = express();
app.use(express.json());

function generateComment() {
  const hex = crypto.randomBytes(8).toString("hex");
  return `pay_${hex}`;
}

function buildDeepLink(address, amount, comment) {
  const nanoAmount = BigInt(Math.round(amount * 1e9)).toString();
  const encodedComment = encodeURIComponent(comment);
  return `ton://transfer/${address}?amount=${nanoAmount}&text=${encodedComment}`;
}

// POST /api/pay/create
app.post("/api/pay/create", async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId || typeof userId !== "string") {
      return res.status(400).json({ error: "userId is required (string)" });
    }

    const comment = generateComment();
    const amount = config.premiumAmount;

    const order = createOrder(userId, amount, comment);

    const deepLink = buildDeepLink(
      config.tonWalletAddress,
      amount,
      comment
    );

    return res.json({
      orderId: order.id,
      walletAddress: config.tonWalletAddress,
      amount,
      amountNano: BigInt(Math.round(amount * 1e9)).toString(),
      comment,
      deepLink,
    });
  } catch (err) {
    console.error("[POST /api/pay/create]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/pay/status/:comment
app.get("/api/pay/status/:comment", async (req, res) => {
  try {
    const { comment } = req.params;
    const order = getOrder(comment);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    return res.json({
      orderId: order.id,
      status: order.status,
      createdAt: order.createdAt,
      completedAt: order.completedAt || null,
    });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/user/:userId
app.get("/api/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const user = findUser(userId);

    return res.json({
      userId,
      isPremium: user?.isPremium || false,
    });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(config.port, () => {
  console.log(`[Server] Running on http://localhost:${config.port}`);
  console.log(`[Server] Wallet: ${config.tonWalletAddress}`);
  console.log(`[Server] Premium amount: ${config.premiumAmount} TON`);
  startPaymentWorker();
});
