window.addEventListener("scroll", () => {
  const header = document.getElementById("header");
  if (!header) return;
  header.style.boxShadow =
    window.scrollY > 6 ? "0 8px 18px rgba(0,0,0,.12)" : "var(--shadow-sm)";
});

// Mobile drawer (hamburger)
(function(){
  function initDrawer(){
    const btn    = document.querySelector('.mobile-menu-btn');
    const drawer = document.querySelector('.drawer');
    if(!btn || !drawer) return;

    // Buat backdrop jika belum ada
    let backdrop = document.querySelector('.drawer-backdrop');
    if(!backdrop){
      backdrop = document.createElement('div');
      backdrop.className = 'drawer-backdrop';
      document.body.appendChild(backdrop);
    }

    const open = () => {
      drawer.classList.add('open');
      backdrop.classList.add('show');
      document.body.classList.add('no-scroll');
    };
    const close = () => {
      drawer.classList.remove('open');
      backdrop.classList.remove('show');
      document.body.classList.remove('no-scroll');
    };
    const toggle = () => drawer.classList.contains('open') ? close() : open();

    btn.addEventListener('click', toggle);
    backdrop.addEventListener('click', close);
    drawer.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initDrawer);
  else initDrawer();
})();

(function () {
  function readFromHtml(hero) {
    const imgs = hero.querySelectorAll("img.hero-item");
    if (!imgs.length) return null;
    return [...imgs].map(img => ({
      img: img.getAttribute("src") || "",
      title: img.dataset.title || img.getAttribute("alt") || "",
      year: img.dataset.year || ""
    }));
  }

  function readFromJson(hero) {
    const el = hero.querySelector("script.hero-data[type='application/json']");
    if (!el) return null;
    try { return JSON.parse(el.textContent.trim()); }
    catch (e) { console.error("Hero JSON invalid", e); return null; }
  }

  function initHero(hero, data, intervalMs) {
    if (!Array.isArray(data) || data.length === 0) return;

    hero.innerHTML = "";
    if (getComputedStyle(hero).position === "static") hero.style.position = "relative";

    const slides = data.map((s, i) => {
      const slide = document.createElement("div");
      slide.className = "slide" + (i === 0 ? " active" : "");
      slide.style.backgroundImage = `url("${encodeURI(s.img)}")`;
      hero.appendChild(slide);
      return slide;
    });

    const overlay = document.createElement("div");
    overlay.className = "hero-overlay";
    hero.appendChild(overlay);

    const caption = document.createElement("div");
    caption.className = "hero-caption";
    caption.innerHTML = `<h2>${data[0].title || ""}</h2><div class="year">${data[0].year || ""}</div>`;
    hero.appendChild(caption);

    const nav = document.createElement("div");
    nav.className = "hero-nav";
    nav.innerHTML = `
      <button class="hero-btn" data-dir="-1" aria-label="Previous">‹</button>
      <button class="hero-btn" data-dir="1" aria-label="Next">›</button>
    `;
    Object.assign(nav.style, {
      position: "absolute",
      inset: "0",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 10px",
      height: "100%",
      pointerEvents: "none"
    });
    nav.querySelectorAll("button").forEach(b => b.style.pointerEvents = "auto");
    hero.appendChild(nav);

    // State per hero
    let idx = 0, timer = null;
    const show = (i) => {
      idx = (i + data.length) % data.length;
      slides.forEach((s, j) => s.classList.toggle("active", j === idx));
      caption.innerHTML = `<h2>${data[idx].title || ""}</h2><div class="year">${data[idx].year || ""}</div>`;
    };
    const next = (d = 1) => show(idx + d);
    const start = () => { stop(); timer = setInterval(() => next(1), intervalMs); };
    const stop  = () => { if (timer) { clearInterval(timer); timer = null; } };

    nav.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      const dir = Number(btn.dataset.dir || 0);
      if (!dir) return;
      stop(); next(dir); start();
    });

    hero.addEventListener("mouseenter", stop);
    hero.addEventListener("mouseleave", start);
    start();
  }

  // Init semua .hero (ambil dari HTML dulu; kalau kosong, coba JSON)
  document.querySelectorAll(".hero").forEach((hero) => {
    const intervalMs = Number(hero.getAttribute("data-interval")) || 5000;
    const data = readFromHtml(hero) || readFromJson(hero) || [];
    if (data.length) initHero(hero, data, intervalMs);
  });
})();


