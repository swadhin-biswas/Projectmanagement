export function dashboardRoutes(app) {
  // Student dashboard endpoint
  app.get('/student', () => {
    return { message: 'Student dashboard data' };
  });

  // Supervisor dashboard endpoint
  app.get('/supervisor', () => {
    return { message: 'Supervisor dashboard data' };
  });

  // Admin dashboard endpoint
  app.get('/admin', () => {
    return { message: 'Admin dashboard data' };
  });
}
