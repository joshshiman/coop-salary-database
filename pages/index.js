import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Image from "next/image";
import { useTheme } from "../context/ThemeContext";

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

export default function Home({ jobs = [], error }) {
  const { theme, toggleTheme } = useTheme();
  // UI state
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sortKey, setSortKey] = useState("start_date");
  const [sortDir, setSortDir] = useState("desc"); // 'asc' | 'desc'
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
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
    return text
      .split(regex)
      .map((part, idx) =>
        regex.test(part) ? (
          <mark key={idx}>{part}</mark>
        ) : (
          <span key={idx}>{part}</span>
        ),
      );
  };

  return (
    <div className="container-fluid min-vh-100">
      <Head>
        <title>Co-op Salary Database — WLU</title>
        <meta
          name="description"
          content="Community-submitted co-op salary and placement data (WLU)"
        />
      </Head>

      <nav className="navbar navbar-expand-lg">
        <div className="container">
          <a className="navbar-brand logo-font" href="#">
            <Image
              src="/logo.png"
              alt="Co-op salary logo"
              width={40}
              height={40}
              className="d-inline-block align-text-top me-2"
            />
            WLU Co-op Salary
          </a>
          <div className="d-flex align-items-center">
            <button
              className="btn btn-outline-light me-2"
              onClick={() =>
                window.open(
                  "https://docs.google.com/forms/d/e/1FAIpQLSeFOQ8luazEcVEuhHiIWwCsDe_XjQrVAfNW7vPleSP43ZFtyw/viewform?usp=sf_link",
                  "_blank",
                )
              }
            >
              📤 Upload Salary
            </button>
            <button className="btn btn-outline-secondary" onClick={toggleTheme}>
              {theme === "light" ? "🌙" : "☀️"}
            </button>
          </div>
        </div>
      </nav>

      <main className="container mt-4">
        {error ? (
          <div className="alert alert-danger">Error loading data: {error}</div>
        ) : (
          <>
            <div className="card mb-4">
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-lg-12">
                    <label htmlFor="q" className="form-label">
                      Search
                    </label>
                    <input
                      id="q"
                      type="search"
                      className="form-control form-control-lg"
                      value={query}
                      placeholder="Role, company, notes, location..."
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setPage(1);
                      }}
                    />
                  </div>
                  <div className="col-md-4">
                    <label htmlFor="program" className="form-label">
                      Program
                    </label>
                    <select
                      id="program"
                      className="form-select"
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
                  <div className="col-md-4">
                    <label htmlFor="location" className="form-label">
                      Location
                    </label>
                    <select
                      id="location"
                      className="form-select"
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
                  <div className="col-md-4">
                    <label className="form-label">Salary range (CAD/hr)</label>
                    <div className="input-group">
                      <input
                        name="min"
                        type="number"
                        className="form-control"
                        value={activeSalaryFilter[0]}
                        onChange={onSalarySliderChange}
                      />
                      <span className="input-group-text">–</span>
                      <input
                        name="max"
                        type="number"
                        className="form-control"
                        value={activeSalaryFilter[1]}
                        onChange={onSalarySliderChange}
                      />
                    </div>
                    <div className="form-text">
                      Detected: {salaryRange[0]} – {salaryRange[1]}
                    </div>
                  </div>
                  <div className="col-12 d-flex justify-content-between align-items-center">
                    <div>
                      <strong>{total}</strong> results
                    </div>
                    <button
                      className="btn btn-outline-secondary"
                      onClick={clearFilters}
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="d-none d-lg-block">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th
                      onClick={() => toggleSort("role")}
                      className="cursor-pointer"
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <span>Role</span>
                        <span className="sort-arrow">
                          {sortKey === "role" &&
                            (sortDir === "asc" ? "↑" : "↓")}
                        </span>
                      </div>
                    </th>
                    <th
                      onClick={() => toggleSort("company")}
                      className="cursor-pointer"
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <span>Company</span>
                        <span className="sort-arrow">
                          {sortKey === "company" &&
                            (sortDir === "asc" ? "↑" : "↓")}
                        </span>
                      </div>
                    </th>
                    <th
                      onClick={() => toggleSort("salary")}
                      className="cursor-pointer"
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <span>Salary</span>
                        <span className="sort-arrow">
                          {sortKey === "salary" &&
                            (sortDir === "asc" ? "↑" : "↓")}
                        </span>
                      </div>
                    </th>
                    <th
                      onClick={() => toggleSort("location")}
                      className="cursor-pointer"
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <span>Location</span>
                        <span className="sort-arrow">
                          {sortKey === "location" &&
                            (sortDir === "asc" ? "↑" : "↓")}
                        </span>
                      </div>
                    </th>
                    <th
                      onClick={() => toggleSort("start_date")}
                      className="cursor-pointer"
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <span>Start Date</span>
                        <span className="sort-arrow">
                          {sortKey === "start_date" &&
                            (sortDir === "asc" ? "↑" : "↓")}
                        </span>
                      </div>
                    </th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((job) => (
                    <tr key={job.id}>
                      <td>{highlight(job.role || "N/A")}</td>
                      <td>{highlight(job.company || "N/A")}</td>
                      <td>{job.salary ? `$${job.salary} / hr` : "N/A"}</td>
                      <td>{highlight(job.location || "N/A")}</td>
                      <td>{formatDate(job.start_date)}</td>
                      <td>
                        {job.notes ? (
                          <span title={job.notes}>
                            {job.notes.slice(0, 60)}
                            {job.notes.length > 60 ? "…" : ""}
                          </span>
                        ) : (
                          "N/A"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="d-lg-none">
              {pageItems.map((job) => (
                <div key={job.id} className="card mb-3">
                  <div className="card-body">
                    <div className="d-flex justify-content-between">
                      <h5 className="card-title">
                        {highlight(job.role || "N/A")}
                      </h5>
                      <h5>{job.salary ? `$${job.salary}/hr` : "N/A"}</h5>
                    </div>
                    <h6 className="card-subtitle mb-2 text-muted">
                      {highlight(job.company || "N/A")}
                    </h6>
                    <p className="card-text">
                      {highlight(job.location || "N/A")} • {job.program} •{" "}
                      {formatDate(job.start_date)}
                    </p>
                    <p className="card-text">
                      {job.notes ? (
                        <>
                          {job.notes.slice(0, 140)}
                          {job.notes.length > 140 && "…"}
                        </>
                      ) : (
                        <span className="text-muted">No notes</span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {pageItems.length === 0 && (
              <div className="text-center p-5">
                <h3>No results found</h3>
                <p>Try adjusting your filters.</p>
              </div>
            )}

            <nav
              aria-label="Pagination"
              className="d-flex justify-content-center mt-4"
            >
              <ul className="pagination">
                <li className={`page-item ${page === 1 ? "disabled" : ""}`}>
                  <a className="page-link" href="#" onClick={() => setPage(1)}>
                    « First
                  </a>
                </li>
                <li className={`page-item ${page === 1 ? "disabled" : ""}`}>
                  <a
                    className="page-link"
                    href="#"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    ‹ Prev
                  </a>
                </li>
                <li className="page-item disabled">
                  <a className="page-link" href="#">
                    Page {page} / {totalPages}
                  </a>
                </li>
                <li
                  className={`page-item ${page === totalPages ? "disabled" : ""}`}
                >
                  <a
                    className="page-link"
                    href="#"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next ›
                  </a>
                </li>
                <li
                  className={`page-item ${page === totalPages ? "disabled" : ""}`}
                >
                  <a
                    className="page-link"
                    href="#"
                    onClick={() => setPage(totalPages)}
                  >
                    Last »
                  </a>
                </li>
              </ul>
            </nav>
          </>
        )}
      </main>

      <footer className="text-center text-muted py-4">
        <small>Community-submitted — use responsibly.</small>
      </footer>
    </div>
  );
}
