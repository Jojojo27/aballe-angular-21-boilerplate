<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>API Docs – IPT Boilerplate</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <style>body{margin:0}</style>
</head>
<body>
<div id="swagger-ui"></div>
<script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script>
const spec = {
  openapi: "3.0.0",
  info: {
    title: "IPT 2026 Auth API",
    version: "1.0.0",
    description: "REST API for the Angular 21 Auth Boilerplate (PHP + MySQL backend)"
  },
  servers: [{ url: "https://ipt-2026-backend-aballe.onrender.com", description: "Production" }],
  components: {
    securitySchemes: {
      BearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" }
    },
    schemas: {
      RegisterRequest: {
        type: "object", required: ["title","firstName","lastName","email","password","confirmPassword","acceptTerms"],
        properties: {
          title: { type: "string", example: "Mr" },
          firstName: { type: "string", example: "John" },
          lastName: { type: "string", example: "Doe" },
          email: { type: "string", format: "email", example: "john@example.com" },
          password: { type: "string", example: "Test1234!" },
          confirmPassword: { type: "string", example: "Test1234!" },
          acceptTerms: { type: "boolean", example: true }
        }
      },
      LoginRequest: {
        type: "object", required: ["email","password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string" }
        }
      },
      AccountResponse: {
        type: "object",
        properties: {
          id: { type: "integer" }, title: { type: "string" },
          firstName: { type: "string" }, lastName: { type: "string" },
          email: { type: "string" }, role: { type: "string", enum: ["Admin","User"] },
          isVerified: { type: "boolean" }, jwtToken: { type: "string" }
        }
      }
    }
  },
  paths: {
    "/accounts/register": {
      post: {
        summary: "Register a new account",
        tags: ["Accounts"],
        requestBody: { required: true, content: { "application/json": { schema: { "$ref": "#/components/schemas/RegisterRequest" } } } },
        responses: {
          "200": { description: "Registration successful. Verification code sent to email (or returned in body if SMTP not configured)." }
        }
      }
    },
    "/accounts/verify-email": {
      post: {
        summary: "Verify email with 6-digit code",
        tags: ["Accounts"],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", properties: { email: { type: "string" }, token: { type: "string", example: "123456" } } } } }
        },
        responses: { "200": { description: "Email verified successfully" }, "400": { description: "Invalid or expired code" } }
      }
    },
    "/accounts/authenticate": {
      post: {
        summary: "Login and get JWT",
        tags: ["Accounts"],
        requestBody: { required: true, content: { "application/json": { schema: { "$ref": "#/components/schemas/LoginRequest" } } } },
        responses: { "200": { description: "Login successful. Sets refreshToken cookie. Returns jwtToken in body.", content: { "application/json": { schema: { "$ref": "#/components/schemas/AccountResponse" } } } }, "400": { description: "Invalid credentials" } }
      }
    },
    "/accounts/refresh-token": {
      post: {
        summary: "Refresh the JWT using the HttpOnly refreshToken cookie",
        tags: ["Accounts"],
        responses: { "200": { description: "New jwtToken issued", content: { "application/json": { schema: { "$ref": "#/components/schemas/AccountResponse" } } } }, "401": { description: "Invalid or missing refresh token" } }
      }
    },
    "/accounts/revoke-token": {
      post: {
        summary: "Logout – revoke refresh token and clear cookie",
        tags: ["Accounts"],
        security: [{ BearerAuth: [] }],
        responses: { "200": { description: "Token revoked" } }
      }
    },
    "/accounts/forgot-password": {
      post: {
        summary: "Send password reset email",
        tags: ["Accounts"],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { email: { type: "string", format: "email" } } } } } },
        responses: { "200": { description: "Reset instructions sent if account exists" } }
      }
    },
    "/accounts/validate-reset-token": {
      post: {
        summary: "Validate a password reset token",
        tags: ["Accounts"],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { token: { type: "string" } } } } } },
        responses: { "200": { description: "Token is valid" }, "400": { description: "Invalid or expired token" } }
      }
    },
    "/accounts/reset-password": {
      post: {
        summary: "Reset password using token",
        tags: ["Accounts"],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { token: { type: "string" }, password: { type: "string" }, confirmPassword: { type: "string" } } } } } },
        responses: { "200": { description: "Password reset successful" } }
      }
    },
    "/accounts": {
      get: {
        summary: "Get all accounts (Admin only)",
        tags: ["Accounts"],
        security: [{ BearerAuth: [] }],
        responses: { "200": { description: "List of accounts" }, "403": { description: "Forbidden" } }
      },
      post: {
        summary: "Create account (Admin only)",
        tags: ["Accounts"],
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { "$ref": "#/components/schemas/RegisterRequest" } } } },
        responses: { "200": { description: "Account created" } }
      }
    },
    "/accounts/{id}": {
      get: {
        summary: "Get account by ID",
        tags: ["Accounts"],
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Account data" }, "403": { description: "Forbidden" } }
      },
      put: {
        summary: "Update account",
        tags: ["Accounts"],
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: { required: true, content: { "application/json": { schema: { "$ref": "#/components/schemas/AccountResponse" } } } },
        responses: { "200": { description: "Updated account" } }
      },
      delete: {
        summary: "Delete account",
        tags: ["Accounts"],
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Account deleted" } }
      }
    }
  }
};

SwaggerUIBundle({ spec, dom_id: '#swagger-ui', presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset], layout: 'BaseLayout', deepLinking: true });
</script>
</body>
</html>
