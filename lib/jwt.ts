import jwt from "jsonwebtoken";

function getJwtSecrets() {
  const accessSecret = process.env.JWT_SECRET;
  const refreshSecret = process.env.REFRESH_SECRET;

  if (!accessSecret) {
    throw new Error("Security Misconfiguration: JWT_SECRET environment variable is missing.");
  }
  if (!refreshSecret) {
    throw new Error("Security Misconfiguration: REFRESH_SECRET environment variable is missing.");
  }

  return { accessSecret, refreshSecret };
}

export function generateAccessToken(user: any) {
  const { accessSecret } = getJwtSecrets();
  return jwt.sign(
    { id: user._id, role: user.role },
    accessSecret,
    { expiresIn: "15m" }
  );
}

export function generateRefreshToken(user: any) {
  const { refreshSecret } = getJwtSecrets();
  return jwt.sign(
    { id: user._id },
    refreshSecret,
    { expiresIn: "7d" }
  );
}

export function verifyAccessToken(token: string) {
  const { accessSecret } = getJwtSecrets();
  return jwt.verify(token, accessSecret);
}
