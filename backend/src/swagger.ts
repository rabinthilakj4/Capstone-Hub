export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Capstone Hub API',
    version: '1.0.0',
    description: 'Dynamic Multi-Disciplinary Capstone Project Collaboration and Mentorship Matching Ecosystem API Specification'
  },
  servers: [
    { url: 'http://localhost:5000/api', description: 'Local Development Server' }
  ],
  paths: {
    '/auth/register': {
      post: {
        summary: 'Register new student or mentor account',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string' },
                  password: { type: 'string' },
                  role: { type: 'string', enum: ['STUDENT', 'MENTOR'] },
                  department_id: { type: 'string' }
                }
              }
            }
          }
        },
        responses: { 201: { description: 'Registration successful' } }
      }
    },
    '/auth/login': {
      post: {
        summary: 'Authenticate user and set secure HTTP-only cookie token',
        responses: { 200: { description: 'Login successful' } }
      }
    },
    '/projects/published': {
      get: {
        summary: 'Get published projects with match scores',
        responses: { 200: { description: 'List of published projects' } }
      }
    },
    '/admin/stats': {
      get: {
        summary: 'Fetch university dashboard statistics (Admin only)',
        responses: { 200: { description: 'University statistics payload' } }
      }
    }
  }
};
