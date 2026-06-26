// Transactional email. Uses Resend when RESEND_API_KEY is set; otherwise logs
// the message to the server console so flows (password reset, order receipts)
// are fully testable in development without a provider.
import { ENV } from "./env";

type Mail = { to: string; subject: string; html: string; text?: string };

const stripHtml = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

export async function sendMail(mail: Mail): Promise<{ delivered: boolean; provider: string }> {
  if (!ENV.resendApiKey) {
    console.log(
      `\n──────── [mail:dev] ────────\nTo:      ${mail.to}\nSubject: ${mail.subject}\n${mail.text || stripHtml(mail.html)}\n────────────────────────────\n`,
    );
    return { delivered: false, provider: "console" };
  }
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${ENV.resendApiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ from: ENV.mailFrom, to: [mail.to], subject: mail.subject, html: mail.html, text: mail.text || stripHtml(mail.html) }),
    });
    if (!resp.ok) {
      console.warn("[mail] Resend send failed", resp.status, await resp.text().catch(() => ""));
      return { delivered: false, provider: "resend" };
    }
    return { delivered: true, provider: "resend" };
  } catch (e) {
    console.warn("[mail] send error", String(e));
    return { delivered: false, provider: "resend" };
  }
}

// ---- Templates --------------------------------------------------------------
const naira = (v: any) => `₦${Number(v || 0).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
// Public site URL for email CTA links (request origin isn't available here).
const appUrl = () => (ENV.appBaseUrl || "https://heiskits.com").replace(/\/$/, "");

const shell = (title: string, body: string) => `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#0a0a0b">
    <div style="background:#0a0a0b;color:#fff;padding:20px 24px"><span style="font-weight:800;letter-spacing:.04em;font-size:20px">HEIS KITS</span></div>
    <div style="padding:24px">
      <h1 style="font-size:22px;margin:0 0 16px">${title}</h1>
      ${body}
    </div>
    <div style="padding:16px 24px;color:#6f6f76;font-size:12px;border-top:1px solid #e4e4e7">HEIS KITS — for the love of the game.</div>
  </div>`;

export function sendPasswordResetEmail(to: string, resetUrl: string) {
  const html = shell(
    "Reset your password",
    `<p style="font-size:15px;line-height:1.6">We received a request to reset your HEIS KITS password. This link expires in 1 hour.</p>
     <p style="margin:24px 0"><a href="${resetUrl}" style="background:#ff2e1f;color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;display:inline-block">Reset password</a></p>
     <p style="font-size:13px;color:#6f6f76">If you didn't request this, you can safely ignore this email. Or paste this link: <br>${resetUrl}</p>`,
  );
  return sendMail({ to, subject: "Reset your HEIS KITS password", html });
}

const esc = (s: any) => String(s ?? "").replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" } as any)[c] || c);

// ---- Admin (business) notifications → ENV.adminNotifyEmail ------------------
export function notifyAdminNewOrder(order: any, customer: { name?: string | null; email?: string | null }) {
  const itemCount = Array.isArray(order?.items) ? order.items.length : 0;
  const html = shell("New order received 🛍️", `
    <p style="font-size:16px;line-height:1.6"><b>${esc(order?.orderNumber)}</b> — ${naira(order?.totalAmount)}</p>
    <p style="font-size:14px;color:#6f6f76">Customer: ${esc(customer.name) || "—"} (${esc(customer.email) || "—"})</p>
    <p style="font-size:14px;color:#6f6f76">${itemCount} item${itemCount === 1 ? "" : "s"} · Payment completed.</p>
    <p style="font-size:13px;margin-top:16px">Manage it in the admin Orders dashboard.</p>`);
  return sendMail({ to: ENV.adminNotifyEmail, subject: `New order ${order?.orderNumber || ""} — ${naira(order?.totalAmount)}`, html });
}

export function notifyAdminNewSupportMessage(opts: { name?: string | null; email?: string | null; content: string }) {
  const html = shell("New support message", `
    <p style="font-size:14px;color:#6f6f76">From: ${esc(opts.name) || "Customer"} (${esc(opts.email) || "—"})</p>
    <blockquote style="border-left:3px solid #ff2e1f;padding:4px 0 4px 12px;margin:12px 0;font-size:15px;color:#0a0a0b">${esc(opts.content)}</blockquote>
    <p style="font-size:13px;margin-top:16px">Reply from the admin Support inbox.</p>`);
  return sendMail({ to: ENV.adminNotifyEmail, subject: "New customer support message", html });
}

