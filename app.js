import { db, ref, set, push, onValue, update, remove } from './firebase.js';

document.addEventListener('DOMContentLoaded', function() {
    // Elemen UI
    const totalSaldoElement = document.getElementById('total-saldo');
    const transaksiListElement = document.getElementById('transaksi-list');
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
                    <div class="text-center py-4">
                        <i class="fas fa-check-circle text-5xl text-green-500 mb-4"></i>
                        <h3 class="text-xl font-bold mb-2">Selamat!</h3>
                        <p class="mb-4">Impian "${impianData.nama}" telah tercapai!</p>
                        <button onclick="hideModal()" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg">
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
        const content = `
            <form id="form-transaksi" class="space-y-4">
                <div>
                    <label for="nominal" class="block text-gray-700 mb-2">Nominal (Rp)</label>
                    <input type="number" id="nominal" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Masukkan nominal" required>
                </div>
                <div>
                    <label for="keterangan" class="block text-gray-700 mb-2">Keterangan</label>
                    <input type="text" id="keterangan" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Contoh: Gaji Bulanan" required>
                </div>
                <div>
                    <label for="tanggal" class="block text-gray-700 mb-2">Tanggal</label>
                    <input type="datetime-local" id="tanggal" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value="${new Date().toISOString().slice(0, 16)}">
                </div>
                <button type="submit" class="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg transition-colors">
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
    
    // Fungsi untuk menampilkan modal tambah impian
    function showTambahImpianModal() {
        const title = 'Tambah Impian Baru';
        const content = `
            <form id="form-impian" class="space-y-4">
                <div>
                    <label for="nama-impian" class="block text-gray-700 mb-2">Nama Impian</label>
                    <input type="text" id="nama-impian" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Contoh: Liburan ke Bali" required>
                </div>
                <div>
                    <label for="target-impian" class="block text-gray-700 mb-2">Target Nominal (Rp)</label>
                    <input type="number" id="target-impian" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Masukkan target" required>
                </div>
                <div>
                    <label for="deskripsi-impian" class="block text-gray-700 mb-2">Deskripsi (Opsional)</label>
                    <textarea id="deskripsi-impian" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Tambahkan deskripsi impian Anda" rows="3"></textarea>
                </div>
                <button type="submit" class="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg transition-colors">
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
            <div class="space-y-4">
                <div class="text-center">
                    <p class="text-2xl font-bold ${bisaDicapai ? 'text-green-500' : 'text-blue-500'}">${formatRupiah(impianData.target)}</p>
                    <p class="text-sm text-gray-500">Target</p>
                </div>
                
                <div>
                    <div class="flex justify-between text-sm mb-1">
                        <span>Tersimpan: ${formatRupiah(saldo > impianData.target ? impianData.target : saldo)}</span>
                        <span>${bisaDicapai ? 'Tercapai!' : `Kurang ${formatRupiah(impianData.target - saldo)}`}</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2.5">
                        <div class="bg-blue-600 h-2.5 rounded-full" style="width: ${persentase}%"></div>
                    </div>
                </div>
                
                ${impianData.deskripsi ? `
                    <div>
                        <h4 class="font-medium text-gray-700 mb-1">Deskripsi</h4>
                        <p class="text-gray-600">${impianData.deskripsi}</p>
                    </div>
                ` : ''}
                
                <div class="grid grid-cols-2 gap-2 pt-4">
                    ${bisaDicapai ? `
                        <button onclick="window.capaiImpian(${impianData.id})" class="bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg transition-colors">
                            Capai Impian
                        </button>
                    ` : ''}
                    <button onclick="window.hapusImpian(${impianData.id})" class="bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg transition-colors">
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
            transaksiListElement.innerHTML = '<p class="text-gray-500 text-center py-4">Belum ada transaksi</p>';
            return;
        }
        
        // Filter transaksi berdasarkan jenis
        let filteredTransaksi = transaksi;
        if (currentFilter === 'pemasukan') {
            filteredTransaksi = transaksi.filter(t => t.jenis === 'pemasukan');
        } else if (currentFilter === 'pengeluaran') {
            filteredTransaksi = transaksi.filter(t => t.jenis === 'pengeluaran');
        }
        
        // Urutkan transaksi terbaru pertama
        const sortedTransaksi = [...filteredTransaksi].sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
        
        // Batasi jumlah transaksi yang ditampilkan jika tidak menampilkan semua
        const transaksiToShow = showAllTransactions ? sortedTransaksi : sortedTransaksi.slice(0, 5);
        
        transaksiListElement.innerHTML = transaksiToShow.map(t => `
            <div class="flex justify-between items-center p-3 border-b hover:bg-gray-50 transition-colors">
                <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 rounded-full flex items-center justify-center ${t.jenis === 'pemasukan' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}">
                        <i class="fas ${t.jenis === 'pemasukan' ? 'fa-arrow-down' : 'fa-arrow-up'}"></i>
                    </div>
                    <div>
                        <p class="font-medium">${t.keterangan}</p>
                        <p class="text-xs text-gray-500">${formatTanggal(t.tanggal)}</p>
                    </div>
                </div>
                <p class="${t.jenis === 'pemasukan' ? 'text-green-600' : 'text-red-600'} font-semibold">
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
            impianListElement.innerHTML = '<p class="text-gray-500 col-span-full text-center py-4">Belum ada impian</p>';
            return;
        }
        
        // Filter hanya impian yang belum tercapai
        const impianAktif = impian.filter(i => !i.tercapai);
        
        if (impianAktif.length === 0) {
            impianListElement.innerHTML = '<p class="text-gray-500 col-span-full text-center py-4">Tidak ada impian aktif</p>';
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
                <div class="border rounded-xl p-4 ${bisaDicapai ? 'border-green-500 bg-green-50' : 'border-gray-200'} hover:shadow-md transition-shadow cursor-pointer" onclick="window.showDetailImpian(${i.id})">
                    <div class="flex justify-between items-start mb-2">
                        <h3 class="font-semibold text-gray-800">${i.nama}</h3>
                        <span class="text-sm ${bisaDicapai ? 'text-green-600' : 'text-gray-600'}">
                            ${formatRupiah(i.target)}
                        </span>
                    </div>
                    
                    <div class="w-full bg-gray-200 rounded-full h-2.5 mb-3">
                        <div class="bg-blue-600 h-2.5 rounded-full" style="width: ${persentase}%"></div>
                    </div>
                    
                    <div class="flex justify-between items-center text-sm">
                        <span class="text-gray-600">Tersimpan: ${formatRupiah(saldo > i.target ? i.target : saldo)}</span>
                        <span class="${bisaDicapai ? 'text-green-600 font-medium' : 'text-gray-500'}">
                            ${bisaDicapai ? 'Tercapai!' : `${Math.round(persentase)}%`}
                        </span>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // Fungsi untuk beralih antara tab
    function switchTab(tab) {
        if (tab === 'transaksi') {
            tabTransaksi.classList.add('text-blue-600', 'border-blue-600');
            tabTransaksi.classList.remove('text-gray-500', 'border-transparent');
            tabImpian.classList.add('text-gray-500', 'border-transparent');
            tabImpian.classList.remove('text-blue-600', 'border-blue-600');
            
            mobileTabTransaksi.classList.add('text-blue-600');
            mobileTabTransaksi.classList.remove('text-gray-500');
            mobileTabImpian.classList.add('text-gray-500');
            mobileTabImpian.classList.remove('text-blue-600');
            
            transaksiSection.classList.remove('hidden');
            impianSection.classList.add('hidden');
        } else {
            tabImpian.classList.add('text-blue-600', 'border-blue-600');
            tabImpian.classList.remove('text-gray-500', 'border-transparent');
            tabTransaksi.classList.add('text-gray-500', 'border-transparent');
            tabTransaksi.classList.remove('text-blue-600', 'border-blue-600');
            
            mobileTabImpian.classList.add('text-blue-600');
            mobileTabImpian.classList.remove('text-gray-500');
            mobileTabTransaksi.classList.add('text-gray-500');
            mobileTabTransaksi.classList.remove('text-blue-600');
            
            impianSection.classList.remove('hidden');
            transaksiSection.classList.add('hidden');
        }
    }
    
    // Fungsi untuk mengupdate filter transaksi
    function updateFilter(filter) {
        currentFilter = filter;
        
        // Update tombol filter
        btnFilterSemua.classList.remove('bg-blue-100', 'text-blue-600');
        btnFilterPemasukan.classList.remove('bg-blue-100', 'text-blue-600');
        btnFilterPengeluaran.classList.remove('bg-blue-100', 'text-blue-600');
        
        btnFilterSemua.classList.add('bg-gray-100', 'text-gray-600');
        btnFilterPemasukan.classList.add('bg-gray-100', 'text-gray-600');
        btnFilterPengeluaran.classList.add('bg-gray-100', 'text-gray-600');
        
        if (filter === 'semua') {
            btnFilterSemua.classList.add('bg-blue-100', 'text-blue-600');
            btnFilterSemua.classList.remove('bg-gray-100', 'text-gray-600');
        } else if (filter === 'pemasukan') {
            btnFilterPemasukan.classList.add('bg-blue-100', 'text-blue-600');
            btnFilterPemasukan.classList.remove('bg-gray-100', 'text-gray-600');
        } else if (filter === 'pengeluaran') {
            btnFilterPengeluaran.classList.add('bg-blue-100', 'text-blue-600');
            btnFilterPengeluaran.classList.remove('bg-gray-100', 'text-gray-600');
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
                <div class="space-y-3">
                    <button onclick="showTambahTransaksiModal('pemasukan')" class="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg flex items-center justify-center">
                        <i class="fas fa-plus mr-2"></i> Pemasukan
                    </button>
                    <button onclick="showTambahTransaksiModal('pengeluaran')" class="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg flex items-center justify-center">
                        <i class="fas fa-minus mr-2"></i> Pengeluaran
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