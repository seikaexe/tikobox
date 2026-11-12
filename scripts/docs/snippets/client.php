<?php
// Butuh: PHP 7.4+ dengan ekstensi curl dan json

const BASE = "https://tikobox.my.id";
const UA = "MyTikoboxClient/1.0";

function tikobox_api(string $path, array $params = [], int $retries = 2): array
{
    $url = BASE . $path . ($params ? "?" . http_build_query($params) : "");

    for ($attempt = 0; ; $attempt++) {
        $retryAfter = 5;
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 35,
            CURLOPT_USERAGENT => UA,
            CURLOPT_HEADERFUNCTION => function ($ch, $line) use (&$retryAfter) {
                if (stripos($line, "retry-after:") === 0) {
                    $retryAfter = max(1, (int) trim(substr($line, 12)));
                }
                return strlen($line);
            },
        ]);

        $body = curl_exec($ch);
        if ($body === false) {
            throw new RuntimeException(curl_error($ch));
        }
        $status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);

        // 429: tunggu sesuai header retry-after lalu ulangi
        if ($status === 429 && $attempt < $retries) {
            sleep($retryAfter);
            continue;
        }

        $json = json_decode($body, true) ?? ["code" => -1, "msg" => "HTTP $status"];
        if (($json["code"] ?? -1) !== 0) {
            throw new RuntimeException($status . " " . ($json["msg"] ?? "error"));
        }
        return $json["data"];
    }
}

function tikobox_save(string $mediaUrl, string $file, string $cookie = ""): void
{
    $params = ["url" => $mediaUrl, "name" => $file];
    if ($cookie !== "") {
        $params["c"] = $cookie;
    }

    $fh = fopen($file, "wb");
    $ch = curl_init(BASE . "/api/download?" . http_build_query($params));
    curl_setopt_array($ch, [
        CURLOPT_FILE => $fh,
        CURLOPT_TIMEOUT => 0,
        CURLOPT_USERAGENT => UA,
    ]);

    $ok = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    fclose($fh);

    if ($ok === false || $status !== 200) {
        $message = $ok === false ? curl_error($ch) : "HTTP $status";
        unlink($file);
        throw new RuntimeException($message);
    }
    echo "tersimpan: $file\n";
}

// Contoh pemakaian
$video = tikobox_api("/api/tiktok", ["url" => "https://vt.tiktok.com/ZSxxxxxxx/"]);
$cookie = $video["cookie"] ?? "";

if (!empty($video["images"])) {
    foreach ($video["images"] as $i => $image) {
        tikobox_save($image, $video["id"] . "-" . ($i + 1) . ".jpg", $cookie);
    }
} else {
    tikobox_save($video["play"], $video["id"] . ".mp4", $cookie);
}
if ($video["music"] !== "") {
    tikobox_save($video["music"], $video["id"] . ".mp3", $cookie);
}

print_r(tikobox_api("/api/user", ["unique_id" => "tiktok"]));
print_r(tikobox_api("/api/hashtag", ["name" => "fyp"]));
