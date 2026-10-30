<?php
// proses_pemesanan.php
require 'koneksi.php';
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $name = trim($_POST['name'] ?? '');
    $wa = trim($_POST['wa'] ?? '');
    $qty = (int)($_POST['qty'] ?? 0);
    $date = $_POST['date'] ?? '';
    $notes = trim($_POST['notes'] ?? '');
    $product_id = 1; // Mengacu pada produk utama di database

    if(empty($name) || empty($wa) || $qty <= 0 || empty($date)) {
        echo json_encode(["status" => "error", "message" => "Data wajib tidak lengkap atau tidak valid."]);
        exit;
    }
    if(strtotime($date) < strtotime(date('Y-m-d'))) {
        echo json_encode(["status" => "error", "message" => "Tanggal pengambilan tidak boleh di masa lalu."]);
        exit;
    }

    try {
        // 1. Ambil data produk
        $stmtProd = $pdo->prepare("SELECT name, price, is_available FROM products WHERE id = ?");
        $stmtProd->execute([$product_id]);
        $product = $stmtProd->fetch(PDO::FETCH_ASSOC);

        if(!$product || $product['is_available'] != 1) {
            echo json_encode(["status" => "error", "message" => "Produk tidak tersedia."]);
            exit;
        }

        $total_price = $product['price'] * $qty;
        $order_code = 'BWL' . strtoupper(substr(uniqid(), -5));

        // 2. Transaksi Database
        $pdo->beginTransaction();

        $stmtOrder = $pdo->prepare("INSERT INTO orders (order_code, customer_name, whatsapp_number, pickup_date, notes, total_price, status) VALUES (?, ?, ?, ?, ?, ?, 'menunggu_konfirmasi')");
        $stmtOrder->execute([$order_code, $name, $wa, $date, $notes, $total_price]);
        $order_id = $pdo->lastInsertId();

        $stmtItem = $pdo->prepare("INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)");
        $stmtItem->execute([$order_id, $product_id, $qty, $product['price']]);

        $pdo->commit();

        // 3. Konfigurasi WhatsApp
        $waBisnis = "6285122949124"; // Ganti dengan nomor asli
        $pesanWA = "Halo BOWLICIOUS,\nSaya ingin mengonfirmasi pesanan saya:\n\n*Kode:* $order_code\n*Nama:* $name\n*Pesanan:* {$product['name']} ($qty porsi)\n*Tanggal:* $date\n*Total:* Rp" . number_format($total_price, 0, ',', '.') . "\n\nPembayaran akan saya lakukan saat pengambilan. Mohon konfirmasinya.";
        
        $wa_link = "https://wa.me/$waBisnis?text=" . urlencode($pesanWA);

        echo json_encode(["status" => "success", "message" => "Pesanan tersimpan. Lanjutkan ke WhatsApp.", "wa_link" => $wa_link]);
    } catch (Exception $e) {
        $pdo->rollBack();
        echo json_encode(["status" => "error", "message" => "Terjadi kesalahan sistem saat menyimpan pesanan."]);
    }
}
?>