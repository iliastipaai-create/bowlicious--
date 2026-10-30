<?php
// get_testimoni.php
require 'koneksi.php';
header('Content-Type: application/json');

try {
    $stmt = $pdo->query("SELECT customer_name, rating, message, DATE_FORMAT(created_at, '%Y-%m-%d') as date FROM testimonials WHERE status = 'approved' ORDER BY created_at DESC");
    $reviews = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(["status" => "success", "data" => $reviews]);
} catch (Exception $e) {
    echo json_encode(["status" => "error", "data" => []]);
}
?>