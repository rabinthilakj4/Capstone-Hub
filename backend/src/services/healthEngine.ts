import prisma from '../config/db';

export async function calculateProjectHealthAndRisk(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { project_id: projectId },
    include: {
      tasks: true,
      milestones: true,
      documents: true,
      messages: true
    }
  });

  if (!project) return null;

  const tasks = project.tasks;
  const milestones = project.milestones;
  const risks: string[] = [];

  // 1. Task score (40%)
  let taskScore = 100;
  if (tasks.length > 0) {
    const completed = tasks.filter(t => t.status === 'COMPLETED').length;
    taskScore = Math.round((completed / tasks.length) * 100);
  }
  const overdueTasks = tasks.filter(t => t.status !== 'COMPLETED' && t.due_date && new Date(t.due_date) < new Date());
  if (overdueTasks.length > 0) {
    risks.push(`${overdueTasks.length} overdue task(s) detected.`);
  }

  // 2. Milestone score (30%)
  let milestoneScore = 100;
  if (milestones.length > 0) {
    const approved = milestones.filter(m => m.status === 'APPROVED').length;
    milestoneScore = Math.round((approved / milestones.length) * 100);
  }
  const pendingReviews = milestones.filter(m => m.status === 'SUBMITTED');
  if (pendingReviews.length > 0) {
    risks.push(`${pendingReviews.length} milestone submission(s) pending mentor review.`);
  }

  // 3. Activity score (30%)
  const hasDocs = project.documents.length > 0;
  const hasMsgs = project.messages.length > 0;
  let activityScore = (hasDocs ? 50 : 0) + (hasMsgs ? 50 : 0);
  if (!hasMsgs) {
    risks.push('Low team chat activity detected.');
  }

  const healthScore = Math.round(
    taskScore * 0.40 +
    milestoneScore * 0.30 +
    activityScore * 0.30
  );

  return {
    healthScore,
    risks,
    metrics: {
      taskCompletionRate: taskScore,
      milestoneApprovalRate: milestoneScore,
      totalTasks: tasks.length,
      overdueTasksCount: overdueTasks.length,
      totalMilestones: milestones.length,
      pendingMilestonesCount: pendingReviews.length
    }
  };
}
