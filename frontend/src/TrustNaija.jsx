import { useState, useEffect, createContext, useContext, useCallback } from "react";

// ============================================================
// DESIGN SYSTEM CONSTANTS
// ============================================================
const COLORS = {
  primary: "#0B1F3A",
  accent: "#0FA958",
  warning: "#F4A300",
  danger: "#D92D20",
  bgLight: "#F9FAFB",
  bgDark: "#0F172A",
};

// ============================================================
// APP CONTEXT
// ============================================================
const AppContext = createContext(null);

function useApp() {
  return useContext(AppContext);
}

// ============================================================
// MOCK API SERVICE
// ============================================================
const api = {
  baseUrl: "http://localhost:8000",

  async lookup(identifier) {
    await new Promise((r) => setTimeout(r, 900));
    const mockData = {
      "08012345678": { risk_score: 87, risk_level: "HIGH", report_count: 14, first_seen_at: "2024-08-12T10:00:00Z", last_seen_at: "2025-01-20T14:30:00Z", tags: ["investment_scam", "romance_scam", "blocked_by_cbdn"], is_known: true, identifier_type: "phone" },
      "paystack-fake.com": { risk_score: 95, risk_level: "CRITICAL", report_count: 31, first_seen_at: "2024-10-01T00:00:00Z", last_seen_at: "2025-01-25T09:00:00Z", tags: ["phishing", "fake_pos", "cloned_site"], is_known: true, identifier_type: "url" },
      "0x1234567890abcdef": { risk_score: 62, risk_level: "MEDIUM", report_count: 5, first_seen_at: "2024-11-15T00:00:00Z", last_seen_at: "2024-12-30T00:00:00Z", tags: ["crypto_scam"], is_known: true, identifier_type: "wallet" },
    };
    const key = Object.keys(mockData).find((k) => identifier.includes(k) || k.includes(identifier.toLowerCase().replace(/\s/g, "")));
    if (key) return mockData[key];
    return { risk_score: 0, risk_level: "LOW", report_count: 0, first_seen_at: null, last_seen_at: null, tags: [], is_known: false, identifier_type: "phone" };
  },

  async submitReport(data) {
    await new Promise((r) => setTimeout(r, 1200));
    return { report_id: `rpt_${Math.random().toString(36).substr(2, 9)}`, message: "Report submitted successfully.", risk_score: 45, status: "pending" };
  },

  async uploadEvidence(files) {
    await new Promise((r) => setTimeout(r, 1500));
    return { success: true, file_ids: files.map((_, i) => `file_${i}_${Date.now()}`) };
  },
};

// ============================================================
// UTILITY FUNCTIONS
// ============================================================
function getRiskConfig(level, score) {
  if (score >= 90 || level === "CRITICAL") return { color: "#D92D20", bg: "rgba(217,45,32,0.12)", border: "rgba(217,45,32,0.3)", label: "CRITICAL", emoji: "🔴", pulse: true };
  if (score >= 70 || level === "HIGH") return { color: "#D92D20", bg: "rgba(217,45,32,0.08)", border: "rgba(217,45,32,0.25)", label: "HIGH RISK", emoji: "🔴", pulse: false };
  if (score >= 40 || level === "MEDIUM") return { color: "#F4A300", bg: "rgba(244,163,0,0.1)", border: "rgba(244,163,0,0.3)", label: "MEDIUM RISK", emoji: "🟡", pulse: false };
  return { color: "#0FA958", bg: "rgba(15,169,88,0.1)", border: "rgba(15,169,88,0.3)", label: "LOW RISK", emoji: "🟢", pulse: false };
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" });
}

function maskIdentifier(id) {
  if (!id) return "";
  if (id.length <= 8) return id;
  return id.slice(0, 4) + "****" + id.slice(-4);
}

// ============================================================
// SHARED COMPONENTS
// ============================================================

function GridBackground() {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden", pointerEvents: "none" }}>
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `linear-gradient(rgba(15,169,88,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(15,169,88,0.04) 1px, transparent 1px)`,
        backgroundSize: "40px 40px",
      }} />
      <div style={{
        position: "absolute", top: "-30%", right: "-10%",
        width: "600px", height: "600px",
        background: "radial-gradient(circle, rgba(15,169,88,0.06) 0%, transparent 70%)",
        borderRadius: "50%",
      }} />
      <div style={{
        position: "absolute", bottom: "-20%", left: "-5%",
        width: "400px", height: "400px",
        background: "radial-gradient(circle, rgba(11,31,58,0.8) 0%, transparent 70%)",
        borderRadius: "50%",
      }} />
    </div>
  );
}

