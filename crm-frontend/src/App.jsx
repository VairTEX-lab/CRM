import { useEffect, useState } from "react";
import "./App.css";
import DealsPipelinePage from "./DealsPipelinePage";
import vairtexLogo from "./assets/vairtex-logo.png";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const AUTH_TOKEN_KEY = "vairtex_crm_auth_token";

function App() {
  const [token, setToken] = useState(() => localStorage.getItem(AUTH_TOKEN_KEY) || "");
  const [currentUser, setCurrentUser] = useState(null);
  const [isCheckingSession, setIsCheckingSession] = useState(Boolean(localStorage.getItem(AUTH_TOKEN_KEY)));
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: ""
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function validateSession() {
      if (!token) {
        setCurrentUser(null);
        setIsCheckingSession(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error("Session expired");
        }

        const data = await response.json();
        setCurrentUser(data.user);
        setErrorMessage("");
      } catch (_error) {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        setToken("");
        setCurrentUser(null);
        setErrorMessage("Please sign in to continue.");
      } finally {
        setIsCheckingSession(false);
      }
    }

    validateSession();
  }, [token]);

  function handleLoginFieldChange(event) {
    const { name, value } = event.target;
    setLoginForm((current) => ({ ...current, [name]: value }));
  }

  async function handleLogin(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(loginForm)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to sign in");
      }

      localStorage.setItem(AUTH_TOKEN_KEY, data.token);
      setToken(data.token);
      setCurrentUser(data.user);
      setLoginForm((current) => ({ ...current, password: "" }));
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setToken("");
    setCurrentUser(null);
    setLoginForm((current) => ({ ...current, password: "" }));
    setErrorMessage("");
  }

  if (isCheckingSession) {
    return (
      <main className="auth-shell">
        <div className="auth-card">
          <p className="auth-muted">Checking your session...</p>
        </div>
      </main>
    );
  }

  if (!token || !currentUser) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <div className="auth-brand">
            <img src={vairtexLogo} alt="VairTEX logo" className="auth-logo" />
            <div>
              <p className="auth-eyebrow">Secure Access</p>
              <p className="auth-muted">
                Sign in to access your pipeline, contacts, deals, and dashboards.
              </p>
            </div>
          </div>

          <form className="auth-form" onSubmit={handleLogin}>
            <label>
              Email
              <input
                name="email"
                type="email"
                value={loginForm.email}
                onChange={handleLoginFieldChange}
                placeholder="Enter your CRM email"
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                value={loginForm.password}
                onChange={handleLoginFieldChange}
                placeholder="Enter your password"
              />
            </label>
            {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Signing In..." : "Sign In"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return <DealsPipelinePage token={token} currentUser={currentUser} onLogout={handleLogout} />;
}

export default App;
