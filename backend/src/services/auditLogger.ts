import prisma from '../config/db';

export async function logAuditAction(
  userId: string,
  action: string,
  targetType: string,
  targetId: string,
  details: string = ''
) {
  try {
    await prisma.auditLog.create({
      data: {
        user_id: userId,
        action,
        target_type: targetType,
        target_id: targetId,
        details
      }
    });
  } catch (error) {
    console.error('Failed to log audit entry:', error);
  }
}
