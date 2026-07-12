import { useEffect, useState } from "react";
import client from "../api/client.js";
import DashboardLayout from "../components/DashboardLayout.jsx";

export default function AdminDashboard() {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState("");
  const [registrations, setRegistrations] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get("/events/").then(({ data }) => {
      const list = data.results ?? data;
      setEvents(list);
      if (list.length && !selectedEvent) setSelectedEvent(String(list[0].id));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (selectedEvent) params.event = selectedEvent;
    if (search) params.search = search;
    client
      .get("/registrations/", { params })
      .then(({ data }) => setRegistrations(data.results ?? data))
      .finally(() => setLoading(false));
  }, [selectedEvent, search]);

  async function handleExport() {
    const { data } = await client.get("/registrations/export/", {
      params: { event: selectedEvent },
      responseType: "blob",
    });
    const url = window.URL.createObjectURL(new Blob([data]));
    const a = document.createElement("a");
    a.href = url;
    a.download = "attendance.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  }

  async function handleExportXlsx() {
    const { data } = await client.get("/registrations/export-xlsx/", {
      params: { event: selectedEvent },
      responseType: "blob",
    });
    const url = window.URL.createObjectURL(new Blob([data]));
    const a = document.createElement("a");
    a.href = url;
    a.download = "attendance.xlsx";
    a.click();
    window.URL.revokeObjectURL(url);
  }

  async function deleteRegistration(r) {
    if (!window.confirm(`Remove ${r.full_name} from this event's check-in list? They'll be able to scan and register again if needed.`)) {
      return;
    }
    await client.delete(`/registrations/${r.id}/`);
    setRegistrations((prev) => prev.filter((reg) => reg.id !== r.id));
  }

  return (
    <DashboardLayout
      subtitle="Administrator"
      title="Registered attendees"
      actions={
        <>
          <select
            value={selectedEvent}
            onChange={(e) => setSelectedEvent(e.target.value)}
            className="focus-ring rounded-lg border border-blush-200 px-3 py-2 bg-white text-sm"
          >
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name}
              </option>
            ))}
          </select>
          <input
            placeholder="Search name, phone, student ID, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="focus-ring flex-1 min-w-[200px] rounded-lg border border-blush-200 px-3 py-2 bg-white text-sm"
          />
          <button
            onClick={handleExport}
            className="focus-ring rounded-lg border border-rose-200 text-rose-600 px-3 py-2 text-sm font-medium hover:bg-rose-50"
          >
            Export CSV
          </button>
          <button
            onClick={handleExportXlsx}
            className="focus-ring rounded-lg border border-rose-200 text-rose-600 px-3 py-2 text-sm font-medium hover:bg-rose-50"
          >
            Export Excel
          </button>
          <button
            onClick={() => window.print()}
            className="focus-ring rounded-lg bg-rose-600 text-white px-3 py-2 text-sm font-medium hover:bg-rose-700"
          >
            Print list
          </button>
        </>
      }
    >
      <div className="bg-white rounded-2xl border border-blush-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-blush-50 text-plum-600 text-left">
            <tr>
              <th className="px-4 py-3 font-semibold">#</th>
              <th className="px-4 py-3 font-semibold">Full name</th>
              <th className="px-4 py-3 font-semibold">Phone</th>
              <th className="px-4 py-3 font-semibold">Student ID</th>
              <th className="px-4 py-3 font-semibold">Institutional email</th>
              <th className="px-4 py-3 font-semibold">Department</th>
              <th className="px-4 py-3 font-semibold">Program</th>
              <th className="px-4 py-3 font-semibold">Level</th>
              <th className="px-4 py-3 font-semibold">Checked in</th>
              <th className="px-4 py-3 font-semibold" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-plum-400">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && registrations.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-plum-400">
                  No registrations yet for this event.
                </td>
              </tr>
            )}
            {!loading &&
              registrations.map((r, i) => (
                <tr key={r.id} className="border-t border-blush-100">
                  <td className="px-4 py-3 text-plum-400">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-plum-900">{r.full_name}</td>
                  <td className="px-4 py-3">{r.phone_number}</td>
                  <td className="px-4 py-3">{r.student_id}</td>
                  <td className="px-4 py-3">{r.institutional_email}</td>
                  <td className="px-4 py-3">{r.department_display}</td>
                  <td className="px-4 py-3">{r.program_of_study_display}</td>
                  <td className="px-4 py-3">{r.academic_year_display}</td>
                  <td className="px-4 py-3 text-plum-400">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => deleteRegistration(r)}
                      className="focus-ring text-xs font-medium border border-red-200 text-red-600 rounded-lg px-2.5 py-1 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-plum-400 mt-3">
        {registrations.length} attendee{registrations.length === 1 ? "" : "s"} shown.
      </p>
    </DashboardLayout>
  );
}
