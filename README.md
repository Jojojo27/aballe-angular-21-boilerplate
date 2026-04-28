# Angular 21 Authentication Boilerplate

A comprehensive Angular 21 authentication boilerplate with:

- Email sign up and verification
- JWT authentication with refresh tokens
- Role based authorization (User & Admin roles)
- Forgot password and reset password functionality
- View and update profile section
- Admin dashboard for managing accounts
- Fake backend API for development and testing
- Bootstrap 5 styling

## Quick Start

### Installation

```bash
npm install
```

### Development

```bash
npm start
```

Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

### Build

```bash
npm run build
```

The build artifacts will be stored in the `dist/` directory.

## Features

- **Authentication**: JWT tokens with automatic refresh
- **Authorization**: Role-based access control
- **Email Verification**: Account verification via email links
- **Password Recovery**: Forgot password and reset password flows
- **Account Management**: Admin panel to manage user accounts
- **Responsive Design**: Bootstrap 5 for responsive UI

## Default Admin Account

The first account registered will be assigned the Admin role. Subsequent accounts will be regular Users.

## Project Structure

```
src/
├── app/
│   ├── _components/        # Shared components
│   ├── _helpers/           # Guards, interceptors, utilities
│   ├── _models/            # Data models
│   ├── _services/          # Services
│   ├── account/            # Account feature (login, register)
│   ├── admin/              # Admin feature
│   ├── home/               # Home feature
│   ├── profile/            # Profile feature
│   └── app.component.ts    # Root component
├── environments/           # Environment configurations
└── index.html             # Main HTML file
```

## License

MIT
