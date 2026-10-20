const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

// ── Existing Admin Pipeline endpoints ────────────────────────────────────────

export async function submitQuery(queryText, source = "manual") {
  const res = await fetch(`${API_BASE}/queries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: queryText, source }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Server returned error ${res.status}`);
  }
  return res.json();
}

export async function generateQuery(topic = "") {
  const res = await fetch(`${API_BASE}/queries/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Generation failed: ${res.status}`);
  }
  return res.json();
}

export async function fetchMetrics() {
  const res = await fetch(`${API_BASE}/metrics`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load metrics");
  return res.json();
}

export async function fetchHistory(limit = 20, offset = 0) {
  const res = await fetch(`${API_BASE}/queries/history?limit=${limit}&offset=${offset}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to load query history");
  return res.json();
}

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`, { cache: "no-store" });
  if (!res.ok) throw new Error("Health check failed");
  return res.json();
}

// ── RBAC: Customer Portal endpoints ─────────────────────────────────────────

export async function customerSubmitQuery(query, customerName = "Customer") {
  const res = await fetch(`${API_BASE}/customer/queries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, customer_name: customerName }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to submit query: ${res.status}`);
  }
  return res.json();
}

export async function customerGetQuery(queryId) {
  const res = await fetch(`${API_BASE}/customer/queries/${queryId}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Failed to fetch query #${queryId}`);
  return res.json();
}

export async function customerListQueries(customerName) {
  const params = customerName ? `?customer_name=${encodeURIComponent(customerName)}` : "";
  const res = await fetch(`${API_BASE}/customer/queries${params}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to list customer queries");
  return res.json();
}

// ── RBAC: Admin Portal endpoints ─────────────────────────────────────────────

export async function adminListQueries(status) {
  const params = status ? `?status=${encodeURIComponent(status)}` : "";
  const res = await fetch(`${API_BASE}/admin/queries${params}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to list admin queries");
  return res.json();
}

export async function adminGetQuery(queryId) {
  const res = await fetch(`${API_BASE}/admin/queries/${queryId}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch admin query #${queryId}`);
  return res.json();
}

export async function adminProcessQuery(queryId) {
  const res = await fetch(`${API_BASE}/admin/queries/${queryId}/process`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Process failed: ${res.status}`);
  }
  return res.json();
}

export async function adminSendAnswer(queryId, answer) {
  const res = await fetch(`${API_BASE}/admin/queries/${queryId}/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answer }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Send failed: ${res.status}`);
  }
  return res.json();
}

export async function adminDeleteQuery(queryId) {
  const res = await fetch(`${API_BASE}/admin/queries/${queryId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete query");
  return res.json();
}

export async function adminClearAllQueries() {
  const res = await fetch(`${API_BASE}/admin/queries`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to clear queries");
  return res.json();
}

