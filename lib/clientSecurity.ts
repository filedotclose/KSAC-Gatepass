/**
 * Cryptographic & Obfuscation Utilities for Anti-Reverse Engineering & Network Masking
 */

const GATEWAY_SECRET = process.env.JWT_SECRET || "ksac_gateway_internal_salt_2026";

/**
 * Fast client/server obfuscator to prevent plain-text schema inspection in DevTools.
 */
export function obfuscatePayload(data: unknown): string {
  try {
    const jsonStr = JSON.stringify(data);
    if (typeof btoa !== "undefined") {
      return btoa(encodeURIComponent(jsonStr));
    }
    return Buffer.from(encodeURIComponent(jsonStr)).toString("base64");
  } catch {
    return "";
  }
}

/**
 * Decodes obfuscated payload safely on the server.
 */
export function deobfuscatePayload<T = any>(encoded: string): T | null {
  try {
    let jsonStr: string;
    if (typeof atob !== "undefined") {
      jsonStr = decodeURIComponent(atob(encoded));
    } else {
      jsonStr = decodeURIComponent(Buffer.from(encoded, "base64").toString("utf-8"));
    }
    return JSON.parse(jsonStr) as T;
  } catch {
    return null;
  }
}

// In-memory Nonce Cache to prevent Replay Attacks
const usedNonces = new Set<string>();

// Cleanup stale nonces every 2 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    usedNonces.clear();
  }, 2 * 60 * 1000);
}

/**
 * Validates request timestamp and anti-replay nonce.
 * Prevents copied curl/Postman requests from being executed repeatedly.
 */
export function validateGatewayNonce(nonce: string, timestamp: number): { valid: boolean; error?: string } {
  const now = Date.now();
  const MAX_DRIFT_MS = 60 * 1000; // 60 seconds

  if (!nonce || typeof nonce !== "string" || nonce.length < 8) {
    return { valid: false, error: "Missing or malformed security nonce." };
  }

  if (!timestamp || Math.abs(now - timestamp) > MAX_DRIFT_MS) {
    return { valid: false, error: "Request timestamp expired or out of sync." };
  }

  if (usedNonces.has(nonce)) {
    return { valid: false, error: "Security nonce already consumed (Replay attack blocked)." };
  }

  usedNonces.add(nonce);
  return { valid: true };
}

/**
 * Standard Opcodes for the unified Gateway
 */
export const GATEWAY_OPCODES = {
  FETCH_STUDENT_DASHBOARD: "0x01",
  REQUEST_GATEPASS: "0x02",
  REQUEST_ROOM_BOOKING: "0x03",
  ACTION_ROOM_BOOKING: "0x04",
  ACTION_PASS_APPROVE: "0x05",
  RECORD_GATE_MOVEMENT: "0x06",
  FETCH_KSAC_REGISTRY: "0x07",
  FETCH_WARDEN_PASSES: "0x08",
  FETCH_KSAC_PASSES: "0x09",
  FETCH_ROOM_SLOTS: "0x0A",
} as const;
