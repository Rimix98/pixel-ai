import config from "./config.js";
import { findPendingOrders, completeOrder, getOrder, upsertUser } from "./db.js";

const TONCENTER_API = "https://toncenter.com/api/v2/getTransactions";

function nanoToTon(nano) {
  return Number(BigInt(nano)) / 1e9;
}

function normalizeComment(text) {
  if (!text) return "";
  try {
    const bytes = Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return text;
  }
}

export async function checkPayments() {
  const pending = findPendingOrders();
  if (pending.length === 0) return;

  try {
    const url = `${TONCENTER_API}?address=${config.tonWalletAddress}&limit=20`;
    const res = await fetch(url);

    if (!res.ok) {
      console.error(`[PaymentWorker] Toncenter API error: ${res.status}`);
      return;
    }

    const data = await res.json();
    if (!data.result) {
      console.error("[PaymentWorker] No transactions in response");
      return;
    }

    for (const tx of data.result) {
      const inMsg = tx.in_msg;
      if (!inMsg) continue;

      const rawComment = inMsg.message || "";
      const comment = normalizeComment(rawComment);
      const amountTon = nanoToTon(inMsg.value || "0");

      if (!comment.startsWith("pay_")) continue;

      const order = getOrder(comment);
      if (!order || order.status !== "pending") continue;

      const expectedAmount = order.amount;
      const tolerance = 0.01;
      if (Math.abs(amountTon - expectedAmount) > tolerance) {
        console.warn(
          `[PaymentWorker] Amount mismatch for ${comment}: expected ${expectedAmount}, got ${amountTon}`
        );
        continue;
      }

      completeOrder(order.id);
      upsertUser(order.userId, { isPremium: true });

      console.log(
        `[PaymentWorker] Order ${order.id} completed. User ${order.userId} is now premium.`
      );
    }
  } catch (err) {
    console.error("[PaymentWorker] Error checking payments:", err.message);
  }
}

export function startPaymentWorker() {
  console.log(
    `[PaymentWorker] Starting. Checking every ${30}s for pending orders.`
  );
  setInterval(checkPayments, 30_000);
}
