<?php
// Reads from environment variables (set in Render dashboard)
define('DB_HOST',     getenv('DB_HOST')     ?: 'localhost');
define('DB_USER',     getenv('DB_USER')     ?: 'root');
define('DB_PASS',     getenv('DB_PASS')     ?: '');
define('DB_NAME',     getenv('DB_NAME')     ?: 'ipt_db');
define('DB_PORT',     (int)(getenv('DB_PORT') ?: 3306));
define('JWT_SECRET',  getenv('JWT_SECRET')  ?: 'change-me-in-production');

define('SMTP_HOST',      getenv('SMTP_HOST')      ?: 'smtp.gmail.com');
define('SMTP_PORT',      (int)(getenv('SMTP_PORT') ?: 587));
define('SMTP_USER',      getenv('SMTP_USER')      ?: '');
define('SMTP_PASS',      getenv('SMTP_PASS')       ?: '');
define('SMTP_FROM_NAME', getenv('SMTP_FROM_NAME') ?: 'IPT Boilerplate');

function sendEmail($to, $subject, $htmlBody) {
    $apiKey = str_replace(' ', '', SMTP_PASS);
    $fromEmail = SMTP_USER;
    if (!$apiKey || !$fromEmail) return 'no-credentials';

    // Use Brevo Transactional Email REST API (HTTPS/443 — works on all hosts)
    $payload = json_encode([
        'sender'      => ['name' => SMTP_FROM_NAME, 'email' => $fromEmail],
        'to'          => [['email' => $to]],
        'subject'     => $subject,
        'htmlContent' => $htmlBody,
    ]);

    $ch = curl_init('https://api.brevo.com/v3/smtp/email');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'Accept: application/json',
            'api-key: ' . $apiKey,
        ],
        CURLOPT_TIMEOUT        => 20,
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr  = curl_error($ch);
    curl_close($ch);

    if ($httpCode >= 200 && $httpCode < 300) return true;
    return "api-failed:$httpCode:$curlErr:$response";
}

function getDBConnection() {
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME, DB_PORT);
    if ($conn->connect_error) {
        http_response_code(500);
        echo json_encode(['message' => 'Database connection failed: ' . $conn->connect_error]);
        exit();
    }
    $conn->set_charset('utf8mb4');
    return $conn;
}

function sendResponse($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data);
    exit();
}

function sendError($message, $status = 400) {
    http_response_code($status);
    echo json_encode(['message' => $message]);
    exit();
}

function generateToken($length = 32) {
    return bin2hex(random_bytes($length));
}

function generateJwt($accountId, $role) {
    $header    = base64_encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $payload   = base64_encode(json_encode([
        'id'   => $accountId,
        'role' => $role,
        'iat'  => time(),
        'exp'  => time() + 86400
    ]));
    $signature = base64_encode(hash_hmac('sha256', "$header.$payload", JWT_SECRET, true));
    return "$header.$payload.$signature";
}

function verifyJwt($token) {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;
    $payload = json_decode(base64_decode($parts[1]), true);
    if (!$payload || $payload['exp'] < time()) return null;
    $expectedSig = base64_encode(hash_hmac('sha256', "$parts[0].$parts[1]", JWT_SECRET, true));
    if ($parts[2] !== $expectedSig) return null;
    return $payload;
}

function getAuthAccount() {
    $headers = getallheaders();
    $auth    = $headers['Authorization'] ?? '';
    if (!preg_match('/Bearer (.+)/', $auth, $m)) sendError('Unauthorized', 401);
    $payload = verifyJwt($m[1]);
    if (!$payload) sendError('Unauthorized', 401);
    return $payload;
}