// --- Simple search (enter -> buka halaman terkait) ---
// --- Search dengan suggestions (filter realtime + keyboard) ---
(function () {
  const input = document.querySelector('.search-input');
  if (!input) return;

  // Data yang muncul di suggestion (boleh kamu tambah produk/halaman lain)
  const items = [
    { title: 'Tentang Perusahaan',    url: 'story.html',     subtitle: 'Profil, visi-misi & dokumen',  icon: '📘', tags: 'story sejarah visi misi profil dokumen perusahaan' },
    { title: 'Dokumen Perusahaan',    url: 'story.html',     subtitle: 'dokumen',  icon: '📘', tags: 'dokumen perusahaan' },
    { title: 'Tentang Produk', url: 'products.html',  subtitle: 'Daftar produk & solusi',       icon: '🧩', tags: 'produk product solusi radio gateway cctv mep seragam' },
    { title: 'Kontruksi', url: 'products.html',  subtitle: 'Daftar Kontruksi',       icon: '🧩', tags: 'kontruksi serta pembangunan' },
    { title: 'Pengalaman',   url: 'experience.html',subtitle: 'Track record proyek',           icon: '🏗️', tags: 'project pengalaman rekam jejak portofolio' },
  ];

  // Buat container dropdown di bawah input
  const wrap = input.closest('.search-wrap');
  const box  = document.createElement('div');
  box.className = 'suggest';
  wrap.appendChild(box);

  let selIndex = -1;       // index item yang di-highlight pakai panah
  let lastList = [];

  const wordStartsWith = (text, q) =>
  text.toLowerCase().split(/\s+/).some(w => w.startsWith(q.toLowerCase()));

  const filter = (q) => {
    q = (q || '').trim().toLowerCase();
    if (!q) return [];                   
    return items
      .filter(it => wordStartsWith(it.title, q))
      .slice(0, 6);
  };
  const render = (list) => {
    if (!list.length) {
      box.classList.remove('show');
      box.innerHTML = '';
      selIndex = -1;
      return;
    }
    box.innerHTML = list.map((it, i) => `
      <a href="${it.url}" data-i="${i}">
        <span class="sg-icon">${it.icon || '🔎'}</span>
        <div class="sg-text">
          <div class="sg-title">${it.title}</div>
          ${it.subtitle ? `<small>${it.subtitle}</small>` : ''}
        </div>
      </a>
    `).join('');
    box.classList.add('show');
    selIndex = -1;
  };

  // Ketik -> filter
  input.addEventListener('input', () => {
    lastList = filter(input.value);
    render(lastList);
  });

  // Navigasi keyboard
  input.addEventListener('keydown', (e) => {
    const links = box.querySelectorAll('a');
    if (e.key === 'ArrowDown') {
      if (!box.classList.contains('show')) { lastList = filter(input.value); render(lastList); }
      if (!links.length) return;
      selIndex = (selIndex + 1) % links.length;
      links.forEach((el, i) => el.classList.toggle('active', i === selIndex));
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      if (!links.length) return;
      selIndex = (selIndex - 1 + links.length) % links.length;
      links.forEach((el, i) => el.classList.toggle('active', i === selIndex));
      e.preventDefault();
    } else if (e.key === 'Enter') {
      if (selIndex >= 0 && links[selIndex]) {
        window.location.href = links[selIndex].getAttribute('href');
      } else {
        // fallback: perilaku lama (Enter tanpa pilih)
        const q = input.value.trim().toLowerCase();
        const hit = items.find(it => (it.title + ' ' + it.tags).toLowerCase().includes(q));
        window.location.href = hit ? hit.url : 'products.html';
      }
    } else if (e.key === 'Escape') {
      box.classList.remove('show');
    }
  });

  // Klik mouse
  box.addEventListener('mousedown', (e) => {
    const a = e.target.closest('a');
    if (!a) return;
    // mousedown supaya tidak tertutup blur lebih dulu
    window.location.href = a.getAttribute('href');
  });

  // Tutup saat blur (beri delay kecil biar klik sempat terbaca)
  input.addEventListener('blur', () => setTimeout(() => box.classList.remove('show'), 120));
})();

// ====== EXPERIENCE (tabel saja; versi kartu/mobile dihapus) ======

// Vision/Mission tabs (kalau dipakai di halaman lain)
function switchTab(tab) {
  document
    .querySelectorAll(".vm-tab")
    .forEach((t) => t.classList.remove("active"));
  document
    .querySelectorAll(".vm-panel")
    .forEach((p) => p.classList.remove("active"));
  const target = document.getElementById(tab);
  if (target) target.classList.add("active");
}

