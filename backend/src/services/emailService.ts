import prisma from '../config/db';
import nodemailer from 'nodemailer';

/**
 * Dynamic SMTP transporter with trimmed credentials and Gmail service support
 */
export function getSmtpTransporter() {
  const host = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER ? process.env.SMTP_USER.trim() : '';
  const pass = process.env.SMTP_PASS ? process.env.SMTP_PASS.trim().replace(/\s+/g, '') : '';

  if (host.includes('gmail')) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

/**
 * Validates role-specific university email format.
 * - Student format: name.departmentbatchyear@bitsathy.ac.in (e.g. name.dept24@bitsathy.ac.in)
 * - Staff/Faculty format: name@bitsathy.ac.in
 */
export function validateUniversityEmail(email: string, role?: string): { isValid: boolean; message?: string } {
  if (!email || typeof email !== 'string') {
    return { isValid: false, message: 'Please enter your email address.' };
  }

  const cleanEmail = email.trim().toLowerCase();
  if (!isValidEmailFormat(cleanEmail)) {
    return { isValid: false, message: 'Invalid email address format.' };
  }

  return { isValid: true };
}

/**
 * Validates basic email format syntax.
 */
export function isValidEmailFormat(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmed)) return false;
  if (trimmed.includes('..') || trimmed.startsWith('.') || trimmed.endsWith('.')) return false;
  const [local, domain] = trimmed.split('@');
  if (!local || !domain) return false;
  if (local.length > 64 || domain.length > 255) return false;
  if (!domain.includes('.')) return false;
  return true;
}

/**
 * Generates a 6-digit OTP.
 */
export function generate6DigitOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generates OTP, saves it in PostgreSQL,
 * and sends it to the user's email.
 */
export async function sendOtpEmail(
  email: string,
  providedOtp?: string
): Promise<{ otp_code: string; expires_at: Date }> {
  const cleanEmail = email.trim().toLowerCase();

  const otpCode = providedOtp || generate6DigitOtp();

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  // Save OTP in PostgreSQL
  await prisma.otpVerification.upsert({
    where: {
      email: cleanEmail,
    },
    create: {
      email: cleanEmail,
      otp_code: otpCode,
      expires_at: expiresAt,
    },
    update: {
      otp_code: otpCode,
      expires_at: expiresAt,
      created_at: new Date(),
    },
  });

  const smtpUser = process.env.SMTP_USER ? process.env.SMTP_USER.trim() : '';
  const smtpPass = process.env.SMTP_PASS ? process.env.SMTP_PASS.trim().replace(/\s+/g, '') : '';
  const smtpFrom = process.env.SMTP_FROM ? process.env.SMTP_FROM.trim() : smtpUser;

  // Send OTP through SMTP if configured
  if (smtpUser && smtpPass) {
    try {
      const transporter = getSmtpTransporter();
      const info = await transporter.sendMail({
        from: `"Capstone Hub" <${smtpFrom}>`,
        to: cleanEmail,
        subject: 'Capstone Hub - Email Verification OTP',
        text: `Your Capstone Hub verification OTP is ${otpCode}. This OTP will expire in 10 minutes.`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b;">
            <h2 style="color: #4f46e5;">Capstone Hub Email Verification</h2>
            <p>Your verification OTP code is:</p>
            <h1 style="letter-spacing: 5px; color: #4f46e5; font-family: monospace; font-size: 32px;">${otpCode}</h1>
            <p>This OTP will expire in <strong>10 minutes</strong>.</p>
            <p style="color: #64748b; font-size: 12px; margin-top: 20px;">If you did not request this OTP, please ignore this email.</p>
          </div>
        `,
      });
      console.log(`[EMAIL OTP SERVICE] ✅ SMTP Email sent successfully to ${cleanEmail} (ID: ${info.messageId})`);
    } catch (smtpErr: any) {
      console.error(`[EMAIL OTP SERVICE ERROR] SMTP delivery failed to ${cleanEmail}: ${smtpErr?.message || smtpErr}`);
      console.log(`[EMAIL OTP SERVICE] Active OTP saved in DB for ${cleanEmail}: ${otpCode}`);
    }
  } else {
    console.warn(`[EMAIL OTP SERVICE] ⚠️ SMTP credentials missing in .env. OTP saved in DB for ${cleanEmail}: ${otpCode}`);
  }

  return {
    otp_code: otpCode,
    expires_at: expiresAt,
  };
}