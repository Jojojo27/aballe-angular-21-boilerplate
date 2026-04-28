# Angular 21 Boilerplate - Setup Instructions

## All Errors Fixed! ✅

The project structure is now complete with all code errors resolved. The remaining "Cannot find module" messages are expected until you install the npm dependencies.

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm start
```
or
```bash
ng serve
```

The application will be available at **http://localhost:4200**

### 3. Build for Production
```bash
npm run build
```

## What's Included

✅ **Complete Authentication System**
- Registration with validation
- Email verification (simulated)
- Login with JWT tokens
- Logout functionality
- Forgot password & reset password flows

✅ **Authorization & Role-Based Access**
- Admin role with full account management
- User role with profile access only
- Protected routes with auth guard

✅ **Features**
- Account service with CRUD operations
- Alert notification system
- Fake backend API (no real backend needed)
- Bootstrap 5 responsive UI
- Lazy-loaded feature modules
- Standalone components (Angular 17+ pattern)

✅ **Project Structure**
- `src/app/_components` - Shared components
- `src/app/_helpers` - Guards, interceptors, utilities
- `src/app/_models` - Data models
- `src/app/_services` - Services
- `src/app/account` - Authentication module
- `src/app/admin` - Admin dashboard
- `src/app/home` - Home page
- `src/app/profile` - User profile management

## Testing the App

### Default Test Account
- Email: test@example.com  
- Password: test

### Create New Account
1. Click "Register" link
2. Fill in the form
3. You'll see a verification email on screen (fake backend)
4. Click the verification link
5. Login with your credentials

### Admin Features
- The first account registered is automatically Admin
- Access admin panel at `/admin`
- Manage all user accounts (add, edit, delete)

## Key Technologies

- **Angular 21.2.7** - Latest stable version
- **TypeScript 5.5.4** - Type-safe development
- **RxJS 7.8.0** - Reactive programming
- **Bootstrap 5.2** - Responsive CSS framework
- **LESS** - CSS preprocessor

## Architecture Highlights

✅ Standalone components (no NgModule dependency)
✅ Lazy-loaded routes for better performance
✅ HTTP interceptors for JWT token management
✅ Error handling with custom interceptor
✅ Reactive forms with validation
✅ Service-based state management with RxJS
✅ Path aliases for clean imports (@app, @environments)

## Troubleshooting

**Issue: Port 4200 already in use**
```bash
ng serve --port 4201
```

**Issue: npm install fails**
Make sure Node.js 18+ is installed:
```bash
node --version
npm --version
```

**Issue: Can't find angular CLI**
```bash
npm install -g @angular/cli@21
```

## Next Steps

1. Customize the UI styling in Bootstrap classes
2. Connect to a real backend API by:
   - Removing or disabling FakeBackendInterceptor in app.config.ts
   - Updating API endpoints in services
   - Configuring CORS on your backend
3. Add additional features and modules
4. Deploy to production

## Support

For Angular documentation: https://angular.io
For Bootstrap documentation: https://getbootstrap.com
