/**
 * BTÜ GEÇERKEN LAB - MODÜLER NAVBAR YÖNETİCİSİ (labsnavbar.js)
 */
window.LabsNavbar = {
  init: function() {
    const root = document.getElementById('lab-navbar-root');
    if (!root) return;

    // Aktif sayfayı yakala
    const currentPath = window.location.pathname;

    root.innerHTML = `
    <header class="custom-navbar lab-navbar-custom">
      <div class="nav-inner">
        <a href="index.html" class="nav-logo-wrap">
          <div class="nav-logo-circle">
            <i class="fa-solid fa-flask-vial"></i>
          </div>
          <div class="nav-logo-text">
            <span class="nav-univ">BTÜ GEÇERKEN</span>
            <div class="nav-logo-title-row">
              <span class="nav-comm">LAB<em>S</em></span>
              <span class="nav-beta-badge">BETA</span>
            </div>
          </div>
        </a>

        <nav id="main-nav" class="lab-nav-menu">
          <a href="index.html" class="nav-link ${currentPath.endsWith('index.html') || currentPath === '/' ? 'active' : ''}">
            <i class="fa-solid fa-shapes"></i>
            <span>Genel Bakış</span>
          </a>

          <!-- 1. PDF ARAÇLARI -->
          <div class="nav-dropdown-wrap">
            <span class="nav-link nav-dropdown-trigger">
              <i class="fa-solid fa-file-pdf"></i>
              <span>PDF Araçları</span>
              <i class="fa-solid fa-chevron-down chevron"></i>
            </span>
            <div class="nav-dropdown-menu">
              <a href="pdf-merge.html" class="nav-dropdown-item"><i class="fa-solid fa-object-group"></i> PDF Birleştirici</a>
              <a href="pdf-split.html" class="nav-dropdown-item"><i class="fa-solid fa-scissors"></i> PDF Sayfa Ayırıcı</a>
              <a href="img-to-pdf.html" class="nav-dropdown-item"><i class="fa-solid fa-images"></i> Görselden PDF Yap</a>
            </div>
          </div>

          <!-- 2. GÖRSEL & AI -->
          <div class="nav-dropdown-wrap">
            <span class="nav-link nav-dropdown-trigger">
              <i class="fa-solid fa-wand-magic-sparkles"></i>
              <span>Görsel &amp; AI</span>
              <i class="fa-solid fa-chevron-down chevron"></i>
            </span>
            <div class="nav-dropdown-menu">
              <a href="bg-remover.html" class="nav-dropdown-item"><i class="fa-solid fa-eraser"></i> AI Arka Plan Temizle</a>
              <a href="upscaler.html" class="nav-dropdown-item"><i class="fa-solid fa-maximize"></i> AI Upscaler</a>
              <a href="resizer.html" class="nav-dropdown-item"><i class="fa-solid fa-compress"></i> Akıllı Downscaler</a>
              <a href="batch-webp.html" class="nav-dropdown-item"><i class="fa-solid fa-bolt"></i> Toplu WebP Dönüştür</a>
              <a href="svg-opt.html" class="nav-dropdown-item"><i class="fa-solid fa-bezier-curve"></i> SVG Optimizer</a>
              <a href="ico-maker.html" class="nav-dropdown-item"><i class="fa-solid fa-icons"></i> ICO Paketi Oluşturucu</a>
            </div>
          </div>

          <!-- 3. MEDYA & DÖNÜŞÜM -->
          <div class="nav-dropdown-wrap">
            <span class="nav-link nav-dropdown-trigger">
              <i class="fa-solid fa-arrow-right-arrow-left"></i>
              <span>Medya &amp; Dönüşüm</span>
              <i class="fa-solid fa-chevron-down chevron"></i>
            </span>
            <div class="nav-dropdown-menu">
              <a href="converter.html" class="nav-dropdown-item"><i class="fa-solid fa-repeat"></i> Evrensel Dönüştürücü</a>
              <a href="downloader.html" class="nav-dropdown-item"><i class="fa-solid fa-cloud-arrow-down"></i> Medya İndirici</a>
            </div>
          </div>

          <!-- 4. PRATİK ARAÇLAR -->
          <div class="nav-dropdown-wrap">
            <span class="nav-link nav-dropdown-trigger">
              <i class="fa-solid fa-toolbox"></i>
              <span>Pratik Araçlar</span>
              <i class="fa-solid fa-chevron-down chevron"></i>
            </span>
            <div class="nav-dropdown-menu">
              <a href="qr-maker.html" class="nav-dropdown-item"><i class="fa-solid fa-qrcode"></i> QR Kod Oluşturucu</a>
              <a href="exif-cleaner.html" class="nav-dropdown-item"><i class="fa-solid fa-shield-halved"></i> EXIF &amp; Meta Temizle</a>
              <a href="bulk-rename.html" class="nav-dropdown-item"><i class="fa-solid fa-i-cursor"></i> Toplu Yeniden Adlandır</a>
            </div>
          </div>
        </nav>

        <button id="mobile-menu-btn" aria-label="Menüyü Aç/Kapat">
          <span></span><span></span><span></span>
        </button>
      </div>
    </header>
    `;

    this.bindEvents();
  },

  bindEvents: function() {
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const mainNav = document.getElementById('main-nav');
    if (mobileBtn && mainNav) {
      mobileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        mobileBtn.classList.toggle('open');
        mainNav.classList.toggle('open');
      });
      document.addEventListener('click', (e) => {
        if (!mainNav.contains(e.target) && !mobileBtn.contains(e.target)) {
          mobileBtn.classList.remove('open');
          mainNav.classList.remove('open');
        }
      });
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (window.LabsNavbar) window.LabsNavbar.init();
  if (window.LabsFooter) window.LabsFooter.init();
});