function Navbar({ currentPage, setPage }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navItems = [
    { id: "home", label: "Home" },
    { id: "lookup", label: "Check" },
    { id: "report", label: "Report" },
    { id: "ussd", label: "Offline" },
    { id: "vault", label: "Vault" },
    { id: "admin", label: "Admin" },
  ];

  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      background: "rgba(11,31,58,0.95)",
      backdropFilter: "blur(16px)",
      borderBottom: "1px solid rgba(15,169,88,0.15)",
      fontFamily: "'Space Mono', monospace",
    }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: "64px" }}>
        {/* Logo */}
        <button onClick={() => setPage("home")} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "32px", height: "32px", borderRadius: "8px",
            background: "linear-gradient(135deg, #0FA958, #0B8A45)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "16px", fontWeight: "bold", color: "white",
          }}>T</div>
          <span style={{ color: "white", fontSize: "18px", fontWeight: "700", letterSpacing: "0.02em" }}>
            Trust<span style={{ color: "#0FA958" }}>Naija</span>
          </span>
        </button>

        {/* Desktop Nav */}
        <div style={{ display: "flex", gap: "4px" }} className="desktop-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              style={{
                background: currentPage === item.id ? "rgba(15,169,88,0.15)" : "none",
                border: "none",
                color: currentPage === item.id ? "#0FA958" : "rgba(255,255,255,0.65)",
                padding: "8px 14px",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "13px",
                fontFamily: "'Space Mono', monospace",
                fontWeight: currentPage === item.id ? "700" : "400",
                letterSpacing: "0.05em",
                transition: "all 0.2s",
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* CTA Button */}
        <button
          onClick={() => setPage("report")}
          style={{
            background: "linear-gradient(135deg, #0FA958, #0B8A45)",
            color: "white",
            border: "none",
            padding: "9px 20px",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: "700",
            cursor: "pointer",
            fontFamily: "'Space Mono', monospace",
            letterSpacing: "0.03em",
          }}
        >
          Report Scam
        </button>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0F172A; color: white; }
        @keyframes pulse-ring { 0% { transform: scale(0.9); opacity: 1; } 100% { transform: scale(2); opacity: 0; } }
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scoreCount { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: scale(1); } }
        @keyframes scanLine { 0% { transform: translateY(-100%); } 100% { transform: translateY(100%); } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes slideIn { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .desktop-nav { display: flex; }
        .animate-up { animation: fadeSlideUp 0.5s ease forwards; }
        .animate-score { animation: scoreCount 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .tag-chip:hover { transform: scale(1.05); }
        input, textarea, select { outline: none; }
        button { cursor: pointer; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #0F172A; } ::-webkit-scrollbar-thumb { background: rgba(15,169,88,0.4); border-radius: 3px; }
        @media (max-width: 768px) { .desktop-nav { display: none !important; } }
      `}</style>
    </nav>
  );
}

function RiskScoreRing({ score, size = 160 }) {
  const config = getRiskConfig("", score);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div style={{ position: "relative", width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {/* Pulse ring for critical */}
      {score >= 90 && (
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          border: `2px solid ${config.color}`,
          animation: "pulse-ring 2s ease-out infinite",
          opacity: 0.4,
        }} />
      )}
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)", position: "absolute" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={config.color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)" }}
        />
      </svg>
      <div style={{ textAlign: "center", zIndex: 1 }}>
        <div style={{ fontSize: size === 160 ? "42px" : "28px", fontWeight: "800", color: config.color, fontFamily: "'Space Mono', monospace", lineHeight: 1, animation: "scoreCount 0.6s ease forwards" }}>
          {score}
        </div>
        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", fontFamily: "'Space Mono', monospace", letterSpacing: "0.1em", marginTop: "2px" }}>
          /100
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ level, score }) {
  const config = getRiskConfig(level, score);
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: "8px",
      background: config.bg, border: `1px solid ${config.border}`,
      color: config.color, borderRadius: "100px",
      padding: "6px 16px", fontSize: "13px",
      fontFamily: "'Space Mono', monospace", fontWeight: "700",
      letterSpacing: "0.08em",
    }}>
      <div style={{
        width: "8px", height: "8px", borderRadius: "50%",
        background: config.color,
        boxShadow: config.pulse ? `0 0 0 0 ${config.color}` : "none",
        animation: config.pulse ? "pulse-ring 1.5s ease infinite" : "none",
      }} />
      {config.label}
    </div>
  );
}

function Tag({ label }) {
  const tagColors = {
    phishing: "#D92D20",
    investment_scam: "#F4A300",
    romance_scam: "#9333EA",
    fake_pos: "#D92D20",
    crypto_scam: "#F4A300",
    cloned_site: "#D92D20",
    blocked_by_cbdn: "#6366F1",
    task_scam: "#F4A300",
  };
  const color = tagColors[label] || "#64748B";
  const displayLabel = label.replace(/_/g, " ").toUpperCase();

  return (
    <span className="tag-chip" style={{
      display: "inline-flex", alignItems: "center",
      background: `${color}18`, border: `1px solid ${color}40`,
      color: color, borderRadius: "4px",
      padding: "4px 10px", fontSize: "11px",
      fontFamily: "'Space Mono', monospace", fontWeight: "700",
      letterSpacing: "0.08em", transition: "transform 0.15s",
    }}>
      {displayLabel}
    </span>
  );
}

function Input({ label, placeholder, value, onChange, type = "text", required, icon }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {label && <label style={{ color: "rgba(255,255,255,0.7)", fontSize: "13px", fontFamily: "'Space Mono', monospace", letterSpacing: "0.05em" }}>{label}{required && <span style={{ color: "#D92D20", marginLeft: "4px" }}>*</span>}</label>}
      <div style={{ position: "relative" }}>
        {icon && <div style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", fontSize: "18px", pointerEvents: "none" }}>{icon}</div>}
        <input
          type={type} value={value} onChange={onChange} placeholder={placeholder}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            width: "100%", background: "rgba(255,255,255,0.04)",
            border: `1px solid ${focused ? "rgba(15,169,88,0.6)" : "rgba(255,255,255,0.1)"}`,
            color: "white", padding: icon ? "14px 14px 14px 44px" : "14px 16px",
            borderRadius: "10px", fontSize: "15px",
            fontFamily: "'DM Sans', sans-serif",
            transition: "border-color 0.2s",
            boxShadow: focused ? "0 0 0 3px rgba(15,169,88,0.1)" : "none",
          }}
        />
      </div>
    </div>
  );
}

function Select({ label, value, onChange, options, required }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {label && <label style={{ color: "rgba(255,255,255,0.7)", fontSize: "13px", fontFamily: "'Space Mono', monospace", letterSpacing: "0.05em" }}>{label}{required && <span style={{ color: "#D92D20", marginLeft: "4px" }}>*</span>}</label>}
      <select
        value={value} onChange={onChange}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{
          width: "100%", background: "#0B1F3A",
          border: `1px solid ${focused ? "rgba(15,169,88,0.6)" : "rgba(255,255,255,0.1)"}`,
          color: "white", padding: "14px 16px",
          borderRadius: "10px", fontSize: "15px",
          fontFamily: "'DM Sans', sans-serif",
          cursor: "pointer",
          boxShadow: focused ? "0 0 0 3px rgba(15,169,88,0.1)" : "none",
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} style={{ background: "#0B1F3A" }}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

function Textarea({ label, placeholder, value, onChange, rows = 4 }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {label && <label style={{ color: "rgba(255,255,255,0.7)", fontSize: "13px", fontFamily: "'Space Mono', monospace", letterSpacing: "0.05em" }}>{label}</label>}
      <textarea
        value={value} onChange={onChange} placeholder={placeholder} rows={rows}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{
          width: "100%", background: "rgba(255,255,255,0.04)",
          border: `1px solid ${focused ? "rgba(15,169,88,0.6)" : "rgba(255,255,255,0.1)"}`,
          color: "white", padding: "14px 16px",
          borderRadius: "10px", fontSize: "15px",
          fontFamily: "'DM Sans', sans-serif", resize: "vertical",
          transition: "border-color 0.2s",
          boxShadow: focused ? "0 0 0 3px rgba(15,169,88,0.1)" : "none",
        }}
      />
    </div>
  );
}

function Button({ children, onClick, variant = "primary", loading, disabled, size = "md", type = "button" }) {
  const styles = {
    primary: { background: "linear-gradient(135deg, #0FA958, #0B8A45)", color: "white", border: "none" },
    secondary: { background: "rgba(255,255,255,0.06)", color: "white", border: "1px solid rgba(255,255,255,0.15)" },
    danger: { background: "linear-gradient(135deg, #D92D20, #B91C1C)", color: "white", border: "none" },
    ghost: { background: "none", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.1)" },
  };
  const sizes = { sm: { padding: "8px 16px", fontSize: "13px" }, md: { padding: "13px 24px", fontSize: "15px" }, lg: { padding: "16px 32px", fontSize: "16px" } };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        ...styles[variant],
        ...sizes[size],
        borderRadius: "10px",
        fontWeight: "700",
        fontFamily: "'Space Mono', monospace",
        letterSpacing: "0.03em",
        cursor: disabled || loading ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
        transition: "transform 0.15s, box-shadow 0.15s",
        boxShadow: variant === "primary" ? "0 4px 20px rgba(15,169,88,0.3)" : "none",
      }}
      onMouseEnter={(e) => { if (!disabled && !loading) e.target.style.transform = "translateY(-1px)"; }}
      onMouseLeave={(e) => { e.target.style.transform = "translateY(0)"; }}
    >
      {loading && <span style={{ display: "inline-block", width: "14px", height: "14px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />}
      {children}
    </button>
  );
}

function Card({ children, style = {}, glow }) {
  return (
    <div style={{
      background: "rgba(11,31,58,0.6)",
      border: glow ? "1px solid rgba(15,169,88,0.3)" : "1px solid rgba(255,255,255,0.07)",
      borderRadius: "16px",
      backdropFilter: "blur(12px)",
      boxShadow: glow ? "0 0 40px rgba(15,169,88,0.1)" : "0 4px 24px rgba(0,0,0,0.3)",
      ...style,
    }}>
      {children}
    </div>
  );
}

function Toast({ message, type = "success" }) {
  const colors = { success: "#0FA958", error: "#D92D20", warning: "#F4A300" };
  return (
    <div style={{
      position: "fixed", bottom: "24px", right: "24px", zIndex: 999,
      background: "#0B1F3A", border: `1px solid ${colors[type]}40`,
      borderLeft: `4px solid ${colors[type]}`,
      color: "white", padding: "16px 20px",
      borderRadius: "10px", fontFamily: "'DM Sans', sans-serif",
      fontSize: "14px", maxWidth: "350px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      animation: "slideIn 0.3s ease",
    }}>
      {message}
    </div>
  );
}

// ============================================================
// PAGE: HOMEPAGE
// ============================================================
function HomePage({ setPage, setLookupQuery }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchType, setSearchType] = useState("phone");
  const [scanActive, setScanActive] = useState(false);

  const stats = [
    { value: "47,231", label: "Scammers Flagged" },
    { value: "₦2.1B", label: "Losses Prevented" },
    { value: "189k", label: "Lookups Today" },
    { value: "12ms", label: "Avg Response" },
  ];

  const types = [
    { id: "phone", label: "📱 Phone", placeholder: "e.g. 08012345678" },
    { id: "url", label: "🌐 URL", placeholder: "e.g. paystack-fake.com" },
    { id: "wallet", label: "💰 Wallet", placeholder: "e.g. 0xAbCd..." },
    { id: "account", label: "🏦 Account", placeholder: "e.g. 0123456789" },
  ];

  const handleSearch = async () => {
    if (!query.trim()) return;
    setScanActive(true);
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setLookupQuery(query.trim());
    setPage("result");
    setLoading(false);
  };

  const recentFlags = [
    { id: "0801****5678", type: "phone", risk: 87, tag: "Investment Scam" },
    { id: "0901****2341", type: "phone", risk: 95, tag: "Romance Scam" },
    { id: "paystack-fake.com", type: "url", risk: 95, tag: "Phishing" },
    { id: "0x1a2b****ef", type: "wallet", risk: 72, tag: "Crypto Scam" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0F172A", paddingTop: "64px" }}>
      {/* Hero */}
      <div style={{ position: "relative", overflow: "hidden", padding: "80px 24px 60px", maxWidth: "1100px", margin: "0 auto" }}>
        {/* Scan line effect */}
        {scanActive && (
          <div style={{
            position: "absolute", left: 0, right: 0, height: "2px",
            background: "linear-gradient(90deg, transparent, #0FA958, transparent)",
            zIndex: 5, animation: "scanLine 0.8s ease forwards",
          }} />
        )}

        {/* Hero badge */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "24px", animation: "fadeSlideUp 0.5s ease" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            background: "rgba(15,169,88,0.1)", border: "1px solid rgba(15,169,88,0.25)",
            borderRadius: "100px", padding: "8px 18px",
            color: "#0FA958", fontSize: "13px", fontFamily: "'Space Mono', monospace",
            letterSpacing: "0.08em",
          }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#0FA958", animation: "pulse-ring 2s ease infinite" }} />
            LIVE — 189,234 lookups today
          </div>
        </div>

        {/* Headline */}
        <h1 style={{
          textAlign: "center", fontFamily: "'Syne', sans-serif",
          fontSize: "clamp(42px, 7vw, 80px)", fontWeight: "800",
          lineHeight: 1.05, marginBottom: "20px",
          animation: "fadeSlideUp 0.5s 0.1s ease both",
        }}>
          <span style={{ color: "white" }}>Check Before</span>
          <br />
          <span style={{
            background: "linear-gradient(135deg, #0FA958, #4ADE80)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>You Pay.</span>
        </h1>

        <p style={{
          textAlign: "center", color: "rgba(255,255,255,0.55)",
          fontSize: "18px", maxWidth: "520px", margin: "0 auto 48px",
          fontFamily: "'DM Sans', sans-serif", lineHeight: 1.7,
          animation: "fadeSlideUp 0.5s 0.2s ease both",
        }}>
          Nigeria's real-time fraud intelligence platform. Instantly verify any phone number, URL, wallet, or bank account before you transact.
        </p>

        {/* Search Box */}
        <div style={{
          maxWidth: "680px", margin: "0 auto",
          animation: "fadeSlideUp 0.5s 0.3s ease both",
        }}>
          {/* Type selector tabs */}
          <div style={{
            display: "flex", gap: "6px", marginBottom: "12px",
            background: "rgba(255,255,255,0.04)", borderRadius: "12px", padding: "6px",
            border: "1px solid rgba(255,255,255,0.07)",
          }}>
            {types.map((t) => (
              <button
                key={t.id}
                onClick={() => setSearchType(t.id)}
                style={{
                  flex: 1, padding: "9px 8px",
                  background: searchType === t.id ? "rgba(15,169,88,0.15)" : "none",
                  border: searchType === t.id ? "1px solid rgba(15,169,88,0.3)" : "1px solid transparent",
                  color: searchType === t.id ? "#0FA958" : "rgba(255,255,255,0.4)",
                  borderRadius: "8px", fontSize: "12px",
                  fontFamily: "'Space Mono', monospace", fontWeight: "700",
                  transition: "all 0.2s",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Search input */}
          <div style={{ display: "flex", gap: "10px" }}>
            <div style={{ flex: 1, position: "relative" }}>
              <span style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", fontSize: "20px" }}>🔍</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder={types.find((t) => t.id === searchType)?.placeholder || "Enter identifier..."}
                style={{
                  width: "100%", background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(15,169,88,0.3)",
                  color: "white", padding: "18px 18px 18px 52px",
                  borderRadius: "12px", fontSize: "16px",
                  fontFamily: "'DM Sans', sans-serif",
                  boxShadow: "0 0 30px rgba(15,169,88,0.1)",
                }}
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={loading || !query.trim()}
              style={{
                background: "linear-gradient(135deg, #0FA958, #0B8A45)",
                color: "white", border: "none",
                padding: "0 28px", borderRadius: "12px",
                fontSize: "15px", fontWeight: "700",
                fontFamily: "'Space Mono', monospace",
                opacity: !query.trim() ? 0.5 : 1,
                boxShadow: "0 4px 24px rgba(15,169,88,0.35)",
                whiteSpace: "nowrap",
                display: "flex", alignItems: "center", gap: "8px",
              }}
            >
              {loading ? "Scanning..." : "Check Now →"}
            </button>
          </div>
          <p style={{ color: "rgba(255,255,255,0.25)", fontSize: "12px", textAlign: "center", marginTop: "10px", fontFamily: "'Space Mono', monospace" }}>
            Try: 08012345678 · paystack-fake.com · 0x1234567890abcdef
          </p>
        </div>
      </div>

      {/* Stats Bar */}
      <div style={{
        background: "rgba(15,169,88,0.06)", borderTop: "1px solid rgba(15,169,88,0.1)",
        borderBottom: "1px solid rgba(15,169,88,0.1)", padding: "24px",
      }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "24px" }}>
          {stats.map((stat) => (
            <div key={stat.label} style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "28px", fontWeight: "700", color: "#0FA958" }}>{stat.value}</div>
              <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "13px", fontFamily: "'DM Sans', sans-serif", marginTop: "4px" }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div style={{ padding: "80px 24px", maxWidth: "1100px", margin: "0 auto" }}>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "40px", fontWeight: "800", textAlign: "center", marginBottom: "8px" }}>
          How <span style={{ color: "#0FA958" }}>TrustNaija</span> Works
        </h2>
        <p style={{ textAlign: "center", color: "rgba(255,255,255,0.45)", marginBottom: "56px", fontFamily: "'DM Sans', sans-serif", fontSize: "16px" }}>
          Three steps to safer transactions
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
          {[
            { step: "01", icon: "🔎", title: "Enter an Identifier", desc: "Type any phone number, URL, bank account, wallet address, or app package name to verify." },
            { step: "02", icon: "⚡", title: "Instant Risk Analysis", desc: "Our engine cross-references thousands of reports, computes a risk score (0-100), and returns results in milliseconds." },
            { step: "03", icon: "🛡️", title: "Make Safe Decisions", desc: "See risk level, report count, scam tags, and timestamps. Then decide — transact or block." },
          ].map((step, i) => (
            <Card key={i} style={{ padding: "32px" }}>
              <div style={{ fontFamily: "'Space Mono', monospace", color: "rgba(15,169,88,0.4)", fontSize: "12px", letterSpacing: "0.15em", marginBottom: "16px" }}>{step.step}</div>
              <div style={{ fontSize: "36px", marginBottom: "16px" }}>{step.icon}</div>
              <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: "20px", fontWeight: "700", marginBottom: "12px", color: "white" }}>{step.title}</h3>
              <p style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.7, fontSize: "15px" }}>{step.desc}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Flags */}
      <div style={{ padding: "0 24px 80px", maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "28px", fontWeight: "700" }}>
            Recent <span style={{ color: "#D92D20" }}>Flags</span>
          </h2>
          <button onClick={() => setPage("lookup")} style={{ background: "none", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.6)", padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontFamily: "'Space Mono', monospace" }}>
            View All
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "12px" }}>
          {recentFlags.map((flag, i) => {
            const config = getRiskConfig("", flag.risk);
            return (
              <Card key={i} style={{ padding: "20px", cursor: "pointer" }} onClick={() => { setLookupQuery(flag.id); setPage("result"); }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "12px" }}>
                  <div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "14px", color: "white", fontWeight: "700" }}>{flag.id}</div>
                    <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "11px", fontFamily: "'Space Mono', monospace", marginTop: "2px", textTransform: "uppercase" }}>{flag.type}</div>
                  </div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "22px", fontWeight: "800", color: config.color }}>{flag.risk}</div>
                </div>
                <Tag label={flag.tag.toLowerCase().replace(/ /g, "_")} />
              </Card>
            );
          })}
        </div>
      </div>

      {/* USSD CTA */}
      <div style={{ padding: "0 24px 100px", maxWidth: "1100px", margin: "0 auto" }}>
        <Card glow style={{ padding: "48px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "32px", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontFamily: "'Space Mono', monospace", color: "#0FA958", fontSize: "12px", letterSpacing: "0.15em", marginBottom: "12px" }}>NO SMARTPHONE? NO PROBLEM</div>
            <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: "32px", fontWeight: "800", marginBottom: "12px" }}>Dial <span style={{ color: "#0FA958" }}>*234*2#</span></h3>
            <p style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'DM Sans', sans-serif", fontSize: "16px", maxWidth: "420px", lineHeight: 1.6 }}>
              TrustNaija works on any mobile phone via USSD. Instantly verify accounts offline — no internet required.
            </p>
          </div>
          <Button size="lg" onClick={() => setPage("ussd")}>Learn More →</Button>
        </Card>
      </div>
    </div>
  );
}

// ============================================================
// PAGE: LOOKUP / RESULT
// ============================================================
function LookupPage({ initialQuery, setPage }) {
  const [query, setQuery] = useState(initialQuery || "");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (initialQuery) handleLookup(initialQuery);
  }, [initialQuery]);

  const handleLookup = async (q = query) => {
    if (!q.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const data = await api.lookup(q.trim());
      setResult(data);
    } catch (e) {
      setResult(null);
    }
    setLoading(false);
  };

  const riskConfig = result ? getRiskConfig(result.risk_level, result.risk_score) : null;

  return (
    <div style={{ minHeight: "100vh", background: "#0F172A", paddingTop: "100px", padding: "100px 24px 80px" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: "40px", fontWeight: "800", marginBottom: "8px" }}>
          Identifier <span style={{ color: "#0FA958" }}>Lookup</span>
        </h1>
        <p style={{ color: "rgba(255,255,255,0.4)", marginBottom: "32px", fontFamily: "'DM Sans', sans-serif" }}>
          Check any phone, URL, wallet, or bank account number
        </p>

        {/* Search */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "40px" }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLookup()}
            placeholder="Enter phone, URL, wallet, or account..."
            style={{
              flex: 1, background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "white", padding: "16px 20px",
              borderRadius: "12px", fontSize: "16px",
              fontFamily: "'DM Sans', sans-serif",
            }}
          />
          <Button onClick={() => handleLookup()} loading={loading}>Search</Button>
        </div>

        {/* Loading state */}
        {loading && (
          <Card style={{ padding: "60px 32px", textAlign: "center" }}>
            <div style={{ fontSize: "40px", marginBottom: "16px" }}>🔍</div>
            <div style={{ fontFamily: "'Space Mono', monospace", color: "#0FA958", fontSize: "14px", letterSpacing: "0.1em" }}>
              SCANNING DATABASE<span style={{ animation: "blink 1s infinite" }}>...</span>
            </div>
          </Card>
        )}

        {/* Result */}
        {!loading && result && searched && (
          <div style={{ animation: "fadeSlideUp 0.5s ease" }}>
            {/* Main result card */}
            <Card glow={result.risk_score >= 70} style={{ padding: "40px", marginBottom: "16px" }}>
              {/* Top row: identifier + status */}
              <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", marginBottom: "32px", flexWrap: "wrap", gap: "16px" }}>
                <div>
                  <div style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Space Mono', monospace", fontSize: "12px", letterSpacing: "0.1em", marginBottom: "6px", textTransform: "uppercase" }}>
                    {result.identifier_type || "identifier"}
                  </div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "22px", fontWeight: "700", color: "white", wordBreak: "break-all" }}>{query}</div>
                </div>
                <StatusBadge level={result.risk_level} score={result.risk_score} />
              </div>

              {/* Score + metrics */}
              <div style={{ display: "flex", alignItems: "center", gap: "48px", marginBottom: "32px", flexWrap: "wrap" }}>
                <RiskScoreRing score={result.risk_score} />

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", flex: 1 }}>
                  {[
                    { label: "Reports Filed", value: result.is_known ? result.report_count : "0", highlight: result.report_count > 0 },
                    { label: "Status", value: result.is_known ? "Known Threat" : "Not Reported" },
                    { label: "First Seen", value: formatDate(result.first_seen_at) },
                    { label: "Last Seen", value: formatDate(result.last_seen_at) },
                  ].map((metric) => (
                    <div key={metric.label}>
                      <div style={{ color: "rgba(255,255,255,0.35)", fontFamily: "'Space Mono', monospace", fontSize: "11px", letterSpacing: "0.1em", marginBottom: "4px", textTransform: "uppercase" }}>{metric.label}</div>
                      <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "20px", fontWeight: "700", color: metric.highlight ? riskConfig.color : "white" }}>{metric.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tags */}
              {result.tags.length > 0 && (
                <div>
                  <div style={{ color: "rgba(255,255,255,0.35)", fontFamily: "'Space Mono', monospace", fontSize: "11px", letterSpacing: "0.1em", marginBottom: "10px", textTransform: "uppercase" }}>Scam Tags</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {result.tags.map((tag) => <Tag key={tag} label={tag} />)}
                  </div>
                </div>
              )}
            </Card>

            {/* Warning banner for high risk */}
            {result.risk_score >= 70 && (
              <div style={{
                background: "rgba(217,45,32,0.1)", border: "1px solid rgba(217,45,32,0.3)",
                borderRadius: "12px", padding: "20px 24px",
                display: "flex", alignItems: "center", gap: "16px",
                marginBottom: "16px",
              }}>
                <span style={{ fontSize: "28px" }}>⚠️</span>
                <div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "14px", fontWeight: "700", color: "#D92D20", marginBottom: "4px" }}>HIGH RISK — DO NOT TRANSACT</div>
                  <div style={{ color: "rgba(255,255,255,0.6)", fontFamily: "'DM Sans', sans-serif", fontSize: "14px" }}>
                    This identifier has been reported by multiple users. Exercise extreme caution. Report to EFCC if you have been defrauded.
                  </div>
                </div>
              </div>
            )}

            {/* Safe message */}
            {!result.is_known && (
              <div style={{
                background: "rgba(15,169,88,0.08)", border: "1px solid rgba(15,169,88,0.2)",
                borderRadius: "12px", padding: "20px 24px",
                display: "flex", alignItems: "center", gap: "16px",
                marginBottom: "16px",
              }}>
                <span style={{ fontSize: "28px" }}>✅</span>
                <div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "14px", fontWeight: "700", color: "#0FA958", marginBottom: "4px" }}>NOT REPORTED YET</div>
                  <div style={{ color: "rgba(255,255,255,0.6)", fontFamily: "'DM Sans', sans-serif", fontSize: "14px" }}>
                    No reports on file. Always transact with caution. If this turns out to be a scam, please report it.
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <Button variant="danger" onClick={() => setPage("report")}>🚨 Report This</Button>
              <Button variant="secondary" onClick={() => window.print()}>📄 Download Report</Button>
              <Button variant="ghost" onClick={() => { setQuery(""); setResult(null); setSearched(false); }}>Clear</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// PAGE: REPORT SCAM
// ============================================================
function ReportPage() {
  const [form, setForm] = useState({ identifier: "", identifier_type: "phone", scam_type: "", description: "", amount_lost: "", reporter_phone: "" });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const validate = () => {
    const errs = {};
    if (!form.identifier.trim()) errs.identifier = "Identifier is required";
    if (!form.scam_type) errs.scam_type = "Please select a scam type";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const result = await api.submitReport(form);
      setSubmitted(true);
      showToast(`Report submitted! ID: ${result.report_id}`, "success");
    } catch (e) {
      showToast("Failed to submit report. Try again.", "error");
    }
    setLoading(false);
  };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  if (submitted) {
    return (
      <div style={{ minHeight: "100vh", background: "#0F172A", paddingTop: "64px", display: "flex", alignItems: "center", justifyContent: "center", padding: "100px 24px" }}>
        <Card style={{ padding: "64px 48px", maxWidth: "480px", textAlign: "center" }}>
          <div style={{ fontSize: "64px", marginBottom: "24px" }}>🛡️</div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "32px", fontWeight: "800", marginBottom: "12px", color: "#0FA958" }}>Report Received</h2>
          <p style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.7, marginBottom: "32px" }}>
            Thank you for helping protect Nigerians from fraud. Our moderators will review your report and update the risk score within 24 hours.
          </p>
          <Button onClick={() => setSubmitted(false)} variant="secondary">Submit Another Report</Button>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0F172A", paddingTop: "64px", padding: "100px 24px 80px" }}>
      <div style={{ maxWidth: "680px", margin: "0 auto" }}>
        <div style={{ marginBottom: "40px" }}>
          <div style={{ fontFamily: "'Space Mono', monospace", color: "#D92D20", fontSize: "12px", letterSpacing: "0.15em", marginBottom: "8px" }}>🚨 REPORT A SCAMMER</div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: "40px", fontWeight: "800", marginBottom: "8px" }}>Report a Scam</h1>
          <p style={{ color: "rgba(255,255,255,0.45)", fontFamily: "'DM Sans', sans-serif", fontSize: "16px" }}>
            Your report helps protect thousands of Nigerians. All submissions are reviewed by our trust & safety team.
          </p>
        </div>

        <Card style={{ padding: "40px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* Identifier type */}
            <Select
              label="What are you reporting?"
              value={form.identifier_type}
              onChange={set("identifier_type")}
              required
              options={[
                { value: "phone", label: "📱 Phone Number" },
                { value: "url", label: "🌐 Website / URL" },
                { value: "wallet", label: "💰 Crypto Wallet" },
                { value: "account", label: "🏦 Bank Account Number" },
                { value: "app", label: "📲 App Package Name" },
              ]}
            />

            {/* Identifier value */}
            <div>
              <Input
                label={`Enter the ${form.identifier_type}`}
                placeholder={
                  form.identifier_type === "phone" ? "e.g. 08012345678" :
                  form.identifier_type === "url" ? "e.g. paystack-fake.com" :
                  form.identifier_type === "wallet" ? "e.g. 0xAbCd1234..." :
                  form.identifier_type === "account" ? "e.g. 0123456789" :
                  "e.g. com.fakebank.app"
                }
                value={form.identifier}
                onChange={set("identifier")}
                required
              />
              {errors.identifier && <p style={{ color: "#D92D20", fontSize: "12px", marginTop: "4px", fontFamily: "'Space Mono', monospace" }}>{errors.identifier}</p>}
            </div>

            {/* Scam type */}
            <div>
              <Select
                label="Type of Scam"
                value={form.scam_type}
                onChange={set("scam_type")}
                required
                options={[
                  { value: "", label: "— Select scam type —" },
                  { value: "investment", label: "💸 Investment / Ponzi Scheme" },
                  { value: "romance", label: "💔 Romance Scam" },
                  { value: "phishing", label: "🎣 Phishing / Fake Website" },
                  { value: "impersonation", label: "🎭 Impersonation (bank, EFCC, police)" },
                  { value: "online_shopping", label: "🛍️ Online Shopping Fraud" },
                  { value: "job_offer", label: "💼 Fake Job Offer" },
                  { value: "loan_fraud", label: "🏧 Loan Fraud" },
                  { value: "task_scam", label: "📋 Task Scam" },
                  { value: "crypto_scam", label: "₿ Crypto Scam" },
                  { value: "other", label: "❓ Other" },
                ]}
              />
              {errors.scam_type && <p style={{ color: "#D92D20", fontSize: "12px", marginTop: "4px", fontFamily: "'Space Mono', monospace" }}>{errors.scam_type}</p>}
            </div>

            {/* Amount lost */}
            <Input
              label="Amount Lost (NGN) — Optional"
              placeholder="e.g. 150000"
              value={form.amount_lost}
              onChange={set("amount_lost")}
              type="number"
              icon="₦"
            />

            {/* Description */}
            <Textarea
              label="Describe the scam — Optional"
              placeholder="Tell us what happened. Include dates, how they contacted you, and any other details that may help..."
              value={form.description}
              onChange={set("description")}
              rows={5}
            />

            {/* Reporter phone */}
            <Input
              label="Your Phone Number — Optional (for updates)"
              placeholder="08012345678"
              value={form.reporter_phone}
              onChange={set("reporter_phone")}
              icon="📱"
            />

            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "24px" }}>
              <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "13px", fontFamily: "'DM Sans', sans-serif", marginBottom: "20px", lineHeight: 1.6 }}>
                🔒 Your personal information is hashed and never stored in plain text. Reports are reviewed before affecting risk scores.
              </p>
              <Button onClick={handleSubmit} loading={loading} size="lg">
                🚨 Submit Report
              </Button>
            </div>
          </div>
        </Card>
      </div>
      {toast && <Toast message={toast.msg} type={toast.type} />}
    </div>
  );
}

// ============================================================
// PAGE: EVIDENCE VAULT
// ============================================================
function VaultPage() {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState(null);
  const [dragging, setDragging] = useState(false);

  const mockVaultFiles = [
    { id: "f001", name: "transfer_receipt_jan.png", size: "284 KB", type: "image/png", date: "2025-01-15", report: "Investment Scam", thumb: "🧾" },
    { id: "f002", name: "whatsapp_chat_scammer.pdf", size: "1.2 MB", type: "application/pdf", date: "2025-01-14", report: "Romance Scam", thumb: "💬" },
    { id: "f003", name: "fake_invoice_oluwaseun.jpg", size: "156 KB", type: "image/jpeg", date: "2025-01-10", report: "Impersonation", thumb: "📄" },
  ];

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const dropped = Array.from(e.dataTransfer.files);
    setFiles((prev) => [...prev, ...dropped]);
  };

  const handleFileInput = (e) => {
    const selected = Array.from(e.target.files);
    setFiles((prev) => [...prev, ...selected]);
  };

  const handleUpload = async () => {
    if (!files.length) return;
    setUploading(true);
    await api.uploadEvidence(files);
    setToast({ msg: `${files.length} file(s) uploaded to Evidence Vault`, type: "success" });
    setFiles([]);
    setUploading(false);
    setTimeout(() => setToast(null), 4000);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0F172A", paddingTop: "64px", padding: "100px 24px 80px" }}>
      <div style={{ maxWidth: "880px", margin: "0 auto" }}>
        <div style={{ marginBottom: "40px" }}>
          <div style={{ fontFamily: "'Space Mono', monospace", color: "#0FA958", fontSize: "12px", letterSpacing: "0.15em", marginBottom: "8px" }}>🗄️ EVIDENCE VAULT</div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: "40px", fontWeight: "800", marginBottom: "8px" }}>Evidence Vault</h1>
          <p style={{ color: "rgba(255,255,255,0.45)", fontFamily: "'DM Sans', sans-serif", fontSize: "16px", maxWidth: "560px" }}>
            Securely upload screenshots, transaction receipts, and chat logs. Evidence is stored encrypted and can be shared with banks and EFCC.
          </p>
        </div>

        {/* Upload zone */}
        <Card style={{ marginBottom: "24px" }}>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${dragging ? "rgba(15,169,88,0.6)" : "rgba(255,255,255,0.1)"}`,
              borderRadius: "12px",
              padding: "48px 32px",
              textAlign: "center",
              background: dragging ? "rgba(15,169,88,0.05)" : "transparent",
              transition: "all 0.2s",
              margin: "24px",
            }}
          >
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>📁</div>
            <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: "20px", fontWeight: "700", marginBottom: "8px" }}>
              Drop files here or <label htmlFor="file-input" style={{ color: "#0FA958", cursor: "pointer" }}>browse</label>
            </h3>
            <input id="file-input" type="file" multiple accept="image/*,.pdf" style={{ display: "none" }} onChange={handleFileInput} />
            <p style={{ color: "rgba(255,255,255,0.35)", fontFamily: "'DM Sans', sans-serif", fontSize: "14px" }}>
              PNG, JPG, PDF up to 10MB each. Screenshots, receipts, chat exports.
            </p>
          </div>

          {files.length > 0 && (
            <div style={{ padding: "0 24px 24px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
                {files.map((f, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.04)", borderRadius: "8px", padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span style={{ fontSize: "20px" }}>{f.type.includes("pdf") ? "📄" : "🖼️"}</span>
                      <div>
                        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: "white" }}>{f.name}</div>
                        <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "12px" }}>{(f.size / 1024).toFixed(0)} KB</div>
                      </div>
                    </div>
                    <button onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", fontSize: "18px" }}>×</button>
                  </div>
                ))}
              </div>
              <Button onClick={handleUpload} loading={uploading}>
                ⬆️ Upload {files.length} File{files.length > 1 ? "s" : ""}
              </Button>
            </div>
          )}
        </Card>

        {/* Existing vault files */}
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "24px", fontWeight: "700", marginBottom: "16px" }}>Your Evidence</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {mockVaultFiles.map((file) => (
            <Card key={file.id} style={{ padding: "20px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <div style={{ width: "48px", height: "48px", background: "rgba(255,255,255,0.06)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px" }}>{file.thumb}</div>
                  <div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: "500", color: "white" }}>{file.name}</div>
                    <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "13px", fontFamily: "'Space Mono', monospace" }}>
                      {file.size} · {file.date}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <Tag label={file.report.toLowerCase().replace(/ /g, "_")} />
                  <button style={{ background: "rgba(255,255,255,0.06)", border: "none", color: "rgba(255,255,255,0.6)", padding: "8px 14px", borderRadius: "8px", fontSize: "13px", fontFamily: "'Space Mono', monospace" }}>Download</button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Export button */}
        <div style={{ marginTop: "24px" }}>
          <Button variant="secondary" size="lg">📊 Export Full Report (PDF)</Button>
        </div>
      </div>
      {toast && <Toast message={toast.msg} type={toast.type} />}
    </div>
  );
}

