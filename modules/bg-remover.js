export function initBgRemoverModule() {
  const dropzone = document.getElementById('bgDropzone');
  const fileInput = document.getElementById('bgFileInput');
  const previewWrap = document.getElementById('bgPreviewWrap');
  const imgPreview = document.getElementById('bgImgPreview');
  const clearBtn = document.getElementById('bgClearBtn');
  const processBtn = document.getElementById('bgProcessBtn');
  const downloadBtn = document.getElementById('bgDownloadBtn');
  const bgCardBody = document.querySelector('#tab-bg-remover .lab-card-body') || previewWrap;

  let currentFile = null;
  let processedBlobUrl = null;
  let cachedRemoveBgFn = null;

  if (!dropzone || !fileInput) return;

  dropzone.addEventListener('click', (e) => {
    if (e.target !== clearBtn && !clearBtn.contains(e.target)) {
      fileInput.click();
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files[0]) handleBgFile(fileInput.files[0]);
  });

  ['dragenter', 'dragover'].forEach(n => dropzone.addEventListener(n, (e) => { e.preventDefault(); dropzone.classList.add('dragover'); }));
  ['dragleave', 'drop'].forEach(n => dropzone.addEventListener(n, (e) => { e.preventDefault(); dropzone.classList.remove('dragover'); }));

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) handleBgFile(e.dataTransfer.files[0]);
  });

  function handleBgFile(file) {
    if (!file.type.startsWith('image/')) {
      window.LabCore.showToast('Lütfen geçerli bir görsel yükleyin.', 'warning');
      return;
    }
    currentFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      imgPreview.src = e.target.result;
      previewWrap.style.display = 'flex';
      if (downloadBtn) downloadBtn.style.display = 'none';
      window.LabCore.showToast('Görsel yüklendi, arka plan temizlemeye hazır.');
    };
    reader.readAsDataURL(file);
  }

  clearBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    currentFile = null;
    fileInput.value = '';
    imgPreview.src = '';
    previewWrap.style.display = 'none';
    if (downloadBtn) downloadBtn.style.display = 'none';
    if (processedBlobUrl) URL.revokeObjectURL(processedBlobUrl);
    processedBlobUrl = null;
    const oldBar = bgCardBody.querySelector('.lab-progress-wrap');
    if (oldBar) oldBar.remove();
  });

  processBtn.addEventListener('click', async () => {
    if (!currentFile) {
      window.LabCore.showToast('Lütfen önce arka planı silinecek bir görsel yükleyin.', 'warning');
      return;
    }

    processBtn.disabled = true;
    const progress = window.LabCore.createLabProgress(bgCardBody, 'Yapay zeka modeli hazırlanıyor...');
    progress.startAuto(80, 450);

    try {
      if (!cachedRemoveBgFn) {
        progress.update(25, 'AI modeli tarayıcıya aktarılıyor (Wasm)...');
        const imgly = await import('https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.7/+esm');
        cachedRemoveBgFn = imgly.removeBackground || imgly.default;
      }

      progress.update(50, 'Segmentasyon maskesi hesaplanıyor...');

      const blob = await cachedRemoveBgFn(currentFile, {
        progress: (key, current, total) => {
          if (total > 0) {
            const p = Math.round((current / total) * 100);
            progress.update(Math.min(Math.max(p, 50), 92), `İşleniyor: %${p}`);
          }
        }
      });

      if (processedBlobUrl) URL.revokeObjectURL(processedBlobUrl);
      processedBlobUrl = URL.createObjectURL(blob);

      imgPreview.src = processedBlobUrl;
      if (downloadBtn) downloadBtn.style.display = 'inline-flex';

      progress.success('Arka plan temizlendi! Şeffaf PNG hazır.');
      window.LabCore.showToast('Arka plan temizlendi! Şeffaf PNG hazır.');
    } catch (err) {
      console.error(err);
      progress.error('İşlem başarısız: ' + (err.message || 'Model çalıştırılamadı'));
      window.LabCore.showToast('İşlem başarısız: ' + err.message, 'error');
    } finally {
      processBtn.disabled = false;
    }
  });

  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      if (!processedBlobUrl || !currentFile) return;
      const baseName = window.LabCore.cleanBaseName(currentFile.name);
      window.LabCore.triggerDownload(processedBlobUrl, `${baseName}-btugecerkenlab.png`);
      window.LabCore.showToast('Şeffaf PNG başarıyla indirildi!');
    });
  }
}