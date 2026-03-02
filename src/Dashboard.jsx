import { useState, useCallback, useMemo, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, LineChart, Line, Cell
} from "recharts";

// ── UCOOK Brand Colours ──────────────────────────────────────────────────────
const B = {
  carrot:   "#FA8246",
  castIron: "#1E1E1E",
  stone:    "#8C8C82",
  stoneLight: "#C8C8BE",
  canola:   "#FAB400",
  sprout:   "#91A555",
  frost:    "#7DA0D7",
  white:    "#FFFFFF",
  offWhite: "#F5F4F0",
  danger:   "#E05555",
  bg:       "#F7F6F2",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const pct = (v) => {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};
const num = (v) => {
  const n = parseInt(String(v).replace(/,/g, ""), 10);
  return isNaN(n) ? 0 : n;
};
const currency = (v) => {
  const n = parseFloat(v);
  if (isNaN(n) || n === 0) return "R 0";
  return `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 0 })}`;
};
const short = (s, max = 22) =>
  s && s.length > max ? s.slice(0, max) + "…" : s || "";

// ── PDF Report: open report in new tab via Blob URL, then trigger print (user chooses "Save as PDF") ─
function openReportForPDF(html) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank", "noopener,noreferrer");
  if (!w) {
    URL.revokeObjectURL(url);
    alert("Please allow pop-ups for this site to download the report as PDF.");
    return;
  }
  const doPrint = () => {
    try {
      w.focus();
      w.print();
    } catch (e) {
      // Print may fail if user already closed the tab
    }
    w.onafterprint = () => {
      w.close();
      URL.revokeObjectURL(url);
    };
    // Fallback: revoke URL after a delay in case onafterprint doesn't fire
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };
  w.addEventListener("load", () => setTimeout(doPrint, 600));
}

