<?php
// proses_testimoni.php
require 'koneksi.php';
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $name = trim($_POST['name'] ?? '');
    $rating = (int)($_POST['rating'] ?? 0);
    $comment = trim($_POST['comment'] ?? '');

    if(empty($name) || $rating < 1 || $rating > 5 || empty($comment)) {
        echo json_encode(["status" => "error", "message" => "Data ulasan tidak lengkap atau di luar ketentuan."]);
        exit;
    }

    try {
        $stmt = $pdo->prepare("INSERT INTO testimonials (customer_name, rating, message, status) VALUES (?, ?, ?, 'pending')");
        $stmt->execute([htmlspecialchars($name), $rating, htmlspecialchars($comment)]);
        echo json_encode(["status" => "success", "message" => "Ulasan berhasil dikirim dan menunggu persetujuan penjual."]);
    } catch (Exception $e) {
        echo json_encode(["status" => "error", "message" => "Terjadi kesalahan saat menyimpan ulasan."]);
    }
}
?>