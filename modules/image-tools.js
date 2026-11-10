/**
 * BTÜ Geçerken Lab - Görsel & Vektör Araçları Modülü (modules/image-tools.js)
 */

async function ensureJSZip() {
  if (typeof JSZip !== 'undefined') return JSZip;
  let attempts = 0;
  while (typeof JSZip === 'undefined' && attempts < 25) {
    await new Promise(r => setTimeout(r, 100));
    attempts++;
  }
  if (typeof JSZip === 'undefined') throw new Error('ZIP kütüphanesi yüklenemedi.');
  return JSZip;
}

// --- 1. TOPLU WEBP DÖNÜŞTÜRÜCÜ ---
export function initBatchWebp() {
  const dropzone = document.getElementById('batchWebpDropzone');
  const fileInput = document.getElementById('batchWebpInput');
  const chooseBtn = dropzone ? dropzone.querySelector('.fc-choose-btn') : null;
  const processArea = document.getElementById('batchWebpProcessArea');
  const fileList = document.getElementById('batchWebpList');
  const addMoreBtn = document.getElementById('batchWebpAddMoreBtn');
  const execBtn = document.getElementById('batchWebpExecBtn');

  if (!dropzone || !fileInput) return;

  let queue = [];

  function openFile(e) {
    if (e) e.stopPropagation();
    fileInput.click();
  }

  dropzone.addEventListener('click', openFile);
  if (chooseBtn) chooseBtn.addEventListener('click', openFile);
  if (addMoreBtn) addMoreBtn.addEventListener('click', openFile);

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
      if (file.type.startsWith('image/')) {
        queue.push({
          id: Math.random().toString(36).substring(2, 9),
          file: file,
          quality: 0.85
        });
      }
    });
    renderQueue();
    window.LabCore.showToast(`${queue.length} görsel eklendi.`);
  }

  function renderQueue() {
    if (queue.length === 0) {
      processArea.style.display = 'none';
      dropzone.style.display = 'flex';
      return;
    }
    dropzone.style.display = 'none';
    processArea.style.display = 'block';
    fileList.innerHTML = '';

    queue.forEach(item => {
      const row = document.createElement('div');
      row.className = 'fc-row-item';
      row.innerHTML = `
        <div class="fc-file-meta">
          <i class="fa-solid fa-file-image fc-file-icon"></i>
          <div>
            <div class="fc-file-name">${item.file.name}</div>
            <div class="fc-file-size">${(item.file.size / 1024).toFixed(1)} KB</div>
          </div>
        </div>
        <div class="fc-select-wrap">
          <span class="fc-select-label">Kalite:</span>
          <select class="fc-select-box quality-select" data-id="${item.id}">
            <option value="0.95" ${item.quality === 0.95 ? 'selected' : ''}>%95 (Kayıpsız)</option>
            <option value="0.85" ${item.quality === 0.85 ? 'selected' : ''}>%85 (Web Standardı)</option>
            <option value="0.75" ${item.quality === 0.75 ? 'selected' : ''}>%75 (Yüksek Sıkıştırma)</option>
          </select>
        </div>
        <button type="button" class="fc-btn-remove" data-id="${item.id}" title="Kaldır">
          <i class="fa-solid fa-xmark"></i>
        </button>
      `;
      fileList.appendChild(row);
    });

    fileList.querySelectorAll('.quality-select').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const item = queue.find(q => q.id === e.target.dataset.id);
        if (item) item.quality = parseFloat(e.target.value);
      });
    });

    fileList.querySelectorAll('.fc-btn-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        queue = queue.filter(q => q.id !== btn.dataset.id);
        renderQueue();
      });
    });
  }

  execBtn.addEventListener('click', async () => {
    if (queue.length === 0) return;

    execBtn.disabled = true;
    const progress = window.LabCore.createLabProgress(processArea, 'WebP dönüştürülüyor...');
    progress.startAuto(85, 300);

    try {
      const zipClass = await ensureJSZip();
      const zip = new zipClass();

      for (let i = 0; i < queue.length; i++) {
        const item = queue[i];
        progress.update(Math.round(((i + 1) / queue.length) * 85), `${item.file.name} dönüştürülüyor...`);
        const webpBlob = await convertImageToWebpBlob(item.file, item.quality);
        const baseName = window.LabCore.cleanBaseName(item.file.name);
        zip.file(`${baseName}.webp`, webpBlob);
      }

      progress.update(95, 'ZIP paketi hazırlanıyor...');
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      window.LabCore.triggerBlobDownload(zipBlob, 'btugecerken-webp-paketi.zip');

      progress.success('WebP paketiniz indirildi!');
      window.LabCore.showToast('İşlem tamamlandı!');
    } catch (err) {
      progress.error('Hata: ' + err.message);
      window.LabCore.showToast('Hata: ' + err.message, 'error');
    } finally {
      execBtn.disabled = false;
    }
  });

  function convertImageToWebpBlob(file, quality) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          canvas.toBlob(blob => resolve(blob), 'image/webp', quality);
        };
        img.onerror = () => reject(new Error('Görsel okunamadı'));
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }
}

