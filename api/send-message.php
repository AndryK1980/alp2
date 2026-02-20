<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed. Use POST.']);
    exit;
}

require_once __DIR__ . '/../config/telegram.php';

function escapeHtml(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_HTML5, 'UTF-8');
}

function validateInput(array $data): array
{
    $errors = [];

    if (empty($data['name']) || !is_string($data['name'])) {
        $errors[] = 'name is required';
    }

    if (empty($data['phone']) || !is_string($data['phone'])) {
        $errors[] = 'phone is required';
    }

    if (empty($data['address']) || !is_string($data['address'])) {
        $errors[] = 'address is required';
    }

    return $errors;
}

function formatMessage(array $data): string
{
    $submittedAt = (new DateTimeImmutable('now', new DateTimeZone('Europe/Moscow')))
        ->format('d.m.Y H:i:s');

    return implode("\n", [
        '📩 <b>Новая заявка с лендинга</b>',
        '',
        '👤 <b>Имя:</b> ' . escapeHtml($data['name']),
        '📞 <b>Телефон:</b> ' . escapeHtml($data['phone']),
        '📍 <b>Адрес:</b> ' . escapeHtml($data['address']),
        '🕒 <b>Время:</b> ' . escapeHtml($submittedAt),
    ]);
}

function sendTelegramMessage(string $text, array $config): array
{
    $url = sprintf('%s/bot%s/sendMessage', $config['api_base'], $config['token']);

    $payload = [
        'chat_id' => $config['chat_id'],
        'text' => $text,
        'parse_mode' => $config['parse_mode'],
        'disable_web_page_preview' => true,
    ];

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_CONNECTTIMEOUT => 5,
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($curlError) {
        throw new RuntimeException('cURL error: ' . $curlError);
    }

    if ($httpCode !== 200) {
        throw new RuntimeException('Telegram API returned HTTP ' . $httpCode);
    }

    $result = json_decode($response, true);
    if (!is_array($result) || !($result['ok'] ?? false)) {
        $description = $result['description'] ?? 'Unknown Telegram API error';
        throw new RuntimeException('Telegram API error: ' . $description);
    }

    return $result;
}

try {
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true);

    if (!is_array($data)) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Invalid JSON payload']);
        exit;
    }

    $validationErrors = validateInput($data);
    if (!empty($validationErrors)) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'errors' => $validationErrors]);
        exit;
    }

    $config = getTelegramConfig();
    $message = formatMessage($data);
    sendTelegramMessage($message, $config);

    echo json_encode(['ok' => true]);
} catch (RuntimeException $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
} catch (Throwable $e) {
    error_log('send-message.php error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Internal server error']);
}
