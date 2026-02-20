<?php

declare(strict_types=1);

function getTelegramConfig(): array
{
    $token = $_ENV['TELEGRAM_BOT_TOKEN'] ?? getenv('TELEGRAM_BOT_TOKEN') ?: '';
    $chatId = $_ENV['TELEGRAM_CHAT_ID'] ?? getenv('TELEGRAM_CHAT_ID') ?: '';

    if (empty($token) || empty($chatId)) {
        throw new RuntimeException(
            'Missing required environment variables: TELEGRAM_BOT_TOKEN and/or TELEGRAM_CHAT_ID'
        );
    }

    return [
        'token' => $token,
        'chat_id' => $chatId,
        'api_base' => 'https://api.telegram.org',
        'parse_mode' => 'HTML',
    ];
}
