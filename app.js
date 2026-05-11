import { db, ref, set, push, onValue, update, remove } from './firebase.js';

document.addEventListener('DOMContentLoaded', function() {
    // Elemen UI
    const totalSaldoElement = document.getElementById('total-saldo');
    const transaksiListElement = document.getElementById('transaksi-list');
    const searchTransaksiInput = document.getElementById('search-transaksi');
    const impianListElement = document.getElementById('impian-list');
    const modalElement = document.getElementById('modal');
    const modalTitleElement = document.getElementById('modal-title');
    const modalContentElement = document.getElementById('modal-content');
    const modalCloseElement = document.getElementById('modal-close');
    
    // Tab elements
    const tabTransaksi = document.getElementById('tab-transaksi');
    const tabImpian = document.getElementById('tab-impian');
    const transaksiSection = document.getElementById('transaksi-section');
    const impianSection = document.getElementById('impian-section');
    
    // Mobile tab elements
    const mobileTabTransaksi = document.getElementById('mobile-tab-transaksi');
    const mobileTabImpian = document.getElementById('mobile-tab-impian');
    const mobileBtnTambah = document.getElementById('mobile-btn-tambah');
    
    // Filter buttons
    const btnFilterSemua = document.getElementById('btn-filter-semua');
    const btnFilterPemasukan = document.getElementById('btn-filter-pemasukan');
    const btnFilterPengeluaran = document.getElementById('btn-filter-pengeluaran');
    
    // Tombol aksi
    const btnTambahPemasukan = document.getElementById('btn-tambah-pemasukan');
    const btnTambahPengeluaran = document.getElementById('btn-tambah-pengeluaran');
    const btnTambahImpian = document.getElementById('btn-tambah-impian');
    const btnRefresh = document.getElementById('btn-refresh');
    const btnLihatSemuaTransaksi = document.getElementById('btn-lihat-semua-transaksi');
    
    // Variabel global
    let saldo = 0;
    let transaksi = [];
    let impian = [];
    let currentFilter = 'semua';
    let transactionSearchQuery = '';
    let showAllTransactions = false;
    
    // Fungsi untuk menampilkan modal
    function showModal(title, content) {
        modalTitleElement.textContent = title;
        modalContentElement.innerHTML = content;
        modalElement.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
    
    // Fungsi untuk menyembunyikan modal
    function hideModal() {
        modalElement.classList.add('hidden');
        document.body.style.overflow = '';
    }
    
    // Event listener untuk tombol close modal
    modalCloseElement.addEventListener('click', hideModal);
    modalElement.addEventListener('click', function(e) {
        if (e.target === modalElement) {
            hideModal();
        }
    });
    
    // Fungsi untuk memformat angka ke Rupiah
    function formatRupiah(angka) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(angka);
    }
    
    // Fungsi untuk memformat tanggal
    function formatTanggal(tanggal) {
        const options = { 
            day: 'numeric', 
            month: 'short', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return new Date(tanggal).toLocaleDateString('id-ID', options);
    }
    
    // Fungsi untuk menambahkan transaksi
    function tambahTransaksi(jenis, nominal, keterangan) {
        const timestamp = new Date().getTime();
        const transaksiBaru = {
            id: timestamp,
            jenis,
            nominal: parseInt(nominal),
            keterangan,
            tanggal: new Date().toISOString()
        };
        
        // Push ke Firebase
        push(ref(db, 'transaksi'), transaksiBaru);
        
        // Update saldo
        const saldoBaru = jenis === 'pemasukan' ? saldo + parseInt(nominal) : saldo - parseInt(nominal);
        set(ref(db, 'saldo'), saldoBaru);
        
        hideModal();
    }
    
    // Fungsi untuk menambahkan impian
    function tambahImpian(nama, target, deskripsi = '') {
        const timestamp = new Date().getTime();
        const impianBaru = {
            id: timestamp,
            nama,
            target: parseInt(target),
            deskripsi,
            tercapai: false,
            tanggal: new Date().toISOString()
        };
        
        // Push ke Firebase
        push(ref(db, 'impian'), impianBaru);
        
        hideModal();
    }
    
    // Fungsi untuk menandai impian sebagai tercapai
    async function capaiImpian(impianId) {
        try {
            // Cari impian yang sesuai
            const impianRef = ref(db, 'impian');
            const snapshot = await new Promise(resolve => onValue(impianRef, resolve, { onlyOnce: true }));
            
            let impianData = null;
            let impianKey = null;
            
            snapshot.forEach((childSnapshot) => {
                const data = childSnapshot.val();
                if (data.id === parseInt(impianId)) {
                    impianData = data;
                    impianKey = childSnapshot.key;
                }
            });
            
            if (!impianData) {
                alert('Impian tidak ditemukan!');
                return;
            }
            
            if (saldo >= impianData.target) {
                // Update saldo
                const saldoBaru = saldo - impianData.target;
                await set(ref(db, 'saldo'), saldoBaru);
                
                // Update status impian
                await update(ref(db, `impian/${impianKey}`), {
                    tercapai: true,
                    tanggalDicapai: new Date().toISOString()
                });
                
                // Tampilkan modal konfirmasi
                showModal(
                    'Impian Tercapai!',
                    `
                    <div class="space-y-5 text-center text-slate-900">
                        <div class="rounded-3xl border border-emerald-200 bg-emerald-50/80 p-5">
                            <div class="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-500 text-white shadow-lg shadow-emerald-200/80">
                                <i class="fas fa-check text-2xl"></i>
                            </div>
                            <h3 class="text-xl font-extrabold text-slate-950">Selamat!</h3>
                            <p class="mt-1 text-slate-600">Impian "${impianData.nama}" telah tercapai.</p>
                        </div>
                        <button onclick="hideModal()" class="w-full bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-3.5 rounded-2xl font-bold shadow-lg shadow-cyan-200/70">
                            Tutup
                        </button>
                    </div>
                    `
                );
            } else {
                alert('Saldo tidak cukup untuk mencapai impian ini!');
            }
        } catch (error) {
            console.error('Error mencapai impian:', error);
            alert('Terjadi kesalahan saat mencoba mencapai impian');
        }
    }
    
    // Fungsi untuk menghapus impian
    async function hapusImpian(impianId) {
        const konfirmasi = confirm('Apakah Anda yakin ingin menghapus impian ini?');
        if (!konfirmasi) return;
        
        try {
            const impianRef = ref(db, 'impian');
            const snapshot = await new Promise(resolve => onValue(impianRef, resolve, { onlyOnce: true }));
            
            let impianKey = null;
            
            snapshot.forEach((childSnapshot) => {
                const data = childSnapshot.val();
                if (data.id === parseInt(impianId)) {
                    impianKey = childSnapshot.key;
                }
            });
            
            if (impianKey) {
                await remove(ref(db, `impian/${impianKey}`));
            } else {
                alert('Impian tidak ditemukan!');
            }
        } catch (error) {
            console.error('Error menghapus impian:', error);
            alert('Terjadi kesalahan saat menghapus impian');
        }
    }
    
    // Fungsi untuk menampilkan modal tambah transaksi
    function showTambahTransaksiModal(jenis) {
        const title = jenis === 'pemasukan' ? 'Tambah Pemasukan' : 'Tambah Pengeluaran';
        const now = new Date();
        const formattedDate = now.toISOString().slice(0, 16);
        const isPemasukan = jenis === 'pemasukan';
        const icon = isPemasukan ? 'fa-arrow-down' : 'fa-arrow-up';
        const helperText = isPemasukan
            ? 'Catat uang yang masuk ke tabungan.'
            : 'Catat uang yang keluar dari tabungan.';
        
        const content = `
            <form id="form-transaksi" class="space-y-5">
                <div class="rounded-3xl border ${isPemasukan ? 'border-emerald-200 bg-emerald-50/80' : 'border-rose-200 bg-rose-50/80'} p-4">
                    <div class="flex items-center gap-3">
                        <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${isPemasukan ? 'bg-emerald-500 text-white shadow-emerald-200/80' : 'bg-rose-500 text-white shadow-rose-200/80'} shadow-lg">
                            <i class="fas ${icon}"></i>
                        </div>
                        <div>
                            <p class="text-sm font-bold ${isPemasukan ? 'text-emerald-700' : 'text-rose-700'}">${title}</p>
                            <p class="text-sm text-slate-600">${helperText}</p>
                        </div>
                    </div>
                </div>
                <div>
                    <label for="nominal" class="block text-slate-700 font-medium mb-2">Nominal (Rp)</label>
                    <div class="relative">
                        <span class="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">Rp</span>
                        <input type="number" id="nominal" class="glass-input w-full rounded-2xl py-3 pl-11 pr-4 outline-none transition-all" placeholder="Masukkan nominal" required>
                    </div>
                </div>
                <div>
                    <label for="keterangan" class="block text-slate-700 font-medium mb-2">Keterangan</label>
                    <div class="relative">
                        <i class="fas fa-align-left absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                        <input type="text" id="keterangan" class="glass-input w-full rounded-2xl py-3 pl-11 pr-4 outline-none transition-all" placeholder="${isPemasukan ? 'Contoh: Gaji Bulanan' : 'Contoh: Beli kebutuhan'}" required>
                    </div>
                </div>
                <div class="bg-cyan-50/70 p-3 rounded-2xl border border-white/80">
                    <p class="text-sm text-cyan-800 flex items-center">
                        <i class="fas fa-info-circle mr-2"></i> 
                        Tanggal transaksi: ${formatTanggal(now.getTime())}
                    </p>
                    <input type="hidden" id="tanggal" value="${now.toISOString()}">
                </div>
                <button type="submit" class="w-full ${isPemasukan ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200/80' : 'bg-rose-500 hover:bg-rose-600 shadow-rose-200/80'} text-white py-3.5 rounded-2xl transition-colors shadow-lg font-bold">
                    Simpan Transaksi
                </button>
            </form>
        `;
        
        showModal(title, content);
        
        const formTransaksi = document.getElementById('form-transaksi');
        formTransaksi.addEventListener('submit', function(e) {
            e.preventDefault();
            const nominal = document.getElementById('nominal').value;
            const keterangan = document.getElementById('keterangan').value;
            const tanggal = document.getElementById('tanggal').value || new Date().toISOString();
            
            if (nominal && keterangan) {
                tambahTransaksi(jenis, nominal, keterangan, tanggal);
            }
        });
    }

    function formatTanggal(tanggal) {
        const date = new Date(tanggal);
        const hari = date.toLocaleDateString('id-ID', { weekday: 'short' }).replace('.', '');
        const tgl = date.getDate();
        const bulan = date.toLocaleDateString('id-ID', { month: 'short' });
        const tahun = date.getFullYear();
        const jam = String(date.getHours()).padStart(2, '0');
        const menit = String(date.getMinutes()).padStart(2, '0');
        
        return `${hari}, ${tgl} ${bulan} ${tahun}, ${jam}:${menit}`;
    }    
    
    // Fungsi untuk menampilkan modal tambah impian
    function showTambahImpianModal() {
        const title = 'Tambah Impian Baru';
        const content = `
            <form id="form-impian" class="space-y-5">
                <div class="rounded-3xl border border-cyan-200 bg-cyan-50/80 p-4">
                    <div class="flex items-center gap-3">
                        <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-600 text-white shadow-lg shadow-cyan-200/80">
                            <i class="fas fa-star"></i>
                        </div>
                        <div>
                            <p class="text-sm font-bold text-cyan-700">Target Impian</p>
                            <p class="text-sm text-slate-600">Tambahkan tujuan tabungan yang ingin dicapai.</p>
                        </div>
                    </div>
                </div>
                <div>
                    <label for="nama-impian" class="block text-slate-700 font-medium mb-2">Nama Impian</label>
                    <div class="relative">
                        <i class="fas fa-bullseye absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                        <input type="text" id="nama-impian" class="glass-input w-full rounded-2xl py-3 pl-11 pr-4 outline-none" placeholder="Contoh: Liburan ke Bali" required>
                    </div>
                </div>
                <div>
                    <label for="target-impian" class="block text-slate-700 font-medium mb-2">Target Nominal (Rp)</label>
                    <div class="relative">
                        <span class="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">Rp</span>
                        <input type="number" id="target-impian" class="glass-input w-full rounded-2xl py-3 pl-11 pr-4 outline-none" placeholder="Masukkan target" required>
                    </div>
                </div>
                <div>
                    <label for="deskripsi-impian" class="block text-slate-700 font-medium mb-2">Deskripsi (Opsional)</label>
                    <textarea id="deskripsi-impian" class="glass-input w-full px-4 py-3 rounded-2xl outline-none" placeholder="Tambahkan deskripsi impian Anda" rows="3"></textarea>
                </div>
                <button type="submit" class="w-full bg-cyan-600 hover:bg-cyan-700 text-white py-3.5 rounded-2xl font-bold transition-colors shadow-lg shadow-cyan-200/70">
                    Tambah Impian
                </button>
            </form>
        `;
        
        showModal(title, content);
        
        const formImpian = document.getElementById('form-impian');
        formImpian.addEventListener('submit', function(e) {
            e.preventDefault();
            const nama = document.getElementById('nama-impian').value;
            const target = document.getElementById('target-impian').value;
            const deskripsi = document.getElementById('deskripsi-impian').value;
            
            if (nama && target) {
                tambahImpian(nama, target, deskripsi);
            }
        });
    }
    
    // Fungsi untuk menampilkan detail impian
    function showDetailImpianModal(impianData) {
        const persentase = Math.min(Math.max((saldo / impianData.target) * 100, 0), 100);
        const bisaDicapai = saldo >= impianData.target;
        
        showModal(
            impianData.nama,
            `
            <div class="space-y-5 text-slate-700">
                <div class="rounded-3xl border ${bisaDicapai ? 'border-emerald-200 bg-emerald-50/80' : 'border-cyan-200 bg-cyan-50/80'} p-4 text-center">
                    <div class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl ${bisaDicapai ? 'bg-emerald-500 shadow-emerald-200/80' : 'bg-cyan-600 shadow-cyan-200/80'} text-white shadow-lg">
                        <i class="fas ${bisaDicapai ? 'fa-check' : 'fa-star'}"></i>
                    </div>
                    <p class="text-2xl font-extrabold ${bisaDicapai ? 'text-emerald-600' : 'text-cyan-700'}">${formatRupiah(impianData.target)}</p>
                    <p class="text-sm text-slate-600">Target impian</p>
                </div>
                
                <div class="rounded-3xl border border-white/80 bg-white/50 p-4">
                    <div class="flex justify-between gap-3 text-sm mb-2 text-slate-600">
                        <span>Tersimpan: ${formatRupiah(saldo > impianData.target ? impianData.target : saldo)}</span>
                        <span class="font-semibold">${bisaDicapai ? 'Tercapai!' : `Kurang ${formatRupiah(impianData.target - saldo)}`}</span>
                    </div>
                    <div class="w-full bg-white/70 rounded-full h-2.5 overflow-hidden">
                        <div class="${bisaDicapai ? 'bg-emerald-500' : 'bg-cyan-500'} h-2.5 rounded-full" style="width: ${persentase}%"></div>
                    </div>
                </div>
                
                ${impianData.deskripsi ? `
                    <div class="rounded-3xl border border-white/80 bg-white/50 p-4">
                        <h4 class="font-semibold text-slate-800 mb-1">Deskripsi</h4>
                        <p class="text-slate-600">${impianData.deskripsi}</p>
                    </div>
                ` : ''}
                
                <div class="grid grid-cols-2 gap-3 pt-1">
                    ${bisaDicapai ? `
                        <button onclick="window.capaiImpian(${impianData.id})" class="bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-2xl font-bold transition-colors shadow-lg shadow-emerald-200/80">
                            Capai Impian
                        </button>
                    ` : ''}
                    <button onclick="window.hapusImpian(${impianData.id})" class="bg-rose-500 hover:bg-rose-600 text-white py-3 rounded-2xl font-bold transition-colors shadow-lg shadow-rose-200/80">
                        Hapus
                    </button>
                </div>
            </div>
            `
        );
    }
    
    // Fungsi untuk merender transaksi
    function renderTransaksi() {
        if (transaksi.length === 0) {
            transaksiListElement.innerHTML = '<p class="text-slate-500 text-center py-8">Belum ada transaksi</p>';
            return;
        }
        
        // Filter transaksi berdasarkan jenis dan keterangan
        let filteredTransaksi = transaksi;
        if (currentFilter === 'pemasukan') {
            filteredTransaksi = transaksi.filter(t => t.jenis === 'pemasukan');
        } else if (currentFilter === 'pengeluaran') {
            filteredTransaksi = transaksi.filter(t => t.jenis === 'pengeluaran');
        }

        const normalizedQuery = transactionSearchQuery.trim().toLowerCase();
        if (normalizedQuery) {
            filteredTransaksi = filteredTransaksi.filter(t => 
                (t.keterangan || '').toLowerCase().includes(normalizedQuery)
            );
        }

        if (filteredTransaksi.length === 0) {
            transaksiListElement.innerHTML = normalizedQuery
                ? '<p class="text-slate-500 text-center py-8">Tidak ada transaksi dengan keterangan tersebut</p>'
                : '<p class="text-slate-500 text-center py-8">Tidak ada transaksi pada filter ini</p>';
            btnLihatSemuaTransaksi.classList.add('hidden');
            return;
        }
        
        // Urutkan transaksi terbaru pertama
        const sortedTransaksi = [...filteredTransaksi].sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
        
        // Batasi jumlah transaksi yang ditampilkan jika tidak menampilkan semua
        const transaksiToShow = showAllTransactions ? sortedTransaksi : sortedTransaksi.slice(0, 5);
        
        transaksiListElement.innerHTML = transaksiToShow.map(t => `
            <div class="flex flex-col gap-3 p-4 hover:bg-white/50 transition-colors sm:flex-row sm:items-center sm:justify-between">
                <div class="flex items-center gap-3 min-w-0">
                    <div class="h-11 w-11 shrink-0 rounded-full flex items-center justify-center ${t.jenis === 'pemasukan' ? 'bg-emerald-100 text-emerald-600 ring-1 ring-emerald-200' : 'bg-rose-100 text-rose-600 ring-1 ring-rose-200'}">
                        <i class="fas ${t.jenis === 'pemasukan' ? 'fa-arrow-down' : 'fa-arrow-up'}"></i>
                    </div>
                    <div class="min-w-0">
                        <p class="font-semibold text-slate-900 truncate">${t.keterangan}</p>
                        <p class="text-xs text-slate-500">${formatTanggal(t.tanggal)}</p>
                    </div>
                </div>
                <p class="${t.jenis === 'pemasukan' ? 'text-emerald-600' : 'text-rose-600'} font-bold sm:text-right">
                    ${t.jenis === 'pemasukan' ? '+' : '-'} ${formatRupiah(t.nominal)}
                </p>
            </div>
        `).join('');
        
        // Tampilkan tombol lihat semua/sedikit jika ada lebih dari 5 transaksi
        if (filteredTransaksi.length > 5) {
            btnLihatSemuaTransaksi.classList.remove('hidden');
            btnLihatSemuaTransaksi.innerHTML = showAllTransactions ? 
                'Lihat Sedikit <i class="fas fa-chevron-up ml-1"></i>' : 
                'Lihat Semua <i class="fas fa-chevron-down ml-1"></i>';
        } else {
            btnLihatSemuaTransaksi.classList.add('hidden');
        }
    }
    
    // Fungsi untuk merender impian
    function renderImpian() {
        if (impian.length === 0) {
            impianListElement.innerHTML = '<p class="text-slate-500 col-span-full text-center py-8">Belum ada impian</p>';
            return;
        }
        
        // Filter hanya impian yang belum tercapai
        const impianAktif = impian.filter(i => !i.tercapai);
        
        if (impianAktif.length === 0) {
            impianListElement.innerHTML = '<p class="text-slate-500 col-span-full text-center py-8">Tidak ada impian aktif</p>';
            return;
        }
        
        // Urutkan impian berdasarkan selisih terdekat dengan saldo saat ini
        const sortedImpian = [...impianAktif].sort((a, b) => {
            const selisihA = a.target - saldo;
            const selisihB = b.target - saldo;
            
            // Prioritaskan impian yang sudah bisa dicapai
            if (selisihA <= 0 && selisihB > 0) return -1;
            if (selisihB <= 0 && selisihA > 0) return 1;
            
            // Kemudian urutkan berdasarkan selisih terkecil
            return selisihA - selisihB;
        });
        
        impianListElement.innerHTML = sortedImpian.map(i => {
            const selisih = i.target - saldo;
            const bisaDicapai = saldo >= i.target;
            const persentase = Math.min(Math.max((saldo / i.target) * 100, 0), 100);
            
            return `
                <div class="rounded-3xl border p-4 ${bisaDicapai ? 'border-emerald-200 bg-emerald-50/70' : 'border-white/70 bg-white/40'} hover:bg-white/70 hover:shadow-xl hover:shadow-sky-200/40 transition-shadow cursor-pointer backdrop-blur" onclick="window.showDetailImpian(${i.id})">
                    <div class="flex justify-between items-start gap-3 mb-3">
                        <h3 class="font-bold text-slate-900 leading-snug">${i.nama}</h3>
                        <span class="shrink-0 text-sm font-semibold ${bisaDicapai ? 'text-emerald-600' : 'text-slate-600'}">
                            ${formatRupiah(i.target)}
                        </span>
                    </div>
                    
                    <div class="w-full bg-white/70 rounded-full h-2.5 mb-3 overflow-hidden">
                        <div class="${bisaDicapai ? 'bg-emerald-500' : 'bg-cyan-500'} h-2.5 rounded-full" style="width: ${persentase}%"></div>
                    </div>
                    
                    <div class="flex justify-between items-center gap-3 text-sm">
                        <span class="text-slate-600">Tersimpan: ${formatRupiah(saldo > i.target ? i.target : saldo)}</span>
                        <span class="${bisaDicapai ? 'text-emerald-600 font-semibold' : 'text-slate-500'}">
                            ${bisaDicapai ? 'Tercapai!' : `${Math.round(persentase)}%`}
                        </span>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    function setDesktopTabState(button, isActive) {
        const icon = button.children[0];
        const textGroup = button.children[1];
        const subtitle = textGroup ? textGroup.children[1] : null;

        if (isActive) {
            button.classList.add('text-white', 'border-cyan-300', 'bg-gradient-to-br', 'from-cyan-500', 'to-blue-600', 'shadow-lg', 'shadow-cyan-200/80', 'hover:shadow-xl', 'hover:shadow-cyan-200/90');
            button.classList.remove('text-slate-600', 'text-slate-500', 'border-white/70', 'bg-white/35', 'hover:bg-white/70', 'hover:text-slate-950', 'hover:shadow-sky-100/60');
            icon?.classList.add('bg-white', 'text-cyan-700', 'shadow-md', 'shadow-cyan-700/10');
            icon?.classList.remove('bg-white/70', 'text-slate-500', 'ring-1', 'ring-white/80');
            subtitle?.classList.add('text-white/80');
            subtitle?.classList.remove('text-slate-500/80', 'text-cyan-700/70');
        } else {
            button.classList.add('text-slate-600', 'border-white/70', 'bg-white/35', 'hover:bg-white/70', 'hover:text-slate-950', 'hover:shadow-lg', 'hover:shadow-sky-100/60');
            button.classList.remove('text-white', 'text-cyan-700', 'border-cyan-300', 'bg-gradient-to-br', 'from-cyan-500', 'to-blue-600', 'shadow-lg', 'shadow-cyan-200/80', 'hover:shadow-xl', 'hover:shadow-cyan-200/90');
            icon?.classList.add('bg-white/70', 'text-slate-500', 'ring-1', 'ring-white/80');
            icon?.classList.remove('bg-white', 'text-cyan-700', 'shadow-md', 'shadow-cyan-700/10');
            subtitle?.classList.add('text-slate-500/80');
            subtitle?.classList.remove('text-white/80', 'text-cyan-700/70');
        }
    }

    // Fungsi untuk beralih antara tab
    function switchTab(tab) {
        if (tab === 'transaksi') {
            setDesktopTabState(tabTransaksi, true);
            setDesktopTabState(tabImpian, false);
            
            mobileTabTransaksi.classList.add('text-cyan-700', 'bg-cyan-100/80', 'ring-1', 'ring-cyan-200/80');
            mobileTabTransaksi.classList.remove('text-slate-500');
            mobileTabImpian.classList.add('text-slate-500');
            mobileTabImpian.classList.remove('text-cyan-700', 'bg-cyan-100/80', 'ring-1', 'ring-cyan-200/80');
            
            transaksiSection.classList.remove('hidden');
            impianSection.classList.add('hidden');
        } else {
            setDesktopTabState(tabImpian, true);
            setDesktopTabState(tabTransaksi, false);
            
            mobileTabImpian.classList.add('text-cyan-700', 'bg-cyan-100/80', 'ring-1', 'ring-cyan-200/80');
            mobileTabImpian.classList.remove('text-slate-500');
            mobileTabTransaksi.classList.add('text-slate-500');
            mobileTabTransaksi.classList.remove('text-cyan-700', 'bg-cyan-100/80', 'ring-1', 'ring-cyan-200/80');
            
            impianSection.classList.remove('hidden');
            transaksiSection.classList.add('hidden');
        }
    }
    
    // Fungsi untuk mengupdate filter transaksi
    function updateFilter(filter) {
        currentFilter = filter;
        
        // Update tombol filter
        btnFilterSemua.classList.remove('bg-cyan-100/80', 'text-cyan-700', 'ring-cyan-200/80');
        btnFilterPemasukan.classList.remove('bg-cyan-100/80', 'text-cyan-700', 'ring-cyan-200/80');
        btnFilterPengeluaran.classList.remove('bg-cyan-100/80', 'text-cyan-700', 'ring-cyan-200/80');
        
        btnFilterSemua.classList.add('bg-white/50', 'text-slate-600', 'ring-white/80');
        btnFilterPemasukan.classList.add('bg-white/50', 'text-slate-600', 'ring-white/80');
        btnFilterPengeluaran.classList.add('bg-white/50', 'text-slate-600', 'ring-white/80');
        
        if (filter === 'semua') {
            btnFilterSemua.classList.add('bg-cyan-100/80', 'text-cyan-700', 'ring-cyan-200/80');
            btnFilterSemua.classList.remove('bg-white/50', 'text-slate-600', 'ring-white/80');
        } else if (filter === 'pemasukan') {
            btnFilterPemasukan.classList.add('bg-cyan-100/80', 'text-cyan-700', 'ring-cyan-200/80');
            btnFilterPemasukan.classList.remove('bg-white/50', 'text-slate-600', 'ring-white/80');
        } else if (filter === 'pengeluaran') {
            btnFilterPengeluaran.classList.add('bg-cyan-100/80', 'text-cyan-700', 'ring-cyan-200/80');
            btnFilterPengeluaran.classList.remove('bg-white/50', 'text-slate-600', 'ring-white/80');
        }
        
        renderTransaksi();
    }
    
    // Event listener untuk tab
    tabTransaksi.addEventListener('click', () => switchTab('transaksi'));
    tabImpian.addEventListener('click', () => switchTab('impian'));
    mobileTabTransaksi.addEventListener('click', () => switchTab('transaksi'));
    mobileTabImpian.addEventListener('click', () => switchTab('impian'));
    mobileBtnTambah.addEventListener('click', () => {
        if (transaksiSection.classList.contains('hidden')) {
            showTambahImpianModal();
        } else {
            // Tampilkan pilihan tambah pemasukan/pengeluaran
            showModal(
                'Tambah Transaksi',
                `
                <div class="space-y-4">
                    <p class="text-sm text-slate-600">Pilih jenis transaksi yang ingin ditambahkan.</p>
                    <button onclick="showTambahTransaksiModal('pemasukan')" class="group flex w-full items-center gap-4 rounded-3xl border border-emerald-200 bg-emerald-50/80 p-4 text-left transition-all hover:-translate-y-0.5 hover:bg-emerald-50 hover:shadow-lg hover:shadow-emerald-100/80">
                        <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-200/80">
                            <i class="fas fa-arrow-down"></i>
                        </span>
                        <span class="min-w-0 flex-1">
                            <span class="block font-bold text-slate-950">Pemasukan</span>
                            <span class="block text-sm text-slate-600">Catat uang yang masuk ke tabungan.</span>
                        </span>
                        <i class="fas fa-chevron-right text-emerald-600 transition-transform group-hover:translate-x-1"></i>
                    </button>
                    <button onclick="showTambahTransaksiModal('pengeluaran')" class="group flex w-full items-center gap-4 rounded-3xl border border-rose-200 bg-rose-50/80 p-4 text-left transition-all hover:-translate-y-0.5 hover:bg-rose-50 hover:shadow-lg hover:shadow-rose-100/80">
                        <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-500 text-white shadow-lg shadow-rose-200/80">
                            <i class="fas fa-arrow-up"></i>
                        </span>
                        <span class="min-w-0 flex-1">
                            <span class="block font-bold text-slate-950">Pengeluaran</span>
                            <span class="block text-sm text-slate-600">Catat uang yang keluar dari tabungan.</span>
                        </span>
                        <i class="fas fa-chevron-right text-rose-600 transition-transform group-hover:translate-x-1"></i>
                    </button>
                </div>
                `
            );
        }
    });
    
    // Event listener untuk filter
    btnFilterSemua.addEventListener('click', () => updateFilter('semua'));
    btnFilterPemasukan.addEventListener('click', () => updateFilter('pemasukan'));
    btnFilterPengeluaran.addEventListener('click', () => updateFilter('pengeluaran'));
    searchTransaksiInput.addEventListener('input', function() {
        transactionSearchQuery = this.value;
        showAllTransactions = Boolean(transactionSearchQuery.trim());
        renderTransaksi();
    });
    
    // Event listener untuk tombol lihat semua transaksi
    btnLihatSemuaTransaksi.addEventListener('click', () => {
        showAllTransactions = !showAllTransactions;
        renderTransaksi();
    });
    
    // Event listener untuk tombol refresh
    btnRefresh.addEventListener('click', function() {
        this.classList.add('refresh-animate');
        setTimeout(() => {
            this.classList.remove('refresh-animate');
        }, 700);
        loadData();
    });
    
    // Event listener untuk tombol aksi
    btnTambahPemasukan.addEventListener('click', () => showTambahTransaksiModal('pemasukan'));
    btnTambahPengeluaran.addEventListener('click', () => showTambahTransaksiModal('pengeluaran'));
    btnTambahImpian.addEventListener('click', showTambahImpianModal);
    
    // Fungsi untuk memuat data dari Firebase
    function loadData() {
        // Load saldo
        onValue(ref(db, 'saldo'), (snapshot) => {
            saldo = snapshot.val() || 0;
            totalSaldoElement.textContent = formatRupiah(saldo);
            renderImpian();
        });
        
        // Load transaksi
        onValue(ref(db, 'transaksi'), (snapshot) => {
            transaksi = [];
            snapshot.forEach((childSnapshot) => {
                transaksi.push(childSnapshot.val());
            });
            renderTransaksi();
        });
        
        // Load impian
        onValue(ref(db, 'impian'), (snapshot) => {
            impian = [];
            snapshot.forEach((childSnapshot) => {
                impian.push(childSnapshot.val());
            });
            renderImpian();
        });
    }
    
    // Ekspos fungsi ke global scope untuk digunakan di event onclick
    window.hideModal = hideModal;
    window.showTambahTransaksiModal = showTambahTransaksiModal;
    window.capaiImpian = capaiImpian;
    window.hapusImpian = hapusImpian;
    window.showDetailImpian = function(impianId) {
        const impianData = impian.find(i => i.id === parseInt(impianId));
        if (impianData) {
            showDetailImpianModal(impianData);
        }
    };
    
    // Mulai aplikasi
    switchTab('transaksi');
    updateFilter('semua');
    loadData();
    
    // Register Service Worker untuk PWA
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js').then(registration => {
                console.log('ServiceWorker registration successful');
            }).catch(err => {
                console.log('ServiceWorker registration failed: ', err);
            });
        });
    }
});
