import { server } from './server';

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(` Capstone Hub Backend Server running on port ${PORT}`);
  console.log(` API Base: http://localhost:${PORT}/api`);
  console.log(` OpenAPI Docs: http://localhost:${PORT}/api-docs`);
  console.log(`=================================================`);
});
