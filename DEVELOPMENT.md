# Development

## Install dependencies
npm install

## Start development server
npm start

The app will be available at http://localhost:4200

## Build for production
npm run build

## Testing

The boilerplate includes a fake backend for testing without needing a real API.

### Default test account
- Email: test@example.com
- Password: test

### Creating accounts
1. Register a new account
2. You'll see a verification email on screen (since we're using a fake backend)
3. Click the verification link to verify your account
4. You can now login with your account

## Features

### Authentication
- Email & password registration
- Email verification
- Login with JWT tokens
- Automatic token refresh
- Logout

### Authorization
- Role-based access control
- Admin and User roles
- Protected routes

### Account Management
- View profile
- Update profile
- Admin panel to manage all accounts

### Password Recovery
- Forgot password
- Reset password via email link

## Project Structure

The application follows Angular best practices with:
- Feature-based module structure
- Lazy-loaded routes
- Shared services and guards
- Barrel files for clean imports
- TypeScript path aliases for cleaner imports

## Customization

To connect to a real backend:

1. Replace the `FakeBackendInterceptor` in `app.config.ts` with your real API calls
2. Update the API endpoints in the service classes
3. Configure CORS on your backend if needed
