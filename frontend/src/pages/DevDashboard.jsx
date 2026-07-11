import { useEffect, useState } from "react";
import client from "../api/client.js";
import DashboardLayout from "../components/DashboardLayout.jsx";

export default function DevDashboard() {
  const [tab, setTab] = useState("events");

  return (
    <DashboardLayout
      subtitle="Developer"
      title="System control"
      actions={
        <div className="flex gap-2">
          <TabButton active={tab === "events"} onClick={() => setTab("events")}>
            Events &amp; QR codes
          </TabButton>
          <TabButton active={tab === "staff"} onClick={() => setTab("staff")}>
            Staff accounts
          </TabButton>
        </div>
      }
    >
      {tab === "events" ? <EventsPanel /> : <StaffPanel />}
    </DashboardLayout>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`focus-ring rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active ? "bg-rose-600 text-white" : "border border-blush-200 text-plum-600 hover:bg-blush-50"
      }`}
    >
      {children}
    </button>
  );
}

function EventsPanel() {
  const [events, setEvents] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  function loadEvents() {
    client.get("/events/").then(({ data }) => setEvents(data.results ?? data));
  }

  useEffect(loadEvents, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    setCreating(true);
    try {
      await client.post("/events/", {
        name,
        description,
        frontend_base_url: window.location.origin,
      });
      setName("");
      setDescription("");
      loadEvents();
    } catch {
      setError("Couldn't create the event. Check the name and try again.");
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(ev) {
    await client.patch(`/events/${ev.id}/`, { is_active: !ev.is_active });
    loadEvents();
  }

  return (
    <div className="grid gap-6 md:grid-cols-[320px_1fr]">
      <form onSubmit={handleCreate} className="bg-white rounded-2xl border border-blush-200 p-5 h-fit space-y-4">
        <h2 className="font-display font-semibold text-plum-900">New event</h2>
        <label className="block">
          <span className="block text-sm font-medium text-plum-600 mb-1.5">Event name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="focus-ring w-full rounded-xl border border-blush-200 px-3 py-2.5 bg-blush-50/60"
          />
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-plum-600 mb-1.5">Description (optional)</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="focus-ring w-full rounded-xl border border-blush-200 px-3 py-2.5 bg-blush-50/60"
          />
        </label>
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <button
          disabled={creating}
          className="focus-ring w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white font-semibold rounded-xl py-2.5"
        >
          {creating ? "Creating…" : "Create event + QR code"}
        </button>
      </form>

      <div className="space-y-4">
        {events.map((ev) => (
          <div key={ev.id} className="bg-white rounded-2xl border border-blush-200 p-5 flex gap-5 items-center">
            {ev.qr_code_url && (
              <img src={ev.qr_code_url} alt={`QR code for ${ev.name}`} className="h-24 w-24 rounded-lg border border-blush-100" />
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-display font-semibold text-plum-900">{ev.name}</h3>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    ev.is_active ? "bg-green-100 text-green-700" : "bg-blush-100 text-plum-400"
                  }`}
                >
                  {ev.is_active ? "Open" : "Closed"}
                </span>
              </div>
              <p className="text-sm text-plum-400 mt-1">{ev.registration_count} registered</p>
              <p className="text-xs text-plum-400 mt-1 break-all">
                {window.location.origin}/register/{ev.slug}
              </p>
            </div>
            <button
              onClick={() => toggleActive(ev)}
              className="focus-ring text-sm font-medium border border-blush-200 rounded-lg px-3 py-1.5 hover:bg-blush-50 shrink-0"
            >
              {ev.is_active ? "Close" : "Reopen"}
            </button>
          </div>
        ))}
        {events.length === 0 && (
          <p className="text-sm text-plum-400 text-center py-10">No events yet — create one to get a QR code.</p>
        )}
      </div>
    </div>
  );
}

function StaffPanel() {
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState({ username: "", email: "", password: "", role: "admin" });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  function loadStaff() {
    client.get("/accounts/staff/").then(({ data }) => setStaff(data.results ?? data));
  }

  useEffect(loadStaff, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    setCreating(true);
    try {
      await client.post("/accounts/staff/", form);
      setForm({ username: "", email: "", password: "", role: "admin" });
      loadStaff();
    } catch {
      setError("Couldn't create this account. Username may already be taken.");
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(user) {
    await client.patch(`/accounts/staff/${user.id}/`, { is_active: !user.is_active });
    loadStaff();
  }

  return (
    <div className="grid gap-6 md:grid-cols-[320px_1fr]">
      <form onSubmit={handleCreate} className="bg-white rounded-2xl border border-blush-200 p-5 h-fit space-y-4">
        <h2 className="font-display font-semibold text-plum-900">New staff account</h2>
        <label className="block">
          <span className="block text-sm font-medium text-plum-600 mb-1.5">Username</span>
          <input
            value={form.username}
            onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
            required
            className="focus-ring w-full rounded-xl border border-blush-200 px-3 py-2.5 bg-blush-50/60"
          />
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-plum-600 mb-1.5">Email</span>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            required
            className="focus-ring w-full rounded-xl border border-blush-200 px-3 py-2.5 bg-blush-50/60"
          />
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-plum-600 mb-1.5">Temporary password</span>
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            required
            minLength={8}
            className="focus-ring w-full rounded-xl border border-blush-200 px-3 py-2.5 bg-blush-50/60"
          />
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-plum-600 mb-1.5">Role</span>
          <select
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            className="focus-ring w-full rounded-xl border border-blush-200 px-3 py-2.5 bg-blush-50/60"
          >
            <option value="admin">Administrator</option>
            <option value="dev">Developer</option>
          </select>
        </label>
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <button
          disabled={creating}
          className="focus-ring w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white font-semibold rounded-xl py-2.5"
        >
          {creating ? "Creating…" : "Create account"}
        </button>
      </form>

      <div className="bg-white rounded-2xl border border-blush-200 overflow-hidden h-fit">
        <table className="w-full text-sm">
          <thead className="bg-blush-50 text-plum-600 text-left">
            <tr>
              <th className="px-4 py-3 font-semibold">Username</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold" />
            </tr>
          </thead>
          <tbody>
            {staff.map((u) => (
              <tr key={u.id} className="border-t border-blush-100">
                <td className="px-4 py-3 font-medium text-plum-900">{u.username}</td>
                <td className="px-4 py-3 capitalize">{u.role}</td>
                <td className="px-4 py-3">
                  <span className={u.is_active ? "text-green-700" : "text-plum-400"}>
                    {u.is_active ? "Active" : "Disabled"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => toggleActive(u)}
                    className="focus-ring text-xs font-medium border border-blush-200 rounded-lg px-2.5 py-1 hover:bg-blush-50"
                  >
                    {u.is_active ? "Disable" : "Enable"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