// --- 2. SVG OPTIMIZER ---
export function initSvgOpt() {
  const dropzone = document.getElementById('svgOptDropzone');
  const fileInput = document.getElementById('svgOptInput');
  const previewWrap = document.getElementById('svgOptPreviewWrap');
  const previewImg = document.getElementById('svgOptPreviewImg');
  const clearBtn = document.getElementById('svgOptClearBtn');
  const execBtn = document.getElementById('svgOptExecBtn');
  const optComments = document.getElementById('svgOptComments');
  const optMeta = document.getElementById('svgOptMeta');
  const optPrecision = document.getElementById('svgOptPrecision');
  const controlsPane = document.querySelector('.lab-controls-pane');

  let currentFile = null;
  let rawSvgText = '';

  if (!dropzone || !fileInput) return;

  dropzone.addEventListener('click', (e) => {
    if (e.target.closest('#svgOptClearBtn')) return;
    fileInput.click();
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      if (!file.name.toLowerCase().endsWith('.svg')) {
        window.LabCore.showToast('Lütfen geçerli bir .svg dosyası yükleyin.', 'warning');
        return;
      }
      currentFile = file;
      const reader = new FileReader();
      reader.onload = (e) => {
        rawSvgText = e.target.result;
        previewImg.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(rawSvgText);
        previewWrap.style.display = 'flex';
        window.LabCore.showToast(`${file.name} yüklendi.`);
      };
      reader.readAsText(file);
    }
  });

  clearBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    currentFile = null;
    rawSvgText = '';
    fileInput.value = '';
    previewWrap.style.display = 'none';
  });

  execBtn.addEventListener('click', () => {
    if (!currentFile || !rawSvgText) {
      window.LabCore.showToast('Lütfen önce bir SVG dosyası yükleyin.', 'warning');
      return;
    }

    const progress = window.LabCore.createLabProgress(controlsPane || dropzone, 'SVG optimize ediliyor...');
    progress.update(30, 'Gereksiz XML etiketleri siliniyor...');

    setTimeout(() => {
      let optimized = rawSvgText;

      if (optComments && optComments.checked) optimized = optimized.replace(/<!--[\s\S]*?-->/g, '');
      if (optMeta && optMeta.checked) {
        optimized = optimized.replace(/<metadata[\s\S]*?<\/metadata>/gi, '');
        optimized = optimized.replace(/<title[\s\S]*?<\/title>/gi, '');
        optimized = optimized.replace(/<desc[\s\S]*?<\/desc>/gi, '');
        optimized = optimized.replace(/\s*(xmlns:sodipodi|xmlns:inkscape|inkscape:[a-z-]+|sodipodi:[a-z-]+)="[^"]*"/gi, '');
      }
      optimized = optimized.replace(/\s{2,}/g, ' ').replace(/>\s+</g, '><').trim();
      if (optPrecision && optPrecision.checked) optimized = optimized.replace(/(\d+\.\d{3,})/g, (m) => parseFloat(m).toFixed(2));

      const originalSize = new Blob([rawSvgText]).size;
      const optSize = new Blob([optimized]).size;
      const savingPercent = Math.max(0, Math.round(((originalSize - optSize) / originalSize) * 100));

      const baseName = window.LabCore.cleanBaseName(currentFile.name);
      const blob = new Blob([optimized], { type: 'image/svg+xml;charset=utf-8' });
      window.LabCore.triggerBlobDownload(blob, `${baseName}-opt.svg`);

      progress.success(`SVG %${savingPercent} küçültüldü ve indirildi!`);
      window.LabCore.showToast('SVG indirildi!');
    }, 300);
  });
}

// --- 3. ICO & FAVICON PAKETİ ---
export function initIcoMaker() {
  const dropzone = document.getElementById('icoDropzone');
  const fileInput = document.getElementById('icoInput');
  const previewWrap = document.getElementById('icoPreviewWrap');
  const previewImg = document.getElementById('icoPreviewImg');
  const clearBtn = document.getElementById('icoClearBtn');
  const execBtn = document.getElementById('icoExecBtn');
  const controlsPane = document.querySelector('.lab-controls-pane');

  let currentFile = null;

  if (!dropzone || !fileInput) return;

  dropzone.addEventListener('click', (e) => {
    if (e.target.closest('#icoClearBtn')) return;
    fileInput.click();
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
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

  execBtn.addEventListener('click', async () => {
    if (!currentFile) {
      window.LabCore.showToast('Lütfen bir görsel yükleyin.', 'warning');
      return;
    }

    execBtn.disabled = true;
    const progress = window.LabCore.createLabProgress(controlsPane || dropzone, 'Favicon paketi oluşturuluyor...');
    progress.startAuto(85, 250);

    try {
      const zipClass = await ensureJSZip();
      const zip = new zipClass();
      const sizes = [16, 32, 48, 64, 128, 192, 512];

      const img = new Image();
      img.src = previewImg.src;
      await new Promise(r => { img.onload = r; });

      for (let i = 0; i < sizes.length; i++) {
        const size = sizes[i];
        progress.update(Math.round(((i + 1) / sizes.length) * 80), `${size}x${size} üretiliyor...`);

        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, size, size);

        const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
        zip.file(`favicon-${size}x${size}.png`, blob);
        if (size === 32) zip.file('favicon.ico', blob);
      }

      progress.update(95, 'ZIP mühürleniyor...');
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const baseName = window.LabCore.cleanBaseName(currentFile.name);
      window.LabCore.triggerBlobDownload(zipBlob, `${baseName}-favicon-paketi.zip`);

      progress.success('Favicon paketi indirildi!');
      window.LabCore.showToast('Favicon paketi indirildi!');
    } catch (err) {
      progress.error('Hata: ' + err.message);
      window.LabCore.showToast('Hata: ' + err.message, 'error');
    } finally {
      execBtn.disabled = false;
    }
  });
}