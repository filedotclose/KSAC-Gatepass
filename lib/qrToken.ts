import crypto from "crypto";

/**
 * Generates an HMAC-SHA256 based cryptographic token for the QR code.
 * @param secret The session secret
 * @param sessionId The active attendance session ID
 * @param sequence The current incrementing sequence number (1, 2, 3...)
 * @returns { token: string, tsBucket: number }
 */
export function generateQRToken(secret: string, sessionId: string, sequence: number) {
  // We use a 10-second time bucket. Math.floor(Date.now() / 10000)
  const tsBucket = Math.floor(Date.now() / 10000);
  
  const payload = `${sessionId}:${sequence}:${tsBucket}`;
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(payload);
  
  return {
    token: hmac.digest("hex"),
    tsBucket,
  };
}

/**
 * Validates a scanned QR token against the session secret and sequence.
 * @param secret The session secret
 * @param sessionId The session ID
 * @param expectedSequence The CURRENT sequence number on the server
 * @param scannedSequence The sequence number submitted by the scanner
 * @param scannedTsBucket The tsBucket submitted by the scanner
 * @param scannedToken The HMAC token submitted by the scanner
 * @returns true if valid, false otherwise
 */
export function validateQRToken(
  secret: string,
  sessionId: string,
  expectedSequence: number,
  scannedSequence: number,
  scannedTsBucket: number,
  scannedToken: string
): boolean {
  if (
    typeof secret !== "string" ||
    typeof sessionId !== "string" ||
    typeof expectedSequence !== "number" ||
    typeof scannedSequence !== "number" ||
    typeof scannedTsBucket !== "number" ||
    typeof scannedToken !== "string"
  ) {
    return false;
  }

  // 1. Sequence check: allow current or previous sequence (for 5s scan latency)
  if (scannedSequence !== expectedSequence && scannedSequence !== expectedSequence - 1) {
    return false;
  }

  // 2. Time bucket check: allow current or previous time bucket (±10s tolerance)
  const currentTsBucket = Math.floor(Date.now() / 10000);
  if (scannedTsBucket < currentTsBucket - 1 || scannedTsBucket > currentTsBucket) {
    return false;
  }

  // 3. HMAC check
  const payload = `${sessionId}:${scannedSequence}:${scannedTsBucket}`;
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(payload);
  
  const expectedToken = hmac.digest("hex");
  
  try {
    return crypto.timingSafeEqual(Buffer.from(expectedToken, "hex"), Buffer.from(scannedToken, "hex"));
  } catch (e) {
    return false;
  }
}
