/**
 * BTÜ Geçerken Lab - Pratik Araçlar Modülü (modules/utility-tools.js)
 */

async function ensureJSZip() {
  if (typeof JSZip !== 'undefined') return JSZip;
  let attempts = 0;
  while (typeof JSZip === 'undefined' && attempts < 20) {
    await new Promise(r => setTimeout(r, 100));
    attempts++;
  }
  if (typeof JSZip === 'undefined') throw new Error('ZIP kütüphanesi yüklenemedi.');
  return JSZip;
}

// --- 1. QR KOD OLUŞTURUCU ---
export function initQrMaker() {
  const textInput = document.getElementById('qrTextInput');
  const fgColor = document.getElementById('qrFgColor');
  const bgColor = document.getElementById('qrBgColor');
  const generateBtn = document.getElementById('qrGenerateBtn');
  const downloadBtn = document.getElementById('qrDownloadBtn');
  const box = document.getElementById('qrCanvasBox');

  if (!box) return;

  let qrInstance = null;

  async function renderQR() {
    const text = (textInput && textInput.value.trim()) ? textInput.value.trim() : 'https://btugecerken.com';
    box.innerHTML = '';

    let attempts = 0;
    while (typeof QRCode === 'undefined' && attempts < 25) {
      await new Promise(r => setTimeout(r, 100));
      attempts++;
    }

    if (typeof QRCode === 'undefined') {
      box.innerHTML = '<p style="color:#ef4444; font-weight:700; padding:20px;">QR kütüphanesi yüklenemedi.</p>';
      if (window.LabCore) window.LabCore.showToast('QR kütüphanesi yüklenemedi.', 'error');
      return;
    }

    try {
      qrInstance = new QRCode(box, {
        text: text,
        width: 256,
        height: 256,
        colorDark: fgColor ? fgColor.value : '#002366',
        colorLight: bgColor ? bgColor.value : '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
      });
      if (window.LabCore) window.LabCore.showToast('QR Kod oluşturuldu!');
    } catch (err) {
      if (window.LabCore) window.LabCore.showToast('QR üretilemedi: ' + err.message, 'error');
    }
  }

  if (generateBtn) generateBtn.addEventListener('click', (e) => { e.preventDefault(); renderQR(); });
  if (fgColor) fgColor.addEventListener('input', renderQR);
  if (bgColor) bgColor.addEventListener('input', renderQR);

  if (downloadBtn) {
    downloadBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const canvas = box.querySelector('canvas');
      const img = box.querySelector('img');

      if (canvas) {
        const dataUrl = canvas.toDataURL('image/png');
        window.LabCore.triggerDownload(dataUrl, 'btugecerken-qr.png');
        window.LabCore.showToast('QR Kod PNG olarak indirildi!');
        return;
      } 
      
      if (img && img.src && !img.src.startsWith('data:,')) {
        window.LabCore.triggerDownload(img.src, 'btugecerken-qr.png');
        window.LabCore.showToast('QR Kod PNG olarak indirildi!');
        return;
      }

      window.LabCore.showToast('İndirilecek QR kod bulunamadı, lütfen yenileyin.', 'warning');
    });
  }

  renderQR();
}

// --- 2. EXIF TEMİZLEYİCİ ---
export function initExifCleaner() {
  const dropzone = document.getElementById('exifDropzone');
  const fileInput = document.getElementById('exifInput');
  const previewWrap = document.getElementById('exifPreviewWrap');
  const previewImg = document.getElementById('exifPreviewImg');
  const clearBtn = document.getElementById('exifClearBtn');
  const execBtn = document.getElementById('exifExecBtn');
  const controlsPane = document.querySelector('.lab-controls-pane');

  let currentFile = null;

  if (!dropzone || !fileInput) return;

  function openFile() { fileInput.click(); }
  dropzone.addEventListener('click', (e) => {
    if (e.target.closest('#exifClearBtn')) return;
    openFile();
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      if (!file.type.startsWith('image/')) {
        window.LabCore.showToast('Lütfen geçerli bir görsel yükleyin.', 'warning');
        return;
      }
      currentFile = file;
      const reader = new FileReader();
      reader.onload = (e) => {
        previewImg.src = e.target.result;
        previewWrap.style.display = 'flex';
        window.LabCore.showToast(`${file.name} yüklendi.`);
      };
      reader.readAsDataURL(file);
    }
  });

  clearBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    currentFile = null;
    fileInput.value = '';
    previewWrap.style.display = 'none';
  });

  execBtn.addEventListener('click', () => {
    if (!currentFile) {
      window.LabCore.showToast('Lütfen önce bir fotoğraf yükleyin.', 'warning');
      return;
    }

    execBtn.disabled = true;
    const progress = window.LabCore.createLabProgress(controlsPane || dropzone, 'EXIF etiketleri sıfırlanıyor...');
    progress.update(40, 'GPS ve meta veriler ayıklanıyor...');

    setTimeout(() => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const isPng = currentFile.type === 'image/png';
        const mimeType = isPng ? 'image/png' : 'image/jpeg';
        const ext = isPng ? 'png' : 'jpg';
        const baseName = window.LabCore.cleanBaseName(currentFile.name);

        canvas.toBlob((blob) => {
          window.LabCore.triggerBlobDownload(blob, `${baseName}-temiz.${ext}`);
          progress.success('Fotoğraf temizlendi ve indirildi!');
          window.LabCore.showToast('EXIF bilgileri sıfırlandı!');
          execBtn.disabled = false;
        }, mimeType, 0.95);
      };
      img.onerror = () => {
        progress.error('Görsel işlenemedi.');
        window.LabCore.showToast('İşlem başarısız.', 'error');
        execBtn.disabled = false;
      };
      img.src = previewImg.src;
    }, 300);
  });
}

