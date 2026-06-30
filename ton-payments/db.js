import { randomUUID } from "crypto";

const orders = new Map();
const users = new Map();

export function createOrder(userId, amount, comment) {
  const order = {
    id: randomUUID(),
    userId,
    amount,
    comment,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  orders.set(order.id, order);
  return order;
}

export function findPendingOrders() {
  return [...orders.values()].filter((o) => o.status === "pending");
}

export function completeOrder(orderId) {
  const order = orders.get(orderId);
  if (!order) return null;
  order.status = "completed";
  order.completedAt = new Date().toISOString();
  return order;
}

export function findUser(userId) {
  return users.get(userId) || null;
}

export function upsertUser(userId, data) {
  const existing = users.get(userId) || { userId, isPremium: false };
  users.set(userId, { ...existing, ...data });
  return users.get(userId);
}

export function getOrder(comment) {
  return [...orders.values()].find((o) => o.comment === comment);
}
