<?php
header('Content-Type: application/json');
// CORS headers are set by .htaccess (Apache mod_headers) to avoid duplication.
// Setting them here too causes duplicate headers which browsers reject.

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

require_once dirname(__DIR__) . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$uri    = $_SERVER['REQUEST_URI'];
$body   = json_decode(file_get_contents('php://input'), true) ?? [];
$id     = $_GET['id'] ?? null;

// POST /api/accounts/authenticate
if ($method === 'POST' && strpos($uri, '/authenticate') !== false) {
    $conn  = getDBConnection();
    $email = $conn->real_escape_string($body['email'] ?? '');
    $res   = $conn->query("SELECT * FROM accounts WHERE email='$email' AND isVerified=1");
    $acc   = $res->fetch_assoc();
    if (!$acc || !password_verify($body['password'] ?? '', $acc['passwordHash']))
        sendError('Email or password is incorrect');
    $accessToken  = generateJwt($acc['id'], $acc['role']);
    $refreshToken = generateToken();
    $conn->query("UPDATE accounts SET jwtToken='$refreshToken' WHERE id=" . (int)$acc['id']);
    $conn->close();
    // Set refresh token as HttpOnly cookie
    $proto    = $_SERVER['HTTP_X_FORWARDED_PROTO'] ?? (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http');
    $isSecure = $proto === 'https';
    setcookie('refreshToken', $refreshToken, [
        'expires'  => time() + 7 * 86400,
        'path'     => '/',
        'httponly' => true,
        'secure'   => $isSecure,
        'samesite' => $isSecure ? 'None' : 'Lax'
    ]);
    sendResponse([
        'id' => $acc['id'], 'title' => $acc['title'],
        'firstName' => $acc['firstName'], 'lastName' => $acc['lastName'],
        'email' => $acc['email'], 'role' => $acc['role'],
        'jwtToken' => $accessToken
    ]);
}

// POST /api/accounts/register
if ($method === 'POST' && strpos($uri, '/register') !== false) {
    $conn  = getDBConnection();
    $email = $conn->real_escape_string($body['email'] ?? '');
    $existing = $conn->query("SELECT id, isVerified FROM accounts WHERE email='$email'")->fetch_assoc();
    if ($existing) {
        if ($existing['isVerified']) sendError("Email \"$email\" is already registered");
        $conn->query("DELETE FROM accounts WHERE id=" . (int)$existing['id']);
    }
    $cnt  = $conn->query("SELECT COUNT(*) as c FROM accounts")->fetch_assoc()['c'];
    $role = $cnt == 0 ? 'Admin' : 'User';
    $hash = password_hash($body['password'] ?? '', PASSWORD_BCRYPT);
    $code = str_pad(rand(100000, 999999), 6, '0', STR_PAD_LEFT);
    $fn   = $conn->real_escape_string($body['firstName'] ?? '');
    $ln   = $conn->real_escape_string($body['lastName']  ?? '');
    $t    = $conn->real_escape_string($body['title']     ?? '');
    $conn->query("INSERT INTO accounts (title,firstName,lastName,email,passwordHash,role,verificationToken,isVerified)
                  VALUES ('$t','$fn','$ln','$email','$hash','$role','$code',0)");
    $conn->close();
    $verifyLink = 'https://ipt-2026-frontend-aballe.onrender.com/account/verify-email?email=' . urlencode($email) . '&token=' . $code;
    $emailSent = sendEmail(
        $email,
        'Verify Your Email — IPT 2026 Boilerplate',
        "<div style='font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;background:#f9f9f9;border-radius:12px'>
          <h2 style='color:#1a2f5e;margin-bottom:8px'>Email Verification</h2>
          <p style='color:#333'>Hi $fn, thanks for registering!</p>
          <p style='color:#333'>Click the button below to verify your email and activate your account:</p>
          <div style='text-align:center;margin:24px 0'>
            <a href='$verifyLink' style='background:#1a2f5e;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:bold;display:inline-block'>Verify My Email</a>
          </div>
          <p style='color:#555;font-size:14px'>Or enter this 6-digit code manually on the verification page:</p>
          <div style='font-size:36px;font-weight:bold;letter-spacing:8px;color:#1a2f5e;margin:12px 0;text-align:center'>$code</div>
          <p style='color:#999;font-size:12px'>This code expires in 24 hours. If you did not register, ignore this email.</p>
        </div>"
    );
    if ($emailSent) {
        sendResponse(['message' => 'Registration successful. Check your email for the verification code.']);
    } else {
        sendResponse([
            'message' => 'Registration successful. (Email not configured — use the code below to verify.)',
            'verificationCode' => $code
        ]);
    }
}

// POST /api/accounts/verify-email
if ($method === 'POST' && strpos($uri, '/verify-email') !== false) {
    $conn  = getDBConnection();
    $email = $conn->real_escape_string($body['email'] ?? '');
    $code  = $conn->real_escape_string($body['token'] ?? '');
    if (!$email || !$code) sendError('Email and verification code are required');
    $res   = $conn->query("SELECT id FROM accounts WHERE email='$email' AND verificationToken='$code' AND isVerified=0");
    if ($res->num_rows === 0) sendError('Invalid or expired verification code');
    $acc   = $res->fetch_assoc();
    $conn->query("UPDATE accounts SET isVerified=1, verificationToken=NULL WHERE id=" . (int)$acc['id']);
    $conn->close();
    sendResponse(['message' => 'Email verified successfully']);
}

// POST /api/accounts/forgot-password
if ($method === 'POST' && strpos($uri, '/forgot-password') !== false) {
    $conn  = getDBConnection();
    $email = $conn->real_escape_string($body['email'] ?? '');
    $res   = $conn->query("SELECT id FROM accounts WHERE email='$email'");
    if ($res->num_rows > 0) {
        $acc     = $res->fetch_assoc();
        $token   = generateToken(16);
        $expires = date('Y-m-d H:i:s', strtotime('+1 hour'));
        $conn->query("UPDATE accounts SET resetToken='$token', resetTokenExpires='$expires' WHERE id=" . (int)$acc['id']);
    }
    $conn->close();
    sendResponse(['message' => 'Please check your email for password reset instructions']);
}

// POST /api/accounts/validate-reset-token
if ($method === 'POST' && strpos($uri, '/validate-reset-token') !== false) {
    $conn  = getDBConnection();
    $token = $conn->real_escape_string($body['token'] ?? '');
    $res   = $conn->query("SELECT id FROM accounts WHERE resetToken='$token' AND resetTokenExpires > NOW()");
    if ($res->num_rows === 0) sendError('Token is invalid or expired');
    $conn->close();
    sendResponse(['message' => 'Token is valid']);
}

// POST /api/accounts/reset-password
if ($method === 'POST' && strpos($uri, '/reset-password') !== false) {
    $conn  = getDBConnection();
    $token = $conn->real_escape_string($body['token'] ?? '');
    $res   = $conn->query("SELECT id FROM accounts WHERE resetToken='$token' AND resetTokenExpires > NOW()");
    if ($res->num_rows === 0) sendError('Token is invalid or expired');
    $acc   = $res->fetch_assoc();
    $hash  = password_hash($body['password'] ?? '', PASSWORD_BCRYPT);
    $conn->query("UPDATE accounts SET passwordHash='$hash', resetToken=NULL, resetTokenExpires=NULL WHERE id=" . (int)$acc['id']);
    $conn->close();
    sendResponse(['message' => 'Password reset successful']);
}

// POST /api/accounts/refresh-token
if ($method === 'POST' && strpos($uri, '/refresh-token') !== false) {
    // Accept token from cookie (production) or body (dev fallback)
    $token = $_COOKIE['refreshToken'] ?? ($body['token'] ?? '');
    if (!$token) sendError('Refresh token is required', 401);
    $conn = getDBConnection();
    $t    = $conn->real_escape_string($token);
    $res  = $conn->query("SELECT * FROM accounts WHERE jwtToken='$t'");
    $acc  = $res->fetch_assoc();
    if (!$acc) { $conn->close(); sendError('Invalid token', 401); }
    $newAccess  = generateJwt($acc['id'], $acc['role']);
    $newRefresh = generateToken();
    $conn->query("UPDATE accounts SET jwtToken='$newRefresh' WHERE id=" . (int)$acc['id']);
    $conn->close();
    $proto    = $_SERVER['HTTP_X_FORWARDED_PROTO'] ?? (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http');
    $isSecure = $proto === 'https';
    setcookie('refreshToken', $newRefresh, [
        'expires'  => time() + 7 * 86400,
        'path'     => '/',
        'httponly' => true,
        'secure'   => $isSecure,
        'samesite' => $isSecure ? 'None' : 'Lax'
    ]);
    sendResponse([
        'id' => $acc['id'], 'title' => $acc['title'],
        'firstName' => $acc['firstName'], 'lastName' => $acc['lastName'],
        'email' => $acc['email'], 'role' => $acc['role'],
        'jwtToken' => $newAccess
    ]);
}

// POST /api/accounts/revoke-token
if ($method === 'POST' && strpos($uri, '/revoke-token') !== false) {
    $conn  = getDBConnection();
    $token = $_COOKIE['refreshToken'] ?? ($conn->real_escape_string($body['token'] ?? ''));
    if ($token) $conn->query("UPDATE accounts SET jwtToken=NULL WHERE jwtToken='" . $conn->real_escape_string($token) . "'");
    $conn->close();
    // Clear the cookie
    setcookie('refreshToken', '', [
        'expires'  => time() - 3600,
        'path'     => '/',
        'httponly' => true,
        'secure'   => true,
        'samesite' => 'None'
    ]);
    sendResponse(['message' => 'Token revoked']);
}

// GET /api/accounts/:id  OR  GET /api/accounts
if ($method === 'GET') {
    $auth = getAuthAccount();
    $conn = getDBConnection();
    if ($id) {
        $rid = (int)$id;
        if ($auth['role'] !== 'Admin' && $auth['id'] != $rid) sendError('Forbidden', 403);
        $res = $conn->query("SELECT id,title,firstName,lastName,email,role,isVerified,created FROM accounts WHERE id=$rid");
        $acc = $res->fetch_assoc();
        if (!$acc) sendError('Account not found', 404);
        $conn->close();
        sendResponse($acc);
    }
    if ($auth['role'] !== 'Admin') sendError('Forbidden', 403);
    $res  = $conn->query("SELECT id,title,firstName,lastName,email,role,isVerified,created FROM accounts ORDER BY created DESC");
    $list = [];
    while ($row = $res->fetch_assoc()) $list[] = $row;
    $conn->close();
    sendResponse($list);
}

// PUT /api/accounts/:id
if ($method === 'PUT' && $id) {
    $auth = getAuthAccount();
    $rid  = (int)$id;
    if ($auth['role'] !== 'Admin' && $auth['id'] != $rid) sendError('Forbidden', 403);
    $conn = getDBConnection();
    $fn   = $conn->real_escape_string($body['firstName'] ?? '');
    $ln   = $conn->real_escape_string($body['lastName']  ?? '');
    $t    = $conn->real_escape_string($body['title']     ?? '');
    $em   = $conn->real_escape_string($body['email']     ?? '');
    $upd  = "title='$t',firstName='$fn',lastName='$ln',email='$em'";
    if (!empty($body['password'])) {
        $hash = password_hash($body['password'], PASSWORD_BCRYPT);
        $upd .= ",passwordHash='$hash'";
    }
    $conn->query("UPDATE accounts SET $upd WHERE id=$rid");
    $res = $conn->query("SELECT id,title,firstName,lastName,email,role,isVerified FROM accounts WHERE id=$rid");
    $acc = $res->fetch_assoc();
    $conn->close();
    sendResponse($acc);
}

// DELETE /api/accounts/:id
if ($method === 'DELETE' && $id) {
    $auth = getAuthAccount();
    $rid  = (int)$id;
    if ($auth['role'] !== 'Admin' && $auth['id'] != $rid) sendError('Forbidden', 403);
    $conn = getDBConnection();
    $conn->query("DELETE FROM accounts WHERE id=$rid");
    $conn->close();
    sendResponse(['message' => 'Account deleted']);
}

sendError('Not found', 404);