// --- 3. TOPLU YENİDEN ADLANDIRICI ---
export function initBulkRename() {
  const dropzone = document.getElementById('bulkRenameDropzone');
  const fileInput = document.getElementById('bulkRenameInput');
  const chooseBtn = dropzone ? dropzone.querySelector('.fc-choose-btn') : null;
  const processArea = document.getElementById('bulkRenameProcessArea');
  const fileList = document.getElementById('bulkRenameList');
  const addMoreBtn = document.getElementById('bulkRenameAddMoreBtn');
  const execBtn = document.getElementById('bulkRenameExecBtn');
  const patternInput = document.getElementById('renamePattern');
  const startNumInput = document.getElementById('renameStartNum');

  let queue = [];

  if (!dropzone || !fileInput) return;

  function triggerInput(e) {
    if (e) e.stopPropagation();
    fileInput.click();
  }

  dropzone.addEventListener('click', triggerInput);
  if (chooseBtn) chooseBtn.addEventListener('click', triggerInput);
  if (addMoreBtn) addMoreBtn.addEventListener('click', triggerInput);

  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files.length > 0) {
      appendFiles(Array.from(fileInput.files));
      fileInput.value = '';
    }
  });

  ['dragenter', 'dragover'].forEach(ev => dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.add('dragover'); }));
  ['dragleave', 'drop'].forEach(ev => dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.remove('dragover'); }));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) appendFiles(Array.from(e.dataTransfer.files));
  });

  function appendFiles(files) {
    files.forEach(file => {
      queue.push({
        id: Math.random().toString(36).substring(2, 9),
        file: file
      });
    });
    renderRenameList();
    window.LabCore.showToast(`${queue.length} dosya eklendi.`);
  }

  function renderRenameList() {
    if (queue.length === 0) {
      processArea.style.display = 'none';
      dropzone.style.display = 'flex';
      return;
    }

    dropzone.style.display = 'none';
    processArea.style.display = 'block';
    fileList.innerHTML = '';

    const prefix = patternInput.value.trim() || 'dosya_';
    const startNum = parseInt(startNumInput.value, 10) || 1;

    queue.forEach((item, index) => {
      const ext = (item.file.name.split('.').pop() || '').toLowerCase();
      const newName = `${prefix}${startNum + index}.${ext}`;

      const row = document.createElement('div');
      row.className = 'fc-row-item';
      row.innerHTML = `
        <div class="fc-file-meta">
          <i class="fa-solid fa-file fc-file-icon"></i>
          <div>
            <div class="fc-file-name" style="color:var(--muted); text-decoration:line-through; font-size:12px;">${item.file.name}</div>
            <div style="font-family:'Syne',sans-serif; font-size:13.5px; font-weight:700; color:var(--emerald);">
              <i class="fa-solid fa-arrow-right" style="font-size:10px;"></i> ${newName}
            </div>
          </div>
        </div>
        <div class="fc-file-size">${(item.file.size / 1024).toFixed(1)} KB</div>
        <button type="button" class="fc-btn-remove" data-id="${item.id}" title="Kaldır">
          <i class="fa-solid fa-xmark"></i>
        </button>
      `;
      fileList.appendChild(row);
    });

    fileList.querySelectorAll('.fc-btn-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        queue = queue.filter(q => q.id !== btn.dataset.id);
        renderRenameList();
      });
    });
  }

  if (patternInput) patternInput.addEventListener('input', renderRenameList);
  if (startNumInput) startNumInput.addEventListener('input', renderRenameList);

  execBtn.addEventListener('click', async () => {
    if (queue.length === 0) return;

    execBtn.disabled = true;
    const progress = window.LabCore.createLabProgress(processArea, 'Dosyalar yeniden adlandırılıyor...');
    progress.startAuto(85, 250);

    try {
      const zipClass = await ensureJSZip();
      const zip = new zipClass();

      const prefix = patternInput.value.trim() || 'dosya_';
      const startNum = parseInt(startNumInput.value, 10) || 1;

      for (let i = 0; i < queue.length; i++) {
        const item = queue[i];
        const ext = (item.file.name.split('.').pop() || '').toLowerCase();
        const newName = `${prefix}${startNum + i}.${ext}`;
        progress.update(Math.round(((i + 1) / queue.length) * 85), `${newName} paketleniyor...`);

        const arrayBuf = await item.file.arrayBuffer();
        zip.file(newName, arrayBuf);
      }

      progress.update(95, 'ZIP arşivi mühürleniyor...');
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      window.LabCore.triggerBlobDownload(zipBlob, 'yeniden-adlandirilan-dosyalar.zip');

      progress.success(`${queue.length} dosya adlandırıldı ve paketlendi!`);
      window.LabCore.showToast('Dosyalar indirildi!');
    } catch (err) {
      progress.error('Hata: ' + err.message);
      window.LabCore.showToast('Hata: ' + err.message, 'error');
    } finally {
      execBtn.disabled = false;
    }
  });
}