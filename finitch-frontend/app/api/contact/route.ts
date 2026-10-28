import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type ContactPayload = {
  name?: string;
  email?: string;
  message?: string;
};

const ADMIN_EMAIL = process.env.CONTACT_ADMIN_EMAIL ?? 'vaultic123@gmail.com';

function validatePayload(payload: ContactPayload) {
  const name = payload.name?.trim() ?? '';
  const email = payload.email?.trim() ?? '';
  const message = payload.message?.trim() ?? '';

  if (!name) return { error: 'Please enter your name.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Please enter a valid email address.' };
  if (!message) return { error: 'Please enter a message.' };
  if (message.length > 5000) return { error: 'Message is too long (max 5000 characters).' };

  return { data: { name, email, message } };
}

function getTransporter(): Transporter | null {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  const port = Number(process.env.SMTP_PORT ?? 587);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    ...(secure ? {} : { requireTLS: true }),
  });
}

function getFromAddress() {
  return process.env.SMTP_FROM ?? process.env.SMTP_USER ?? ADMIN_EMAIL;
}

async function sendContactEmails(
  transporter: Transporter,
  { name, email, message }: { name: string; email: string; message: string },
) {
  const from = getFromAddress();

  await transporter.sendMail({
    from: `Vaultic Support <${from}>`,
    to: ADMIN_EMAIL,
    replyTo: email,
    subject: `New Vaultic inquiry from ${name}`,
    text: [
      'A new contact form submission was received on the Vaultic website.',
      '',
      `Name: ${name}`,
      `Email: ${email}`,
      '',
      'Message:',
      message,
    ].join('\n'),
  });

  await transporter.sendMail({
    from: `Vaultic Support <${from}>`,
    to: email,
    replyTo: ADMIN_EMAIL,
    subject: 'We received your Vaultic inquiry',
    text: [
      `Hi ${name},`,
      '',
      'Thank you for contacting Vaultic. This email confirms we received your message.',
      '',
      'Our team will review it and get back to you at this email address as soon as possible.',
      '',
      '---',
      'Your message:',
      message,
      '---',
      '',
      'Vaultic Support',
      ADMIN_EMAIL,
    ].join('\n'),
  });
}

export async function POST(request: Request) {
  let payload: ContactPayload;

  try {
    payload = (await request.json()) as ContactPayload;
  } catch {
    return NextResponse.json({ detail: 'Invalid request body.' }, { status: 400 });
  }

  const validation = validatePayload(payload);
  if ('error' in validation) {
    return NextResponse.json({ detail: validation.error }, { status: 400 });
  }

  const transporter = getTransporter();
  if (!transporter) {
    return NextResponse.json(
      { detail: 'Email delivery is not configured on the server. Please try again later.' },
      { status: 503 },
    );
  }

  try {
    await transporter.verify();
    await sendContactEmails(transporter, validation.data);
    return NextResponse.json({
      ok: true,
      message: 'Your message was sent. A confirmation email is on its way.',
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unable to send email.';
    console.error('[contact]', detail);
    return NextResponse.json(
      { detail: 'We could not send your message right now. Please try again in a moment.' },
      { status: 500 },
    );
  }
}
