"use client"

import { useEffect, useState } from "react"
import "../../Components/Layout/Page.css"

const AdminVendors = () => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState("")
  const [expandedVendor, setExpandedVendor] = useState(null)
  const API = process.env.REACT_APP_API_URL || "http://localhost:5000"

  // =========================
  // LOAD VENDORS
  // =========================
  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken")
        const headers = token ? { Authorization: `Bearer ${token}` } : {}
        const res = await fetch(`${API}/api/admin/vendors`, { headers })
        const json = await res.json().catch(() => ({}))

        if (!mounted) return

        if (!res.ok) {
          setErr(json.message || "Failed to load vendors")
        } else {
          setData(json.data || [])
        }
      } catch (e) {
        if (!mounted) return
        setErr("Network error")
        console.error(e)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [API])

  // =========================
  // ACTION HANDLERS
  // =========================
  const getAuthHeaders = () => {
    const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken")
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const handleApprove = async (username) => {
    try {
      const headers = getAuthHeaders()
      const res = await fetch(`${API}/api/admin/vendors/${username}/approve`, {
        method: "PATCH",
        headers,
      })
      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        alert(json.message || `Failed to approve (${res.status})`)
        return
      }

      const updatedVendor = json.data || { status: "approved" }
      setData((prev) => prev.map((p) => (p.username === username ? { ...p, ...updatedVendor } : p)))
      alert("Vendor approved successfully!")
    } catch (err) {
      console.error("Approve error:", err)
      alert("Network error: " + err.message)
    }
  }

  const handleDecline = async (username) => {
    if (!window.confirm("Are you sure you want to decline this vendor?")) return
    try {
      const headers = getAuthHeaders()
      const res = await fetch(`${API}/api/admin/vendors/${username}/decline`, {
        method: "PATCH",
        headers,
      })
      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        alert(json.message || "Failed to decline")
        return
      }

      const updatedVendor = json.data || { status: "declined" }
      setData((prev) => prev.map((p) => (p.username === username ? { ...p, ...updatedVendor } : p)))
      alert("Vendor declined!")
    } catch (err) {
      console.error("Decline error:", err)
      alert("Network error: " + err.message)
    }
  }

  const handleHold = async (username) => {
    if (!window.confirm("Put this vendor on hold?")) return
    try {
      const headers = getAuthHeaders()
      const res = await fetch(`${API}/api/admin/vendors/${username}/hold`, {
        method: "PATCH",
        headers,
      })
      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        alert(json.message || "Failed to put vendor on hold")
        return
      }

      const updatedVendor = json.data || { status: "held" }
      setData((prev) => prev.map((p) => (p.username === username ? { ...p, ...updatedVendor } : p)))
      alert("Vendor put on hold!")
    } catch (err) {
      console.error("Hold error:", err)
      alert("Network error: " + err.message)
    }
  }

  const handleReactivate = async (username) => {
    if (!window.confirm("Reactivate this vendor?")) return
    try {
      const headers = getAuthHeaders()
      const res = await fetch(`${API}/api/admin/vendors/${username}/reactivate`, {
        method: "PATCH",
        headers,
      })
      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        alert(json.message || "Failed to reactivate")
        return
      }

      const updatedVendor = json.data || { status: "approved" }
      setData((prev) => prev.map((p) => (p.username === username ? { ...p, ...updatedVendor } : p)))
      alert("Vendor reactivated!")
    } catch (err) {
      console.error("Reactivate error:", err)
      alert("Network error: " + err.message)
    }
  }

  const handleRemove = async (username) => {
    if (!window.confirm("Are you sure you want to permanently remove this vendor?")) return
    try {
      const headers = getAuthHeaders()
      const res = await fetch(`${API}/api/admin/vendors/${username}/remove`, {
        method: "PATCH",
        headers,
      })
      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        alert(json.message || `Failed to remove vendor (${res.status})`)
        return
      }

      const updatedVendor = json.data || { status: "removed" }
      setData((prev) => prev.map((p) => (p.username === username ? { ...p, ...updatedVendor } : p)))
      alert("Vendor removed successfully!")
    } catch (err) {
      console.error("Remove error:", err)
      alert("Network error: " + err.message)
    }
  }

  const getStatusClass = (status) => status || "pending"

  // =========================
  // LOADING / ERROR STATES
  // =========================
  if (loading)
    return (
      <div className="page">
        <div className="panel">Loading vendors…</div>
      </div>
    )

  if (err)
    return (
      <div className="page">
        <div className="panel" style={{ color: "#ef4444" }}>
          {err}
        </div>
      </div>
    )

  if (!data.length)
    return (
      <div className="page">
        <h2>Vendor Management</h2>
        <p className="page-subtitle">Manage and review vendor applications</p>
        <div className="panel">No vendors yet.</div>
      </div>
    )

  // =========================
  // MAIN UI
  // =========================
  return (
    <div className="page">
      <h2>Vendor Management</h2>
      <p className="page-subtitle">
        Review and manage vendor applications • Approve, hold, decline, reactivate, or remove vendors
      </p>

      <div style={{ marginBottom: "32px" }}>
        <h4
          style={{
            marginBottom: "16px",
            color: "var(--text-secondary)",
            fontSize: "13px",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            fontWeight: "700",
          }}
        >
          Vendors
        </h4>

        <div className="vendor-carousel">
          {data.map((v) => (
            <div key={v._id} className="vendor-card" onClick={() => setExpandedVendor(v)}>
              <div className="vendor-card-header">
                <div className="vendor-card-name">{v.companyName || v.username}</div>
                <div className={`vendor-status-badge ${getStatusClass(v.status || "pending")}`}>
                  {(v.status || "pending").charAt(0).toUpperCase() + (v.status || "pending").slice(1)}
                </div>
              </div>

              <div className="vendor-card-info">
                <div className="vendor-card-row">
                  <div className="vendor-card-label">Username</div>
                  <div className="vendor-card-value">{v.username}</div>
                </div>
                <div className="vendor-card-row">
                  <div className="vendor-card-label">Email</div>
                  <div className="vendor-card-value">{v.email}</div>
                </div>
                <div className="vendor-card-row">
                  <div className="vendor-card-label">Phone</div>
                  <div className="vendor-card-value">{v.phone || "—"}</div>
                </div>
              </div>

              <p style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>Click to expand →</p>
            </div>
          ))}
        </div>
      </div>

      {/* ================= EXPANDED VENDOR MODAL ================= */}
      {expandedVendor && (
        <>
          <div className="vendor-overlay active" onClick={() => setExpandedVendor(null)} />
          <div className="vendor-card expanded">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "24px",
              }}
            >
              <div>
                <div className="vendor-card-name">
                  {expandedVendor.companyName || expandedVendor.username}
                </div>
                <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px" }}>
                  @{expandedVendor.username}
                </div>
              </div>
              <button
                onClick={() => setExpandedVendor(null)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  color: "var(--text-secondary)",
                }}
              >
                ×
              </button>
            </div>

            <div className="vendor-card-info" style={{ marginBottom: "24px" }}>
              <div className="vendor-card-row">
                <div className="vendor-card-label">Full Name</div>
                <div className="vendor-card-value">{expandedVendor.fullName || "—"}</div>
              </div>
              <div className="vendor-card-row">
                <div className="vendor-card-label">Company</div>
                <div className="vendor-card-value">{expandedVendor.companyName || "—"}</div>
              </div>
              <div className="vendor-card-row">
                <div className="vendor-card-label">Email</div>
                <div className="vendor-card-value">{expandedVendor.email}</div>
              </div>
              <div className="vendor-card-row">
                <div className="vendor-card-label">Phone</div>
                <div className="vendor-card-value">{expandedVendor.phone || "—"}</div>
              </div>
              <div className="vendor-card-row">
                <div className="vendor-card-label">Status</div>
                <div
                  className={`vendor-status-badge ${getStatusClass(expandedVendor.status || "pending")}`}
                  style={{ marginTop: "4px" }}
                >
                  {(expandedVendor.status || "pending").charAt(0).toUpperCase() +
                    (expandedVendor.status || "pending").slice(1)}
                </div>
              </div>
            </div>

            {/* ====== ACTIONS (status-based) ====== */}
            <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: "20px" }}>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: "700",
                  color: "var(--text-secondary)",
                  marginBottom: "16px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Actions
              </div>

              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                {(() => {
                  const status = (expandedVendor.status || "pending").toLowerCase()

                  // PENDING → Approve / Decline
                  if (status === "pending") {
                    return (
                      <>
                        <button
                          onClick={() => {
                            handleApprove(expandedVendor.username)
                            setExpandedVendor(null)
                          }}
                          style={{
                            padding: "10px 20px",
                            background: "rgba(45, 212, 191, 0.15)",
                            color: "#1ca89f",
                            border: "1px solid rgba(45, 212, 191, 0.3)",
                            borderRadius: "8px",
                            cursor: "pointer",
                            fontWeight: "700",
                            fontSize: "12px",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            transition: "all 0.2s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = "rgba(45, 212, 191, 0.25)"
                            e.target.style.transform = "translateY(-2px)"
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = "rgba(45, 212, 191, 0.15)"
                            e.target.style.transform = "translateY(0)"
                          }}
                        >
                          Approve
                        </button>

                        <button
                          onClick={() => {
                            handleDecline(expandedVendor.username)
                            setExpandedVendor(null)
                          }}
                          style={{
                            padding: "10px 20px",
                            background: "rgba(239, 68, 68, 0.15)",
                            color: "#dc2626",
                            border: "1px solid rgba(239, 68, 68, 0.3)",
                            borderRadius: "8px",
                            cursor: "pointer",
                            fontWeight: "700",
                            fontSize: "12px",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            transition: "all 0.2s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = "rgba(239, 68, 68, 0.25)"
                            e.target.style.transform = "translateY(-2px)"
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = "rgba(239, 68, 68, 0.15)"
                            e.target.style.transform = "translateY(0)"
                          }}
                        >
                          Decline
                        </button>
                      </>
                    )
                  }

                  // APPROVED or HELD → Hold (if approved) + Remove
                  if (status === "approved" || status === "held") {
                    return (
                      <>
                        {status === "approved" && (
                          <button
                            onClick={() => {
                              handleHold(expandedVendor.username)
                              setExpandedVendor(null)
                            }}
                            style={{
                              padding: "10px 20px",
                              background: "rgba(251, 146, 60, 0.15)",
                              color: "#c2410c",
                              border: "1px solid rgba(251, 146, 60, 0.3)",
                              borderRadius: "8px",
                              cursor: "pointer",
                              fontWeight: "700",
                              fontSize: "12px",
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                              transition: "all 0.2s ease",
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.background = "rgba(251, 146, 60, 0.25)"
                              e.target.style.transform = "translateY(-2px)"
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.background = "rgba(251, 146, 60, 0.15)"
                              e.target.style.transform = "translateY(0)"
                            }}
                          >
                            Hold
                          </button>
                        )}

                        <button
                          onClick={() => {
                            handleRemove(expandedVendor.username)
                            setExpandedVendor(null)
                          }}
                          style={{
                            padding: "10px 20px",
                            background: "rgba(239, 68, 68, 0.15)",
                            color: "#b91c1c",
                            border: "1px solid rgba(239, 68, 68, 0.4)",
                            borderRadius: "8px",
                            cursor: "pointer",
                            fontWeight: "700",
                            fontSize: "12px",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            transition: "all 0.2s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = "rgba(239, 68, 68, 0.25)"
                            e.target.style.transform = "translateY(-2px)"
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = "rgba(239, 68, 68, 0.15)"
                            e.target.style.transform = "translateY(0)"
                          }}
                        >
                          Remove
                        </button>
                      </>
                    )
                  }

                  // DECLINED or REMOVED → Reactivate
                  if (status === "declined" || status === "removed") {
                    return (
                      <button
                        onClick={() => {
                          handleReactivate(expandedVendor.username)
                          setExpandedVendor(null)
                        }}
                        style={{
                          padding: "10px 20px",
                          background: "rgba(59, 130, 246, 0.15)",
                          color: "#1e40af",
                          border: "1px solid rgba(59, 130, 246, 0.3)",
                          borderRadius: "8px",
                          cursor: "pointer",
                          fontWeight: "700",
                          fontSize: "12px",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = "rgba(59, 130, 246, 0.25)"
                          e.target.style.transform = "translateY(-2px)"
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = "rgba(59, 130, 246, 0.15)"
                          e.target.style.transform = "translateY(0)"
                        }}
                      >
                        Reactivate
                      </button>
                    )
                  }

                  return null
                })()}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default AdminVendors