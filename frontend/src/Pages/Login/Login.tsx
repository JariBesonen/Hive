import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./Login.css";

export default function Login() {
  const navigate = useNavigate();
  const { login, loginAsGuest } = useAuth();
  const [identity, setIdentity] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  async function handleGuestLogin(): Promise<void> {
    setErrorMessage("");

    try {
      await loginAsGuest();
      navigate("/");
    } catch (caughtError) {
      setErrorMessage(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to continue as guest.",
      );
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setErrorMessage("");

    try {
      await login(identity, password);
      navigate("/");
    } catch (caughtError) {
      setErrorMessage(
        caughtError instanceof Error ? caughtError.message : "Unable to login.",
      );
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h2>Login to Hive</h2>
        <p className="auth-subtitle">
          Access your feed, communities, and account settings.
        </p>
        <form
          className="auth-form"
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
        >
          <label htmlFor="identity">Username or Email</label>
          <input
            id="identity"
            type="text"
            autoComplete="username"
            value={identity}
            onChange={(event) => {
              setIdentity(event.target.value);
            }}
            required
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
            }}
            required
          />

          <Link className="switch-auth-link" to="/register">
            Don&apos;t have an account? Register
          </Link>
          <button type="submit">Login</button>
        </form>

        <div className="guest-divider" aria-hidden="true">
          <span>or</span>
        </div>
        <button
          type="button"
          className="guest-login-button"
          onClick={() => {
            void handleGuestLogin();
          }}
        >
          Continue as Guest
        </button>
        <p className="guest-warning">
          You are using a temporary guest account. Activity is wiped when you
          log out and cannot be recovered.
        </p>

        {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}
      </section>
    </main>
  );
}
