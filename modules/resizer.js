export function initResizerModule() {
  const dropzone = document.getElementById('resizerDropzone');
  const fileInput = document.getElementById('resizerFileInput');
  const previewWrap = document.getElementById('resizerPreviewWrap');
  const imgPreview = document.getElementById('resizerImgPreview');
  const mediaInfo = document.getElementById('resizerMediaInfo');
  const fileNameText = document.getElementById('resizerFileName');
  const clearBtn = document.getElementById('resizerClearBtn');
  const processBtn = document.getElementById('resizerProcessBtn');

  const imgParams = document.getElementById('downscaleImageParams');
  const videoParams = document.getElementById('downscaleVideoParams');
  const pdfParams = document.getElementById('downscalePdfParams');
  const chipBtns = document.querySelectorAll('#tab-resizer .chip-btn');
  const resizerCardBody = document.querySelector('#tab-resizer .lab-card-body') || previewWrap;

  let currentFile = null;
  let fileType = 'image';

  if (!dropzone || !fileInput) return;

  dropzone.addEventListener('click', (e) => {
    if (e.target.closest('#resizerClearBtn')) return;
    fileInput.click();
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files[0]) handleIncomingFile(fileInput.files[0]);
  });

  chipBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const wInput = document.getElementById('resizerWidth');
      const hInput = document.getElementById('resizerHeight');
      if (btn.dataset.ratio && imgPreview.naturalWidth) {
        const factor = parseFloat(btn.dataset.ratio);
        wInput.value = Math.round(imgPreview.naturalWidth * factor);
        hInput.value = Math.round(imgPreview.naturalHeight * factor);
      } else if (btn.dataset.w && btn.dataset.h) {
        wInput.value = btn.dataset.w;
        hInput.value = btn.dataset.h;
      }
    });
  });

  function handleIncomingFile(file) {
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    currentFile = file;

    if (ext === 'svg' || ext === 'eps') {
      window.LabCore.showToast('SVG/EPS matematiksel tabanlıdır; kalite kaybı olmadan sınırsız ölçeklenebilir, küçültmeye gerek yoktur.', 'info');
      fileInput.value = '';
      return;
    }

    if (previewWrap) previewWrap.style.display = 'flex';

    if (file.type.startsWith('video/') || ['mp4', 'mov', 'mkv', 'webm'].includes(ext)) {
      fileType = 'video';
      if (imgParams) imgParams.style.display = 'none';
      if (pdfParams) pdfParams.style.display = 'none';
      if (videoParams) videoParams.style.display = 'block';
      if (imgPreview) imgPreview.style.display = 'none';
      if (mediaInfo) mediaInfo.style.display = 'block';
      if (fileNameText) fileNameText.textContent = `${file.name} (Video Küçültme)`;
    } else if (file.type === 'application/pdf' || ext === 'pdf') {
      fileType = 'pdf';
      if (imgParams) imgParams.style.display = 'none';
      if (videoParams) videoParams.style.display = 'none';
      if (pdfParams) pdfParams.style.display = 'block';
      if (imgPreview) imgPreview.style.display = 'none';
      if (mediaInfo) mediaInfo.style.display = 'block';
      if (fileNameText) fileNameText.textContent = `${file.name} (PDF Sıkıştırma)`;
    } else {
      fileType = 'image';
      if (videoParams) videoParams.style.display = 'none';
      if (pdfParams) pdfParams.style.display = 'none';
      if (imgParams) imgParams.style.display = 'block';
      if (mediaInfo) mediaInfo.style.display = 'none';
      if (imgPreview) {
        imgPreview.style.display = 'block';
        const reader = new FileReader();
        reader.onload = (e) => {
          imgPreview.src = e.target.result;
          const img = new Image();
          img.onload = () => {
            const wInput = document.getElementById('resizerWidth');
            const hInput = document.getElementById('resizerHeight');
            if (wInput) wInput.value = img.naturalWidth;
            if (hInput) hInput.value = img.naturalHeight;
          };
          img.src = e.target.result;
        };
        reader.readAsDataURL(file);
      }
    }

    window.LabCore.showToast(`${file.name} küçültme için hazırlandı.`);
  }

  clearBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    currentFile = null;
    fileInput.value = '';
    if (previewWrap) previewWrap.style.display = 'none';
    if (imgParams) imgParams.style.display = 'block';
    if (videoParams) videoParams.style.display = 'none';
    if (pdfParams) pdfParams.style.display = 'none';
    const oldBar = resizerCardBody.querySelector('.lab-progress-wrap');
    if (oldBar) oldBar.remove();
  });

  processBtn.addEventListener('click', async () => {
    if (!currentFile) {
      window.LabCore.showToast('Lütfen önce bir dosya seçin.', 'warning');
      return;
    }

    const baseName = window.LabCore.cleanBaseName(currentFile.name);
    processBtn.disabled = true;

    const progress = window.LabCore.createLabProgress(resizerCardBody, `${fileType.toUpperCase()} optimize ediliyor...`);

    try {
      if (fileType === 'image') {
        progress.update(30, 'Piksel matrisi yeniden hesaplanıyor...');
        const targetW = parseInt(document.getElementById('resizerWidth').value) || 1080;
        const targetH = parseInt(document.getElementById('resizerHeight').value) || 1080;

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.src = imgPreview.src;
        await new Promise(r => { img.onload = r; });
        ctx.drawImage(img, 0, 0, targetW, targetH);

        progress.update(75, 'JPEG optimizasyonu yapılıyor...');
        await new Promise(r => setTimeout(r, 200));

        window.LabCore.triggerDownload(canvas.toDataURL('image/jpeg', 0.85), `${baseName}-btugecerkenlab.jpg`);
        progress.success('Görsel başarıyla küçültüldü ve indirildi!');
        window.LabCore.showToast('Görsel küçültüldü ve indirildi!');
      } else {
        progress.startAuto(88, 400);

        const formData = new FormData();
        formData.append('file', currentFile);
        formData.append('type', fileType);
        formData.append('target', fileType === 'video' ? document.getElementById('videoDownTarget').value : document.getElementById('pdfCompressionLevel').value);

        const res = await fetch(`${window.LabCore.API_BASE}/api/downscale`, {
          method: 'POST',
          body: formData
        });

        if (res.ok) {
          const blob = await res.blob();
          const ext = fileType === 'video' ? 'mp4' : 'pdf';
          window.LabCore.triggerBlobDownload(blob, `${baseName}-btugecerkenlab.${ext}`);
          progress.success(`${fileType.toUpperCase()} sıkıştırıldı ve indirildi!`);
          window.LabCore.showToast('Dosya başarıyla küçültüldü!');
        } else {
          progress.error('Sıkıştırma işlemi başarısız oldu.');
          window.LabCore.showToast('Sıkıştırma işlemi başarısız oldu.', 'error');
        }
      }
    } catch (err) {
      progress.error('Hata: ' + err.message);
      window.LabCore.showToast('Hata: ' + err.message, 'error');
    } finally {
      processBtn.disabled = false;
    }
  });
}