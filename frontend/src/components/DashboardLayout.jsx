import { logout } from "../utils/auth.js";

export default function DashboardLayout({ title, subtitle, actions, children }) {
  const fullName = localStorage.getItem("full_name");

  return (
    <div className="min-h-screen">
      <header className="no-print bg-white border-b border-blush-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-rose-600 font-semibold">
              {subtitle}
            </p>
            <h1 className="font-display text-xl font-semibold text-plum-900">{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            {fullName && <span className="text-sm text-plum-400 hidden sm:inline">{fullName}</span>}
            <button
              onClick={logout}
              className="focus-ring text-sm font-medium text-rose-600 hover:text-rose-700 border border-rose-200 rounded-lg px-3 py-1.5"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {actions && <div className="no-print mb-6 flex flex-wrap gap-3">{actions}</div>}
        {children}
      </main>
    </div>
  );
}
