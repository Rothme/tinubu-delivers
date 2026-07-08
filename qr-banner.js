// qr-banner.js
// Shared banner component. Include this script on both the admin panel and the
// client dashboard so they always show identical numbers - one source of truth
// (functions/qr-stats.js), rendered in two places.
//
// Usage: <div id="qr-usage-banner"></div>  <script src="/qr-banner.js"></script>

async function renderQRBanner() {
  const container = document.getElementById("qr-usage-banner");
  if (!container) return;

  container.innerHTML = `<div style="padding:16px;border-radius:10px;background:#f0f0f0;color:#666;font-family:Arial,sans-serif;">Loading QR usage...</div>`;

  try {
    const res = await fetch("/qr-stats");
    const data = await res.json();

    const pct = data.percentOfCap;
    const alertColor = data.alertActive ? "#b00020" : "#0d5c3a";
    const bgColor = data.alertActive ? "#fdecea" : "#e9f5ef";
    const barColor = data.alertActive ? "#b00020" : "#0d5c3a";

    container.innerHTML = `
      <div style="padding:18px 20px;border-radius:10px;background:${bgColor};border:1px solid ${alertColor}22;font-family:Arial,sans-serif;">
        <div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:8px;">
          <div>
            <div style="font-size:13px;color:#666;text-transform:uppercase;letter-spacing:0.5px;">Total QR Scans (all-time)</div>
            <div style="font-size:32px;font-weight:700;color:${alertColor};">${data.total.toLocaleString()}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:13px;color:#666;">of ${data.hardCap.toLocaleString()} cap</div>
            <div style="font-size:20px;font-weight:600;color:${alertColor};">${pct}%</div>
          </div>
        </div>
        <div style="margin-top:12px;height:8px;background:#ddd;border-radius:4px;overflow:hidden;">
          <div style="height:100%;width:${pct}%;background:${barColor};transition:width 0.3s;"></div>
        </div>
        ${data.alertActive ? `
        <div style="margin-top:12px;padding:10px 12px;background:${alertColor};color:white;border-radius:6px;font-size:14px;font-weight:600;">
          ⚠ Usage has crossed 40,000,000 scans. Reach out to the client to discuss the contract cap.
        </div>` : ''}
        <div style="margin-top:8px;font-size:12px;color:#999;">Last updated: ${new Date(data.generatedAt).toLocaleString()}</div>
      </div>
    `;
  } catch (e) {
    container.innerHTML = `<div style="padding:16px;border-radius:10px;background:#fdecea;color:#b00020;font-family:Arial,sans-serif;">Could not load QR usage data.</div>`;
  }
}

renderQRBanner();
setInterval(renderQRBanner, 60000); // refresh every minute so the banner stays current without a manual reload