// ---- Data pengalaman (penuh) ----
const experienceData = [
  {
    no: 1,
    namaProyek: "Pengadaan Peralatan Ship Power Plant Simulator",
    ringkasanLingkup: "Pengadaan Peralatan Simulator Tangerang",
    lokasi: "Tangerang",
    pemberiTugas: {
      nama: "Balai Pendidikan dan Pelatihan Ilmu Pelayaran Tangerang",
      alamat:
        "Jl. Raya Karang Serang No. 1 Kotak, Kec. Sukadiri, Kab. Tangerang, 15530",
    },
    kontrak: {
      nomor: "KU.003/5/23/BP2IP.Tng-2013",
      tanggal: "tanggal 25 Maret 2013",
    },
    tanggalSelesai: {
      kontrak: "25 Maret 2013",
      baSerahTerima: "29 November 2013",
    },
  },
  {
    no: 2,
    namaProyek: "Pembangunan VTS Banjarmasin",
    ringkasanLingkup: "Pengadaan Barang dan Jasa Telekomunikasi Navigasi",
    lokasi: "Banjarmasin",
    pemberiTugas: {
      nama: "Distrik Navigasi Kelas II Banjarmasin",
      alamat: "Jl. Barito Hilir Pelabuhan Trisakti Banjarmasin 70119",
    },
    kontrak: {
      nomor: "PL.106/2/13/DNG.BJM-13",
      tanggal: "tanggal 23 April 2013",
    },
    tanggalSelesai: {
      kontrak: "23 April 2013",
      baSerahTerima: "18 November 2013",
    },
  },
  {
    no: 3,
    namaProyek: "Pengadaan GMDSS SROP Tg. Balai Asahan",
    ringkasanLingkup: "Pengadaan Barang dan Jasa Telekomunikasi Navigasi",
    lokasi: "Belawan",
    pemberiTugas: {
      nama: "Distrik Navigasi Kelas I Belawan",
      alamat: "Jl. Suar No. 2 Ujung Baru, Belawan 20411 - Sumatera Utara",
    },
    kontrak: {
      nomor: "PL.306/1/11/DNG.BLW-2014",
      tanggal: "tanggal 4 Maret 2014",
    },
    tanggalSelesai: {
      kontrak: "04 Maret 2014",
      baSerahTerima: "31 Agustus 2014",
    },
  },
  {
    no: 4,
    namaProyek:
      "Pengadaan dan Pemasangan Alat Komunikasi di Mensu Tg. Losoni, TG. Watutembatu, Wangi-Wangi, Tg. Pemali dan Talaga Besar",
    ringkasanLingkup: "Pengadaan Barang dan Jasa Telekomunikasi Navigasi",
    lokasi: "Kendari",
    pemberiTugas: {
      nama: "Distrik Navigasi Kelas III Kendari",
      alamat: "Jl. Mutiara Kassilampe Kendari 93127",
    },
    kontrak: {
      nomor: "PL.108/01/19/DNG.KDI-14",
      tanggal: "tanggal 3 April 2014",
    },
    tanggalSelesai: {
      kontrak: "03 April 2014",
      baSerahTerima: "24 September 2014",
    },
  },
  {
    no: 5,
    namaProyek: "Pengadaan Peralatan Laboratorium Rapid Prototyping",
    ringkasanLingkup: "Pengadaan Barang dan Jasa Laboratorium Komputer",
    lokasi: "Bendung",
    pemberiTugas: {
      nama: "Politeknik Manufaktur Negeri Bandung",
      alamat: "Jl. Kanayakan 21 - Dago Bandung 40135",
    },
    kontrak: {
      nomor: "03/KONTRAK/LELANGPEDP/DIPA/POLAMAN/10.2014",
      tanggal: "tanggal 3 Oktober 2014",
    },
    tanggalSelesai: {
      kontrak: "03 Oktober 2014",
      baSerahTerima: "03 Desember 2014",
    },
  },
  {
    no: 6,
    namaProyek:
      "Pengadaan Sistem Pengujian Komputensi Pelaut Menggunakan Engine Room Simulator",
    ringkasanLingkup: "Pengadaan Peralatan Simulator",
    lokasi: "Jakarta",
    pemberiTugas: {
      nama: "Satuan Kerja Peningkatan Fungsi Perkapalan dan Kepelautan Pusat",
      alamat: "Gedung Karya Lt 12, Jl Medan Merdeka Barat No 8, Jakarta",
    },
    kontrak: {
      nomor: "SP.60/DKP/PFKP/X-15",
      tanggal: "tanggal 22 Oktober 2015",
    },
    tanggalSelesai: {
      kontrak: "22 Oktober 2015",
      baSerahTerima: "16 Desember 2015",
    },
  },
  {
    no: 7,
    namaProyek: "Pengadaan GMDSS KN. Antares",
    ringkasanLingkup: "Pengadaan Barang dan Jasa Telekomunikasi Navigasi",
    lokasi: "Sabang",
    pemberiTugas: {
      nama: "Distrik Navigasi Kelas II Sabang",
      alamat: "Jln. Malahayati Sabang 23513",
    },
    kontrak: {
      nomor: "PL.106/3/15/DNG.SAB-15",
      tanggal: "tanggal 26 Maret 2015",
    },
    tanggalSelesai: {
      kontrak: "26 Maret 2015",
      baSerahTerima: "21 September 2015",
    },
  },
  {
    no: 8,
    namaProyek:
      "Pengadaan ECDIS Simulator & Real ECDIS Trainee pada Balai Pendidikan dan Pelatihan Pelayaran Minahasa Selatan Tahun Anggaran 2017",
    ringkasanLingkup: "Pengadaan Peralatan Simulato",
    lokasi: "Minahasa selatan",
    pemberiTugas: {
      nama: "Balai Pendidikan dan Pelatihan Pelayaran Minahasa Selatan",
      alamat: "Jl. Trans Sulawesi Km.80 Tawang Timur, Tenga, Minahasa Selatan",
    },
    kontrak: {
      nomor: "004/KONT.LU/III/BDP.MINSEL17",
      tanggal: "tanggal 8 Maret 2017",
    },
    tanggalSelesai: {
      kontrak: "08 Maret 2017",
      baSerahTerima: "3 September 2017",
    },
  },
  {
    no: 9,
    namaProyek:
      "Pengadaan Radar Arpa Simulator pada Balai Pendidikan dan Pelatihan Pelayaran Minahasa Selatan Tahun Anggaran 2017",
    ringkasanLingkup: "Pengadaan Peralatan Simulator",
    lokasi: "Minahasa Selatan",
    pemberiTugas: {
      nama: "Balai Pendidikan dan Pelatihan Pelayaran Minahasa Selatan",
      alamat: "Jl. Trans Sulawesi Km.80 Tawang Timur, Tenga, Minahasa Selatan",
    },
    kontrak: {
      nomor: "005/KONT.LU/III/BDP.MINSEL17",
      tanggal: "tanggal 8 Maret 2017",
    },
    tanggalSelesai: {
      kontrak: "08 Maret 2017",
      baSerahTerima: "3 September 2017",
    },
  },
  {
    no: 10,
    namaProyek: "GMDSS KN. Altair",
    ringkasanLingkup: "Pengadaan alat pengukuran dan Navigasi",
    lokasi: "Banjarmasin",
    pemberiTugas: {
      nama: "Distrik Navigasi Kelas II Banjarmasin",
      alamat: "Jl. Barito Hilir Pelabuhan 1 trisakti Banjarmasin",
    },
    kontrak: {
      nomor: "PL. 106/5/10/DNG.BJM-18",
      tanggal: "tanggal 30 April 2018",
    },
    tanggalSelesai: {
      kontrak: "30 April 2018",
      baSerahTerima: "25 November 2018",
    },
  },
  {
    no: 11,
    namaProyek: "Pengadaan Peralatan BST Tahun 2018",
    ringkasanLingkup:
      "Pengadaan Alat Latihan Telekomunikasi termasuk Radar Transponder",
    lokasi: "Mempawah",
    pemberiTugas: {
      nama: "Balai Pendidikan Dan Pelatihan Transportasi Darat Mempawah",
      alamat: "Jl. Daeng Menambon Kec. Mempawah Timur",
    },
    kontrak: {
      nomor: "SPP.14/IV/BST/BPPTD MPW18",
      tanggal: "tanggal 16 April 2018",
    },
    tanggalSelesai: {
      kontrak: "16 April 2018",
      baSerahTerima: "12 Oktober 2018",
    },
  },
  {
    no: 12,
    namaProyek: "Pemeliharaan Radar Cuaca EEC",
    ringkasanLingkup: "Pengadaan Alat Transmisi dan Telekomunikasi Jarak Jauh",
    lokasi: "18 Lokasi",
    pemberiTugas: {
      nama: "BMKG",
      alamat: "Jl. Angkasa II No.1 Jakarta Pusat",
    },
    kontrak: {
      nomor: "PS.25/PEEC/PPKPI/DI/VII/BMKG/2019",
      tanggal: "tanggal 29 Juli 2019",
    },
    tanggalSelesai: {
      kontrak: "29 Juli 2019",
      baSerahTerima: "29 Juli 2019",
    },
  },
  {
    no: 13,
    namaProyek: "Pengadaan Suku Cadang Radar EEC",
    ringkasanLingkup: "Pengadaan Alat Transmisi dan Telekomunikasi Jarak Jauh",
    lokasi: "Jakarta",
    pemberiTugas: {
      nama: "BMKG",
      alamat: "Jl. Angkasa II No.1 Jakarta Pusat",
    },
    kontrak: {
      nomor: "PS.32/SCEEC/PPKPI/DI/VIII/BMKG/2019",
      tanggal: "tanggal 22 Agustus 2019",
    },
    tanggalSelesai: {
      kontrak: "22 Agustus 2019",
      baSerahTerima: "22 Agustus 2019",
    },
  },
  {
    no: 14,
    namaProyek: "Pengadaan Alat Laboratorium Teknik 2",
    ringkasanLingkup: "Pengadaan Alat Laboratorium Teknik",
    lokasi: "Lampung",
    pemberiTugas: {
      nama: "Institut Teknologi Sumatera",
      alamat: "Jl. Terusan Ryacudu, desa Way Hui, Jati agung, Lampung Selatan",
    },
    kontrak: {
      nomor: "1312/IT9.PPK/BR/SP-AD/2019",
      tanggal: "",
    },
    tanggalSelesai: {
      kontrak: "18 Oktober 2019",
      baSerahTerima: "18 Oktober 2019",
    },
  },
  {
    no: 15,
    namaProyek: "Pengadaan Integrasi Sistem Komunikasi Multiplatform Kapal",
    ringkasanLingkup: "Telekomunikasi, Navigas",
    lokasi: "Jakarta",
    pemberiTugas: {
      nama: "Korps Kepolisian Perairan dan Udara",
      alamat: "Jl. RE. Maradhata I/1 Tanjung Priok Jakarta Utara",
    },
    kontrak: {
      nomor: "SPPB/106/IX/2020/PPK/Kapolairud",
      tanggal: "tanggal 8 Oktober 2020",
    },
    tanggalSelesai: {
      kontrak: "08 Oktober 2020",
      baSerahTerima: "03 Desember 2020",
    },
  },
  {
    no: 16,
    namaProyek:
      "Pekerjaan Pengadaan dan Pemasangan Sensor AIS Base Station Pulau Jemur dan Sensor AIS Base Station VTS Dumai Tanjung Sair",
    ringkasanLingkup: "Telekomunikasi, Navigas",
    lokasi: "Dumai",
    pemberiTugas: {
      nama: "Distrik Navigasi Kelas I Dumai",
      alamat: "Jl. Datuk Laksamana No. Dumai 28814",
    },
    kontrak: {
      nomor: "PL.107/2/13/DNG.Dmi-2021",
      tanggal: "tanggal 27 Januari 2021",
    },
    tanggalSelesai: {
      kontrak: "27 Januari 2021",
      baSerahTerima: "24 Agustus 2021",
    },
  },
  {
    no: 17,
    namaProyek: "Pekerjaan Pengadaan Real Equipment GMDSS Simulator",
    ringkasanLingkup: "Pengadaan Peralatan Simulator",
    lokasi: "Sorong",
    pemberiTugas: {
      nama: "Politeknik Pelayaran Sorong",
      alamat: "Jl. Tanjung Saoka No. 1 Sorong - Papua Barat",
    },
    kontrak: {
      nomor: "KU.003/5/7 POLTEKPEL.SRG2021",
      tanggal: "tanggal 9 Februari 2021",
    },
    tanggalSelesai: {
      kontrak: "09 Februari 2021",
      baSerahTerima: "07 Agustus 2021",
    },
  },
  {
    no: 18,
    namaProyek:
      "Pengadaan Integrasi Sistem Komunikasi Multiplatform Kapal Sumber Pembiayaan APBN T.A 2021",
    ringkasanLingkup: "Telekomunikasi, Navigasi",
    lokasi: "Jakarta",
    pemberiTugas: {
      nama: "Korps Kepolisian Perairan dan Udara",
      alamat: "Jl. RE. Maradhata I/1 Tanjung Priok Jakarta Utara",
    },
    kontrak: {
      nomor: "SPPB/18/I/2021PPK/KORPOLAIRUD",
      tanggal: "tanggal 15 Januari 2021",
    },
    tanggalSelesai: {
      kontrak: "15 Januari 2021",
      baSerahTerima: "08 Juli 2021",
    },
  },
  {
    no: 19,
    namaProyek:
      "Pengadaan Sistem Komunikasi Secure Multiplatform Sumber Anggaran APBN T.A 2021",
    ringkasanLingkup: "Telekomunikasi, Navigasi",
    lokasi: "Jakarta",
    pemberiTugas: {
      nama: "Korps Kepolisian Perairan dan Udara",
      alamat: "Jl. RE. Maradhata I/1 Tanjung Priok Jakarta Utara",
    },
    kontrak: {
      nomor: "SPPB/10/I/2024/PPK/KORPOLAIRUD",
      tanggal: "tanggal 3 Januari 2024",
    },
    tanggalSelesai: {
      kontrak: "03 Januari 2024",
      baSerahTerima: "31 Desember 2024",
    },
  },
];

