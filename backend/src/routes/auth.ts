import { Router } from "express";
import {
  deleteAccount,
  guest,
  login,
  logout,
  me,
  register,
} from "../controllers/authController";
import { createRateLimitMiddleware } from "../middleware/rateLimit";

const authRouter = Router();
const authRateLimit = createRateLimitMiddleware({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: "Too many authentication requests. Please try again later.",
});

authRouter.post("/register", authRateLimit, register);
authRouter.post("/login", authRateLimit, login);
authRouter.post("/guest", authRateLimit, guest);
authRouter.post("/logout", authRateLimit, logout);
authRouter.get("/me", me);
authRouter.delete("/account", authRateLimit, deleteAccount);

export default authRouter;
