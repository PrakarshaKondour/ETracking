"use client"

import { useEffect, useState } from "react"
import "../../Components/Layout/Page.css"
import { apiCall } from "../../utils/api"
import { getUserRole } from "../../utils/auth"
import { useNavigate } from "react-router-dom"

const VendorProfile = () => {
  const [vendor, setVendor] = useState(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        const role = getUserRole()
        if (role !== "vendor") {
          setError("Vendor access required")
          return
        }

        const res = await apiCall("/api/vendor/profile")
        if (!mounted) return
        if (res?.ok) {
          setVendor(res.vendor)
        } else {
          setError(res?.message || "Failed to fetch profile")
        }
      } catch (e) {
        if (e.status === 401) {
          setError("Session expired. Please log in again.")
          navigate("/login", { replace: true })
          return
        }
        setError(e.message || "Network error")
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [navigate])

  if (loading)
    return (
      <div className="page">
        <div className="panel">Loading profile…</div>
      </div>
    )

  return (
    <div className="page">
      <h2>Vendor Profile</h2>
      <div className="panel">
        {error && (
          <div
            style={{
              color: "#ef4444",
              background: "rgba(239, 68, 68, 0.05)",
              padding: "10px 12px",
              borderRadius: "6px",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              marginBottom: 16,
              fontSize: "13px",
              fontWeight: "500",
            }}
          >
            {error}
          </div>
        )}
        {vendor ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
            <div>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "var(--text-secondary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: "6px",
                }}
              >
                Username
              </div>
              <div style={{ fontSize: "16px", fontWeight: "500", color: "var(--text-primary)" }}>
                {vendor.username || "—"}
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "var(--text-secondary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: "6px",
                }}
              >
                Email
              </div>
              <div style={{ fontSize: "16px", fontWeight: "500", color: "var(--text-primary)" }}>
                {vendor.email || "—"}
              </div>
            </div>
            {vendor.companyName && (
              <div>
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "var(--text-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    marginBottom: "6px",
                  }}
                >
                  Company
                </div>
                <div style={{ fontSize: "16px", fontWeight: "500", color: "var(--text-primary)" }}>
                  {vendor.companyName}
                </div>
              </div>
            )}
            {vendor.phone && (
              <div>
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "var(--text-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    marginBottom: "6px",
                  }}
                >
                  Phone
                </div>
                <div style={{ fontSize: "16px", fontWeight: "500", color: "var(--text-primary)" }}>{vendor.phone}</div>
              </div>
            )}
            {vendor.status && (
              <div>
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "var(--text-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    marginBottom: "6px",
                  }}
                >
                  Status
                </div>
                <div style={{ fontSize: "16px", fontWeight: "500", color: "var(--accent)" }}>
                  {vendor.status.charAt(0).toUpperCase() + vendor.status.slice(1)}
                </div>
              </div>
            )}
            {vendor.createdAt && (
              <div>
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "var(--text-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    marginBottom: "6px",
                  }}
                >
                  Member Since
                </div>
                <div style={{ fontSize: "16px", fontWeight: "500", color: "var(--text-primary)" }}>
                  {new Date(vendor.createdAt).toLocaleDateString()}
                </div>
              </div>
            )}
          </div>
        ) : !error ? (
          <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: "20px" }}>No profile found.</div>
        ) : null}
      </div>
    </div>
  )
}

export default VendorProfile
