# BTÜ Geçerken Lab

Bursa Teknik Üniversitesi (BTÜ) Geçerken Topluluğu bünyesinde geliştirilen bağımsız, yüksek performanslı ve hibrit mimarili medya/araç ekosistemi.

---

## Proje Vizyonu ve Mimari Felsefe

BTÜ Geçerken Lab (`lab.btugecerken.com`), tek sayfa (SPA) sekme yapılarının getirdiği bellek darboğazları, kütüphane çakışmaları ve SEO indeksleme sorunlarını ortadan kaldırmak amacıyla **Çoklu Sayfa Mimarisi (MPA)** prensibiyle inşa edilmiştir.

### Hibrit Çalışma Katmanları

1. **İstemci Katmanı (Client-Side & Zero-Server-Cost):** Görseller, PDF dokümanları, SVG vektörleri ve QR kodlar sunucuya hiç iletilmeden doğrudan kullanıcının tarayıcısında (`HTML5 Canvas`, `pdf-lib`, `JSZip`, `qrcode.js`) işlenir. Bu sayede %100 kullanıcı veri gizliliği ve sıfır sunucu bant genişliği tüketimi sağlanır.
2. **Mikroservis Katmanı (Server-Side Pipeline):** Tarayıcı sandbox kısıtlamalarına takılan video ayrıştırma, medya akış birleştirme ve derin PDF optimizasyonları için arka planda Python tabanlı asenkron `FastAPI` mikroservisi (Port 8001) çalışır.

---

## Araç Matrisi (14 Bağımsız Araç)

Ekosistem, 4 ana başlık altında toplanmış 14 fiziksel araç sayfasından oluşur:

### 1. Görsel & AI Stüdyosu
* **Akıllı Downscaler (`/resizer`):** Görselleri, 4K videoları ve PDF belgelerini hedef piksel veya sıkıştırma oranına göre optimize ederek en küçük boyuta indirir.
* **AI Arka Plan Temizleyici (`/bg-remover`):** Tarayıcı içi Wasm tabanlı segmentasyon modeliyle fotoğraflardaki arka planı ayıklar ve şeffaf PNG üretir.
* **AI Çözünürlük Artırıcı (`/upscaler`):** 2x ve 4x derin öğrenme / Lanczos filtreleme çekirdekleriyle düşük çözünürlüklü fotoğrafları netleştirir.
* **Toplu WebP Dönüştürücü (`/batch-webp`):** Onlarca görseli web standartlarına uygun hafif WebP formatına kayıpsız dönüştürüp tek bir ZIP arşivi olarak indirir.
* **SVG Optimizer (`/svg-opt`):** Vektörel SVG dosyalarındaki gereksiz XML etiketlerini, düzenleyici (Inkscape/Illustrator) çöplerini ve boşlukları ayıklar.
* **Favicon & ICO Paketi (`/ico-maker`):** Logolardan 16x16, 32x32, 48x48, 64x64, 128x128 ve 512x512 piksel favicon setlerini ve `favicon.ico` dosyasını derler.

### 2. PDF Stüdyosu (İstemci Taraflı & Sıfır Sunucu Yükü)
* **PDF Birleştirici (`/pdf-merge`):** Birden fazla PDF dokümanını tarayıcıda `pdf-lib` ile sıraya dizerek tek bir belgede birleştirir.
* **PDF Sayfa Ayırıcı (`/pdf-split`):** Belirtilen sayfa numaralarını veya aralıkları (örn: `1-3, 5, 8-10`) ayıklayarak yeni bir PDF dosyası üretir.
* **Görselden PDF (`/img-to-pdf`):** JPG, PNG ve WebP formatındaki resimleri tek tıkla yüksek çözünürlüklü bir PDF albümüne dönüştürür.

### 3. Medya & Dönüştürme
* **Evrensel Medya İndirici (`/downloader`):** YouTube Shorts, Instagram Reels ve X (Twitter) platformlarındaki videoları analiz eder; 1080p, 720p MP4 veya 320kbps MP3 formatında indirir.
* **Evrensel Format Dönüştürücü (`/converter`):** Görsel, ses ve doküman formatları arasında otomatik tür algılamalı dönüştürme sağlar.

### 4. Pratik Araçlar
* **QR Kod Oluşturucu (`/qr-maker`):** Özel ön plan/arka plan renk seçenekleriyle yüksek çözünürlüklü PNG formatında QR kodlar üretir.
* **EXIF & Meta Temizleyici (`/exif-cleaner`):** Fotoğraflardaki GPS konumu, çekim tarihi ve cihaz etiketlerini piksel matrisini yeniden çizerek sıfırlar.
* **Toplu Yeniden Adlandırıcı (`/bulk-rename`):** Dosya adlarını ön ek, son ek ve otomatik sayaç kurallarına göre düzenleyip topluca ZIP olarak sunar.

---

## Mimari & Dizin Yapısı