// ---- New-user lifecycle -----------------------------------------------------
export function sendWelcomeEmail(to: string, name?: string | null) {
  const first = String(name || "").trim().split(/\s+/)[0] || "there";
  const html = shell(
    `Welcome to HEIS KITS, ${esc(first)} 👟`,
    `<p style="font-size:15px;line-height:1.6">Your account is live. You're all set to shop premium football & sports kits — built for performance, made for the love of the game.</p>
     <ul style="font-size:14px;line-height:1.8;color:#0a0a0b;padding-left:18px;margin:16px 0">
       <li>AI virtual try-on & a smart size advisor</li>
       <li>Saved carts and faster checkout</li>
       <li>Live order tracking from confirmation to delivery</li>
     </ul>
     <p style="margin:24px 0"><a href="${esc(appUrl())}/catalog" style="background:#ff2e1f;color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;display:inline-block">Start shopping</a></p>
     <p style="font-size:13px;color:#6f6f76">Need a hand? Just reply to this email or use in-app support.</p>`,
  );
  return sendMail({ to, subject: "Welcome to HEIS KITS 👟", html });
}

export function notifyAdminNewSignup(user: { name?: string | null; email?: string | null; method?: string | null }) {
  const html = shell("New customer sign-up 🎉", `
    <p style="font-size:16px;line-height:1.6"><b>${esc(user.name) || "New customer"}</b></p>
    <p style="font-size:14px;color:#6f6f76">Email: ${esc(user.email) || "—"}</p>
    <p style="font-size:14px;color:#6f6f76">Method: ${esc(user.method) || "email"}</p>
    <p style="font-size:13px;margin-top:16px">View them in the admin Customers dashboard.</p>`);
  return sendMail({ to: ENV.adminNotifyEmail, subject: `New sign-up: ${user.email || "customer"}`, html });
}

// ---- Order lifecycle --------------------------------------------------------
export function sendOrderShippedEmail(to: string, order: any) {
  const track = [
    order?.carrier ? `<p style="font-size:14px;margin:4px 0"><b>Carrier:</b> ${esc(order.carrier)}</p>` : "",
    order?.trackingNumber ? `<p style="font-size:14px;margin:4px 0"><b>Tracking #:</b> ${esc(order.trackingNumber)}</p>` : "",
    order?.estimatedDelivery ? `<p style="font-size:14px;margin:4px 0"><b>Estimated delivery:</b> ${esc(order.estimatedDelivery)}</p>` : "",
  ].join("");
  const html = shell(
    "Your order is on its way 🚚",
    `<p style="font-size:15px;line-height:1.6">Good news — order <b>${esc(order?.orderNumber)}</b> has shipped.</p>
     ${track || `<p style="font-size:14px;color:#6f6f76">Tracking details will follow shortly.</p>`}
     <p style="margin:24px 0"><a href="${esc(appUrl())}/profile" style="background:#ff2e1f;color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;display:inline-block">Track your order</a></p>`,
  );
  return sendMail({ to, subject: `Your HEIS KITS order ${order?.orderNumber || ""} has shipped 🚚`, html });
}

export function sendOrderCancelledEmail(to: string, order: any) {
  const paid = order?.paymentStatus === "completed";
  const html = shell(
    "Order cancelled",
    `<p style="font-size:15px;line-height:1.6">Your order <b>${esc(order?.orderNumber)}</b> (${naira(order?.totalAmount)}) has been cancelled.</p>
     <p style="font-size:14px;color:#6f6f76">${paid ? "If you were charged, your refund is being processed and will appear on your original payment method." : "You have not been charged."}</p>
     <p style="margin:24px 0"><a href="${esc(appUrl())}/catalog" style="background:#0a0a0b;color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;display:inline-block">Continue shopping</a></p>`,
  );
  return sendMail({ to, subject: `Your HEIS KITS order ${order?.orderNumber || ""} was cancelled`, html });
}

export function sendOrderConfirmationEmail(to: string, order: any) {
  const items: any[] = Array.isArray(order?.items) ? order.items : [];
  const rows = items
    .map(it => `<tr><td style="padding:6px 0">Product #${it.productId}${it.size ? ` · ${it.size}` : ""} × ${it.quantity || 1}</td><td style="padding:6px 0;text-align:right">${naira(Number(it.price || 0) * (it.quantity || 1))}</td></tr>`)
    .join("");
  const addr = order?.shippingAddress || {};
  const html = shell(
    "Order confirmed 🎉",
    `<p style="font-size:15px;line-height:1.6">Thanks for your order <b>${order?.orderNumber || ""}</b>. We're getting it ready.</p>
     <table style="width:100%;font-size:14px;border-collapse:collapse;margin:16px 0">${rows}
       <tr><td style="padding:10px 0;border-top:1px solid #e4e4e7;font-weight:800">Total</td><td style="padding:10px 0;border-top:1px solid #e4e4e7;text-align:right;font-weight:800">${naira(order?.totalAmount)}</td></tr>
     </table>
     <p style="font-size:13px;color:#6f6f76">Shipping to: ${[addr.name, addr.address, addr.city, addr.country, addr.postalCode].filter(Boolean).join(", ") || "—"}</p>`,
  );
  return sendMail({ to, subject: `Your HEIS KITS order ${order?.orderNumber || ""}`, html });
}
