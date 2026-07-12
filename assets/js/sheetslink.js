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

    const firstNonEmpty = (currentRow) =>
        (currentRow || []).find((value) => String(value ?? "").trim() !== "")?.trim() || "";

    const norm = (value) => value.toLowerCase().replace(/\s+/g, " ").trim();
    const isProfileHeader = (value) =>
        value.includes("profile") && (value.includes("pitc") || value.includes("picture"));
    const isDescriptionHeader = (value) => value.includes("description");
    const isKnownHeader = (value) => isProfileHeader(value) || isDescriptionHeader(value);

    let pfp = "";
    let undeadBrosPfp = "";
    let description = "";
    const descriptionQuotes = [];

    for (let i = 0; i < rows.length; i++) {
        const text = norm(firstNonEmpty(rows[i]));
        if (!text) continue;

        if (isProfileHeader(text)) {
            for (let j = i + 1; j < rows.length; j++) {
                const value = firstNonEmpty(rows[j]);
                if (!value) continue;

                const normalizedValue = norm(value);
                if (isKnownHeader(normalizedValue)) break;

                if (!pfp) {
                    pfp = value;
                } else if (!undeadBrosPfp) {
                    undeadBrosPfp = value;
                }
                break;
            }
        }

        if (!description && isDescriptionHeader(text)) {
            for (let j = i + 1; j < rows.length; j++) {
                const value = firstNonEmpty(rows[j]);
                if (!value) continue;

                const normalizedValue = norm(value);
                if (isKnownHeader(normalizedValue)) break;

                descriptionQuotes.push(value);
            }

            description = descriptionQuotes[0] || "";
        }

        if (pfp && undeadBrosPfp && description) break;
    }

    const cacheBust = `cb=${Date.now()}`;
    const pfpNoCache = pfp
        ? (pfp.includes("?") ? `${pfp}&${cacheBust}` : `${pfp}?${cacheBust}`)
        : "";
    const undeadBrosPfpNoCache = undeadBrosPfp
        ? (undeadBrosPfp.includes("?") ? `${undeadBrosPfp}&${cacheBust}` : `${undeadBrosPfp}?${cacheBust}`)
        : "";

    const pfpEl = document.getElementById("linked-pfp");
    const undeadBrosPfpEl = document.getElementById("linked-ub-pfp");
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

    if (undeadBrosPfpEl && undeadBrosPfpNoCache) {
        if (undeadBrosPfpEl.tagName === "IMG") {
            undeadBrosPfpEl.src = undeadBrosPfpNoCache;
        } else {
            undeadBrosPfpEl.style.backgroundImage = `url("${undeadBrosPfpNoCache}")`;
            undeadBrosPfpEl.style.backgroundSize = "cover";
            undeadBrosPfpEl.style.backgroundPosition = "center";
        }
    }

    if (descEl) {
        if (descriptionQuotes.length > 1) {
            let quoteIndex = 0;
            const cycleMs = 7000;
            descEl.textContent = descriptionQuotes[quoteIndex];
            descEl.classList.add("animate-fadecycle");
            const updateQuote = () => {
                quoteIndex = (quoteIndex + 1) % descriptionQuotes.length;
                descEl.textContent = descriptionQuotes[quoteIndex];
            };
            const scheduleUpdate = () => setTimeout(updateQuote, cycleMs / 2);
            scheduleUpdate();
            setInterval(scheduleUpdate, cycleMs);
        } else {
            descEl.textContent = description || "";
        }
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


    return { pfp: pfpNoCache, undeadBrosPfp: undeadBrosPfpNoCache, description };
})();