// ============================================================
// PAGE: USSD INFO
// ============================================================
function UssdPage() {
  const [openFaq, setOpenFaq] = useState(null);

  const faqs = [
    { q: "Which networks support *234*2#?", a: "TrustNaija USSD works on MTN, Airtel, Glo, and 9Mobile. The service is available 24/7." },
    { q: "Does the USSD service cost money?", a: "Standard USSD charges from your network provider apply. Typically N0–N10 per session. No hidden TrustNaija charges." },
    { q: "Can I report a scammer via USSD?", a: "Yes! Select option 2 from the main menu, enter the scammer's number, and select the scam type. Your report will be logged anonymously." },
    { q: "How fast are USSD results?", a: "Results appear on your handset within 2–5 seconds. Our database is queried in real-time." },
    { q: "Can I use this on a basic/non-smartphone?", a: "Yes. USSD works on any mobile phone — no internet, no app, no smartphone required." },
    { q: "Will I receive an SMS after the USSD session?", a: "If the identifier is HIGH or CRITICAL risk, you can opt in to receive a detailed SMS alert after the session." },
  ];

  const steps = [
    { num: "1", code: "*234*2#", desc: "Dial the USSD code", detail: "Open your phone dialler and dial *234*2# then press Call" },
    { num: "2", code: "Select option", desc: "Choose action", detail: "Press 1 to verify an account, or 2 to report a scammer" },
    { num: "3", code: "Enter number", desc: "Input identifier", detail: "Type the phone number or account you want to check" },
    { num: "4", code: "Instant result", desc: "See risk rating", detail: "Your handset displays the risk score, report count, and safety verdict" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0F172A", paddingTop: "64px", padding: "100px 24px 80px" }}>
      <div style={{ maxWidth: "880px", margin: "0 auto" }}>
        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: "64px" }}>
          <div style={{ fontFamily: "'Space Mono', monospace", color: "#0FA958", fontSize: "12px", letterSpacing: "0.15em", marginBottom: "16px" }}>📱 WORKS ON ANY PHONE</div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: "56px", fontWeight: "800", marginBottom: "16px" }}>
            Verify Offline with{" "}
            <span style={{
              background: "linear-gradient(135deg, #0FA958, #4ADE80)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>USSD</span>
          </h1>
          <p style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'DM Sans', sans-serif", fontSize: "18px", maxWidth: "540px", margin: "0 auto 32px", lineHeight: 1.7 }}>
            No internet. No app. No smartphone needed. Check any account on any phone in seconds.
          </p>

          {/* USSD code display */}
          <div style={{
            display: "inline-block",
            background: "rgba(15,169,88,0.1)", border: "2px solid rgba(15,169,88,0.3)",
            borderRadius: "16px", padding: "20px 48px",
          }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "48px", fontWeight: "700", color: "#0FA958", letterSpacing: "0.05em" }}>*234*2#</div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Space Mono', monospace", fontSize: "13px", marginTop: "8px" }}>DIAL FROM ANY PHONE · ALL NETWORKS</div>
          </div>
        </div>

        {/* Steps */}
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "32px", fontWeight: "700", marginBottom: "24px" }}>How to Use</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "64px" }}>
          {steps.map((step, i) => (
            <Card key={i} style={{ padding: "28px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(15,169,88,0.15)", border: "1px solid rgba(15,169,88,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Space Mono', monospace", fontWeight: "700", color: "#0FA958", fontSize: "16px", marginBottom: "16px" }}>{step.num}</div>
              <div style={{ fontFamily: "'Space Mono', monospace", color: "#0FA958", fontSize: "12px", marginBottom: "8px" }}>{step.code}</div>
              <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: "17px", fontWeight: "700", marginBottom: "8px" }}>{step.desc}</h3>
              <p style={{ color: "rgba(255,255,255,0.45)", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", lineHeight: 1.6 }}>{step.detail}</p>
            </Card>
          ))}
        </div>

        {/* Shortcut */}
        <Card glow style={{ padding: "32px", marginBottom: "48px" }}>
          <div style={{ fontFamily: "'Space Mono', monospace", color: "#0FA958", fontSize: "12px", letterSpacing: "0.1em", marginBottom: "12px" }}>⚡ QUICK SHORTCUT</div>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: "24px", fontWeight: "700", marginBottom: "8px" }}>Verify Directly</h3>
          <p style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'DM Sans', sans-serif", marginBottom: "20px", lineHeight: 1.6 }}>
            Skip the menu — dial with the account number embedded:
          </p>
          <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: "10px", padding: "16px 24px", fontFamily: "'Space Mono', monospace", fontSize: "20px", color: "#4ADE80", letterSpacing: "0.05em", display: "inline-block" }}>
            *234*2*<span style={{ color: "rgba(255,255,255,0.5)" }}>PHONENUMBER</span>#
          </div>
          <p style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'Space Mono', monospace", fontSize: "12px", marginTop: "12px" }}>
            Example: *234*2*08012345678#
          </p>
        </Card>

        {/* FAQ */}
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "32px", fontWeight: "700", marginBottom: "24px" }}>Frequently Asked Questions</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {faqs.map((faq, i) => (
            <Card key={i} style={{ overflow: "hidden", cursor: "pointer" }} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
              <div style={{ padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
                <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "16px", fontWeight: "600", color: "white" }}>{faq.q}</h3>
                <span style={{ color: "#0FA958", fontSize: "20px", flexShrink: 0, transition: "transform 0.2s", transform: openFaq === i ? "rotate(45deg)" : "none" }}>+</span>
              </div>
              {openFaq === i && (
                <div style={{ padding: "0 24px 20px", color: "rgba(255,255,255,0.55)", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.7, animation: "fadeSlideUp 0.2s ease" }}>
                  {faq.a}
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PAGE: ADMIN DASHBOARD
// ============================================================
function AdminPage() {
  const [activeTab, setActiveTab] = useState("reports");
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const [pendingReports, setPendingReports] = useState([
    { id: "rpt_001", identifier: "08012345678", type: "phone", scam_type: "investment", description: "Promised 50% returns, took ₦500k and disappeared.", amount: "₦500,000", channel: "web", date: "2025-01-25", status: "pending" },
    { id: "rpt_002", identifier: "paystack-payments.ng", type: "url", scam_type: "phishing", description: "Clone of Paystack collecting card details.", amount: null, channel: "mobile", date: "2025-01-24", status: "pending" },
    { id: "rpt_003", identifier: "0x8F3291aB", type: "wallet", scam_type: "crypto_scam", description: "Fake investment platform. Refused withdrawal.", amount: "₦1,200,000", channel: "ussd", date: "2025-01-23", status: "pending" },
    { id: "rpt_004", identifier: "08098765432", type: "phone", scam_type: "romance", description: "Met on Facebook, claimed to be US soldier. Requested gift cards.", amount: "₦85,000", channel: "web", date: "2025-01-22", status: "pending" },
  ]);

  const auditLogs = [
    { action: "report.approved", actor: "mod_taiwo", entity: "rpt_998", time: "2 mins ago", channel: "admin" },
    { action: "lookup.web", actor: "anonymous", entity: "08056781234", time: "4 mins ago", channel: "web" },
    { action: "report.created", actor: "user_yemi", entity: "rpt_999", time: "7 mins ago", channel: "mobile" },
    { action: "lookup.ussd", actor: "+2348032145678", entity: "0501234567", time: "11 mins ago", channel: "ussd" },
    { action: "report.rejected", actor: "mod_bisi", entity: "rpt_997", time: "15 mins ago", channel: "admin" },
    { action: "user.verified", actor: "user_chukwu", entity: "usr_1123", time: "22 mins ago", channel: "web" },
  ];

  const stats = [
    { label: "Pending Reports", value: pendingReports.filter((r) => r.status === "pending").length, color: "#F4A300", icon: "🕐" },
    { label: "Approved Today", value: "23", color: "#0FA958", icon: "✅" },
    { label: "Identifiers Flagged", value: "1,847", color: "#D92D20", icon: "🚨" },
    { label: "Lookups Today", value: "189k", color: "#6366F1", icon: "🔍" },
  ];

  const moderate = (id, action) => {
    setPendingReports((prev) => prev.map((r) => r.id === id ? { ...r, status: action } : r));
    showToast(`Report ${action === "approved" ? "approved ✅" : "rejected ❌"}`, action === "approved" ? "success" : "error");
  };

  const tabs = [
    { id: "reports", label: "📋 Reports" },
    { id: "audit", label: "📜 Audit Log" },
    { id: "analytics", label: "📊 Analytics" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0F172A", paddingTop: "64px", padding: "100px 24px 80px" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ fontFamily: "'Space Mono', monospace", color: "#F4A300", fontSize: "12px", letterSpacing: "0.15em", marginBottom: "8px" }}>🛡️ ADMIN PANEL</div>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: "36px", fontWeight: "800" }}>Trust & Safety Dashboard</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(15,169,88,0.1)", border: "1px solid rgba(15,169,88,0.25)", borderRadius: "8px", padding: "10px 16px" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#0FA958", animation: "pulse-ring 2s ease infinite" }} />
            <span style={{ fontFamily: "'Space Mono', monospace", color: "#0FA958", fontSize: "13px" }}>Live</span>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "32px" }}>
          {stats.map((s) => (
            <Card key={s.label} style={{ padding: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                <span style={{ fontSize: "24px" }}>{s.icon}</span>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: s.color }} />
              </div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "32px", fontWeight: "700", color: s.color, marginBottom: "4px" }}>{s.value}</div>
              <div style={{ color: "rgba(255,255,255,0.45)", fontFamily: "'DM Sans', sans-serif", fontSize: "13px" }}>{s.label}</div>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "4px", background: "rgba(255,255,255,0.04)", borderRadius: "12px", padding: "6px", marginBottom: "24px", border: "1px solid rgba(255,255,255,0.06)" }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                flex: 1, padding: "10px",
                background: activeTab === t.id ? "rgba(15,169,88,0.15)" : "none",
                border: activeTab === t.id ? "1px solid rgba(15,169,88,0.3)" : "1px solid transparent",
                color: activeTab === t.id ? "#0FA958" : "rgba(255,255,255,0.45)",
                borderRadius: "8px", fontSize: "13px",
                fontFamily: "'Space Mono', monospace", fontWeight: "700",
                transition: "all 0.2s",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Reports Tab */}
        {activeTab === "reports" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {pendingReports.filter((r) => r.status === "pending").length === 0 && (
              <Card style={{ padding: "48px", textAlign: "center" }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>✅</div>
                <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: "24px", color: "#0FA958" }}>All Clear</h3>
                <p style={{ color: "rgba(255,255,255,0.4)", marginTop: "8px", fontFamily: "'DM Sans', sans-serif" }}>No pending reports. Great work!</p>
              </Card>
            )}
            {pendingReports.filter((r) => r.status === "pending").map((report) => (
              <Card key={report.id} style={{ padding: "24px" }}>
                <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: "200px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px", flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "13px", color: "rgba(255,255,255,0.3)" }}>{report.id}</span>
                      <Tag label={report.scam_type} />
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "11px", color: "rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.04)", padding: "3px 8px", borderRadius: "4px" }}>{report.channel}</span>
                    </div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "16px", fontWeight: "700", color: "white", marginBottom: "6px" }}>{report.identifier}</div>
                    <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "11px", fontFamily: "'Space Mono', monospace", textTransform: "uppercase", marginBottom: "12px" }}>TYPE: {report.type}</div>
                    <p style={{ color: "rgba(255,255,255,0.6)", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", lineHeight: 1.6, marginBottom: "12px" }}>{report.description}</p>
                    {report.amount && <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(217,45,32,0.1)", border: "1px solid rgba(217,45,32,0.2)", borderRadius: "6px", padding: "4px 12px", color: "#D92D20", fontFamily: "'Space Mono', monospace", fontSize: "13px", fontWeight: "700" }}>💸 {report.amount} lost</div>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", justifyContent: "center", flexShrink: 0 }}>
                    <Button variant="primary" size="sm" onClick={() => moderate(report.id, "approved")}>✅ Approve</Button>
                    <Button variant="danger" size="sm" onClick={() => moderate(report.id, "rejected")}>❌ Reject</Button>
                    <button style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.45)", padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontFamily: "'Space Mono', monospace" }}>View Details</button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Audit Tab */}
        {activeTab === "audit" && (
          <Card>
            <div style={{ padding: "24px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: "20px", fontWeight: "700" }}>Audit Log</h3>
              <p style={{ color: "rgba(255,255,255,0.35)", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", marginTop: "4px" }}>Immutable record of all actions</p>
            </div>
            <div>
              {auditLogs.map((log, i) => {
                const actionColor = log.action.includes("approved") || log.action.includes("verified") ? "#0FA958" : log.action.includes("rejected") ? "#D92D20" : "rgba(255,255,255,0.5)";
                return (
                  <div key={i} style={{ padding: "16px 24px", borderBottom: i < auditLogs.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                    <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: actionColor, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: "200px" }}>
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "13px", color: actionColor, fontWeight: "700" }}>{log.action}</span>
                      <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "13px", fontFamily: "'Space Mono', monospace", margin: "0 8px" }}>by</span>
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "13px", color: "white" }}>{log.actor}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "11px", color: "rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.04)", padding: "3px 8px", borderRadius: "4px" }}>{log.channel}</span>
                      <span style={{ color: "rgba(255,255,255,0.25)", fontFamily: "'Space Mono', monospace", fontSize: "12px" }}>{log.time}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Analytics Tab */}
        {activeTab === "analytics" && (
          <div style={{ display: "grid", gap: "20px" }}>
            {/* Bar chart: reports by type */}
            <Card style={{ padding: "32px" }}>
              <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: "20px", fontWeight: "700", marginBottom: "24px" }}>Reports by Scam Type</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {[
                  { label: "Investment / Ponzi", count: 234, pct: 85 },
                  { label: "Romance Scam", count: 187, pct: 68 },
                  { label: "Phishing", count: 156, pct: 57 },
                  { label: "Impersonation", count: 112, pct: 41 },
                  { label: "Online Shopping", count: 89, pct: 32 },
                  { label: "Crypto Scam", count: 67, pct: 24 },
                ].map((item) => (
                  <div key={item.label}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: "rgba(255,255,255,0.7)" }}>{item.label}</span>
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "13px", color: "rgba(255,255,255,0.4)" }}>{item.count}</span>
                    </div>
                    <div style={{ height: "8px", background: "rgba(255,255,255,0.05)", borderRadius: "4px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${item.pct}%`, background: "linear-gradient(90deg, #0FA958, #4ADE80)", borderRadius: "4px", transition: "width 1s ease" }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Lookup channels */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <Card style={{ padding: "32px" }}>
                <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: "18px", fontWeight: "700", marginBottom: "20px" }}>Lookup Channels</h3>
                {[
                  { channel: "Web", pct: 52, color: "#0FA958" },
                  { channel: "Mobile", pct: 31, color: "#6366F1" },
                  { channel: "USSD", pct: 13, color: "#F4A300" },
                  { channel: "API", pct: 4, color: "#64748B" },
                ].map((c) => (
                  <div key={c.channel} style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                    <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: c.color, flexShrink: 0 }} />
                    <div style={{ flex: 1, fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: "rgba(255,255,255,0.7)" }}>{c.channel}</div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "14px", color: c.color, fontWeight: "700" }}>{c.pct}%</div>
                  </div>
                ))}
              </Card>

              <Card style={{ padding: "32px" }}>
                <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: "18px", fontWeight: "700", marginBottom: "20px" }}>Risk Distribution</h3>
                {[
                  { level: "CRITICAL", count: 234, color: "#D92D20" },
                  { level: "HIGH", count: 687, color: "#D92D20" },
                  { level: "MEDIUM", count: 445, color: "#F4A300" },
                  { level: "LOW", count: 1892, color: "#0FA958" },
                ].map((c) => (
                  <div key={c.level} style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                    <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: c.color, flexShrink: 0 }} />
                    <div style={{ flex: 1, fontFamily: "'Space Mono', monospace", fontSize: "12px", color: "rgba(255,255,255,0.7)", letterSpacing: "0.05em" }}>{c.level}</div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "14px", color: c.color, fontWeight: "700" }}>{c.count.toLocaleString()}</div>
                  </div>
                ))}
              </Card>
            </div>
          </div>
        )}
      </div>
      {toast && <Toast message={toast.msg} type={toast.type} />}
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const [currentPage, setCurrentPage] = useState("home");
  const [lookupQuery, setLookupQuery] = useState("");

  const navigateTo = (page, query = "") => {
    setCurrentPage(page);
    if (query) setLookupQuery(query);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const renderPage = () => {
    switch (currentPage) {
      case "home":
        return <HomePage setPage={navigateTo} setLookupQuery={setLookupQuery} />;
      case "lookup":
      case "result":
        return <LookupPage initialQuery={lookupQuery} setPage={navigateTo} />;
      case "report":
        return <ReportPage />;
      case "vault":
        return <VaultPage />;
      case "ussd":
        return <UssdPage />;
      case "admin":
        return <AdminPage />;
      default:
        return <HomePage setPage={navigateTo} setLookupQuery={setLookupQuery} />;
    }
  };

  return (
    <AppContext.Provider value={{ currentPage, setPage: navigateTo }}>
      <div style={{ fontFamily: "'DM Sans', sans-serif", background: "#0F172A", minHeight: "100vh" }}>
        <GridBackground />
        <Navbar currentPage={currentPage} setPage={navigateTo} />
        <div style={{ position: "relative", zIndex: 1 }}>
          {renderPage()}
        </div>

        {/* Footer */}
        <footer style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          padding: "40px 24px",
          background: "rgba(11,31,58,0.5)",
          backdropFilter: "blur(12px)",
          position: "relative", zIndex: 1,
        }}>
          <div style={{ maxWidth: "1100px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "16px", fontWeight: "700", color: "white", marginBottom: "4px" }}>
                Trust<span style={{ color: "#0FA958" }}>Naija</span>
              </div>
              <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "13px", fontFamily: "'DM Sans', sans-serif" }}>
                Nigeria's fraud intelligence platform
              </div>
            </div>
            <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
              {["home", "lookup", "report", "ussd", "vault", "admin"].map((p) => (
                <button key={p} onClick={() => navigateTo(p)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.35)", fontSize: "13px", fontFamily: "'Space Mono', monospace", textTransform: "capitalize", letterSpacing: "0.05em" }}>
                  {p === "lookup" ? "Check" : p === "ussd" ? "Offline" : p === "vault" ? "Vault" : p}
                </button>
              ))}
            </div>
            <div style={{ color: "rgba(255,255,255,0.2)", fontSize: "12px", fontFamily: "'Space Mono', monospace" }}>
              © 2025 TrustNaija · Built for 🇳🇬
            </div>
          </div>
        </footer>
      </div>
    </AppContext.Provider>
  );
}
