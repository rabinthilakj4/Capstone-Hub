import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

console.log('--- TESTING SMTP WITH SENDER: capstonehubadmin@gmail.com ---');

const user = 'capstonehubadmin@gmail.com';
const pass = process.env.SMTP_PASS ? process.env.SMTP_PASS.trim().replace(/\s+/g, '') : 'lzhoyhdhldoqtovz';

console.log('SMTP_USER:', user);
console.log('SMTP_PASS:', pass);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user,
    pass,
  },
  tls: {
    rejectUnauthorized: false
  }
});

async function runTest() {
  try {
    console.log('Verifying transporter connection...');
    await transporter.verify();
    console.log('✅ SMTP CONNECTION SUCCESSFUL!');

    console.log('Sending test email to student...');
    const info = await transporter.sendMail({
      from: `"Capstone Hub" <${user}>`,
      to: 'rabinthilakj.cb24@bitsathy.ac.in',
      subject: 'Capstone Hub Test Verification Code',
      text: 'Your Capstone Hub test OTP is 123456.'
    });
    console.log('✅ TEST EMAIL SENT SUCCESSFULLY! MessageId:', info.messageId);
  } catch (err: any) {
    console.error('❌ SMTP TEST FAILED:', err);
  }
}

runTest();
