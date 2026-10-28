import { randomBytes } from "crypto";
import type { Request, Response } from "express";
import {
  createUser,
  deleteUserById,
  findUserById,
  findUserByIdentity,
  findUserByUsernameOrEmail,
  sanitizeUser,
} from "../models/authModel";
import { hashPassword, verifyPassword } from "../utils/password";

const MAX_USERNAME_LENGTH = 40;
const MAX_EMAIL_LENGTH = 120;

export async function register(req: Request, res: Response): Promise<Response> {
  const { username, email, password } = req.body as {
    username?: string;
    email?: string;
    password?: string;
  };

  if (!username || !email || !password) {
    return res
      .status(400)
      .json({ message: "Username, email, and password are required." });
  }

  const normalizedUsername = username.trim();
  const normalizedEmail = email.trim();

  if (!normalizedUsername || !normalizedEmail) {
    return res
      .status(400)
      .json({ message: "Username and email are required." });
  }

  if (normalizedUsername.length > MAX_USERNAME_LENGTH) {
    return res.status(400).json({ message: "Username is too long." });
  }

  if (normalizedEmail.length > MAX_EMAIL_LENGTH) {
    return res.status(400).json({ message: "Email is too long." });
  }

  if (password.length < 6) {
    return res
      .status(400)
      .json({ message: "Password must be at least 6 characters long." });
  }

  const existingUser = await findUserByUsernameOrEmail(
    normalizedUsername,
    normalizedEmail,
  );
  if (existingUser) {
    return res
      .status(409)
      .json({ message: "Username or email already exists." });
  }

  const passwordHash = hashPassword(password);
  const user = await createUser(
    normalizedUsername,
    normalizedEmail,
    passwordHash,
  );
  req.session.userId = user.id;
  req.session.isGuest = false;

  return res.status(201).json({ user: sanitizeUser(user) });
}

export async function login(req: Request, res: Response): Promise<Response> {
  const { identity, password } = req.body as {
    identity?: string;
    password?: string;
  };

  if (!identity || !password) {
    return res
      .status(400)
      .json({ message: "Identity and password are required." });
  }

  const normalizedIdentity = identity.trim();
  if (!normalizedIdentity) {
    return res.status(400).json({ message: "Identity is required." });
  }

  const user = await findUserByIdentity(normalizedIdentity);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ message: "Invalid credentials." });
  }

  req.session.userId = user.id;
  req.session.isGuest = false;
  return res.status(200).json({ user: sanitizeUser(user) });
}

export async function guest(req: Request, res: Response): Promise<Response> {
  const guestId = randomBytes(6).toString("hex");
  const guestPassword = randomBytes(32).toString("hex");
  const user = await createUser(
    `guest-${guestId}`,
    `guest-${guestId}@hive.invalid`,
    hashPassword(guestPassword),
  );

  req.session.userId = user.id;
  req.session.isGuest = true;
  return res.status(200).json({ user: sanitizeUser(user) });
}

export async function logout(req: Request, res: Response): Promise<void> {
  const guestUserId = req.session.isGuest ? req.session.userId : undefined;

  if (guestUserId) {
    await deleteUserById(guestUserId);
  }

  req.session.destroy((error: Error | null) => {
    if (error) {
      res.status(500).json({ message: "Unable to logout." });
      return;
    }

    res.clearCookie("connect.sid");
    res.status(200).json({ message: "Logged out." });
  });
}

export async function me(req: Request, res: Response): Promise<Response> {
  if (!req.session.userId) {
    return res.status(200).json({ user: null, isGuest: false });
  }

  const user = await findUserById(req.session.userId);
  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  return res.status(200).json({
    user: sanitizeUser(user),
    isGuest: req.session.isGuest === true,
  });
}

export async function deleteAccount(
  req: Request,
  res: Response,
): Promise<Response> {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated." });
  }

  if (req.session.isGuest) {
    return res.status(403).json({
      message: "Guest accounts cannot be deleted.",
    });
  }

  const { confirmation } = req.body as { confirmation?: string };
  if (confirmation !== "DELETE") {
    return res.status(400).json({
      message: "Type DELETE to confirm account deletion.",
    });
  }

  const deleted = await deleteUserById(req.session.userId);
  if (!deleted) {
    return res.status(404).json({ message: "User not found." });
  }

  return new Promise((resolve) => {
    req.session.destroy((error: Error | null) => {
      if (error) {
        resolve(res.status(500).json({ message: "Unable to delete account." }));
        return;
      }

      res.clearCookie("connect.sid");
      resolve(res.status(200).json({ message: "Account deleted." }));
    });
  });
}
