import axios from 'axios';

async function testApiOtp() {
  try {
    console.log('Sending API request to resend OTP for rabinthilakj.cb24@bitsathy.ac.in...');
    const res = await axios.post('http://localhost:5000/api/auth/resend-otp', {
      email: 'rabinthilakj.cb24@bitsathy.ac.in'
    });
    console.log('API Response:', res.data);
  } catch (err: any) {
    console.error('API Request error:', err.response?.data || err.message);
  }
}

testApiOtp();
