import nodemailer from "nodemailer";

type ContactMessage = {
  name: string;
  email: string;
  message: string;
  productTitle?: string;
  productSlug?: string;
};

function getTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;

  const port = Number(SMTP_PORT ?? 587);
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

export async function sendContactMessage(msg: ContactMessage) {
  const to = process.env.CONTACT_EMAIL;
  if (!to) throw new Error("CONTACT_EMAIL is not configured");

  const subject = msg.productTitle ? `Inquiry: ${msg.productTitle}` : "New inquiry from gtland";
  const text = [
    `From: ${msg.name} <${msg.email}>`,
    msg.productSlug ? `Product: ${msg.productTitle} (${msg.productSlug})` : null,
    "",
    msg.message,
  ]
    .filter((line) => line !== null)
    .join("\n");

  const transporter = getTransporter();
  if (!transporter) {
    // dev fallback: no SMTP configured, log it so the flow is still testable locally
    console.log("[contact] SMTP not configured; would have sent email:", { to, subject, text });
    return;
  }

  await transporter.sendMail({
    to,
    from: process.env.SMTP_USER,
    replyTo: msg.email,
    subject,
    text,
  });
}
