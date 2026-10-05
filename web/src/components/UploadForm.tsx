"use client";
import { useRef, useState } from "react";
// Kiest foto's en verstuurt ze meteen; op de telefoon opent dit de camera of de fotorol.
export default function UploadForm({ action, kind, multiple, label, note }: { action: string; kind: "photo" | "logo"; multiple?: boolean; label: string; note?: string }) {
  const ref = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form ref={ref} method="post" action={action} encType="multipart/form-data" style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }} onSubmit={() => setBusy(true)}>
      <input type="hidden" name="kind" value={kind} />
      <label className={kind === "photo" ? "btn btn-primary" : "btn btn-outline"} style={{ cursor: "pointer", opacity: busy ? 0.6 : 1 }}>
        {busy ? "Bezig met uploaden..." : label}
        <input type="file" name="files" accept="image/*" multiple={multiple} style={{ display: "none" }} disabled={busy} onChange={(e) => { if (e.currentTarget.files?.length) { setBusy(true); ref.current?.requestSubmit(); } }} />
      </label>
      {note && <span className="srnote">{note}</span>}
    </form>
  );
}
