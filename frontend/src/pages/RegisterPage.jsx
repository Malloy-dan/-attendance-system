import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import client from "../api/client.js";
import { getDeviceFingerprint, getLocalRegistration, saveLocalRegistration } from "../utils/device.js";

const initialForm = {
  full_name: "",
  phone_number: "",
  student_id: "",
  institutional_email: "",
  department: "",
  program_of_study: "",
  academic_year: "",
};

// Single source of truth for department → program mapping. Must mirror
// Registration.DEPARTMENT_PROGRAMS on the backend.
const DEPARTMENT_PROGRAMS = {
  computer_science: {
    label: "Department of Computer Science",
    programs: [
      { value: "bsc_computer_science", label: "B.Sc. in Computer Science" },
      { value: "bsc_data_science", label: "B.Sc. in Data Science" },
      { value: "bsc_network_science", label: "B.Sc. in Network Science" },
      { value: "dip_computer_science", label: "Diploma in Computer Science" },
    ],
  },
  information_systems_technology: {
    label: "Department of Information Systems & Technology",
    programs: [
      { value: "bsc_information_technology", label: "B.Sc. in Information Technology" },
      { value: "bsc_information_systems", label: "B.Sc. in Information Systems" },
    ],
  },
  business_computing: {
    label: "Department of Business Computing",
    programs: [
      { value: "bsc_computing_with_accounting", label: "B.Sc. in Computing-With-Accounting" },
    ],
  },
  cyber_security_computer_engineering: {
    label: "Department of Cyber Security & Computer Engineering Technology",
    programs: [
      { value: "bsc_cyber_security", label: "B.Sc. in Cyber Security" },
      { value: "bsc_software_engineering", label: "B.Sc. in Software Engineering" },
      { value: "dip_cyber_security", label: "Diploma in Cyber Security" },
      { value: "dip_software_engineering", label: "Diploma in Software Engineering" },
    ],
  },
};

const DEPARTMENT_OPTIONS = Object.entries(DEPARTMENT_PROGRAMS).map(([value, { label }]) => ({
  value,
  label,
}));

const ACADEMIC_YEAR_OPTIONS = [
  { value: "200", label: "Level 200" },
  { value: "300", label: "Level 300" },
];

