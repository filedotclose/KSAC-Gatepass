import { NextResponse } from "next/server";
import mongoose from "mongoose";

export const MAX_PAYLOAD_BYTES = 50 * 1024; // 50 KB

/**
 * Safely parses and validates JSON body with strict size checks.
 */
export async function parseAndValidateBody<T = any>(
  req: Request
): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse }> {
  try {
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_PAYLOAD_BYTES) {
      return {
        ok: false,
        response: NextResponse.json(
          { message: "Payload Too Large: Request body exceeds maximum allowed size (50 KB)." },
          { status: 413 }
        ),
      };
    }

    const rawText = await req.text();
    if (rawText.length > MAX_PAYLOAD_BYTES) {
      return {
        ok: false,
        response: NextResponse.json(
          { message: "Payload Too Large: Request body exceeds maximum allowed size (50 KB)." },
          { status: 413 }
        ),
      };
    }

    if (!rawText || rawText.trim() === "") {
      return {
        ok: false,
        response: NextResponse.json(
          { message: "Bad Request: Request body is empty." },
          { status: 400 }
        ),
      };
    }

    const data = JSON.parse(rawText);
    return { ok: true, data };
  } catch (error: any) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "Bad Request: Malformed JSON payload." },
        { status: 400 }
      ),
    };
  }
}

/**
 * Strips HTML tags, script elements, and dangerous characters from user input to prevent XSS.
 */
export function sanitizeString(
  input: unknown,
  maxLength = 500,
  fieldName = "Field"
): { valid: boolean; value: string; error?: string } {
  if (input === undefined || input === null) {
    return { valid: true, value: "" };
  }

  // Reject objects/arrays to prevent NoSQL Operator Injection (e.g. { $gt: "" })
  if (typeof input !== "string") {
    return {
      valid: false,
      value: "",
      error: `Invalid input type for ${fieldName}. Must be a plain string.`,
    };
  }

  // Strip script tags and HTML tags
  let sanitized = input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // remove non-printable control chars
    .trim();

  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return { valid: true, value: sanitized };
}

/**
 * Validates and sanitizes email input.
 */
export function sanitizeEmail(email: unknown): { valid: boolean; email: string; error?: string } {
  if (typeof email !== "string") {
    return { valid: false, email: "", error: "Email must be a string." };
  }
  const cleanEmail = email.trim().toLowerCase();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(cleanEmail)) {
    return { valid: false, email: "", error: "Invalid email format." };
  }
  if (!cleanEmail.endsWith("@kiit.ac.in")) {
    return {
      valid: false,
      email: "",
      error: "Access restricted: Only official @kiit.ac.in email addresses are permitted.",
    };
  }
  return { valid: true, email: cleanEmail };
}

/**
 * Validates and sanitizes Roll Number.
 */
export function sanitizeRollNo(rollNo: unknown): { valid: boolean; rollNo: string; error?: string } {
  if (typeof rollNo !== "string") {
    return { valid: false, rollNo: "", error: "Roll number must be a string." };
  }
  const clean = rollNo.trim().toUpperCase();
  if (clean.length > 20 || clean.length < 3) {
    return { valid: false, rollNo: "", error: "Invalid roll number length." };
  }
  // Allow alphanumeric characters only
  if (!/^[A-Z0-9_-]+$/.test(clean)) {
    return { valid: false, rollNo: "", error: "Roll number must contain only alphanumeric characters." };
  }
  return { valid: true, rollNo: clean };
}

/**
 * Validates whether an ID string is a valid MongoDB 24-character hexadecimal ObjectId.
 */
export function isValidMongoId(id: unknown): boolean {
  if (typeof id !== "string") return false;
  return mongoose.Types.ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(id);
}
