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
    $host = SMTP_HOST;
    $user = SMTP_USER;
    $pass = str_replace(' ', '', SMTP_PASS);
    if (!$user || !$pass) return 'no-credentials';

    // Use SSL/SMTPS on port 465 (more reliable than STARTTLS on cloud servers)
    $socket = @stream_socket_client("ssl://$host:465", $errno, $errstr, 20, STREAM_CLIENT_CONNECT, stream_context_create(['ssl' => ['verify_peer' => true, 'verify_peer_name' => true]]));
    if (!$socket) return "socket-failed:$errstr($errno)";

    stream_set_timeout($socket, 20);
    fgets($socket, 512); // banner

    fwrite($socket, "EHLO localhost\r\n");
    do { $line = fgets($socket, 512); } while ($line && isset($line[3]) && $line[3] !== ' ');

    fwrite($socket, "AUTH LOGIN\r\n");
    fgets($socket, 512);
    fwrite($socket, base64_encode($user) . "\r\n");
    fgets($socket, 512);
    fwrite($socket, base64_encode($pass) . "\r\n");
    $authResp = fgets($socket, 512);
    if (strpos($authResp, '235') === false) { fclose($socket); return "auth-failed:$authResp"; }

    fwrite($socket, "MAIL FROM:<$user>\r\n"); fgets($socket, 512);
    fwrite($socket, "RCPT TO:<$to>\r\n");    fgets($socket, 512);
    fwrite($socket, "DATA\r\n");             fgets($socket, 512);

    $msg  = "From: " . SMTP_FROM_NAME . " <$user>\r\n";
    $msg .= "To: $to\r\n";
    $msg .= "Subject: $subject\r\n";
    $msg .= "MIME-Version: 1.0\r\n";
    $msg .= "Content-Type: text/html; charset=UTF-8\r\n\r\n";
    $msg .= $htmlBody . "\r\n.\r\n";
    fwrite($socket, $msg);
    fgets($socket, 512);

    fwrite($socket, "QUIT\r\n");
    fclose($socket);
    return true;
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
