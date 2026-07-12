import { useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../api/client.js";

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await client.post("/auth/login/", {
        username: username.trim(),
        password: password.trim(),
      });
      localStorage.setItem("access_token", data.access);
      localStorage.setItem("refresh_token", data.refresh);
      localStorage.setItem("role", data.role);
      localStorage.setItem("full_name", data.full_name);
      navigate(data.role === "dev" ? "/dev" : "/admin");
    } catch {
      setError("Incorrect username or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-ticket p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-rose-600 font-semibold text-center">
          Staff Access
        </p>
        <h1 className="font-display text-2xl font-semibold text-center mt-1 mb-6 text-plum-900">
          Sign in
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="block text-sm font-medium text-plum-600 mb-1.5">Username</span>
            <input
              className="focus-ring w-full rounded-xl border border-blush-200 px-4 py-3 bg-blush-50/60"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-plum-600 mb-1.5">Password</span>
            <input
              type="password"
              className="focus-ring w-full rounded-xl border border-blush-200 px-4 py-3 bg-blush-50/60"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="focus-ring w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white font-semibold rounded-xl py-3.5 mt-2 transition-colors"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
