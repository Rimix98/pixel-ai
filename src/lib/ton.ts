import crypto from "crypto";

const TONCENTER_API = "https://toncenter.com/api/v2/getTransactions";

export const TON_CONFIG = {
  walletAddress: process.env.TON_WALLET_ADDRESS || "",
  proAmount: parseFloat(process.env.TON_PRO_AMOUNT || "1.5"),
  maxAmount: parseFloat(process.env.TON_MAX_AMOUNT || "7.5"),
  orderTtlMinutes: 30,
  amountTolerance: 0.01,
};

export function generateComment(): string {
  const hex = crypto.randomBytes(8).toString("hex");
  return `pay_${hex}`;
}

export function buildDeepLink(address: string, amount: number, comment: string): string {
  const nanoAmount = BigInt(Math.round(amount * 1e9)).toString();
  const encodedComment = encodeURIComponent(comment);
  return `ton://transfer/${address}?amount=${nanoAmount}&text=${encodedComment}`;
}

export function buildTonhubLink(address: string, amount: number, comment: string): string {
  const nanoAmount = BigInt(Math.round(amount * 1e9)).toString();
  return `https://tonhub.com/transfer/${address}?amount=${nanoAmount}&text=${encodeURIComponent(comment)}`;
}

function nanoToTon(nano: string | number): number {
  return Number(BigInt(nano)) / 1e9;
}

function normalizeComment(text: string): string {
  if (!text) return "";
  try {
    const bytes = Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return text;
  }
}

export interface TonTransaction {
  comment: string;
  amount: number;
  lt: number;
  hash: string;
}

export async function fetchRecentTransactions(walletAddress: string): Promise<TonTransaction[]> {
  const url = `${TONCENTER_API}?address=${walletAddress}&limit=20`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Toncenter API error: ${res.status}`);
  }

  const data = await res.json();
  if (!data.result) return [];

  const transactions: TonTransaction[] = [];

  for (const tx of data.result) {
    const inMsg = tx.in_msg;
    if (!inMsg) continue;

    const rawComment = inMsg.message || "";
    const comment = normalizeComment(rawComment);
    const amount = nanoToTon(inMsg.value || "0");

    if (!comment.startsWith("pay_")) continue;

    transactions.push({
      comment,
      amount,
      lt: tx.lt,
      hash: tx.hash,
    });
  }

  return transactions;
}

export function isOrderExpired(createdAt: string, ttlMinutes: number = TON_CONFIG.orderTtlMinutes): boolean {
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  return now - created > ttlMinutes * 60 * 1000;
}

export function getTierAmount(tier: string): number {
  if (tier === "pro") return TON_CONFIG.proAmount;
  if (tier === "max") return TON_CONFIG.maxAmount;
  throw new Error(`Unknown tier: ${tier}`);
}
