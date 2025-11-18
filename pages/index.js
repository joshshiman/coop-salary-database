import { useEffect, useMemo, useState } from "react";
import Head from "next/head";

/**
 * Redesigned responsive frontend for the Co-op Salary Database
 *
 * Features:
 * - Server-side fetch of /api/jobs with robust error handling
 * - Search (debounced), filters (program, location), and salary range slider
 * - Sort (including numeric sort for salary, date parsing for start date)
 * - Pagination with page-size control
 * - Export visible set to CSV
 * - Responsive: table for wide screens, card list for narrow screens
 * - Row details (expand) with permalink and copy-to-clipboard
 * - Accessible controls and minimalistic, modern styling via styled-jsx
 */

/* Server-side fetch to keep the dataset fresh on each request */
export async function getServerSideProps() {
  const base =
    typeof process.env.VERCEL_URL === "string" &&
    process.env.VERCEL_URL.length > 0
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

  try {
    const res = await fetch(`${base}/api/jobs`);
    if (!res.ok) {
      throw new Error(`Failed to load jobs (${res.status})`);
    }
    const jobs = await res.json();
    if (!Array.isArray(jobs)) {
      throw new Error("Invalid data shape from API");
    }

    return { props: { jobs } };
  } catch (err) {
    // Provide empty data and error message to the page
    return { props: { jobs: [], error: err.message || "Unknown error" } };
  }
}

/* Small utilities */
const toNumber = (v) => {
  if (v == null) return NaN;
  if (typeof v === "number") return v;
  const parsed = Number(String(v).replace(/[^\d.-]/g, ""));
  return Number.isNaN(parsed) ? NaN : parsed;
};

const parseDate = (s) => {
  if (!s) return null;
  const d = new Date(s);
  if (!isNaN(d)) return d;
  // try common formats (YYYY-MM-DD or MMM YYYY)
  const parsed = Date.parse(s);
  return isNaN(parsed) ? null : new Date(parsed);
};

const formatDate = (s) => {
  const d = parseDate(s);
  if (!d) return s || "N/A";
  return d.toLocaleDateString();
};