// ── Build full report HTML ─
function generatePDFReport(data, period, { wins = [], risks = [], funnelData = [] }) {
  const title = `UCOOK CRM Report – ${period}`;
  const n = data.length || 1;
  const totalSent = data.reduce((a, r) => a + num(r["Sent"]), 0);
  const avgOpen = (data.reduce((a, r) => a + pct(r["Unique Opened %"]), 0) / n).toFixed(1);
  const avgClick = (data.reduce((a, r) => a + pct(r["Unique Clicked %"]), 0) / n).toFixed(2);
  const totalRev = data.reduce((a, r) => a + parseFloat(r["Revenue"] || 0), 0);
  const avgConv = (data.reduce((a, r) => a + pct(r["Conversion %"]), 0) / n).toFixed(2);
  const avgUnsub = (data.reduce((a, r) => a + pct(r["Unsubscribed %"]), 0) / n).toFixed(3);
  const avgBounce = (data.reduce((a, r) => a + pct(r["Bounce %"]), 0) / n).toFixed(2);

  const rows = data.map(r => `
    <tr>
      <td>${short(r["Campaign Name"], 35)}</td>
      <td>${num(r["Sent"]).toLocaleString()}</td>
      <td>${pct(r["Delivered %"])}%</td>
      <td>${pct(r["Unique Opened %"])}%</td>
      <td>${pct(r["Unique Clicked %"])}%</td>
      <td>${pct(r["Conversion %"])}%</td>
      <td>${currency(r["Revenue"])}</td>
      <td style="color:${pct(r["Unsubscribed %"]) > 0.5 ? "#E05555" : "#333"}">${pct(r["Unsubscribed %"])}%</td>
      <td style="color:${pct(r["Bounce %"]) > 2 ? "#E05555" : "#333"}">${pct(r["Bounce %"])}%</td>
    </tr>`).join("");

  const winsHtml = wins.length
    ? `<div class="two-col"><div class="card wins"><h3>Top Wins</h3>${wins.map(w => `<div class="row"><span class="label">${w.label}</span><span class="val" style="color:${w.color}">${w.val}</span><span class="camp">${short(w.campaign?.replace(/^\d+_/, "") || "", 28)}</span></div>`).join("")}</div>
       <div class="card risks"><h3>Watch List</h3>${risks.map(r => `<div class="row"><span class="label">${r.label}</span><span class="val" style="color:${r.color}">${r.val}</span><span class="camp">${short(r.campaign?.replace(/^\d+_/, "") || "", 28)}</span></div>`).join("")}</div></div>`
    : "";

  const funnelHtml = funnelData.length
    ? `<h2>Average Funnel</h2><div class="funnel">${funnelData.map((d) => {
        const maxVal = funnelData[0]?.value || 1;
        const pctVal = Math.round((d.value / maxVal) * 100);
        return `<div class="funnel-bar"><div class="funnel-label">${d.name}</div><div class="funnel-track"><div class="funnel-fill" style="width:${pctVal}%;background:${d.fill}"></div><span>${d.value.toLocaleString()}</span></div></div>`;
      }).join("")}</div>`
    : "";

  const printHint = `<div class="print-hint">To save as PDF: use <strong>Save as PDF</strong> or <strong>Print to PDF</strong> as the destination in the print dialog.</div>`;

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>${title}</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&family=DM+Serif+Display&display=swap" rel="stylesheet"/>
<style>
  @media print { .print-hint { display:none !important; } }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'DM Sans', sans-serif; background:#F7F6F2; color:#1E1E1E; padding:40px; }
  .print-hint { background:#FA8246; color:white; padding:12px 20px; border-radius:8px; margin-bottom:24px; font-size:13px; }
  .header { background:#1E1E1E; color:white; padding:32px 40px; border-radius:12px; margin-bottom:32px; display:flex; justify-content:space-between; align-items:center; }
  .logo { font-family:'DM Serif Display',serif; font-size:36px; letter-spacing:-1px; }
  .logo span { color:#FA8246; }
  .subtitle { font-size:13px; color:#8C8C82; margin-top:4px; letter-spacing:2px; text-transform:uppercase; }
  .period { font-size:13px; color:#8C8C82; text-align:right; }
  .kpis { display:grid; grid-template-columns:repeat(8,1fr); gap:12px; margin-bottom:32px; }
  .kpi { background:white; border-radius:8px; padding:16px; border-top:3px solid #FA8246; }
  .kpi .label { font-size:10px; text-transform:uppercase; letter-spacing:1px; color:#8C8C82; margin-bottom:6px; }
  .kpi .value { font-size:20px; font-weight:700; color:#1E1E1E; }
  .kpi.warn { border-top-color:#E05555; }
  .kpi.warn .value { color:#E05555; }
  h2 { font-family:'DM Serif Display',serif; font-size:22px; margin-bottom:16px; color:#1E1E1E; }
  h3 { font-size:14px; margin-bottom:12px; color:#1E1E1E; }
  .two-col { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:24px; }
  .card { background:white; border-radius:8px; padding:20px; }
  .card.wins h3 { color:#91A555; }
  .card.risks h3 { color:#E05555; }
  .card .row { margin-bottom:12px; padding-bottom:10px; border-bottom:1px solid #F0EFE9; }
  .card .row:last-child { border-bottom:none; margin-bottom:0; padding-bottom:0; }
  .card .label { font-size:10px; text-transform:uppercase; letter-spacing:1px; color:#8C8C82; display:block; }
  .card .val { font-size:16px; font-weight:700; display:block; margin:2px 0; }
  .card .camp { font-size:11px; color:#8C8C82; }
  .funnel { margin-bottom:24px; }
  .funnel-bar { margin-bottom:10px; }
  .funnel-label { font-size:11px; color:#8C8C82; margin-bottom:4px; }
  .funnel-track { height:24px; background:#F0EFE9; border-radius:6px; position:relative; display:flex; align-items:center; padding:0 10px; }
  .funnel-fill { position:absolute; left:0; top:0; bottom:0; border-radius:6px; min-width:4px; }
  .funnel-track span { position:relative; z-index:1; font-size:12px; font-weight:700; color:#1E1E1E; }
  table { width:100%; border-collapse:collapse; background:white; border-radius:8px; overflow:hidden; margin-bottom:24px; }
  th { background:#1E1E1E; color:white; padding:10px 12px; font-size:11px; text-align:left; font-weight:600; letter-spacing:0.5px; }
  td { padding:9px 12px; font-size:12px; border-bottom:1px solid #F0EFE9; }
  tr:nth-child(even) td { background:#FAFAF7; }
  .footer { margin-top:32px; text-align:center; font-size:11px; color:#8C8C82; }
  .footer strong { color:#FA8246; }
</style>
</head>
<body>
  ${printHint}
  <div class="header">
    <div>
      <div class="logo"><span>UC</span>OOK</div>
      <div class="subtitle">CRM Performance Report</div>
    </div>
    <div class="period">
      <div>${title}</div>
      <div style="margin-top:4px">${data.length} campaigns analysed</div>
      <div style="margin-top:4px">Generated ${new Date().toLocaleDateString("en-ZA", { day: "2-digit", month: "long", year: "numeric" })}</div>
    </div>
  </div>

  <div class="kpis">
    <div class="kpi"><div class="label">Total Sent</div><div class="value">${totalSent.toLocaleString()}</div></div>
    <div class="kpi"><div class="label">Avg Open Rate</div><div class="value">${avgOpen}%</div></div>
    <div class="kpi"><div class="label">Avg Click Rate</div><div class="value">${avgClick}%</div></div>
    <div class="kpi"><div class="label">Total Revenue</div><div class="value">${currency(totalRev)}</div></div>
    <div class="kpi"><div class="label">Avg Conv %</div><div class="value">${avgConv}%</div></div>
    <div class="kpi ${parseFloat(avgUnsub) > 0.5 ? "warn" : ""}"><div class="label">Avg Unsub %</div><div class="value">${avgUnsub}%</div></div>
    <div class="kpi ${parseFloat(avgBounce) > 2 ? "warn" : ""}"><div class="label">Avg Bounce %</div><div class="value">${avgBounce}%</div></div>
    <div class="kpi"><div class="label">Campaigns</div><div class="value">${data.length}</div></div>
  </div>

  ${winsHtml}
  ${funnelHtml}

  <h2>Campaign Breakdown</h2>
  <table>
    <thead>
      <tr>
        <th>Campaign</th><th>Sent</th><th>Delivered%</th><th>Open%</th>
        <th>Click%</th><th>Conv%</th><th>Revenue</th><th>Unsub%</th><th>Bounce%</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="footer">
    <strong>UCOOK</strong> · Good Food | Good People · ucook.co.za · Report generated by CRM Dashboard
  </div>
</body>
</html>`;

  openReportForPDF(html);
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KPICard({ label, value, sub, accent, warn }) {
  return (
    <div style={{
      background: B.white, borderRadius: 10, padding: "20px 22px",
      borderTop: `3px solid ${warn ? B.danger : accent || B.carrot}`,
      boxShadow: "0 2px 12px rgba(0,0,0,0.06)", minWidth: 0,
    }}>
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, color: B.stone, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: warn ? B.danger : B.castIron, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: B.stone, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

// ── Custom Tooltip ─────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: B.castIron, color: B.white, borderRadius: 8, padding: "10px 14px", fontSize: 12, boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}>
      <div style={{ fontWeight: 700, marginBottom: 6, color: B.carrot }}>{short(label, 30)}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || B.white }}>
          {p.name}: <strong>{typeof p.value === "number" ? p.value.toFixed(2) : p.value}</strong>
        </div>
      ))}
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function UCOOKDashboard() {
  const [data, setData] = useState([]);
  const [fileName, setFileName] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [periodType, setPeriodType] = useState("monthly");
  const fileRef = useRef();

  const parseCSV = (text) => {
    const lines = text.split("\n").filter(Boolean);
    const headers = lines[0].split(",").map(h => h.replace(/^"|"$/g, "").trim());
    return lines.slice(1).map(line => {
      const vals = [];
      let cur = "", inQ = false;
      for (const c of line) {
        if (c === '"') { inQ = !inQ; }
        else if (c === "," && !inQ) { vals.push(cur); cur = ""; }
        else cur += c;
      }
      vals.push(cur);
      const row = {};
      headers.forEach((h, i) => { row[h] = (vals[i] || "").trim(); });
      return row;
    });
  };

  const handleFile = (file) => {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try { setData(parseCSV(e.target.result)); } catch (err) { alert("Could not parse CSV."); }
    };
    reader.readAsText(file);
  };

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  }, []);

  const kpis = useMemo(() => {
    if (!data.length) return null;
    const n = data.length;
    const totalSent = data.reduce((a, r) => a + num(r["Sent"]), 0);
    const avgOpen = (data.reduce((a, r) => a + pct(r["Unique Opened %"]), 0) / n).toFixed(1);
    const avgClick = (data.reduce((a, r) => a + pct(r["Unique Clicked %"]), 0) / n).toFixed(2);
    const totalRev = data.reduce((a, r) => a + parseFloat(r["Revenue"] || 0), 0);
    const avgConv = (data.reduce((a, r) => a + pct(r["Conversion %"]), 0) / n).toFixed(2);
    const avgUnsub = (data.reduce((a, r) => a + pct(r["Unsubscribed %"]), 0) / n).toFixed(3);
    const avgBounce = (data.reduce((a, r) => a + pct(r["Bounce %"]), 0) / n).toFixed(2);
    return { totalSent, avgOpen, avgClick, totalRev, avgConv, avgUnsub, avgBounce, n };
  }, [data]);

  const chartData = useMemo(() => data.map(r => ({
    name: short(r["Campaign Name"]?.replace(/^\d+_/, ""), 20),
    full: r["Campaign Name"],
    open: pct(r["Unique Opened %"]),
    click: pct(r["Unique Clicked %"]),
    conv: pct(r["Conversion %"]),
    revenue: parseFloat(r["Revenue"] || 0),
    unsub: pct(r["Unsubscribed %"]),
    bounce: pct(r["Bounce %"]),
    sent: num(r["Sent"]),
    delivered: pct(r["Delivered %"]),
  })), [data]);

  const funnelData = useMemo(() => {
    if (!data.length) return [];
    const n = data.length;
    return [
      { name: "Sent", value: Math.round(data.reduce((a, r) => a + num(r["Sent"]), 0) / n), fill: B.castIron },
      { name: "Delivered", value: Math.round(data.reduce((a, r) => a + num(r["Delivered"]), 0) / n), fill: B.stone },
      { name: "Opened", value: Math.round(data.reduce((a, r) => a + num(r["Unique Opened"]), 0) / n), fill: B.carrot },
      { name: "Clicked", value: Math.round(data.reduce((a, r) => a + num(r["Unique Clicked"]), 0) / n), fill: B.canola },
    ];
  }, [data]);

  const wins = useMemo(() => {
    if (!data.length) return [];
    const byRev = [...data].sort((a, b) => parseFloat(b["Revenue"] || 0) - parseFloat(a["Revenue"] || 0))[0];
    const byOpen = [...data].sort((a, b) => pct(b["Unique Opened %"]) - pct(a["Unique Opened %"]))[0];
    const byConv = [...data].sort((a, b) => pct(b["Conversion %"]) - pct(a["Conversion %"]))[0];
    return [
      { label: "Top Revenue", campaign: byRev?.["Campaign Name"], val: currency(byRev?.["Revenue"]), color: B.sprout },
      { label: "Top Open Rate", campaign: byOpen?.["Campaign Name"], val: `${pct(byOpen?.["Unique Opened %"])}%`, color: B.frost },
      { label: "Top Conversion", campaign: byConv?.["Campaign Name"], val: `${pct(byConv?.["Conversion %"])}%`, color: B.canola },
    ];
  }, [data]);

  const risks = useMemo(() => {
    if (!data.length) return [];
    const byUnsub = [...data].sort((a, b) => pct(b["Unsubscribed %"]) - pct(a["Unsubscribed %"]))[0];
    const byBounce = [...data].sort((a, b) => pct(b["Bounce %"]) - pct(a["Bounce %"]))[0];
    const byLowOpen = [...data].sort((a, b) => pct(a["Unique Opened %"]) - pct(b["Unique Opened %"]))[0];
    return [
      { label: "Highest Unsub", campaign: byUnsub?.["Campaign Name"], val: `${pct(byUnsub?.["Unsubscribed %"])}%`, color: B.danger },
      { label: "Highest Bounce", campaign: byBounce?.["Campaign Name"], val: `${pct(byBounce?.["Bounce %"])}%`, color: B.danger },
      { label: "Lowest Open Rate", campaign: byLowOpen?.["Campaign Name"], val: `${pct(byLowOpen?.["Unique Opened %"])}%`, color: "#E09030" },
    ];
  }, [data]);

  const tabs = ["overview", "performance", "deliverability", "revenue"];

  return (
    <div style={{ fontFamily: "'DM Sans', Helvetica, sans-serif", background: B.bg, minHeight: "100vh", color: B.castIron }}>
      <div style={{ background: B.castIron, padding: "0 32px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div>
              <span style={{ fontWeight: 900, fontSize: 22, letterSpacing: -1, color: B.white }}>
                <span style={{ color: B.carrot }}>UC</span>OOK
              </span>
              <span style={{ color: B.stone, fontSize: 12, marginLeft: 10, letterSpacing: 2, textTransform: "uppercase" }}>CRM Dashboard</span>
            </div>
            {data.length > 0 && (
              <div style={{ display: "flex", gap: 4, marginLeft: 20 }}>
                {tabs.map(t => (
                  <button key={t} onClick={() => setActiveTab(t)} style={{
                    background: activeTab === t ? B.carrot : "transparent",
                    color: activeTab === t ? B.white : B.stone,
                    border: "none", borderRadius: 6, padding: "6px 16px",
                    fontSize: 12, fontWeight: 600, cursor: "pointer", textTransform: "capitalize",
                    letterSpacing: 0.5, transition: "all 0.2s",
                  }}>{t}</button>
                ))}
              </div>
            )}
          </div>
          {data.length > 0 && (
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <select value={periodType} onChange={e => setPeriodType(e.target.value)} style={{
                background: "#2A2A2A", color: B.stone, border: "1px solid #3A3A3A",
                borderRadius: 6, padding: "6px 12px", fontSize: 12, cursor: "pointer",
              }}>
                <option value="weekly">Weekly Report</option>
                <option value="monthly">Monthly Report</option>
              </select>
              <button onClick={() => generatePDFReport(data, `${periodType === "weekly" ? "Weekly" : "Monthly"} – ${new Date().toLocaleDateString("en-ZA", { month: "long", year: "numeric" })}`, { wins, risks, funnelData })}
                style={{
                  background: B.carrot, color: B.white, border: "none",
                  borderRadius: 6, padding: "7px 18px", fontSize: 12, fontWeight: 700,
                  cursor: "pointer", letterSpacing: 0.5,
                }}>
                ↓ Download Report (PDF)
              </button>
              <button onClick={() => { setData([]); setFileName(""); }}
                style={{ background: "transparent", color: B.stone, border: "1px solid #3A3A3A", borderRadius: 6, padding: "6px 12px", fontSize: 12, cursor: "pointer" }}>
                Clear
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: "28px 32px" }}>
        {!data.length && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? B.carrot : B.stoneLight}`,
              borderRadius: 16, padding: "80px 40px", textAlign: "center",
              cursor: "pointer", background: dragOver ? "#FA824208" : B.white,
              transition: "all 0.2s", maxWidth: 600, margin: "60px auto",
            }}>
            <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }}
              onChange={(e) => handleFile(e.target.files?.[0])} />
            <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: B.castIron, marginBottom: 8 }}>
              Drop your CSV here
            </div>
            <div style={{ fontSize: 14, color: B.stone, marginBottom: 20 }}>
              Upload your email campaign export to generate insights
            </div>
            <div style={{ display: "inline-block", background: B.carrot, color: B.white, borderRadius: 8, padding: "10px 28px", fontWeight: 700, fontSize: 14 }}>
              Browse File
            </div>
            <div style={{ marginTop: 16, fontSize: 12, color: B.stoneLight }}>
              Supports: Campaign Name, Sent, Delivered, Open Rate, Click Rate, Revenue, Unsub, Bounce
            </div>
          </div>
        )}

        {data.length > 0 && (
          <div style={{ background: B.white, borderRadius: 8, padding: "10px 18px", marginBottom: 24, display: "flex", alignItems: "center", gap: 12, boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
            <span style={{ fontSize: 18 }}>📁</span>
            <span style={{ fontSize: 13, color: B.stone }}>{fileName}</span>
            <span style={{ background: B.carrot + "20", color: B.carrot, borderRadius: 4, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>{data.length} campaigns</span>
          </div>
        )}

        {data.length > 0 && activeTab === "overview" && kpis && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 14, marginBottom: 28 }}>
              <KPICard label="Total Sent" value={kpis.totalSent.toLocaleString()} accent={B.castIron} />
              <KPICard label="Avg Open Rate" value={`${kpis.avgOpen}%`} sub={parseFloat(kpis.avgOpen) < 20 ? "⚠ Below 20%" : "✓ Healthy"} accent={B.frost} warn={parseFloat(kpis.avgOpen) < 20} />
              <KPICard label="Avg Click Rate" value={`${kpis.avgClick}%`} sub={parseFloat(kpis.avgClick) < 2 ? "⚠ Below 2%" : "✓ Good"} accent={B.canola} warn={parseFloat(kpis.avgClick) < 2} />
              <KPICard label="Total Revenue" value={currency(kpis.totalRev)} accent={B.sprout} />
              <KPICard label="Avg Conv %" value={`${kpis.avgConv}%`} accent={B.carrot} />
              <KPICard label="Avg Unsub %" value={`${kpis.avgUnsub}%`} accent={B.stone} warn={parseFloat(kpis.avgUnsub) > 0.5} />
              <KPICard label="Avg Bounce %" value={`${kpis.avgBounce}%`} accent={B.stone} warn={parseFloat(kpis.avgBounce) > 2} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
              <div style={{ background: B.white, borderRadius: 12, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 20 }}>Average Funnel Drop-off</div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 180 }}>
                  {funnelData.map((d, i) => {
                    const maxVal = funnelData[0]?.value || 1;
                    const h = Math.max((d.value / maxVal) * 150, 20);
                    return (
                      <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: B.stone }}>{d.value.toLocaleString()}</div>
                        <div style={{ width: "100%", height: h, background: d.fill, borderRadius: "6px 6px 0 0", transition: "height 0.5s" }} />
                        <div style={{ fontSize: 11, color: B.stone, textAlign: "center" }}>{d.name}</div>
                        {i > 0 && (
                          <div style={{ fontSize: 10, color: B.danger }}>
                            {((1 - d.value / funnelData[i-1].value) * 100).toFixed(0)}% drop
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div style={{ background: B.white, borderRadius: 12, padding: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                  <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 14, color: B.sprout }}>🟢 Top Wins</div>
                  {wins.map((w, i) => (
                    <div key={i} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: i < wins.length-1 ? `1px solid ${B.bg}` : "none" }}>
                      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1, color: B.stone }}>{w.label}</div>
                      <div style={{ fontWeight: 700, fontSize: 16, color: w.color, margin: "2px 0" }}>{w.val}</div>
                      <div style={{ fontSize: 11, color: B.stone }}>{short(w.campaign?.replace(/^\d+_/, ""), 28)}</div>
                    </div>
                  ))}
                </div>
                <div style={{ background: B.white, borderRadius: 12, padding: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                  <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 14, color: B.danger }}>🔴 Watch List</div>
                  {risks.map((r, i) => (
                    <div key={i} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: i < risks.length-1 ? `1px solid ${B.bg}` : "none" }}>
                      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1, color: B.stone }}>{r.label}</div>
                      <div style={{ fontWeight: 700, fontSize: 16, color: r.color, margin: "2px 0" }}>{r.val}</div>
                      <div style={{ fontSize: 11, color: B.stone }}>{short(r.campaign?.replace(/^\d+_/, ""), 28)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ background: B.white, borderRadius: 12, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
              <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 20 }}>Open Rate by Campaign (%)</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: -10, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EFE9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: B.stone }} angle={-35} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 11, fill: B.stone }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="open" name="Open %" radius={[4, 4, 0, 0]}>
                    {chartData.map((d, i) => <Cell key={i} fill={d.open < 20 ? B.danger : d.open > 40 ? B.sprout : B.carrot} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {data.length > 0 && activeTab === "performance" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
              <div style={{ background: B.white, borderRadius: 12, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>Click Rate vs Open Rate</div>
                <div style={{ fontSize: 12, color: B.stone, marginBottom: 16 }}>Identify engagement outliers</div>
                <ResponsiveContainer width="100%" height={240}>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0EFE9" />
                    <XAxis dataKey="open" name="Open %" tick={{ fontSize: 11, fill: B.stone }} label={{ value: "Open %", position: "insideBottom", offset: -4, fontSize: 11, fill: B.stone }} />
                    <YAxis dataKey="click" name="Click %" tick={{ fontSize: 11, fill: B.stone }} />
                    <Tooltip content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]?.payload;
                      return <div style={{ background: B.castIron, color: B.white, padding: "8px 12px", borderRadius: 8, fontSize: 12 }}>
                        <div style={{ color: B.carrot, fontWeight: 700 }}>{short(d?.name, 25)}</div>
                        <div>Open: {d?.open}% | Click: {d?.click}%</div>
                      </div>;
                    }} />
                    <Scatter data={chartData} fill={B.carrot} opacity={0.8} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>

              <div style={{ background: B.white, borderRadius: 12, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>Conversion % by Campaign</div>
                <div style={{ fontSize: 12, color: B.stone, marginBottom: 16 }}>Which campaigns drive action</div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={chartData.filter(d => d.conv > 0)} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0EFE9" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: B.stone }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: B.stone }} width={130} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="conv" name="Conv %" fill={B.canola} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={{ background: B.white, borderRadius: 12, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", overflowX: "auto" }}>
              <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 20 }}>Full Campaign Table</div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: B.castIron }}>
                    {["Campaign", "Sent", "Delivered%", "Open%", "Click%", "Conv%", "Revenue", "Unsub%", "Bounce%"].map(h => (
                      <th key={h} style={{ color: B.white, padding: "10px 12px", textAlign: "left", fontWeight: 600, fontSize: 11, letterSpacing: 0.5, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((r, i) => {
                    const highUnsub = pct(r["Unsubscribed %"]) > 0.5;
                    const highBounce = pct(r["Bounce %"]) > 2;
                    return (
                      <tr key={i} style={{ background: i % 2 === 0 ? B.white : B.bg }}>
                        <td style={{ padding: "9px 12px", color: B.castIron, fontWeight: 500, maxWidth: 220 }}>{short(r["Campaign Name"]?.replace(/^\d+_/, ""), 32)}</td>
                        <td style={{ padding: "9px 12px", color: B.stone }}>{num(r["Sent"]).toLocaleString()}</td>
                        <td style={{ padding: "9px 12px" }}>{pct(r["Delivered %"])}%</td>
                        <td style={{ padding: "9px 12px", fontWeight: pct(r["Unique Opened %"]) > 30 ? 700 : 400, color: pct(r["Unique Opened %"]) < 15 ? B.danger : B.castIron }}>{pct(r["Unique Opened %"])}%</td>
                        <td style={{ padding: "9px 12px" }}>{pct(r["Unique Clicked %"])}%</td>
                        <td style={{ padding: "9px 12px" }}>{pct(r["Conversion %"])}%</td>
                        <td style={{ padding: "9px 12px", fontWeight: 700, color: B.sprout }}>{currency(r["Revenue"])}</td>
                        <td style={{ padding: "9px 12px", color: highUnsub ? B.danger : B.stone, fontWeight: highUnsub ? 700 : 400 }}>{pct(r["Unsubscribed %"])}% {highUnsub && "⚠"}</td>
                        <td style={{ padding: "9px 12px", color: highBounce ? B.danger : B.stone, fontWeight: highBounce ? 700 : 400 }}>{pct(r["Bounce %"])}% {highBounce && "⚠"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {data.length > 0 && activeTab === "deliverability" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {[
              { key: "bounce", label: "Bounce % by Campaign", name: "Bounce %", color: B.danger, threshold: 2 },
              { key: "unsub", label: "Unsubscribe % by Campaign", name: "Unsub %", color: B.carrot, threshold: 0.5 },
              { key: "delivered", label: "Delivered % by Campaign", name: "Delivered %", color: B.sprout, threshold: null },
              { key: "open", label: "Open Rate Trend", name: "Open %", color: B.frost, threshold: 20 },
            ].map(cfg => (
              <div key={cfg.key} style={{ background: B.white, borderRadius: 12, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 20 }}>{cfg.label}</div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} margin={{ top: 4, right: 8, left: -10, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0EFE9" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: B.stone }} angle={-35} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 11, fill: B.stone }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey={cfg.key} name={cfg.name} radius={[4, 4, 0, 0]}>
                      {chartData.map((d, i) => (
                        <Cell key={i} fill={cfg.threshold && d[cfg.key] > cfg.threshold ? B.danger : cfg.color} />
                      ))}
                    </Bar>
                    {cfg.threshold && (
                      <Line dataKey={() => cfg.threshold} stroke={B.danger} strokeDasharray="4 4" dot={false} name="Threshold" />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ))}
          </div>
        )}

        {data.length > 0 && activeTab === "revenue" && (
          <>
            <div style={{ background: B.white, borderRadius: 12, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: 20 }}>
              <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>Revenue by Campaign</div>
              <div style={{ fontSize: 12, color: B.stone, marginBottom: 20 }}>Sorted by revenue contribution</div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={[...chartData].sort((a,b) => b.revenue - a.revenue)} margin={{ top: 4, right: 20, left: 20, bottom: 70 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EFE9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: B.stone }} angle={-35} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 11, fill: B.stone }} tickFormatter={v => `R${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    return <div style={{ background: B.castIron, color: B.white, padding: "8px 12px", borderRadius: 8, fontSize: 12 }}>
                      <div style={{ color: B.canola, fontWeight: 700 }}>{payload[0]?.payload?.name}</div>
                      <div>Revenue: <strong>{currency(payload[0]?.value)}</strong></div>
                    </div>;
                  }} />
                  <Bar dataKey="revenue" name="Revenue" fill={B.canola} radius={[5, 5, 0, 0]}>
                    {[...chartData].sort((a,b) => b.revenue - a.revenue).map((d, i) => (
                      <Cell key={i} fill={i === 0 ? B.sprout : i < 3 ? B.carrot : B.canola} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ background: B.white, borderRadius: 12, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
              <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>Click Rate vs Conversion Rate</div>
              <div style={{ fontSize: 12, color: B.stone, marginBottom: 20 }}>Identify where clicks aren't converting</div>
              <ResponsiveContainer width="100%" height={240}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EFE9" />
                  <XAxis dataKey="click" name="Click %" tick={{ fontSize: 11, fill: B.stone }} label={{ value: "Click %", position: "insideBottom", offset: -4, fontSize: 11, fill: B.stone }} />
                  <YAxis dataKey="conv" name="Conv %" tick={{ fontSize: 11, fill: B.stone }} />
                  <Tooltip content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0]?.payload;
                    return <div style={{ background: B.castIron, color: B.white, padding: "8px 12px", borderRadius: 8, fontSize: 12 }}>
                      <div style={{ color: B.canola, fontWeight: 700 }}>{short(d?.name, 25)}</div>
                      <div>Click: {d?.click}% | Conv: {d?.conv}%</div>
                      <div>Revenue: {currency(d?.revenue)}</div>
                    </div>;
                  }} />
                  <Scatter data={chartData.filter(d => d.conv > 0)} fill={B.sprout} opacity={0.85} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>

      <div style={{ textAlign: "center", padding: "20px 32px 32px", fontSize: 12, color: B.stoneLight }}>
        <span style={{ color: B.carrot, fontWeight: 700 }}>UCOOK</span> · Good Food | Good People · CRM Dashboard 2026
      </div>
    </div>
  );
}