let currentPage = 1,
  currentPageGroup = 1;
const pagesPerGroup = 3,
  totalPages = experienceData.length;

function renderTable() {
  const tbody = document.getElementById("table-body");
  if (!tbody) return;
  const d = experienceData[currentPage - 1];
  tbody.innerHTML = `
    <tr>
      <td class="center-align">${d.no}</td>
      <td>${d.namaProyek}</td>
      <td>${d.ringkasanLingkup}</td>
      <td>${d.lokasi}</td>
      <td>${d.pemberiTugas.nama}</td>
      <td>${d.pemberiTugas.alamat}</td>
      <td>${d.kontrak.nomor} ${d.kontrak.tanggal}</td>
      <td>${d.tanggalSelesai.kontrak}</td>
      <td>${d.tanggalSelesai.baSerahTerima}</td>
    </tr>
  `;
}

// HANYA pagination utama (mobile pagination & kartu DIHAPUS)
function renderPagination() {
  const pg = document.getElementById("pagination");
  if (!pg) return;

  const start = (currentPageGroup - 1) * pagesPerGroup + 1;
  const end = Math.min(start + pagesPerGroup - 1, totalPages);
  const maxGroup = Math.ceil(totalPages / pagesPerGroup);

  let html = `<button onclick="prevPageGroup()" ${
    currentPageGroup === 1 ? "disabled" : ""
  }>‹ Prev</button>`;
  for (let i = start; i <= end; i++) {
    html += `<button onclick="changePage(${i})" ${
      i === currentPage ? 'class="active"' : ""
    }>${i}</button>`;
  }
  html += `<button onclick="nextPageGroup()" ${
    currentPageGroup === maxGroup ? "disabled" : ""
  }>Next ›</button>`;

  pg.innerHTML = html;

  const ci = document.getElementById("current-info");
  if (ci) ci.textContent = `Halaman ${currentPage} dari ${totalPages}`;
}

