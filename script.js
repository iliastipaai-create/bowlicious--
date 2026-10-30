document.addEventListener('DOMContentLoaded', () => {

    /* ===== UTIL ===== */
    const $ = (id) => document.getElementById(id);
    const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const localISO = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    /* ===== 1. SHARED: NAVBAR, REVEAL, FOOTER ===== */
    const navbar = $('navbar');
    const menuBtn = $('mobile-menu');
    const navMenu = $('nav-menu');

    const onScroll = () => navbar.classList.toggle('scrolled', window.scrollY > 50);
    window.addEventListener('scroll', onScroll);
    onScroll();

    if (menuBtn && navMenu) {
        const setMenu = (open) => {
            navMenu.classList.toggle('active', open);
            menuBtn.setAttribute('aria-expanded', open);
            menuBtn.querySelector('i').className = open ? 'fas fa-times' : 'fas fa-bars';
        };
        menuBtn.addEventListener('click', () => setMenu(!navMenu.classList.contains('active')));
        navMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
    }

    const revealEls = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window) {
        const obs = new IntersectionObserver((entries, o) => {
            entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('active'); o.unobserve(e.target); } });
        }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });
        revealEls.forEach(el => obs.observe(el));
    } else {
        revealEls.forEach(el => el.classList.add('active'));
    }

    const yearEl = $('currentYear');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    /* ===== 2. PEMESANAN (hanya jika form ada) ===== */
    const orderForm = $('orderForm');
    if (orderForm) {
        const basePrice = parseInt($('product-price').dataset.price, 10);
        const qtyInput = $('orderQty');
        const dateInput = $('orderDate');
        const feedback = $('orderFeedback');
        const fmt = (n) => `Rp${n.toLocaleString('id-ID')}`;

        dateInput.min = localISO();

        const setErr = (id, msg) => {
            const el = orderForm.querySelector(`.error-msg[data-for="${id}"]`);
            const input = $(id);
            el.textContent = msg;
            el.classList.toggle('show', !!msg);
            input.classList.toggle('invalid', !!msg);
        };

        const refresh = () => {
            const qty = Math.max(1, parseInt(qtyInput.value, 10) || 1);
            $('totalPrice').textContent = fmt(basePrice * qty);
            $('sumQty').textContent = qty;
            $('sumDate').textContent = dateInput.value
                ? new Date(dateInput.value + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                : '-';
        };

        $('btn-minus').addEventListener('click', () => {
            if (parseInt(qtyInput.value, 10) > 1) { qtyInput.value = parseInt(qtyInput.value, 10) - 1; refresh(); }
        });
        $('btn-plus').addEventListener('click', () => { qtyInput.value = parseInt(qtyInput.value, 10) + 1; refresh(); });
        dateInput.addEventListener('change', refresh);

        orderForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = $('orderName').value.trim();
            const wa = $('orderWA').value.replace(/[\s-]/g, '');
            const qty = parseInt(qtyInput.value, 10);
            let ok = true;

            setErr('orderName', ''); setErr('orderWA', ''); setErr('orderDate', '');
            if (name.length < 2) { setErr('orderName', 'Masukkan nama lengkap.'); ok = false; }
            if (!/^(\+62|62|0)8\d{7,12}$/.test(wa)) { setErr('orderWA', 'Nomor WhatsApp tidak valid. Contoh: 081234567890.'); ok = false; }
            if (!dateInput.value) { setErr('orderDate', 'Pilih tanggal pengambilan.'); ok = false; }
            else if (dateInput.value < localISO()) { setErr('orderDate', 'Tanggal tidak boleh sebelum hari ini.'); ok = false; }
            if (!(qty >= 1)) ok = false;
            if (!ok) return;

            // Integrasi Backend: Mengirim data ke proses_pemesanan.php
            const formData = new FormData();
            formData.append('name', name);
            formData.append('wa', wa);
            formData.append('qty', qty);
            formData.append('date', dateInput.value);
            formData.append('notes', $('orderNotes').value.trim());

            // Nonaktifkan tombol saat memproses untuk mencegah double submit
            const submitBtn = orderForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            feedback.textContent = 'Memproses pesanan...';
            feedback.className = 'feedback-msg';

            fetch('proses_pemesanan.php', { method: 'POST', body: formData })
            .then(res => res.json())
            .then(data => {
                submitBtn.disabled = false;
                if(data.status === 'success') {
                    feedback.textContent = data.message;
                    feedback.className = 'feedback-msg feedback-success';
                    $('orderStatus').textContent = `Pesanan berhasil tercatat. Silakan klik tombol WA di bawah untuk konfirmasi.`;

                    // Tambahkan tombol WA jika belum ada
                    const existingWaBtn = orderForm.querySelector('.fa-whatsapp');
                    if(!existingWaBtn) {
                        const waBtn = document.createElement('a');
                        waBtn.href = data.wa_link;
                        waBtn.target = '_blank';
                        waBtn.className = 'btn btn-primary btn-full';
                        waBtn.style.marginTop = '1rem';
                        waBtn.innerHTML = '<i class="fab fa-whatsapp"></i> KONFIRMASI VIA WHATSAPP';
                        orderForm.appendChild(waBtn);
                    } else {
                        // Jika sudah ada (dari pesanan sebelumnya), perbarui link-nya
                        existingWaBtn.parentElement.href = data.wa_link;
                    }

                    orderForm.reset();
                    qtyInput.value = 1;
                    refresh();
                } else {
                    feedback.textContent = data.message;
                    feedback.className = 'feedback-msg feedback-error';
                }
            })
            .catch(err => {
                submitBtn.disabled = false;
                feedback.textContent = 'Gagal menghubungi server. Pastikan XAMPP menyala.';
                feedback.className = 'feedback-msg feedback-error';
                console.error(err);
            });
        });
        refresh();
    }

    /* ===== 3. TESTIMONI (hanya jika form ada) ===== */
    const reviewForm = $('reviewForm');
    if (reviewForm) {
        let reviewsData = []; // Mengosongkan data dummy, akan diisi dari database
        const stars = (n) => Array.from({ length: 5 }, (_, i) => `<i class="${i < n ? 'fas' : 'far'} fa-star"></i>`).join('');
        const starInput = $('starInput').querySelectorAll('i');
        const ratingInput = $('reviewRating');
        const ratingError = $('ratingError');

        // Fungsi mengambil data dari database
        const loadTestimonials = () => {
            fetch('get_testimoni.php')
            .then(res => res.json())
            .then(data => {
                if(data.status === 'success') {
                    reviewsData = data.data;
                    renderSummary();
                    renderList();
                }
            }).catch(e => console.error("Gagal memuat ulasan:", e));
        };

        starInput.forEach(star => star.addEventListener('click', () => {
            const val = parseInt(star.dataset.value, 10);
            ratingInput.value = val;
            ratingError.style.display = 'none';
            starInput.forEach(s => s.classList.toggle('active', parseInt(s.dataset.value, 10) <= val));
        }));

        const renderSummary = () => {
            const total = reviewsData.length;
            $('totalReviewsCount').textContent = total;
            const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
            let sum = 0;
            reviewsData.forEach(r => { 
                sum += parseInt(r.rating, 10); 
                counts[r.rating]++; 
            });
            const avg = total ? sum / total : 0;
            $('avgRatingNum').textContent = avg.toFixed(1);
            $('avgStarsDisplay').innerHTML = stars(Math.round(avg));
            $('ratingDistribution').innerHTML = [5, 4, 3, 2, 1].map(i => {
                const pct = total ? (counts[i] / total) * 100 : 0;
                return `<div class="dist-row"><span>${i} <i class="fas fa-star" style="color:#ccc;font-size:.8rem"></i></span>
                    <div class="dist-bar"><div class="dist-fill" style="width:${pct}%"></div></div><span>${counts[i]}</span></div>`;
            }).join('');
        };

        const renderList = () => {
            const reviewItems = $('reviewItems');
            if(reviewsData.length === 0) {
                reviewItems.innerHTML = "<p style='text-align:center; color:#888;'>Belum ada ulasan yang disetujui. Jadilah yang pertama!</p>";
                return;
            }
            // Sesuaikan variabel dengan output database (customer_name & message)
            reviewItems.innerHTML = reviewsData.map(r => `
                <div class="review-card">
                    <div class="review-card-header"><span class="review-author">${esc(r.customer_name)}</span><span class="review-date">${esc(r.date)}</span></div>
                    <div class="review-stars">${stars(r.rating)}</div>
                    <p class="review-comment">${esc(r.message)}</p>
                </div>`).join('');
            
            // Sembunyikan badge info demo
            const badge = document.querySelector('.demo-badge');
            if(badge) badge.style.display = 'none';
        };

        reviewForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = $('reviewerName').value.trim();
            const comment = $('reviewComment').value.trim();
            if (!ratingInput.value) { ratingError.style.display = 'block'; return; }
            if (!name || !comment) { reviewForm.reportValidity(); return; }

            const submitBtn = reviewForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'MENGIRIM...';

            // Kirim ke database
            const fd = new FormData();
            fd.append('name', name);
            fd.append('rating', ratingInput.value);
            fd.append('comment', comment);

            fetch('proses_testimoni.php', { method: 'POST', body: fd })
            .then(res => res.json())
            .then(data => {
                submitBtn.disabled = false;
                submitBtn.textContent = 'KIRIM ULASAN';
                alert(data.message); // Menampilkan pop-up sukses
                
                if(data.status === 'success') {
                    reviewForm.reset();
                    ratingInput.value = '';
                    starInput.forEach(s => s.classList.remove('active'));
                    // Kita tidak merender ulang list karena status ulasannya masih 'pending' di DB
                }
            })
            .catch(err => {
                submitBtn.disabled = false;
                submitBtn.textContent = 'KIRIM ULASAN';
                alert("Gagal menghubungi server.");
            });
        });

        // Panggil data asli saat halaman dimuat
        loadTestimonials();
    }
});