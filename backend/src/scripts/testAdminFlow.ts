import prisma from '../config/db';
import { adminSendOtp, adminVerifyOtp } from '../controllers/authController';
import { getSystemStats, getAdminStudents, getAdminFaculty, getAdminDepartments, getAdminProjects, getAdminProjectRequests } from '../controllers/adminController';

function createMockRes() {
  const res: any = {};
  res.statusCode = 200;
  res.data = null;
  res.cookies = {};
  res.status = function (code: number) {
    res.statusCode = code;
    return res;
  };
  res.json = function (payload: any) {
    res.data = payload;
    return res;
  };
  res.cookie = function (name: string, value: string) {
    res.cookies[name] = value;
    return res;
  };
  return res;
}

async function runTests() {
  console.log('====================================================');
  console.log('   RUNNING AUTOMATED ADMIN SECURITY & WORKFLOW TESTS');
  console.log('====================================================\n');

  // Test 1: Reject unauthorized Admin email
  console.log('[TEST 1] Testing Unauthorized Admin Email (unauthorized@gmail.com)...');
  const req1: any = { body: { email: 'unauthorized@gmail.com' } };
  const res1 = createMockRes();
  await adminSendOtp(req1, res1);
  console.log(`Status Code: ${res1.statusCode} (Expected: 403)`);
  console.log(`Response:`, res1.data);
  if (res1.statusCode === 403 && res1.data?.success === false) {
    console.log('✅ TEST 1 PASSED: Unauthorized admin email correctly blocked!\n');
  } else {
    console.error('❌ TEST 1 FAILED!');
  }

  // Test 2: Request OTP for authorized admin rabinthilakj@gmail.com
  console.log('[TEST 2] Requesting Admin OTP for authorized email (rabinthilakj@gmail.com)...');
  // Clear any existing OTP for test repeatability
  await prisma.otpVerification.deleteMany({ where: { email: 'rabinthilakj@gmail.com' } });

  const req2: any = { body: { email: 'rabinthilakj@gmail.com' } };
  const res2 = createMockRes();
  await adminSendOtp(req2, res2);
  console.log(`Status Code: ${res2.statusCode} (Expected: 200)`);
  console.log(`Response:`, res2.data);

  const otpInDb = await prisma.otpVerification.findUnique({
    where: { email: 'rabinthilakj@gmail.com' }
  });
  console.log(`Active OTP in DB: ${otpInDb?.otp_code}, Expires At: ${otpInDb?.expires_at}`);

  if (res2.statusCode === 200 && otpInDb?.otp_code) {
    console.log('✅ TEST 2 PASSED: OTP successfully generated and saved in DB!\n');
  } else {
    console.error('❌ TEST 2 FAILED!');
  }

  // Test 3: Verify with incorrect OTP code
  console.log('[TEST 3] Verifying Admin login with WRONG OTP (000000)...');
  const req3: any = { body: { email: 'rabinthilakj@gmail.com', otp_code: '000000' } };
  const res3 = createMockRes();
  await adminVerifyOtp(req3, res3);
  console.log(`Status Code: ${res3.statusCode} (Expected: 400)`);
  console.log(`Response:`, res3.data);
  if (res3.statusCode === 400 && res3.data?.success === false) {
    console.log('✅ TEST 3 PASSED: Invalid OTP correctly rejected!\n');
  } else {
    console.error('❌ TEST 3 FAILED!');
  }

  // Test 4: Verify with CORRECT OTP code
  console.log('[TEST 4] Verifying Admin login with CORRECT OTP code...');
  const req4: any = { body: { email: 'rabinthilakj@gmail.com', otp_code: otpInDb!.otp_code } };
  const res4 = createMockRes();
  await adminVerifyOtp(req4, res4);
  console.log(`Status Code: ${res4.statusCode} (Expected: 200)`);
  console.log(`Admin User Role: ${res4.data?.user?.role}`);
  console.log(`JWT Token Generated: ${!!res4.data?.token}`);
  if (res4.statusCode === 200 && res4.data?.user?.role === 'ADMIN' && res4.data?.token) {
    console.log('✅ TEST 4 PASSED: Admin OTP verification succeeded & JWT issued!\n');
  } else {
    console.error('❌ TEST 4 FAILED!');
  }

  // Test 5: Check Admin Dashboard real database endpoints
  console.log('[TEST 5] Fetching Admin Dashboard Real Database APIs...');

  const adminUser = res4.data.user;
  const adminReq: any = { user: { user_id: adminUser.user_id, email: adminUser.email, role: 'ADMIN', name: adminUser.name } };

  // Stats
  const resStats = createMockRes();
  await getSystemStats(adminReq, resStats);
  console.log(`[STATS] Students: ${resStats.data.stats.totalStudents}, Faculty: ${resStats.data.stats.totalFaculty}, Depts: ${resStats.data.stats.totalDepartments}, Projects: ${resStats.data.stats.totalProjects}`);

  // Students
  const resStudents = createMockRes();
  await getAdminStudents(adminReq, resStudents);
  console.log(`[STUDENTS LIST] Count: ${resStudents.data.count}`);

  // Faculty
  const resFaculty = createMockRes();
  await getAdminFaculty(adminReq, resFaculty);
  console.log(`[FACULTY LIST] Count: ${resFaculty.data.count}`);

  // Departments
  const resDepts = createMockRes();
  await getAdminDepartments(adminReq, resDepts);
  console.log(`[DEPARTMENTS LIST] Count: ${resDepts.data.count}`);

  // Projects
  const resProjects = createMockRes();
  await getAdminProjects(adminReq, resProjects);
  console.log(`[PROJECTS LIST] Count: ${resProjects.data.count}`);

  // Project Requests
  const resRequests = createMockRes();
  await getAdminProjectRequests(adminReq, resRequests);
  console.log(`[PROJECT REQUESTS LIST] Count: ${resRequests.data.count}`);

  console.log('\n====================================================');
  console.log('   ALL AUTOMATED ADMIN SECURITY TESTS COMPLETED!   ');
  console.log('====================================================');
}

runTests().catch(console.error);