const downloadCSV = (rows) => {
  if (!rows || !rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(",")]
    .concat(
      rows.map((r) =>
        headers
          .map((h) => {
            const v = r[h] == null ? "" : String(r[h]);
            // Escape quotes
            return `"${v.replace(/"/g, '""')}"`;
          })
          .join(","),
      ),
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "coop-salaries-export.csv";
  a.click();
  URL.revokeObjectURL(url);
};

export default function Home({ jobs = [], error }) {
  // UI state
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sortKey, setSortKey] = useState("start_date");
  const [sortDir, setSortDir] = useState("desc"); // 'asc' | 'desc'
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [expandedId, setExpandedId] = useState(null);
  const [salaryRange, setSalaryRange] = useState([0, 0]); // [min,max]
  const [activeSalaryFilter, setActiveSalaryFilter] = useState([0, 0]); // applied
  const [programFilter, setProgramFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");

  /* Debounce the query for 250ms */
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  /* Initialize salary range from data on mount or when jobs change */
  useEffect(() => {
    const numeric = jobs
      .map((j) => toNumber(j.salary))
      .filter((n) => !Number.isNaN(n));
    const min = numeric.length ? Math.min(...numeric) : 0;
    const max = numeric.length ? Math.max(...numeric) : 0;
    setSalaryRange([min, max]);
    setActiveSalaryFilter([min, max]);
  }, [jobs]);

  /* Derived lists for filters */
  const programs = useMemo(() => {
    const setP = new Set();
    jobs.forEach((j) => j.program && setP.add(j.program));
    return ["all", ...Array.from(setP).sort()];
  }, [jobs]);

  const locations = useMemo(() => {
    const setL = new Set();
    jobs.forEach((j) => j.location && setL.add(j.location));
    return ["all", ...Array.from(setL).sort()];
  }, [jobs]);

  /* Filtering */
  const filtered = useMemo(() => {
    const q = debouncedQuery.toLowerCase();
    const [minSalary, maxSalary] = activeSalaryFilter;
    return jobs.filter((j) => {
      // search across several fields
      if (q) {
        const hay =
          `${j.role || ""} ${j.company || ""} ${j.notes || ""} ${j.location || ""} ${j.program || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      const s = toNumber(j.salary);
      if (!Number.isNaN(minSalary) && !Number.isNaN(maxSalary)) {
        if (!Number.isNaN(s) && (s < minSalary || s > maxSalary)) return false;
        // if salary N/A, we still include unless user explicitly sets min>0 and item has no salary
        if (Number.isNaN(s) && minSalary > 0) return false;
      }
      if (programFilter !== "all" && (j.program || "") !== programFilter)
        return false;
      if (locationFilter !== "all" && (j.location || "") !== locationFilter)
        return false;
      return true;
    });
  }, [jobs, debouncedQuery, activeSalaryFilter, programFilter, locationFilter]);

  /* Sorting */
  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let av = a[sortKey];
      let bv = b[sortKey];

      // numeric for salary
      if (sortKey === "salary") {
        av = toNumber(av);
        bv = toNumber(bv);
        if (Number.isNaN(av) && Number.isNaN(bv)) return 0;
        if (Number.isNaN(av)) return sortDir === "asc" ? 1 : -1;
        if (Number.isNaN(bv)) return sortDir === "asc" ? -1 : 1;
        return sortDir === "asc" ? av - bv : bv - av;
      }

      // date for start_date
      if (sortKey === "start_date") {
        const ad = parseDate(av);
        const bd = parseDate(bv);
        if (!ad && !bd) return 0;
        if (!ad) return sortDir === "asc" ? 1 : -1;
        if (!bd) return sortDir === "asc" ? -1 : 1;
        return sortDir === "asc" ? ad - bd : bd - ad;
      }

      // fallback string compare
      const as = (av || "").toString().toLowerCase();
      const bs = (bv || "").toString().toLowerCase();
      if (as < bs) return sortDir === "asc" ? -1 : 1;
      if (as > bs) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  /* Pagination */
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [totalPages]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

  /* Handlers */
  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const onSalarySliderChange = (e) => {
    // simple two inputs: min and max number inputs
    const name = e.target.name;
    const value = Number(e.target.value || 0);
    setActiveSalaryFilter((prev) =>
      name === "min" ? [value, prev[1]] : [prev[0], value],
    );
  };

  const clearFilters = () => {
    setDebouncedQuery("");
    setQuery("");
    setProgramFilter("all");
    setLocationFilter("all");
    setActiveSalaryFilter(salaryRange);
    setSortKey("start_date");
    setSortDir("desc");
  };

  const exportVisibleCSV = () => {
    // export the currently visible (sorted & filtered) dataset (not paginated)
    const exported = sorted.map((r) => ({
      id: r.id,
      role: r.role || "",
      company: r.company || "",
      salary: r.salary || "",
      location: r.location || "",
      start_date: r.start_date || "",
      duration: r.duration || "",
      program: r.program || "",
      notes: (r.notes || "").replace(/\r?\n/g, " "),
    }));
    downloadCSV(exported);
  };

  const copyPermalink = (id) => {
    const url = new URL(window.location.href);
    url.searchParams.set("id", id);
    navigator.clipboard
      .writeText(url.toString())
      .then(() => {
        // small feedback: toggle expanded ID to force re-render for aria-live (we'll use title change)
        setExpandedId(id);
      })
      .catch(() => {
        // ignore
      });
  };

  const highlight = (text) => {
    if (!debouncedQuery) return text;
    const q = debouncedQuery.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
    const regex = new RegExp(`(${q})`, "ig");
    return text.split(regex).map((part, idx) =>
      regex.test(part) ? (
        <mark key={idx} className="highlight">
          {part}
        </mark>
      ) : (
        <span key={idx}>{part}</span>
      ),
    );
  };

  /* Render */
  return (
    <div className="page-root">
      <Head>
        <title>Co-op Salary Database — WLU</title>
        <meta
          name="description"
          content="Community-submitted co-op salary and placement data (WLU)"
        />
      </Head>

      <header className="header">
        <div className="brand">
          <img src="/logo.png" alt="Co-op salary logo" />
          <div>
            <h1>WLU Co-op Salary</h1>
            <p className="tagline">
              Community-driven, searchable co-op salary & placement database
            </p>
          </div>
        </div>

        <div className="actions">
          <button
            className="btn ghost"
            onClick={() =>
              window.open(
                "https://docs.google.com/forms/d/e/1FAIpQLSeFOQ8luazEcVEuhHiIWwCsDe_XjQrVAfNW7vPleSP43ZFtyw/viewform?usp=sf_link",
                "_blank",
              )
            }
          >
            📤 Upload Salary
          </button>
          <button
            className="btn"
            onClick={() => exportVisibleCSV()}
            aria-label="Export visible results to CSV"
          >
            ⤓ Export CSV
          </button>
        </div>
      </header>

      <main className="content">
        {error ? (
          <div className="error">Error loading data: {error}</div>
        ) : (
          <>
            <section className="controls" aria-label="Search and filters">
              <div className="search">
                <label htmlFor="q">🔎 Search</label>
                <input
                  id="q"
                  type="search"
                  value={query}
                  placeholder="Role, company, notes, location..."
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                />
              </div>

              <div className="filter-row">
                <div className="filter">
                  <label htmlFor="program">Program</label>
                  <select
                    id="program"
                    value={programFilter}
                    onChange={(e) => {
                      setProgramFilter(e.target.value);
                      setPage(1);
                    }}
                  >
                    {programs.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="filter">
                  <label htmlFor="location">Location</label>
                  <select
                    id="location"
                    value={locationFilter}
                    onChange={(e) => {
                      setLocationFilter(e.target.value);
                      setPage(1);
                    }}
                  >
                    {locations.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="filter salary-filter" aria-hidden={false}>
                  <label>Salary range (CAD/hr)</label>
                  <div className="salary-inputs">
                    <input
                      name="min"
                      type="number"
                      value={activeSalaryFilter[0]}
                      onChange={onSalarySliderChange}
                    />
                    <span>—</span>
                    <input
                      name="max"
                      type="number"
                      value={activeSalaryFilter[1]}
                      onChange={onSalarySliderChange}
                    />
                  </div>
                  <div className="salary-hint">
                    Detected: {salaryRange[0]} — {salaryRange[1]}
                  </div>
                </div>
              </div>

              <div className="controls-bottom">
                <div className="pager-controls">
                  <label>Sort</label>
                  <div
                    className="sort-buttons"
                    role="tablist"
                    aria-label="Sort options"
                  >
                    <button
                      className={`pill ${sortKey === "role" ? "active" : ""}`}
                      onClick={() => toggleSort("role")}
                    >
                      Role{" "}
                      {sortKey === "role"
                        ? sortDir === "asc"
                          ? "↑"
                          : "↓"
                        : ""}
                    </button>
                    <button
                      className={`pill ${sortKey === "company" ? "active" : ""}`}
                      onClick={() => toggleSort("company")}
                    >
                      Company{" "}
                      {sortKey === "company"
                        ? sortDir === "asc"
                          ? "↑"
                          : "↓"
                        : ""}
                    </button>
                    <button
                      className={`pill ${sortKey === "salary" ? "active" : ""}`}
                      onClick={() => toggleSort("salary")}
                    >
                      Salary{" "}
                      {sortKey === "salary"
                        ? sortDir === "asc"
                          ? "↑"
                          : "↓"
                        : ""}
                    </button>
                    <button
                      className={`pill ${sortKey === "start_date" ? "active" : ""}`}
                      onClick={() => toggleSort("start_date")}
                    >
                      Start Date{" "}
                      {sortKey === "start_date"
                        ? sortDir === "asc"
                          ? "↑"
                          : "↓"
                        : ""}
                    </button>
                  </div>
                </div>

                <div className="pager-controls">
                  <label>Page size</label>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                  >
                    {[10, 20, 50, 100].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pager-controls">
                  <label>Results</label>
                  <div className="result-count">{total} matches</div>
                </div>

                <div className="spacer" />

                <div>
                  <button className="btn ghost" onClick={clearFilters}>
                    Clear
                  </button>
                </div>
              </div>
            </section>

            <section className="list-area" aria-live="polite">
              {/* Responsive: table on wide screens, cards on narrow screens */}
              <div
                className="desktop-table"
                role="table"
                aria-label="Salary results"
              >
                <div className="thead" role="rowgroup">
                  <div className="tr header-row" role="row">
                    <div
                      className="th col-role"
                      role="columnheader"
                      onClick={() => toggleSort("role")}
                    >
                      Role
                    </div>
                    <div
                      className="th col-company"
                      role="columnheader"
                      onClick={() => toggleSort("company")}
                    >
                      Company
                    </div>
                    <div
                      className="th col-salary"
                      role="columnheader"
                      onClick={() => toggleSort("salary")}
                    >
                      Salary
                    </div>
                    <div
                      className="th col-location"
                      role="columnheader"
                      onClick={() => toggleSort("location")}
                    >
                      Location
                    </div>
                    <div
                      className="th col-start"
                      role="columnheader"
                      onClick={() => toggleSort("start_date")}
                    >
                      Start
                    </div>
                    <div className="th col-duration" role="columnheader">
                      Duration
                    </div>
                    <div className="th col-program" role="columnheader">
                      Program
                    </div>
                    <div className="th col-notes" role="columnheader">
                      Notes
                    </div>
                  </div>
                </div>

                <div className="tbody" role="rowgroup">
                  {pageItems.length === 0 ? (
                    <div className="tr empty" role="row">
                      <div className="td" role="cell">
                        No results found.
                      </div>
                    </div>
                  ) : (
                    pageItems.map((job) => (
                      <div
                        key={job.id}
                        className={`tr ${expandedId === job.id ? "expanded" : ""}`}
                        role="row"
                        onClick={() =>
                          setExpandedId(expandedId === job.id ? null : job.id)
                        }
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter")
                            setExpandedId(
                              expandedId === job.id ? null : job.id,
                            );
                        }}
                      >
                        <div className="td col-role" role="cell">
                          {job.role || "N/A"}
                        </div>
                        <div className="td col-company" role="cell">
                          {job.company || "N/A"}
                        </div>
                        <div className="td col-salary" role="cell">
                          {job.salary ? `$${job.salary} / hr` : "N/A"}
                        </div>
                        <div className="td col-location" role="cell">
                          {job.location || "N/A"}
                        </div>
                        <div className="td col-start" role="cell">
                          {formatDate(job.start_date)}
                        </div>
                        <div className="td col-duration" role="cell">
                          {job.duration || "N/A"}
                        </div>
                        <div className="td col-program" role="cell">
                          {job.program || "N/A"}
                        </div>
                        <div className="td col-notes" role="cell">
                          {job.notes ? (
                            <span className="notes-snippet">
                              {job.notes.slice(0, 60)}
                              {job.notes.length > 60 ? "…" : ""}
                            </span>
                          ) : (
                            "N/A"
                          )}
                        </div>

                        {expandedId === job.id && (
                          <div
                            className="expanded-panel"
                            role="region"
                            aria-live="polite"
                          >
                            <div className="panel-row">
                              <div>
                                <strong>Notes:</strong>
                              </div>
                              <div className="notes">{job.notes || "N/A"}</div>
                            </div>
                            <div className="panel-row">
                              <div>
                                <strong>Details:</strong>
                              </div>
                              <div className="detail-grid">
                                <div>
                                  <strong>Role:</strong> {job.role}
                                </div>
                                <div>
                                  <strong>Company:</strong> {job.company}
                                </div>
                                <div>
                                  <strong>Salary:</strong>{" "}
                                  {job.salary ? `$${job.salary} / hr` : "N/A"}
                                </div>
                                <div>
                                  <strong>Location:</strong> {job.location}
                                </div>
                                <div>
                                  <strong>Start:</strong>{" "}
                                  {formatDate(job.start_date)}
                                </div>
                                <div>
                                  <strong>Duration:</strong> {job.duration}
                                </div>
                                <div>
                                  <strong>Program:</strong> {job.program}
                                </div>
                              </div>
                            </div>
                            <div className="panel-actions">
                              <button
                                className="btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyPermalink(job.id);
                                }}
                              >
                                🔗 Copy Permalink
                              </button>
                              <button
                                className="btn ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard?.writeText(
                                    JSON.stringify(job),
                                  );
                                }}
                              >
                                📋 Copy JSON
                              </button>
                              <a
                                className="btn ghost"
                                href={`mailto:?subject=Co-op salary&body=${encodeURIComponent(JSON.stringify(job, null, 2))}`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                ✉️ Share
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Mobile list */}
              <div className="mobile-list" aria-hidden={false}>
                {pageItems.length === 0 ? (
                  <div className="card empty">No results</div>
                ) : (
                  pageItems.map((job) => (
                    <article key={job.id} className="card">
                      <div className="card-top">
                        <div className="card-role">{job.role || "N/A"}</div>
                        <div className="card-salary">
                          {job.salary ? `$${job.salary}/hr` : "N/A"}
                        </div>
                      </div>
                      <div className="card-mid">
                        <div className="company">{job.company}</div>
                        <div className="meta">
                          {job.location} • {job.program} •{" "}
                          {formatDate(job.start_date)}
                        </div>
                      </div>
                      <div className="card-bottom">
                        <div className="notes">
                          {job.notes
                            ? job.notes.slice(0, 140) +
                              (job.notes.length > 140 ? "…" : "")
                            : "No notes"}
                        </div>
                        <div className="card-actions">
                          <button
                            className="btn"
                            onClick={() =>
                              setExpandedId(
                                expandedId === job.id ? null : job.id,
                              )
                            }
                          >
                            Details
                          </button>
                          <button
                            className="btn ghost"
                            onClick={() => copyPermalink(job.id)}
                          >
                            Permalink
                          </button>
                        </div>
                        {expandedId === job.id && (
                          <div className="card-expanded">
                            <pre>{job.notes || "No notes"}</pre>
                          </div>
                        )}
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>

            <nav className="pagination" aria-label="Pagination">
              <div className="page-actions">
                <button
                  className="btn ghost"
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                >
                  « First
                </button>
                <button
                  className="btn ghost"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  ‹ Prev
                </button>
                <span className="page-info">
                  Page {page} / {totalPages}
                </span>
                <button
                  className="btn ghost"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next ›
                </button>
                <button
                  className="btn ghost"
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                >
                  Last »
                </button>
              </div>
            </nav>
          </>
        )}
      </main>

      <footer className="footer">
        <div>
          Community-submitted — use responsibly. Contact the maintainers for
          corrections.
        </div>
      </footer>

      <style jsx>{`
        :global(html, body, #__next) {
          height: 100%;
        }
        .page-root {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: linear-gradient(180deg, #f7f6fb 0%, #ffffff 100%);
          color: #111;
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            "Segoe UI",
            Roboto,
            "Helvetica Neue",
            Arial;
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 18px 20px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
          background: white;
          position: sticky;
          top: 0;
          z-index: 30;
        }
        .brand {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .brand img {
          height: 48px;
          width: 48px;
          object-fit: contain;
          border-radius: 8px;
        }
        .brand h1 {
          margin: 0;
          font-size: 1.1rem;
        }
        .tagline {
          margin: 0;
          font-size: 0.85rem;
          color: #666;
        }

        .actions {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .btn {
          background: #2a1863;
          color: white;
          border: none;
          padding: 8px 12px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
        }
        .btn.ghost {
          background: transparent;
          border: 1px solid rgba(0, 0, 0, 0.08);
          color: #2a1863;
        }

        .content {
          width: 100%;
          max-width: 1200px;
          margin: 18px auto;
          padding: 0 18px 80px;
          flex: 1 0 auto;
        }

        .controls {
          background: white;
          padding: 18px;
          border-radius: 12px;
          box-shadow: 0 6px 18px rgba(12, 13, 21, 0.04);
          margin-bottom: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        /* Search row - label + input aligned and responsive */
        .search {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
        }
        .search label {
          font-weight: 600;
          color: #222;
          white-space: nowrap;
        }
        .search input[type="search"] {
          flex: 1;
          min-width: 220px;
          max-width: 720px;
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid #e6e6ea;
          box-shadow: inset 0 1px 0 rgba(0, 0, 0, 0.02);
          font-size: 0.95rem;
        }
        .filter-row {
          display: flex;
          gap: 12px;
          margin-top: 6px;
          flex-wrap: wrap;
          align-items: center;
        }
        .filter {
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 140px;
        }
        .filter select,
        .filter input[type="number"] {
          padding: 8px 10px;
          border-radius: 8px;
          border: 1px solid #e6e6ea;
          background: #fff;
        }
        .salary-inputs {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .salary-inputs input[type="number"] {
          width: 100px;
          padding: 8px 10px;
          border-radius: 8px;
          border: 1px solid #e6e6ea;
        }
        .salary-inputs span {
          color: #666;
          padding: 0 6px;
        }
        .salary-hint {
          font-size: 0.78rem;
          color: #666;
          margin-top: 6px;
        }

        .controls-bottom {
          display: flex;
          gap: 12px;
          align-items: center;
          margin-top: 12px;
          flex-wrap: wrap;
          justify-content: space-between;
        }
        .controls-bottom .pager-controls {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .controls-bottom .spacer {
          flex: 1 1 auto;
        }
        .pill {
          padding: 6px 10px;
          border-radius: 999px;
          background: #f3f2f8;
          border: none;
          cursor: pointer;
        }
        .pill.active {
          background: #2a1863;
          color: white;
        }

        .list-area {
          display: block;
        }

        /* Table */
        .desktop-table {
          display: block;
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(16, 18, 20, 0.04);
        }
        .thead {
          background: #f8f8fb;
          border-bottom: 1px solid #eee;
        }
        .tr {
          display: grid;
          grid-template-columns: 2fr 1.6fr 1fr 1fr 0.9fr 0.8fr 0.9fr 1.8fr;
          gap: 0;
          align-items: center;
          padding: 10px 12px;
          cursor: pointer;
        }
        .header-row {
          font-weight: 600;
          font-size: 0.9rem;
          cursor: default;
        }
        .tr:not(.header-row):hover {
          background: #fbfbff;
        }
        .td {
          padding: 8px 12px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.04);
        }
        .empty .td {
          grid-column: 1 / -1;
          padding: 28px;
          text-align: center;
          color: #666;
        }
        .notes-snippet {
          color: #444;
          font-size: 0.9rem;
        }

        .expanded-panel {
          grid-column: 1 / -1;
          padding: 12px;
          background: #fafafa;
          border-top: 1px dashed rgba(0, 0, 0, 0.06);
        }
        .panel-row {
          display: flex;
          gap: 12px;
          margin-bottom: 8px;
        }
        .detail-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }
        .panel-actions {
          display: flex;
          gap: 8px;
          margin-top: 8px;
        }

        /* Mobile cards */
        .mobile-list {
          display: none;
        }
        .card {
          background: white;
          padding: 12px;
          border-radius: 10px;
          margin-bottom: 10px;
          box-shadow: 0 6px 18px rgba(12, 13, 21, 0.04);
        }
        .card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .card-role {
          font-weight: 700;
        }
        .card-salary {
          color: #2a1863;
          font-weight: 700;
        }
        .card-mid .company {
          font-weight: 600;
        }
        .card-mid .meta {
          color: #666;
          font-size: 0.9rem;
        }
        .card-bottom .notes {
          margin-top: 8px;
          color: #444;
        }
        .card-actions {
          display: flex;
          gap: 8px;
          margin-top: 8px;
        }

        .pagination {
          display: flex;
          justify-content: center;
          margin-top: 16px;
          gap: 8px;
        }
        .page-actions {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
        }

        .footer {
          padding: 18px;
          text-align: center;
          color: #666;
          font-size: 0.9rem;
          background: transparent;
        }

        .error {
          color: #7a1723;
          background: #fff1f1;
          padding: 12px;
          border-radius: 8px;
        }

        .highlight {
          background: #fff3a0;
          padding: 0 2px;
          border-radius: 3px;
        }

        /* Responsive breakpoints */
        @media (max-width: 900px) {
          .desktop-table {
            display: none;
          }
          .mobile-list {
            display: block;
          }
          .filter-row {
            gap: 8px;
          }
          .controls-bottom {
            gap: 8px;
          }
          .brand h1 {
            font-size: 1rem;
          }
        }

        @media (max-width: 600px) {
          .header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
          .actions {
            width: 100%;
            justify-content: space-between;
          }
          .search input {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
