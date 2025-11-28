"use client"

import { useEffect, useState } from "react"
import "../../Components/Layout/Page.css"
import { apiCall } from "../../utils/api"

const CustomerProfile = () => {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const res = await apiCall("/api/customer/profile")
        if (!mounted) return
        setProfile(res.data || null)
      } catch (e) {
        console.error("Profile fetch error:", e)
        if (mounted) setProfile(null)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  if (loading)
    return (
      <div className="page">
        <div className="panel">Loading profile…</div>
      </div>
    )

  return (
    <div className="page">
      <h2>Profile Information</h2>
      <div className="panel">
        {profile ? (
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
                {profile.username || "—"}
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
                {profile.email || "—"}
              </div>
            </div>
            {profile.fullName && (
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
                  Full Name
                </div>
                <div style={{ fontSize: "16px", fontWeight: "500", color: "var(--text-primary)" }}>
                  {profile.fullName}
                </div>
              </div>
            )}
            {profile.phone && (
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
                <div style={{ fontSize: "16px", fontWeight: "500", color: "var(--text-primary)" }}>{profile.phone}</div>
              </div>
            )}
            {profile.address && (
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
                  Address
                </div>
                <div style={{ fontSize: "16px", fontWeight: "500", color: "var(--text-primary)" }}>
                  {profile.address}
                </div>
              </div>
            )}
            {profile.createdAt && (
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
                  {new Date(profile.createdAt).toLocaleDateString()}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: "20px" }}>Profile not found</div>
        )}
      </div>
    </div>
  )
}

export default CustomerProfile