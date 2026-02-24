import { createApplication } from "@specific-dev/framework";
import * as appSchema from './db/schema.js';
import * as authSchema from './db/auth-schema.js';
import { registerProfileRoutes } from './routes/profile.js';
import { registerFriendsRoutes } from './routes/friends.js';
import { registerGameRoutes } from './routes/game.js';

// Combine application and auth schemas
const schema = { ...appSchema, ...authSchema };

// Create application with schema for full database type support
export const app = await createApplication(schema);

// Export App type for use in route files
export type App = typeof app;

// Enable Better Auth for authentication
app.withAuth();

// Register routes - add your route modules here
// IMPORTANT: Always use registration functions to avoid circular dependency issues
registerProfileRoutes(app);
registerFriendsRoutes(app);
registerGameRoutes(app);

await app.run();
app.logger.info('Application running');
