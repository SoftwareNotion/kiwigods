(async () => {
    const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSs200FXKVI1w2NvKYjbQrD-VQu4Vfz4HxgZSHBzOi4C1jUCkrUTdTS81IbJ-qo8XrWj6XWZMhiCssu/pub?gid=0&single=true&output=csv";

    const res = await fetch(SHEET_CSV_URL);
    if (!res.ok) throw new Error(`Failed to load sheet: ${res.status}`);

    const csv = await res.text();

    const rows = [];
    let row = [];
    let cell = "";
    let inQuotes = false;

    for (let i = 0; i < csv.length; i++) {
        const ch = csv[i];
        const next = csv[i + 1];

        if (ch === '"') {
            if (inQuotes && next === '"') {
                cell += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (ch === "," && !inQuotes) {
            row.push(cell);
            cell = "";
        } else if ((ch === "\n" || ch === "\r") && !inQuotes) {
            if (ch === "\r" && next === "\n") i++;
            row.push(cell);
            rows.push(row);
            row = [];
            cell = "";
        } else {
            cell += ch;
        }
    }
    if (cell.length || row.length) {
        row.push(cell);
        rows.push(row);
    }

    const firstNonEmpty = (r) =>
        (r || []).find((c) => String(c ?? "").trim() !== "")?.trim() || "";

    let pfp = "";
    let description = "";

    const norm = (s) => s.toLowerCase().replace(/\s+/g, " ").trim();

    for (let i = 0; i < rows.length; i++) {
        const text = norm(firstNonEmpty(rows[i]));
        if (!text) continue;

        if (!pfp && text.includes("profile") && (text.includes("pitc") || text.includes("picture"))) {
            for (let j = i + 1; j < rows.length; j++) {
                const v = firstNonEmpty(rows[j]);
                if (v) {
                    pfp = v;
                    break;
                }
            }
        }

        if (!description && text.includes("description")) {
            for (let j = i + 1; j < rows.length; j++) {
                const v = firstNonEmpty(rows[j]);
                if (v) {
                    description = v;
                    break;
                }
            }
        }

        if (pfp && description) break;
    }

    const cacheBust = `cb=${Date.now()}`;
    const pfpNoCache = pfp
        ? (pfp.includes("?") ? `${pfp}&${cacheBust}` : `${pfp}?${cacheBust}`)
        : "";

    const pfpEl = document.getElementById("linked-pfp");
    const descEl = document.getElementById("linked-description");

    if (pfpEl && pfpNoCache) {
        if (pfpEl.tagName === "IMG") {
            pfpEl.src = pfpNoCache;
        } else {
            pfpEl.style.backgroundImage = `url("${pfpNoCache}")`;
            pfpEl.style.backgroundSize = "cover";
            pfpEl.style.backgroundPosition = "center";
        }
    }

    if (descEl) {
        descEl.textContent = description || "";
    }

    if (pfpNoCache) {
        const old = document.querySelector('link[rel="icon"][data-dynamic-favicon="true"]');
        if (old) old.remove();

        // create a new favicon link using the pfp
        const link = document.createElement("link");
        link.rel = "icon";
        link.type = "image/png";
        link.href = pfpNoCache;
        link.setAttribute("data-dynamic-favicon", "true");

        document.head.appendChild(link);
    }


    return { pfp: pfpNoCache, description };
})();
