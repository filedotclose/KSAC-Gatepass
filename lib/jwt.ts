import jwt from "jsonwebtoken";

const ACCESS_SECRET = process.env.JWT_SECRET!;
const REFRESH_SECRET = process.env.REFRESH_SECRET!;

export function generateAccessToken(user: any) {
  return jwt.sign(
    { id: user._id, role: user.role },
    ACCESS_SECRET,
    { expiresIn: "15m" }
  );
}

export function generateRefreshToken(user: any) {
  return jwt.sign(
    { id: user._id },
    REFRESH_SECRET,
    { expiresIn: "7d" }
  );
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, ACCESS_SECRET);
}