```text
/var/www/lab/
├── index.html                 # 14 Araçlık Ana Vitrin & Hub Sayfası
├── resizer.html               # Akıllı Downscaler
├── converter.html             # Format Dönüştürücü
├── bg-remover.html            # AI Arka Plan Temizleyici
├── upscaler.html              # AI Çözünürlük Artırıcı
├── downloader.html            # Medya İndirici
├── pdf-merge.html             # PDF Birleştirici
├── pdf-split.html             # PDF Sayfa Ayırıcı
├── img-to-pdf.html            # Görselden PDF
├── batch-webp.html            # Toplu WebP
├── svg-opt.html               # SVG Optimizer
├── ico-maker.html             # Favicon Paketi
├── qr-maker.html              # QR Kod Oluşturucu
├── exif-cleaner.html          # EXIF Temizleyici
├── bulk-rename.html           # Toplu Yeniden Adlandırıcı
├── labs.css                   # Ortak Glassmorphism & UI Stilleri
├── labs.js                    # Minimal Genel Orkestratör (9 Satır)
├── labs-core.js               # İlerleme Çubuğu (Progress), Toast & API Köprüsü
├── labsnavbar.js              # Uzantısız Linkleri Yöneten Dinamik Navbar
├── labsnavbar.css             # Navbar Tasarım Kuralları
├── labsfooter.js              # Dinamik Footer Bileşeni
├── sitemap.xml                # 14 Bağımsız Aracın Arama Motoru İndeksi
├── modules/                   # Bağımsız ES6 Modülleri
│   ├── resizer.js
│   ├── converter.js
│   ├── bg-remover.js
│   ├── upscaler.js
│   ├── downloader.js
│   ├── pdf-tools.js           # PDF motorları (pdf-lib entegrasyonu)
│   ├── image-tools.js         # WebP, SVG ve ICO derleyicileri
│   └── utility-tools.js       # QR, EXIF ve Yeniden Adlandırma
└── backend/                   # Python FastAPI Mikroservisi
    ├── app.py                 # FastAPI, yt-dlp & pypdf Çekirdeği
    ├── requirements.txt       # Python Bağımlılıkları
    └── downloads/             # Geçici Dosya Havuzu (10 dk Auto-Cleanup)
```

---

## Kurulum & Dağıtım

### 1. Gereksinimler
* Ubuntu 22.04 / 24.04 LTS
* Python 3.10+
* Nginx
* FFmpeg (`imageio-ffmpeg` veya sistem paketi)

### 2. Backend Servisi (FastAPI & systemd)

Sanal ortamı oluşturun ve bağımlılıkları yükleyin:

```bash
cd /var/www/lab/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Servisi arka planda kalıcı çalıştırmak için systemd birimi oluşturun (`/etc/systemd/system/lab-backend.service`):

```ini
[Unit]
Description=BTU Gecerken Lab FastAPI Backend Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/lab/backend
ExecStart=/usr/local/bin/uvicorn app:app --host 127.0.0.1 --port 8001 --workers 2
Restart=always
RestartSec=3
Environment="PYTHONUNBUFFERED=1"

[Install]
WantedBy=multi-user.target
```

Servisi etkinleştirin ve başlatın:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now lab-backend
sudo systemctl status lab-backend
```

### 3. Nginx Yapılandırması

Nginx sanal konfigürasyonunuza (`/etc/nginx/sites-available/lab.btugecerken.com`) aşağıdaki kuralları ekleyin:

```nginx
server {
    server_name lab.btugecerken.com;
    root /var/www/lab;
    index index.html;

    # 1. Uzantısız Temiz URL Desteği (/resizer -> resizer.html)
    location / {
        try_files $uri $uri.html $uri/ /index.html;
    }

    # 2. FastAPI Reverse Proxy (Port 8001)
    location /api/ {
        proxy_pass [http://127.0.0.1:8001](http://127.0.0.1:8001);
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        client_max_body_size 250M;
        proxy_read_timeout 600s;
        proxy_connect_timeout 600s;
        proxy_send_timeout 600s;
        proxy_buffering off;
    }
}
```

Yapılandırmayı test edip Nginx'i yeniden yükleyin:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## API Uç Noktaları

| Metot | Uç Nokta | Açıklama |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Backend servisinin ve FFmpeg durumunun sağlık kontrolü |
| `POST` | `/api/analyze` | YouTube / Reels / X bağlantısından video meta verisi ayıklama |
| `POST` | `/api/download` | İstenen formatta (1080p, 720p, MP3) medya indirme işi başlatma |
| `GET` | `/api/file/{id}` | İşlenmiş medyanın istemciye aktarılması (10 dk sonra otomatik silinir) |
| `POST` | `/api/compress-pdf` | Sunucu taraflı saf Python tabanlı (`pypdf`) PDF sıkıştırma |

---

## Lisans

Bu proje **MIT Lisansı** ile lisanslanmıştır. Detaylar için `LICENSE` dosyasına göz atabilirsiniz.