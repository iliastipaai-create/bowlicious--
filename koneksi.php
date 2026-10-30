<?php
// koneksi.php
$host = 'localhost';
$dbname = 'bowlicious_db';
$username = 'root'; // Sesuaikan jika XAMPP Anda menggunakan username lain
$password = '';     // Sesuaikan jika XAMPP Anda menggunakan password

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    // Jangan tampilkan $e->getMessage() di production agar path/struktur DB aman
    die("Koneksi gagal. Pastikan XAMPP Apache dan MySQL berjalan.");
}
?>