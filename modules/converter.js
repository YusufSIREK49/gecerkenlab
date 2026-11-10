export function initConverterModule() {
  const dropzone = document.getElementById('fcDropzone');
  const fileInput = document.getElementById('fcFileInput');
  const processArea = document.getElementById('fcProcessArea');
  const fileList = document.getElementById('fcFileList');
  const addMoreBtn = document.getElementById('fcAddMoreBtn');
  const convertAllBtn = document.getElementById('fcConvertAllBtn');

  let queue = [];

  if (!dropzone || !fileInput) return;

  dropzone.addEventListener('click', () => fileInput.click());
  if (addMoreBtn) addMoreBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files.length > 0) {
      appendFiles(Array.from(fileInput.files));
      fileInput.value = '';
    }
  });

  ['dragenter', 'dragover'].forEach(n => dropzone.addEventListener(n, (e) => { e.preventDefault(); dropzone.classList.add('dragover'); }));
  ['dragleave', 'drop'].forEach(n => dropzone.addEventListener(n, (e) => { e.preventDefault(); dropzone.classList.remove('dragover'); }));

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      appendFiles(Array.from(e.dataTransfer.files));
    }
  });

  function appendFiles(files) {
    files.forEach(file => {
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      const detectedType = detectFileType(file, ext);
      const targets = getAvailableTargets(detectedType, ext);

      queue.push({
        id: Math.random().toString(36).substring(2, 9),
        file: file,
        baseName: window.LabCore.cleanBaseName(file.name),
        ext: ext,
        type: detectedType,
        targets: targets,
        targetFormat: targets[0] ? targets[0].val : 'png'
      });
    });

    renderQueue();
    window.LabCore.showToast(`${files.length} dosya eklendi.`);
  }

  function detectFileType(file, ext) {
    if (file.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'ico', 'avif', 'tiff', 'tif', 'gif', 'svg'].includes(ext)) {
      return ext === 'svg' ? 'vector' : 'image';
    }
    if (file.type === 'application/pdf' || ext === 'pdf') return 'pdf';
    if (file.type.startsWith('video/') || ['mp4', 'mkv', 'webm', 'avi', 'mov', 'flv'].includes(ext)) return 'video';
    if (file.type.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'wma'].includes(ext)) return 'audio';
    return 'generic';
  }

  function getAvailableTargets(type, ext) {
    if (type === 'image') {
      const allImageTargets = [
        { label: 'WEBP (Web İçin)', val: 'webp' },
        { label: 'PNG (Şeffaf / Kayıpsız)', val: 'png' },
        { label: 'JPG (Standart Görsel)', val: 'jpg' },
        { label: 'SVG (Vektörleştir)', val: 'svg' },
        { label: 'PDF (Belge)', val: 'pdf' },
        { label: 'ICO (Favicon Paketi)', val: 'ico' },
        { label: 'BMP (Sıkıştırmasız Bitmap)', val: 'bmp' },
        { label: 'GIF (Görsel)', val: 'gif' }
      ];
      return allImageTargets.filter(t => t.val !== ext);
    }

    if (type === 'vector') {
      return [
        { label: 'PNG (Yüksek Çözünürlük)', val: 'png' },
        { label: 'WEBP (Optimize)', val: 'webp' },
        { label: 'JPG (Beyaz Zemin)', val: 'jpg' },
        { label: 'PDF (Vektörel Belge)', val: 'pdf' },
        { label: 'ICO (Favicon)', val: 'ico' }
      ];
    }

    if (type === 'pdf') {
      return [
        { label: 'PNG (Sayfaları Görsele Çevir)', val: 'png' },
        { label: 'JPG (Görsel Sayfalar)', val: 'jpg' },
        { label: 'WEBP', val: 'webp' }
      ];
    }

    if (type === 'video') {
      return [
        { label: 'MP3 (Ses Ayıkla - 320kbps)', val: 'mp3' },
        { label: 'WAV (Kayıpsız Stüdyo Sesi)', val: 'wav' },
        { label: 'AAC (Mobil Uyumlu Ses)', val: 'aac' },
        { label: 'OGG (Açık Kaynak Ses)', val: 'ogg' }
      ];
    }

    if (type === 'audio') {
      const allAudioTargets = [
        { label: 'MP3 (Evrensel Ses)', val: 'mp3' },
        { label: 'WAV (Kayıpsız)', val: 'wav' },
        { label: 'AAC (Yüksek Kalite)', val: 'aac' },
        { label: 'OGG (Vorbis)', val: 'ogg' },
        { label: 'M4A (Apple Audio)', val: 'm4a' }
      ];
      return allAudioTargets.filter(t => t.val !== ext);
    }

    return [
      { label: 'PNG', val: 'png' },
      { label: 'PDF', val: 'pdf' }
    ];
  }

  function renderQueue() {
    if (queue.length === 0) {
      processArea.style.display = 'none';
      dropzone.style.display = 'block';
      return;
    }

    dropzone.style.display = 'none';
    processArea.style.display = 'block';
    fileList.innerHTML = '';

    queue.forEach(item => {
      const row = document.createElement('div');
      row.className = 'fc-row-item';

      let fileIcon = 'fa-file';
      if (item.type === 'image') fileIcon = 'fa-file-image';
      else if (item.type === 'vector') fileIcon = 'fa-bezier-curve';
      else if (item.type === 'video') fileIcon = 'fa-file-video';
      else if (item.type === 'audio') fileIcon = 'fa-file-audio';
      else if (item.type === 'pdf') fileIcon = 'fa-file-pdf';

      const optionsHtml = item.targets.map(t =>
        `<option value="${t.val}" ${item.targetFormat === t.val ? 'selected' : ''}>${t.label}</option>`
      ).join('');

      row.innerHTML = `
        <div class="fc-file-meta">
          <i class="fa-solid ${fileIcon} fc-file-icon"></i>
          <div>
            <div class="fc-file-name" title="${item.file.name}">${item.file.name}</div>
            <div class="fc-file-size">${(item.file.size / 1024).toFixed(1)} KB</div>
          </div>
        </div>
        <div class="fc-select-wrap">
          <span class="fc-select-label">HEDEF:</span>
          <select class="fc-select-box" data-id="${item.id}">
            ${optionsHtml}
          </select>
        </div>
        <button type="button" class="fc-btn-remove" data-id="${item.id}" title="Kaldır">
          <i class="fa-solid fa-xmark"></i>
        </button>
      `;

      fileList.appendChild(row);
    });

    fileList.querySelectorAll('.fc-select-box').forEach(select => {
      select.addEventListener('change', (e) => {
        const id = e.target.dataset.id;
        const target = queue.find(q => q.id === id);
        if (target) target.targetFormat = e.target.value;
      });
    });

    fileList.querySelectorAll('.fc-btn-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        queue = queue.filter(q => q.id !== id);
        renderQueue();
      });
    });
  }

  convertAllBtn.addEventListener('click', async () => {
    if (queue.length === 0) return;

    convertAllBtn.disabled = true;
    const progress = window.LabCore.createLabProgress(processArea, `${queue.length} dosya dönüştürülüyor...`);

    const total = queue.length;
    for (let i = 0; i < total; i++) {
      const item = queue[i];
      const startPercent = Math.round((i / total) * 100);
      const stepPercent = Math.round(((i + 1) / total) * 100);

      progress.update(startPercent, `${item.file.name} dönüştürülüyor (${i + 1}/${total})...`);

      try {
        await processSingleItem(item);
        progress.update(stepPercent, `${item.file.name} hazırlandı.`);
        await new Promise(r => setTimeout(r, 250));
      } catch (err) {
        console.error(err);
        window.LabCore.showToast(`${item.file.name} dönüştürülemedi: ${err.message}`, 'error');
      }
    }

    progress.success('Tüm dosyalar başarıyla dönüştürüldü!');
    convertAllBtn.disabled = false;
    window.LabCore.showToast('Tüm dönüştürmeler tamamlandı!');
  });

  async function processSingleItem(item) {
    const { file, baseName, type, targetFormat } = item;
    const finalName = `${baseName}-btugecerkenlab.${targetFormat}`;

    if (type === 'image' && ['png', 'webp', 'jpg', 'ico', 'bmp'].includes(targetFormat)) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = targetFormat === 'ico' ? 64 : img.naturalWidth;
            canvas.height = targetFormat === 'ico' ? 64 : img.naturalHeight;

            if (targetFormat === 'jpg' || targetFormat === 'bmp') {
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            let mime = 'image/png';
            if (targetFormat === 'webp') mime = 'image/webp';
            else if (targetFormat === 'jpg') mime = 'image/jpeg';
            else if (targetFormat === 'ico') mime = 'image/x-icon';
            else if (targetFormat === 'bmp') mime = 'image/bmp';

            window.LabCore.triggerDownload(canvas.toDataURL(mime, 0.92), finalName);
            resolve();
          };
          img.onerror = () => reject(new Error('Görsel okunamadı'));
          img.src = e.target.result;
        };
        reader.readAsDataURL(file);
      });
    }

    if (targetFormat === 'svg') {
      const svgStr = await rasterToSvg(file, 128, '#002366');
      const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
      window.LabCore.triggerBlobDownload(blob, finalName);
      return;
    }

    if (targetFormat === 'pdf') {
      if (typeof PDFLib === 'undefined') throw new Error('PDF kütüphanesi yüklenmedi');
      const pdfDoc = await PDFLib.PDFDocument.create();
      const arrayBuffer = await file.arrayBuffer();
      const isJpg = file.type === 'image/jpeg' || file.name.endsWith('.jpg');

      let pdfImage;
      if (isJpg) {
        pdfImage = await pdfDoc.embedJpg(arrayBuffer);
      } else {
        const pngBuf = await convertImageToPngBuffer(file);
        pdfImage = await pdfDoc.embedPng(pngBuf);
      }

      const page = pdfDoc.addPage([pdfImage.width, pdfImage.height]);
      page.drawImage(pdfImage, { x: 0, y: 0, width: pdfImage.width, height: pdfImage.height });
      const pdfBytes = await pdfDoc.save();
      window.LabCore.triggerBlobDownload(new Blob([pdfBytes], { type: 'application/pdf' }), finalName);
      return;
    }

    if (['mp3', 'wav', 'aac', 'ogg', 'm4a'].includes(targetFormat)) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('format', targetFormat);
      formData.append('bitrate', '320');

      const res = await fetch(`${window.LabCore.API_BASE}/api/convert-audio`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error('Sunucu ses dönüştürme hatası verdi');
      const blob = await res.blob();
      window.LabCore.triggerBlobDownload(blob, finalName);
      return;
    }
  }

  function rasterToSvg(file, thresh, fillColor) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 600;
          let w = img.naturalWidth;
          let h = img.naturalHeight;
          if (w > maxDim || h > maxDim) {
            if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim; }
            else { w = Math.round((w * maxDim) / h); h = maxDim; }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);

          const imgData = ctx.getImageData(0, 0, w, h);
          const data = imgData.data;
          let paths = [];
          for (let y = 0; y < h; y += 2) {
            for (let x = 0; x < w; x += 2) {
              const idx = (y * w + x) * 4;
              const brightness = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
              if (data[idx + 3] > 128 && brightness < thresh) {
                paths.push(`M${x},${y}h2v2h-2z`);
              }
            }
          }
          resolve(`<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><path fill="${fillColor}" d="${paths.join(' ')}" /></svg>`);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function convertImageToPngBuffer(file) {
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
          canvas.toBlob(async (blob) => {
            resolve(await blob.arrayBuffer());
          }, 'image/png');
        };
        img.onerror = () => reject(new Error('Görsel ayrıştırılamadı.'));
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }
}