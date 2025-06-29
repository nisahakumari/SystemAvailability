<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

$api_url = "https://apps.aegcl.co.in/projapi/Api/getSysAvailability";

if (!empty($_GET)) {
    $api_url .= '?' . http_build_query($_GET);
}

$ch = curl_init($api_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);

// Check for errors
if (curl_errno($ch)) {
    $error = curl_error($ch);
    curl_close($ch);
    echo json_encode(['error' => $error]);
    exit;
}

curl_close($ch);

// Output API response
echo $response;
?>
