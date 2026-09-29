<?php
/**
 * OGPチェッカー：ページの <head> を取得して、メタ情報を JSON で返す
 * 置き場所：公開ディレクトリ直下 /api/ogp.php（Astro の public/ に入れてあるので、build で dist/api/ に出る）
 * 必要なもの：PHP 8.0 以上、cURL、DOM、mbstring（Xserver は標準で有効）
 *
 * 採点は src/lib/ogp.js（ブラウザ側）で行う。ここは取得だけ。
 * 入力URLと結果は保存しない（レート制限用に、IPのハッシュと回数だけを一時フォルダに1分間置く）。
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');
header('X-Content-Type-Options: nosniff');

const MAX_BYTES = 2 * 1024 * 1024; // 2MB まで読む
const MAX_REDIRECTS = 5;
const RATE_PER_MIN = 20;            // 1IPあたり1分20回まで
const UA = 'Mozilla/5.0 (compatible; insemble-tools-ogp/1.0; +https://tools.insemble.jp/ogp/)';

function out(array $a, int $code = 200): void {
  http_response_code($code);
  echo json_encode($a, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}
function fail(string $msg, int $code = 400): void { out(['ok' => false, 'error' => $msg], $code); }

if ($_SERVER['REQUEST_METHOD'] !== 'GET') fail('GET でリクエストしてください。', 405);

/* ---- レート制限（簡易） ---- */
$ip = $_SERVER['REMOTE_ADDR'] ?? '0';
$bucket = sys_get_temp_dir() . '/ogp_rl_' . hash('sha256', $ip . date('YmdHi'));
$n = is_file($bucket) ? (int) file_get_contents($bucket) : 0;
if ($n >= RATE_PER_MIN) fail('短時間にたくさんのチェックがありました。1分ほど待ってから、もう一度お試しください。', 429);
@file_put_contents($bucket, (string) ($n + 1), LOCK_EX);

/* ---- 入力チェック ---- */
$url = trim((string) ($_GET['url'] ?? ''));
if ($url === '' || strlen($url) > 2048) fail('URLを入力してください。');
if (!preg_match('#^https?://#i', $url)) $url = 'https://' . $url;
$p = parse_url($url);
if (!$p || empty($p['host']) || !in_array(strtolower($p['scheme'] ?? ''), ['http', 'https'], true)) fail('URLの形が正しくありません。');

/* ---- SSRF対策：公開IPだけに接続する ---- */
function resolve_public(string $host): ?string {
  if (filter_var($host, FILTER_VALIDATE_IP)) $ips = [$host];
  else {
    $ips = gethostbynamel($host) ?: [];
    $v6 = @dns_get_record($host, DNS_AAAA) ?: [];
    foreach ($v6 as $r) if (!empty($r['ipv6'])) $ips[] = $r['ipv6'];
  }
  if (!$ips) return null;
  foreach ($ips as $ip) {
    if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) return null;
  }
  return $ips[0];
}

/* ---- 取得（リダイレクトは1回ずつ検証しながら追う） ---- */
$cur = $url;
$body = '';
$status = 0;
for ($i = 0; $i <= MAX_REDIRECTS; $i++) {
  $u = parse_url($cur);
  $host = $u['host'] ?? '';
  $scheme = strtolower($u['scheme'] ?? '');
  if (!in_array($scheme, ['http', 'https'], true)) fail('このURLにはアクセスできません。');
  $ipAddr = $host ? resolve_public($host) : null;
  if (!$ipAddr) fail('このURLにはアクセスできません。公開されているページのURLを入力してください。');
  $port = $u['port'] ?? ($scheme === 'https' ? 443 : 80);

  $buf = '';
  $ch = curl_init($cur);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => false,
    CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_TIMEOUT => 10,
    CURLOPT_CONNECTTIMEOUT => 5,
    CURLOPT_USERAGENT => UA,
    CURLOPT_HTTPHEADER => ['Accept: text/html,application/xhtml+xml;q=0.9,*/*;q=0.5', 'Accept-Language: ja,en;q=0.8'],
    CURLOPT_ENCODING => '',
    CURLOPT_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS,
    CURLOPT_RESOLVE => [$host . ':' . $port . ':' . (strpos($ipAddr, ':') !== false ? '[' . $ipAddr . ']' : $ipAddr)],
    CURLOPT_WRITEFUNCTION => function ($ch, $chunk) use (&$buf) {
      $buf .= $chunk;
      // </head> まで読めたら、または上限に達したら打ち切る
      if (strlen($buf) > MAX_BYTES || stripos($buf, '</head>') !== false) return -1;
      return strlen($chunk);
    },
  ]);
  curl_exec($ch);
  $errno = curl_errno($ch);
  $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
  $loc = (string) curl_getinfo($ch, CURLINFO_REDIRECT_URL);
  curl_close($ch);

  // 23 = 書き込み中断（自分で打ち切った）は正常扱い
  if ($errno && $errno !== 23 && $buf === '') fail('ページを取得できませんでした。URLが正しいか、ページが公開されているかを確かめてください。', 502);
  if ($status >= 300 && $status < 400 && $loc !== '') { $cur = $loc; continue; }
  $body = $buf;
  break;
}
if ($status >= 300 && $status < 400) fail('リダイレクトが多すぎます。');
if ($status >= 400) fail("ページを開けませんでした（HTTP {$status}）。URLを確かめてください。");
if ($body === '') fail('ページの中身が空でした。');

/* ---- 文字コードをUTF-8へ ---- */
$head = preg_match('#<head\b[^>]*>(.*?)(</head>|$)#is', $body, $m) ? $m[1] : $body;
$cs = 'UTF-8';
if (preg_match('#<meta[^>]+charset=["\']?\s*([\w-]+)#i', $head, $c)) $cs = strtoupper($c[1]);
if ($cs !== 'UTF-8' && $cs !== 'UTF8') {
  $conv = @mb_convert_encoding($head, 'UTF-8', $cs);
  if ($conv !== false) $head = $conv;
}

/* ---- 解析 ---- */
libxml_use_internal_errors(true);
$doc = new DOMDocument();
$doc->loadHTML('<?xml encoding="UTF-8"><html><head>' . $head . '</head><body></body></html>', LIBXML_NONET | LIBXML_NOERROR | LIBXML_NOWARNING);

$meta = [];
foreach ($doc->getElementsByTagName('meta') as $el) {
  $k = strtolower(trim($el->getAttribute('property') ?: $el->getAttribute('name')));
  if ($k === '' || isset($meta[$k])) continue;
  $meta[$k] = mb_substr(trim($el->getAttribute('content')), 0, 1000);
}
$titleEl = $doc->getElementsByTagName('title')->item(0);
$title = $titleEl ? mb_substr(trim($titleEl->textContent), 0, 300) : '';
$canonical = '';
foreach ($doc->getElementsByTagName('link') as $l) {
  if (strtolower(trim($l->getAttribute('rel'))) === 'canonical') { $canonical = trim($l->getAttribute('href')); break; }
}

out([
  'ok' => true,
  'url' => $url,
  'finalUrl' => $cur,
  'status' => $status,
  'title' => $title,
  'canonical' => $canonical,
  'meta' => $meta,
]);
