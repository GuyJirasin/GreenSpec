import { createClient } from "@supabase/supabase-js";
export const configured = Boolean(
  import.meta.env.VITE_SUPABASE_URL &&
    import.meta.env.VITE_SUPABASE_ANON_KEY &&
    !import.meta.env.VITE_SUPABASE_ANON_KEY.includes("replace-"),
);
export const db = configured
  ? createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
    )
  : null;
export const requestId = () => crypto.randomUUID();
const errorText = {
  VERSION_CONFLICT: "Someone changed this record. Load the latest data and review your changes before saving.",
  REVIEW_LOCKED: "This decision is locked. Unlock it before changing the option or wording.",
  UNRESOLVED_REVIEW: "Review every item before finalizing.",
  INPUT_STALE: "Source data changed. Run analysis again before finalizing.",
  OPTION_UNAVAILABLE: "This option is not available in this analysis.",
  WORDING_INVALID: "Enter a revised requirement before saving.",
  EXECUTION_STARTED: "This work has already started. Keep its history and resolve the change before replacing it.",
};
export async function checked(request) {
  const { data, error } = await request;
  if (error) {
    let detail;
    try {
      detail = await error.context?.json();
    } catch {}
    const message = errorText[detail?.code] || Object.entries(errorText).find(([code]) => String(detail?.message || error.message).includes(code))?.[1] || detail?.message || error.message;
    throw Object.assign(new Error(message), error, detail || {}, { message });
  }
  return data;
}
export const rows = (table, project) =>
  checked(db.from(table).select("*").eq("project_id", project));
export const rpc = (name, args) => checked(db.rpc(name, args));
export const invoke = (name, args) =>
  checked(db.functions.invoke(name, { body: args }));
export async function mutate(project, kind, data, record, key = requestId()) {
  return rpc("gs_mutate", {
    p_project_id: project,
    p_kind: kind,
    p_id: record?.id ?? null,
    p_expected_version: record?.row_version ?? null,
    p_data: data,
    p_request_id: key,
  });
}
export async function download(path, bucket = "documents") {
  const { signedUrl } = await checked(
    db.storage.from(bucket).createSignedUrl(path, 300),
  );
  window.open(signedUrl, "_blank", "noopener");
}
export async function checksum(file) {
  const bytes = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(bytes)]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
export function exportFile(name, data, type = "application/json") {
  const url = URL.createObjectURL(
    new Blob(
      [typeof data === "string" ? data : JSON.stringify(data, null, 2)],
      { type },
    ),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
export const money = (value) =>
  value === null || value === undefined
    ? "Unknown"
    : new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 }).format(
        Number(value),
      );
export const stamp = (value) =>
  value
    ? new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Bangkok",
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";