export default function RegisterPage() {
  const { eventSlug } = useParams();

  const [phase, setPhase] = useState("loading"); // loading | closed | form | already | success | error
  const [event, setEvent] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function init() {
      const local = getLocalRegistration(eventSlug);
      if (local) {
        setPhase("already");
        return;
      }

      try {
        const { data: eventData } = await client.get(`/public/events/${eventSlug}/`);
        setEvent(eventData);

        const fingerprint = await getDeviceFingerprint();
        const { data: check } = await client.post("/public/check-device/", {
          event_slug: eventSlug,
          device_fingerprint: fingerprint,
        });

        if (check.already_registered) {
          setPhase("already");
        } else {
          setPhase("form");
        }
      } catch (err) {
        setPhase(err.response?.status === 404 ? "closed" : "error");
      }
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventSlug]);

  function updateField(key, value) {
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === "department") next.program_of_study = "";
      return next;
    });
    setFieldErrors((e) => ({ ...e, [key]: undefined, ...(key === "department" ? { program_of_study: undefined } : {}) }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError("");
    setSubmitting(true);
    try {
      const fingerprint = await getDeviceFingerprint();
      await client.post("/public/register/", {
        ...form,
        event_slug: eventSlug,
        device_fingerprint: fingerprint,
      });
      saveLocalRegistration(eventSlug, { full_name: form.full_name });
      setPhase("success");
    } catch (err) {
      const data = err.response?.data;
      if (data?.device) {
        setPhase("already");
      } else if (data && typeof data === "object") {
        setFieldErrors(data);
      } else {
        setSubmitError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <span className="inline-block text-xs tracking-[0.2em] uppercase text-rose-600 font-semibold">
            Attendance Check-In
          </span>
        </div>

        <div className="bg-white rounded-3xl shadow-ticket overflow-hidden">
          {phase === "loading" && <LoadingState />}
          {phase === "closed" && <ClosedState />}
          {phase === "error" && <ErrorState />}
          {phase === "already" && <AlreadyState name={getLocalRegistration(eventSlug)?.full_name} />}
          {phase === "success" && <SuccessState name={form.full_name} eventName={event?.name} />}
          {phase === "form" && (
            <FormState
              event={event}
              form={form}
              updateField={updateField}
              onSubmit={handleSubmit}
              fieldErrors={fieldErrors}
              submitError={submitError}
              submitting={submitting}
            />
          )}
        </div>

        <p className="text-center text-xs text-plum-400 mt-6">
          One registration per device, per event.
        </p>
      </div>
    </div>
  );
}

function TicketHeader({ eyebrow, title }) {
  return (
    <div className="bg-rose-500 px-6 pt-6 pb-8 text-white relative">
      <p className="text-xs uppercase tracking-[0.2em] text-rose-100">{eyebrow}</p>
      <h1 className="font-display text-2xl font-semibold mt-1 leading-snug">{title}</h1>
    </div>
  );
}

function Perforation() {
  return <div className="ticket-perforation -mt-2" />;
}

function FormState({ event, form, updateField, onSubmit, fieldErrors, submitError, submitting }) {
  return (
    <div>
      <TicketHeader eyebrow="You're checking in to" title={event?.name || "This event"} />
      <Perforation />
      <form onSubmit={onSubmit} className="px-6 py-6 space-y-4">
        <Field
          label="Full name"
          value={form.full_name}
          onChange={(v) => updateField("full_name", v)}
          error={fieldErrors.full_name}
          autoComplete="name"
          required
        />
        <Field
          label="Phone number"
          type="tel"
          value={form.phone_number}
          onChange={(v) => updateField("phone_number", v)}
          error={fieldErrors.phone_number}
          autoComplete="tel"
          required
        />
        <Field
          label="Student ID"
          value={form.student_id}
          onChange={(v) => updateField("student_id", v)}
          error={fieldErrors.student_id}
          required
        />
        <Field
          label="Institutional email"
          type="email"
          value={form.institutional_email}
          onChange={(v) => updateField("institutional_email", v)}
          error={fieldErrors.institutional_email}
          autoComplete="email"
          required
        />
        <SelectField
          label="Department"
          value={form.department}
          onChange={(v) => updateField("department", v)}
          error={fieldErrors.department}
          options={DEPARTMENT_OPTIONS}
          required
        />
        <SelectField
          label="Program of study"
          value={form.program_of_study}
          onChange={(v) => updateField("program_of_study", v)}
          error={fieldErrors.program_of_study}
          options={form.department ? DEPARTMENT_PROGRAMS[form.department].programs : []}
          disabled={!form.department}
          required
        />
        <SelectField
          label="Academic year"
          value={form.academic_year}
          onChange={(v) => updateField("academic_year", v)}
          error={fieldErrors.academic_year}
          options={ACADEMIC_YEAR_OPTIONS}
          required
        />

        {submitError && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{submitError}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="focus-ring w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3.5 mt-2 transition-colors"
        >
          {submitting ? "Checking in…" : "Check in"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, error, type = "text", ...rest }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-plum-600 mb-1.5">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`focus-ring w-full rounded-xl border px-4 py-3 text-base bg-blush-50/60 placeholder:text-plum-400 ${
          error ? "border-red-400" : "border-blush-200"
        }`}
        {...rest}
      />
      {error && <span className="text-xs text-red-600 mt-1 block">{error}</span>}
    </label>
  );
}

function SelectField({ label, value, onChange, error, options, disabled, ...rest }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-plum-600 mb-1.5">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`focus-ring w-full rounded-xl border px-4 py-3 text-base bg-blush-50/60 ${
          error ? "border-red-400" : "border-blush-200"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        {...rest}
      >
        <option value="" disabled>
          {disabled ? "Select department first" : `Select ${label.toLowerCase()}`}
        </option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-red-600 mt-1 block">{error}</span>}
    </label>
  );
}

function LoadingState() {
  return (
    <div className="px-6 py-16 flex flex-col items-center gap-3">
      <div className="h-8 w-8 rounded-full border-2 border-rose-200 border-t-rose-500 animate-spin" />
      <p className="text-sm text-plum-400">Loading check-in…</p>
    </div>
  );
}

function ClosedState() {
  return (
    <div className="px-6 py-14 text-center">
      <h2 className="font-display text-xl font-semibold text-plum-900">Check-in closed</h2>
      <p className="text-sm text-plum-400 mt-2">
        This event isn't accepting registrations right now. Please check with the organizer.
      </p>
    </div>
  );
}

function ErrorState() {
  return (
    <div className="px-6 py-14 text-center">
      <h2 className="font-display text-xl font-semibold text-plum-900">Couldn't load this page</h2>
      <p className="text-sm text-plum-400 mt-2">Check your connection and scan the QR code again.</p>
    </div>
  );
}

function AlreadyState({ name }) {
  return (
    <div className="px-6 py-14 text-center">
      <div className="mx-auto h-14 w-14 rounded-full bg-blush-100 flex items-center justify-center mb-4">
        <CheckIcon />
      </div>
      <h2 className="font-display text-xl font-semibold text-plum-900">
        {name ? `You're already checked in, ${name.split(" ")[0]}` : "This device already checked in"}
      </h2>
      <p className="text-sm text-plum-400 mt-2">
        Only one registration is allowed per device for this event.
      </p>
    </div>
  );
}

function SuccessState({ name, eventName }) {
  return (
    <div className="px-6 py-14 text-center">
      <div className="mx-auto h-14 w-14 rounded-full bg-rose-500 flex items-center justify-center mb-4">
        <CheckIcon white />
      </div>
      <h2 className="font-display text-xl font-semibold text-plum-900">
        You're checked in{name ? `, ${name.split(" ")[0]}` : ""}!
      </h2>
      <p className="text-sm text-plum-400 mt-2">
        {eventName ? `Attendance recorded for ${eventName}.` : "Your attendance has been recorded."}
      </p>
    </div>
  );
}

function CheckIcon({ white }) {
  return (
    <svg
      className={`h-7 w-7 ${white ? "text-white" : "text-rose-500"}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}