function changePage(p) {
  if (p < 1 || p > totalPages) return;
  currentPage = p;
  currentPageGroup = Math.ceil(p / pagesPerGroup);
  renderTable();
  renderPagination();
}
function nextPageGroup() {
  const maxGroup = Math.ceil(totalPages / pagesPerGroup);
  if (currentPageGroup < maxGroup) {
    currentPageGroup++;
    currentPage = (currentPageGroup - 1) * pagesPerGroup + 1;
    renderTable();
    renderPagination();
  }
}
function prevPageGroup() {
  if (currentPageGroup > 1) {
    currentPageGroup--;
    currentPage = (currentPageGroup - 1) * pagesPerGroup + 1;
    renderTable();
    renderPagination();
  }
}

function initializePage() {
  renderTable();
  renderPagination();
}
document.addEventListener("DOMContentLoaded", initializePage);

// ---- Modal dokumen (tetap) ----
let currentSlideIndex = 0;
function openDocumentModal(title, description, images = []) {
  const modal = document.getElementById("modal");
  if (!modal) return;
  document.getElementById("modal-title").textContent = title;
  const cont = document.getElementById("slides-container");
  cont.innerHTML = "";
  Object.assign(cont.style, {
    display: "flex",
    width: "100%",
    height: "auto",
    transition: "transform .35s ease",
    willChange: "transform",
    gap: "0",
  });

  images.forEach((src) => {
    const d = document.createElement("div");
    d.className = "doc-slide";
    Object.assign(d.style, {
      flex: "0 0 100%",
      maxWidth: "100%",
    });
    d.innerHTML = `<img src="${src}" style="display:block;width:100%;max-height:70vh;height:auto;object-fit:contain" alt="${title}">`;
    cont.appendChild(d);
  });
  currentSlideIndex = 0;
  updateSlide();
  modal.classList.add("active");
  document.body.style.overflow = "hidden";

  const btns = modal.querySelectorAll('.modal-slider .hero-btn');
  btns.forEach(b => b.style.display = images.length > 1 ? 'grid' : 'none');

  const onKey = (e) => {
    if (!modal.classList.contains('active')) return;
    if (e.key === 'Escape') { closeModal(); }
    else if (e.key === 'ArrowLeft') { changeSlide(-1); }
    else if (e.key === 'ArrowRight') { changeSlide(1); }
  };
  modal._keyHandler = onKey;
  document.addEventListener('keydown', onKey);
}
function changeSlide(dir) {
  const slides = document.querySelectorAll("#slides-container .doc-slide");
  if (slides.length === 0) return;
  currentSlideIndex = (currentSlideIndex + dir + slides.length) % slides.length;
  updateSlide();
}
function updateSlide() {
  const cont = document.getElementById("slides-container");
  if (cont) cont.style.transform = `translateX(-${currentSlideIndex * 100}%)`;
}
function closeModal() {
  const modal = document.getElementById("modal");
  if (modal) {
    modal.classList.remove("active");
    document.body.style.overflow = "auto";
    if (modal._keyHandler) {
      document.removeEventListener('keydown', modal._keyHandler);
      modal._keyHandler = null;
    }
  }
}
// ===== Mobile FAB (Quick Actions) =====
(function(){
  const fab = document.getElementById('fab');
  const toggle = document.getElementById('fabToggle');
  if(!fab || !toggle) return;

  const close = () => fab.classList.remove('open');
  const toggleOpen = (e) => { e.stopPropagation(); fab.classList.toggle('open'); };

  toggle.addEventListener('click', toggleOpen);
  document.addEventListener('click', (e) => { if(!fab.contains(e.target)) close(); }, {passive:true});
  window.addEventListener('scroll', close, {passive:true});
})();

