import { Server, Socket } from 'socket.io';
import prisma from '../config/db';

export function setupSocketIO(io: Server) {
  io.on('connection', (socket: Socket) => {

    socket.on('join_project_room', async ({ projectId, userId }) => {
      try {
        if (!projectId || !userId) return;

        // Check room permission
        const user = await prisma.user.findUnique({ where: { user_id: userId } });
        if (!user) return;

        if (user.role !== 'ADMIN') {
          const project = await prisma.project.findUnique({
            where: { project_id: projectId },
            include: { team: { include: { members: true } } }
          });

          if (!project) return;
          const isMentor = project.mentor_id === userId;
          const isMember = project.team?.members.some(m => m.student_id === userId);

          if (!isMentor && !isMember && project.created_by !== userId) {
            socket.emit('error_msg', 'Unauthorized to join project chat room.');
            return;
          }
        }

        socket.join(`project_${projectId}`);
      } catch (err) {
        console.error('Socket join error:', err);
      }
    });

    socket.on('send_message', async ({ projectId, senderId, content }) => {
      try {
        if (!projectId || !senderId || !content.trim()) return;

        const message = await prisma.message.create({
          data: {
            project_id: projectId,
            sender_id: senderId,
            content
          },
          include: {
            sender: { select: { name: true, role: true } }
          }
        });

        io.to(`project_${projectId}`).emit('receive_message', message);
      } catch (err) {
        console.error('Socket send_message error:', err);
      }
    });

    socket.on('disconnect', () => {
      // Clean disconnect
    });
  });
}
