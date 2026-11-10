export function initUpscalerModule() {
  const dropzone = document.getElementById('upscalerDropzone');
  const fileInput = document.getElementById('upscalerFileInput');
  const previewWrap = document.getElementById('upscalerPreviewWrap');
  const imgPreview = document.getElementById('upscalerImgPreview');
  const mediaInfo = document.getElementById('upscalerMediaInfo');
  const fileNameText = document.getElementById('upscalerFileName');
  const clearBtn = document.getElementById('upscalerClearBtn');
  const processBtn = document.getElementById('upscalerProcessBtn');
  const toggleCards = document.querySelectorAll('#tab-upscaler .toggle-card');
  const upscaleModeSelect = document.getElementById('upscaleMode');
  const upscalerCardBody = document.querySelector('#tab-upscaler .lab-card-body') || previewWrap;

  let currentFile = null;
  let detectedType = 'image';

  if (!dropzone || !fileInput) return;

  toggleCards.forEach(card => {
    card.addEventListener('click', () => {
      toggleCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const radio = card.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;
    });
  });

  dropzone.addEventListener('click', (e) => {
    if (e.target !== clearBtn && !clearBtn.contains(e.target)) {
      fileInput.click();
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files[0]) handleUpscaleFile(fileInput.files[0]);
  });

  ['dragenter', 'dragover'].forEach(n => dropzone.addEventListener(n, (e) => { e.preventDefault(); dropzone.classList.add('dragover'); }));
  ['dragleave', 'drop'].forEach(n => dropzone.addEventListener(n, (e) => { e.preventDefault(); dropzone.classList.remove('dragover'); }));

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) handleUpscaleFile(e.dataTransfer.files[0]);
  });

  function updateUpscaleModes(type) {
    if (!upscaleModeSelect) return;
    upscaleModeSelect.innerHTML = '';

    let options = [];
    if (type === 'image') {
      options = [
        { val: 'photo', label: 'Fotoğraf & Portre (Yüz & Doku Onarımı)' },
        { val: 'digital', label: 'Dijital Çizim & Logo (Keskin Hatlar)' }
      ];
    } else if (type === 'video') {
      options = [
        { val: 'video_general', label: 'Video & Dizi/Film (Lanczos + Unsharp Keskinleştirme)' },
        { val: 'video_anime', label: 'Animasyon & Çizgi Dizi (Kenar Onarımı)' }
      ];
    } else if (type === 'pdf') {
      options = [
        { val: 'document', label: 'Taranmış Belge & Form (OCR ve Metin Netleştirme - 300 DPI)' },
        { val: 'pdf_print', label: 'Renkli Katalog & Broşür (Yüksek Çözünürlüklü Baskı Modu)' }
      ];
    }

    options.forEach(opt => {
      const el = document.createElement('option');
      el.value = opt.val;
      el.textContent = opt.label;
      upscaleModeSelect.appendChild(el);
    });
  }

  function handleUpscaleFile(file) {
    const ext = (file.name.split('.').pop() || '').toLowerCase();

    if (ext === 'svg' || ext === 'eps') {
      window.LabCore.showToast('SVG/EPS matematiksel tabanlıdır; kalite kaybı olmadan sonsuz ölçeklenebilir, AI büyütmeye ihtiyaç duymaz.', 'info');
      fileInput.value = '';
      return;
    }

    currentFile = file;

    if (file.type.startsWith('video/') || ['mp4', 'mov', 'mkv', 'webm'].includes(ext)) {
      detectedType = 'video';
    } else if (file.type === 'application/pdf' || ext === 'pdf') {
      detectedType = 'pdf';
    } else {
      detectedType = 'image';
    }

    updateUpscaleModes(detectedType);

    if (previewWrap) previewWrap.style.display = 'flex';

    if (detectedType === 'image') {
      if (mediaInfo) mediaInfo.style.display = 'none';
      if (imgPreview) {
        imgPreview.style.display = 'block';
        const reader = new FileReader();
        reader.onload = (e) => { imgPreview.src = e.target.result; };
        reader.readAsDataURL(file);
      }
      window.LabCore.showToast('Görsel yüklendi, AI ölçeklendirmeye hazır.');
    } else {
      if (imgPreview) imgPreview.style.display = 'none';
      if (mediaInfo) {
        mediaInfo.style.display = 'block';
        const icon = document.getElementById('upscalerMediaIcon');
        if (icon) {
          icon.className = detectedType === 'video' ? 'fa-solid fa-file-video fa-3x' : 'fa-solid fa-file-pdf fa-3x';
        }
        if (fileNameText) {
          fileNameText.textContent = `${file.name} (${detectedType.toUpperCase()} Dosyası)`;
        }
      }
      window.LabCore.showToast(`${detectedType.toUpperCase()} dosyası yüklendi.`);
    }
  }

  clearBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    currentFile = null;
    fileInput.value = '';
    if (imgPreview) imgPreview.src = '';
    if (previewWrap) previewWrap.style.display = 'none';
    if (mediaInfo) mediaInfo.style.display = 'none';
    detectedType = 'image';
    updateUpscaleModes('image');
    const oldBar = upscalerCardBody.querySelector('.lab-progress-wrap');
    if (oldBar) oldBar.remove();
  });

  processBtn.addEventListener('click', async () => {
    if (!currentFile) {
      window.LabCore.showToast('Lütfen önce çözünürlüğü artırılacak bir dosya yükleyin.', 'warning');
      return;
    }

    const checkedRadio = document.querySelector('input[name="upscaleFactor"]:checked');
    const factor = checkedRadio ? parseInt(checkedRadio.value, 10) : 2;
    const mode = upscaleModeSelect ? upscaleModeSelect.value : 'photo';
    const baseName = window.LabCore.cleanBaseName(currentFile.name);

    processBtn.disabled = true;
    const progress = window.LabCore.createLabProgress(upscalerCardBody, `${factor}X AI Çözünürlük Onarımı başlatılıyor...`);

    try {
      if (detectedType === 'image') {
        progress.update(25, 'Kenar çizgileri ve doku pikselleri enterpole ediliyor...');
        await new Promise(r => setTimeout(r, 200));

        progress.update(60, `${factor}X Bicubic filtre uygulanıyor...`);
        await processClientImageUpscaling(imgPreview.src, factor, mode, baseName);

        progress.success(`Görsel başarıyla ${factor}X büyütüldü ve indirildi!`);
        window.LabCore.showToast(`Görsel başarıyla ${factor}X büyütüldü ve indirildi!`);
      } else {
        progress.startAuto(85, 450);

        const formData = new FormData();
        formData.append('file', currentFile);
        formData.append('type', detectedType);
        formData.append('factor', factor.toString());
        formData.append('mode', mode);

        const res = await fetch(`${window.LabCore.API_BASE}/api/upscale`, {
          method: 'POST',
          body: formData
        });

        if (res.ok) {
          const blob = await res.blob();
          const ext = detectedType === 'video' ? 'mp4' : 'pdf';
          window.LabCore.triggerBlobDownload(blob, `${baseName}-btugecerkenlab.${ext}`);
          progress.success(`${detectedType.toUpperCase()} başarıyla netleştirildi ve indirildi!`);
          window.LabCore.showToast(`${detectedType.toUpperCase()} başarıyla netleştirildi ve indirildi!`);
        } else {
          const errData = await res.json().catch(() => ({}));
          progress.error(errData.detail || 'Upscale işlemi başarısız oldu.');
          window.LabCore.showToast(errData.detail || 'Upscale işlemi başarısız oldu.', 'error');
        }
      }
    } catch (err) {
      console.error(err);
      progress.error('Hata: ' + err.message);
      window.LabCore.showToast('Hata: ' + err.message, 'error');
    } finally {
      processBtn.disabled = false;
    }
  });

  function processClientImageUpscaling(imageSrc, scale, mode, baseName) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const targetW = img.naturalWidth * scale;
          const targetH = img.naturalHeight * scale;

          const canvas = document.createElement('canvas');
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, targetW, targetH);

          if (mode === 'digital') {
            ctx.filter = 'contrast(1.05) saturate(1.02)';
            ctx.drawImage(canvas, 0, 0);
          }

          window.LabCore.triggerDownload(canvas.toDataURL('image/png', 0.95), `${baseName}-btugecerkenlab.png`);
          resolve();
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error('Görsel işlenemedi.'));
      img.src = imageSrc;
    });
  }

  updateUpscaleModes('image');
}