// ===== Documents Carousel (horizontal, auto-scroll R->L, drag/swipe) =====
(function(){
  function initDocsCarousel(){
    const wrap = document.getElementById('docsCarousel');
    if(!wrap) return;

    let autoTimer = null; 
    let rafId = null;
    let isPaused = false;
    const SPEED_PX_PER_FRAME = 0.6; 
    const cardWidth = () => (wrap.querySelector('.document-card')?.getBoundingClientRect().width || 300) + 18; 

    const tick = () => {
      if (!isPaused) {
        wrap.scrollLeft += SPEED_PX_PER_FRAME; 
        if (wrap.scrollLeft + wrap.clientWidth + 1 >= wrap.scrollWidth) {
          wrap.scrollLeft = 0; 
        }
      }
      rafId = requestAnimationFrame(tick);
    };
    const startAuto = () => {
      stopAuto();
      rafId = requestAnimationFrame(tick);
    };
    const stopAuto = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
    };

    const container = wrap.parentElement;
    container?.querySelectorAll('[data-docs-dir]')?.forEach(btn => {
      btn.addEventListener('click', () => {
        const dir = Number(btn.getAttribute('data-docs-dir')||1);
        const step = cardWidth() * dir;
        isPaused = true; 
        wrap.scrollBy({left: step, behavior: 'smooth'});
        setTimeout(() => { isPaused = false; }, 600);
      });
    });

    let isDown=false, startX=0, scrollStart=0;
    const onDown = (e) => {
      isDown = true; startX = ('touches' in e ? e.touches[0].pageX : e.pageX); scrollStart = wrap.scrollLeft; isPaused = true;
    };
    const onMove = (e) => {
      if(!isDown) return; const x = ('touches' in e ? e.touches[0].pageX : e.pageX); const dx = x - startX; wrap.scrollLeft = scrollStart - dx; e.preventDefault();
    };
    const onUp = () => { isDown=false; setTimeout(() => { isPaused = false; }, 300); };
    wrap.addEventListener('mousedown', onDown);
    wrap.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    wrap.addEventListener('touchstart', onDown, {passive:true});
    wrap.addEventListener('touchmove', onMove, {passive:false});
    wrap.addEventListener('touchend', onUp);
    startAuto();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initDocsCarousel);
  else initDocsCarousel();
})();

// ===== Documents Carousel: auto-scroll R->L + loop + manual =====
(function(){
  function initDocsCarousel(){
    const list = document.getElementById('docsCarousel');
    if(!list || list._wbksInit) return;
    list._wbksInit = true;

    const items = Array.from(list.children);
    if(items.length){
      const clones = items.map(n => n.cloneNode(true));
      list.append(...clones);
    }

    let paused = false;
    const speed = 0.6;                
    const stepButtons = () => {
      const first = list.querySelector('.document-card');
      const gap = parseFloat(getComputedStyle(list).gap || '18') || 18;
      return (first ? first.getBoundingClientRect().width : 280) + gap;
    };

    let rafId = null;
    const halfWidth = () => list.scrollWidth / 2; 
    const tick = () => {
      if(!paused){
        list.scrollLeft += speed;
        if(list.scrollLeft >= halfWidth()){
          list.scrollLeft -= halfWidth();
        }
      }
      rafId = requestAnimationFrame(tick);
    };

    const container = list.closest('.docs-wrap') || list.parentElement;
    container?.querySelectorAll('[data-docs-dir]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const dir = Number(btn.getAttribute('data-docs-dir') || 1);
        const step = stepButtons();
        paused = true;
        list.scrollBy({ left: step * dir, behavior: 'smooth' });
        setTimeout(()=> paused = false, 420);
      });
    });

    let dragging = false, startX = 0, startLeft = 0;
    const onDown = (e)=>{
      dragging = true; paused = true;
      startX = e.clientX; startLeft = list.scrollLeft;
      list.setPointerCapture?.(e.pointerId);
    };
    const onMove = (e)=>{
      if(!dragging) return;
      const dx = e.clientX - startX;
      list.scrollLeft = startLeft - dx;
    };
    const onUp = ()=>{
      if(!dragging) return;
      dragging = false;
      setTimeout(()=> paused = false, 250);
    };
    list.addEventListener('pointerdown', onDown);
    list.addEventListener('pointermove', onMove);
    list.addEventListener('pointerup', onUp);
    list.addEventListener('pointercancel', onUp);
    list.addEventListener('pointerleave', onUp);

    list.addEventListener('mouseenter', ()=> paused = true);
    list.addEventListener('mouseleave', ()=> paused = false);

    document.addEventListener('visibilitychange', ()=>{
      paused = document.hidden ? true : false;
    });

    requestAnimationFrame(tick);

    let resizeTO = null;
    window.addEventListener('resize', ()=>{
      if(resizeTO) cancelAnimationFrame(resizeTO);
      resizeTO = requestAnimationFrame(()=> {
      });
    });
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initDocsCarousel);
  }else{
    initDocsCarousel();
  }
})();


  function switchTab(tab, btn){
    document.querySelectorAll('.vm-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.vm-panel').forEach(p => p.classList.remove('active'));

    const target = document.getElementById(tab);
    if (target) target.classList.add('active');
    if (btn) btn.classList.add('active');  
  }

// ===============================
// LIGHTBOX untuk grid MODELS
// ===============================
(function(){
  const grid = document.getElementById('modelsGrid');
  if(!grid) return;

  const lb = document.getElementById('pdLightbox');
  const lbImg = document.getElementById('lbImg');
  const lbClose = document.getElementById('lbClose');
  const lbPrev = document.getElementById('lbPrev');
  const lbNext = document.getElementById('lbNext');
  const lbCounter = document.getElementById('lbCounter');

  const items = Array.from(grid.querySelectorAll('.model-card'));
  let idx = 0;

  function open(i){
    idx = (i + items.length) % items.length;
    const href = items[idx].getAttribute('href');
    lbImg.src = href;
    lb.classList.add('show');
    lb.setAttribute('aria-hidden', 'false');
    updateCounter();
  }

  function close(){
    lb.classList.remove('show');
    lb.setAttribute('aria-hidden', 'true');
    lbImg.src = '';
  }

  function next(d=1){ open(idx + d); }
  function updateCounter(){ lbCounter.textContent = (idx+1) + '/' + items.length; }

  items.forEach((a, i) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      open(i);
    });
  });

  lbClose.addEventListener('click', close);
  lbPrev.addEventListener('click', () => next(-1));
  lbNext.addEventListener('click', () => next(1));

  lb.addEventListener('click', (e) => {
    if (e.target === lb) close();
  });

  window.addEventListener('keydown', (e) => {
    if (!lb.classList.contains('show')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') next(-1);
    if (e.key === 'ArrowRight') next(1);
  });
})();

// ===============================
// HERO SLIDER: Flat Pack Classic
// ===============================
(function(){
  const hero = document.getElementById('fpClassicHero');
  if(!hero) return;

  const track = hero.querySelector('.flatpack-classic-hero-track');
  const slides = Array.from(track.querySelectorAll('img'));
  const prev = hero.querySelector('.flatpack-classic-hero-nav.prev');
  const next = hero.querySelector('.flatpack-classic-hero-nav.next');
  let idx = 0;

  function go(i){
    idx = (i + slides.length) % slides.length;
    track.style.transform = 'translateX(' + (-idx * 100) + '%)';
  }
  prev.addEventListener('click', () => go(idx - 1));
  next.addEventListener('click', () => go(idx + 1));

  // swipe
  let startX = 0, dragging = false;
  hero.addEventListener('touchstart', e => {
    dragging = true; startX = e.touches[0].clientX;
    track.style.transition = 'none';
  }, {passive:true});

  hero.addEventListener('touchmove', e => {
    if(!dragging) return;
    const dx = e.touches[0].clientX - startX;
    track.style.transform = 'translateX(calc(' + (-idx*100) + '% + ' + dx + 'px))';
  }, {passive:true});

  hero.addEventListener('touchend', e => {
    track.style.transition = 'transform .35s ease';
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 40) go(idx + (dx < 0 ? 1 : -1)); else go(idx);
    dragging = false;
  });

  // keyboard
  window.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') go(idx - 1);
    if (e.key === 'ArrowRight') go(idx + 1);
  });
})();

// ===============================
// LIGHTBOX: Flat Pack Classic
// ===============================
(function(){
  const grid = document.getElementById('fpClassicModels');
  if(!grid) return;

  const lb = document.getElementById('fpClassicLightbox');
  const lbImg = document.getElementById('fpClassicLbImg');
  const lbClose = document.getElementById('fpClassicLbClose');
  const lbPrev = document.getElementById('fpClassicLbPrev');
  const lbNext = document.getElementById('fpClassicLbNext');
  const lbCounter = document.getElementById('fpClassicLbCounter');

  const items = Array.from(grid.querySelectorAll('.flatpack-classic-model'));
  let idx = 0;

  function open(i){
    idx = (i + items.length) % items.length;
    lbImg.src = items[idx].getAttribute('href');
    lb.classList.add('show');
    lb.setAttribute('aria-hidden', 'false');
    lbCounter.textContent = (idx+1) + '/' + items.length;
  }
  function close(){
    lb.classList.remove('show');
    lb.setAttribute('aria-hidden', 'true');
    lbImg.src = '';
  }
  function next(d=1){ open(idx + d); }

  items.forEach((a, i) => {
    a.addEventListener('click', e => { e.preventDefault(); open(i); });
  });
  lbClose.addEventListener('click', close);
  lbPrev.addEventListener('click', () => next(-1));
  lbNext.addEventListener('click', () => next(1));
  lb.addEventListener('click', e => { if (e.target === lb) close(); });

  window.addEventListener('keydown', e => {
    if (!lb.classList.contains('show')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') next(-1);
    if (e.key === 'ArrowRight') next(1);
  });
})();
// ===== Hero: auto aspect-ratio dari gambar aktif =====
(function(){
  const hero  = document.querySelector('.flatpack-classic-hero');
  const track = hero?.querySelector('.flatpack-classic-hero-track');
  if(!hero || !track) return;

  const slides = Array.from(track.querySelectorAll('img'));
  let index = 0; 

  function applyAspect(i){
    const img = slides[i];
    if(!img) return;
    const ar = (img.naturalWidth && img.naturalHeight)
      ? (img.naturalWidth / img.naturalHeight)
      : (img.width / Math.max(1,img.height));

    hero.style.setProperty('--hero-ar', ar);
    if(ar < 1) hero.classList.add('is-portrait');
    else hero.classList.remove('is-portrait');
  }

  slides.forEach(img=>{
    if(img.complete) return;
    img.addEventListener('load', ()=>applyAspect(index), {once:true});
  });

  applyAspect(index);

  const prevBtn = hero.querySelector('.flatpack-classic-hero-nav.prev');
  const nextBtn = hero.querySelector('.flatpack-classic-hero-nav.next');

  function go(to){
    index = (to + slides.length) % slides.length;
    track.style.transform = `translateX(-${index * 100}%)`;
    applyAspect(index);
  }

  prevBtn?.addEventListener('click', ()=>go(index-1));
  nextBtn?.addEventListener('click', ()=>go(index+1));

})();
  document.addEventListener('click', function (e) {
    const sum = e.target.closest('.acc-summary');
    if (!sum) return;
    const item = sum.parentElement;
    requestAnimationFrame(() => {
      if (item.open) {
        document.querySelectorAll('.acc-item[open]').forEach(d => {
          if (d !== item) d.removeAttribute('open');
        });
      }
    });
  });
