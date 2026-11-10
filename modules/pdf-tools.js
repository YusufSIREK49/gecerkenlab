/**
 * BTÜ Geçerken Lab - PDF Araçları Modülü (modules/pdf-tools.js)
 */

async function ensurePdfLib() {
  if (typeof PDFLib !== 'undefined') return PDFLib;
  let attempts = 0;
  while (typeof PDFLib === 'undefined' && attempts < 25) {
    await new Promise(r => setTimeout(r, 100));
    attempts++;
  }
  if (typeof PDFLib === 'undefined') throw new Error('PDF kütüphanesi yüklenemedi.');
  return PDFLib;
}

// --- 1. PDF BİRLEŞTİRİCİ ---
export function initPdfMerge() {
  const dropzone = document.getElementById('pdfMergeDropzone');
  const fileInput = document.getElementById('pdfMergeInput');
  const chooseBtn = dropzone ? dropzone.querySelector('.fc-choose-btn') : null;
  const processArea = document.getElementById('pdfMergeProcessArea');
  const fileList = document.getElementById('pdfMergeList');
  const addMoreBtn = document.getElementById('pdfMergeAddMoreBtn');
  const execBtn = document.getElementById('pdfMergeExecBtn');

  if (!dropzone || !fileInput) return;

  let pdfFiles = [];

  function openFile(e) {
    if (e) e.stopPropagation();
    fileInput.click();
  }

  dropzone.addEventListener('click', openFile);
  if (chooseBtn) chooseBtn.addEventListener('click', openFile);
  if (addMoreBtn) addMoreBtn.addEventListener('click', openFile);

  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files.length > 0) {
      appendPdfs(Array.from(fileInput.files));
      fileInput.value = '';
    }
  });

  ['dragenter', 'dragover'].forEach(ev => dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.add('dragover'); }));
  ['dragleave', 'drop'].forEach(ev => dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.remove('dragover'); }));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      appendPdfs(Array.from(e.dataTransfer.files));
    }
  });

  async function appendPdfs(files) {
    window.LabCore.showToast(`${files.length} dosya inceleniyor...`, 'info');
    try {
      const pdfLib = await ensurePdfLib();
      for (const file of files) {
        if (!file.name.toLowerCase().endsWith('.pdf')) {
          window.LabCore.showToast(`${file.name} PDF değil!`, 'warning');
          continue;
        }
        try {
          const arrayBuf = await file.arrayBuffer();
          const doc = await pdfLib.PDFDocument.load(arrayBuf, { ignoreEncryption: true });
          pdfFiles.push({
            id: Math.random().toString(36).substring(2, 9),
            file: file,
            pageCount: doc.getPageCount(),
            bytes: arrayBuf
          });
        } catch (err) {
          window.LabCore.showToast(`${file.name} okunamadı.`, 'error');
        }
      }
      renderMergeList();
      window.LabCore.showToast(`Listede ${pdfFiles.length} PDF hazır.`);
    } catch (err) {
      window.LabCore.showToast(err.message, 'error');
    }
  }

  function renderMergeList() {
    if (pdfFiles.length === 0) {
      processArea.style.display = 'none';
      dropzone.style.display = 'flex';
      return;
    }
    dropzone.style.display = 'none';
    processArea.style.display = 'block';
    fileList.innerHTML = '';

    pdfFiles.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'fc-row-item';
      row.innerHTML = `
        <div class="fc-file-meta">
          <i class="fa-solid fa-file-pdf fc-file-icon"></i>
          <div>
            <div class="fc-file-name"><strong>${index + 1}.</strong> ${item.file.name}</div>
            <div class="fc-file-size">${(item.file.size / 1024).toFixed(1)} KB</div>
          </div>
        </div>
        <div style="font-family:'JetBrains Mono',monospace; font-size:12.5px; font-weight:700; color:var(--emerald);">
          ${item.pageCount} Sayfa
        </div>
        <button type="button" class="fc-btn-remove" data-id="${item.id}" title="Kaldır">
          <i class="fa-solid fa-xmark"></i>
        </button>
      `;
      fileList.appendChild(row);
    });

    fileList.querySelectorAll('.fc-btn-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        pdfFiles = pdfFiles.filter(p => p.id !== id);
        renderMergeList();
      });
    });
  }

  execBtn.addEventListener('click', async () => {
    if (pdfFiles.length < 2) {
      window.LabCore.showToast('En az 2 PDF belgesi yüklemelisiniz.', 'warning');
      return;
    }

    execBtn.disabled = true;
    const progress = window.LabCore.createLabProgress(processArea, 'PDF belgeleri birleştiriliyor...');
    progress.startAuto(85, 300);

    try {
      const pdfLib = await ensurePdfLib();
      const mergedPdf = await pdfLib.PDFDocument.create();

      for (let i = 0; i < pdfFiles.length; i++) {
        const step = Math.round(((i + 1) / pdfFiles.length) * 85);
        progress.update(step, `${pdfFiles[i].file.name} ekleniyor (${i + 1}/${pdfFiles.length})...`);
        const srcDoc = await pdfLib.PDFDocument.load(pdfFiles[i].bytes);
        const copiedPages = await mergedPdf.copyPages(srcDoc, srcDoc.getPageIndices());
        copiedPages.forEach(page => mergedPdf.addPage(page));
      }

      progress.update(95, 'Belge derleniyor...');
      const mergedBytes = await mergedPdf.save();
      const blob = new Blob([mergedBytes], { type: 'application/pdf' });
      window.LabCore.triggerBlobDownload(blob, `birlestirilmis-belge-btugecerkenlab.pdf`);

      progress.success('Tüm PDF belgeleri birleştirildi!');
      window.LabCore.showToast('PDF birleştirme tamamlandı!');
    } catch (err) {
      progress.error('Hata: ' + err.message);
      window.LabCore.showToast('Hata: ' + err.message, 'error');
    } finally {
      execBtn.disabled = false;
    }
  });
}

// --- 2. PDF SAYFA AYIRICI ---
export function initPdfSplit() {
  const dropzone = document.getElementById('pdfSplitDropzone');
  const fileInput = document.getElementById('pdfSplitInput');
  const previewWrap = document.getElementById('pdfSplitPreviewWrap');
  const fileNameText = document.getElementById('pdfSplitFileName');
  const pageBadge = document.getElementById('pdfSplitPageCount');
  const clearBtn = document.getElementById('pdfSplitClearBtn');
  const rangeInput = document.getElementById('pdfSplitRange');
  const execBtn = document.getElementById('pdfSplitExecBtn');
  const controlsPane = document.querySelector('.lab-controls-pane');

  if (!dropzone || !fileInput) return;

  let currentFile = null;
  let totalPages = 0;
  let pdfBytes = null;

  dropzone.addEventListener('click', (e) => {
    if (e.target.closest('#pdfSplitClearBtn')) return;
    fileInput.click();
  });

  fileInput.addEventListener('change', async () => {
    if (fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      try {
        const pdfLib = await ensurePdfLib();
        pdfBytes = await file.arrayBuffer();
        const doc = await pdfLib.PDFDocument.load(pdfBytes, { ignoreEncryption: true });
        totalPages = doc.getPageCount();
        currentFile = file;

        fileNameText.textContent = file.name;
        pageBadge.textContent = `Toplam ${totalPages} Sayfa`;
        previewWrap.style.display = 'flex';
        rangeInput.placeholder = `Örn: 1-${Math.min(3, totalPages)} veya 1, 3`;
        window.LabCore.showToast(`${file.name} yüklendi (${totalPages} sayfa).`);
      } catch (err) {
        window.LabCore.showToast('PDF okunamadı veya şifreli: ' + err.message, 'error');
      }
    }
  });

  clearBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    currentFile = null;
    pdfBytes = null;
    totalPages = 0;
    fileInput.value = '';
    previewWrap.style.display = 'none';
  });

  execBtn.addEventListener('click', async () => {
    if (!currentFile || !pdfBytes) {
      window.LabCore.showToast('Lütfen önce bir PDF dosyası yükleyin.', 'warning');
      return;
    }

    const rangeStr = rangeInput.value.trim();
    let selectedIndices = [];

    if (!rangeStr) {
      for (let i = 0; i < totalPages; i++) selectedIndices.push(i);
    } else {
      const parts = rangeStr.split(',');
      for (const part of parts) {
        const clean = part.trim();
        if (clean.includes('-')) {
          const [start, end] = clean.split('-').map(n => parseInt(n.trim(), 10));
          if (!isNaN(start) && !isNaN(end)) {
            for (let i = Math.max(1, start); i <= Math.min(totalPages, end); i++) {
              selectedIndices.push(i - 1);
            }
          }
        } else {
          const num = parseInt(clean, 10);
          if (!isNaN(num) && num >= 1 && num <= totalPages) selectedIndices.push(num - 1);
        }
      }
    }

    selectedIndices = [...new Set(selectedIndices)].sort((a, b) => a - b);

    if (selectedIndices.length === 0) {
      window.LabCore.showToast('Geçerli bir sayfa aralığı girmediniz!', 'warning');
      return;
    }

    execBtn.disabled = true;
    const progress = window.LabCore.createLabProgress(controlsPane || dropzone, 'Sayfalar ayıklanıyor...');
    progress.startAuto(85, 250);

    try {
      const pdfLib = await ensurePdfLib();
      const srcDoc = await pdfLib.PDFDocument.load(pdfBytes);
      const newPdf = await pdfLib.PDFDocument.create();
      const copiedPages = await newPdf.copyPages(srcDoc, selectedIndices);
      copiedPages.forEach(p => newPdf.addPage(p));

      const newBytes = await newPdf.save();
      const baseName = window.LabCore.cleanBaseName(currentFile.name);
      window.LabCore.triggerBlobDownload(new Blob([newBytes], { type: 'application/pdf' }), `${baseName}-ayiklanan.pdf`);

      progress.success(`${selectedIndices.length} sayfa ayrıldı ve indirildi!`);
      window.LabCore.showToast('İşlem tamamlandı!');
    } catch (err) {
      progress.error('Hata: ' + err.message);
      window.LabCore.showToast('Hata: ' + err.message, 'error');
    } finally {
      execBtn.disabled = false;
    }
  });
}

// --- 3. GÖRSELDEN PDF ---
export function initImgToPdf() {
  const dropzone = document.getElementById('imgToPdfDropzone');
  const fileInput = document.getElementById('imgToPdfInput');
  const chooseBtn = dropzone ? dropzone.querySelector('.fc-choose-btn') : null;
  const processArea = document.getElementById('imgToPdfProcessArea');
  const fileList = document.getElementById('imgToPdfList');
  const addMoreBtn = document.getElementById('imgToPdfAddMoreBtn');
  const execBtn = document.getElementById('imgToPdfExecBtn');

  if (!dropzone || !fileInput) return;

  let imageFiles = [];

  function openFile(e) {
    if (e) e.stopPropagation();
    fileInput.click();
  }

  dropzone.addEventListener('click', openFile);
  if (chooseBtn) chooseBtn.addEventListener('click', openFile);
  if (addMoreBtn) addMoreBtn.addEventListener('click', openFile);

  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files.length > 0) {
      appendImages(Array.from(fileInput.files));
      fileInput.value = '';
    }
  });

  function appendImages(files) {
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        imageFiles.push({
          id: Math.random().toString(36).substring(2, 9),
          file: file
        });
      }
    });
    renderImgList();
    window.LabCore.showToast(`${imageFiles.length} görsel PDF listesine eklendi.`);
  }

  function renderImgList() {
    if (imageFiles.length === 0) {
      processArea.style.display = 'none';
      dropzone.style.display = 'flex';
      return;
    }
    dropzone.style.display = 'none';
    processArea.style.display = 'block';
    fileList.innerHTML = '';

    imageFiles.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'fc-row-item';
      row.innerHTML = `
        <div class="fc-file-meta">
          <i class="fa-solid fa-file-image fc-file-icon"></i>
          <div>
            <div class="fc-file-name"><strong>Sayfa ${index + 1}:</strong> ${item.file.name}</div>
            <div class="fc-file-size">${(item.file.size / 1024).toFixed(1)} KB</div>
          </div>
        </div>
        <div style="font-family:'Syne',sans-serif; font-size:12px; font-weight:700; color:var(--emerald);">Sıra #${index + 1}</div>
        <button type="button" class="fc-btn-remove" data-id="${item.id}" title="Kaldır">
          <i class="fa-solid fa-xmark"></i>
        </button>
      `;
      fileList.appendChild(row);
    });

    fileList.querySelectorAll('.fc-btn-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        imageFiles = imageFiles.filter(img => img.id !== id);
        renderImgList();
      });
    });
  }

  execBtn.addEventListener('click', async () => {
    if (imageFiles.length === 0) {
      window.LabCore.showToast('Lütfen en az bir görsel yükleyin.', 'warning');
      return;
    }

    execBtn.disabled = true;
    const progress = window.LabCore.createLabProgress(processArea, 'PDF albümü oluşturuluyor...');
    progress.startAuto(85, 300);

    try {
      const pdfLib = await ensurePdfLib();
      const pdfDoc = await pdfLib.PDFDocument.create();

      for (let i = 0; i < imageFiles.length; i++) {
        const f = imageFiles[i].file;
        progress.update(Math.round(((i + 1) / imageFiles.length) * 85), `${f.name} ekleniyor...`);

        const arrayBuf = await f.arrayBuffer();
        let pdfImage;
        if (f.type === 'image/jpeg' || f.name.toLowerCase().endsWith('.jpg') || f.name.toLowerCase().endsWith('.jpeg')) {
          pdfImage = await pdfDoc.embedJpg(arrayBuf);
        } else {
          const pngBuf = await rasterToPngBuffer(f);
          pdfImage = await pdfDoc.embedPng(pngBuf);
        }

        const page = pdfDoc.addPage([pdfImage.width, pdfImage.height]);
        page.drawImage(pdfImage, { x: 0, y: 0, width: pdfImage.width, height: pdfImage.height });
      }

      const pdfBytes = await pdfDoc.save();
      window.LabCore.triggerBlobDownload(new Blob([pdfBytes], { type: 'application/pdf' }), 'gorseller-albumu-btugecerkenlab.pdf');

      progress.success('PDF albümü başarıyla indirildi!');
      window.LabCore.showToast('PDF hazır!');
    } catch (err) {
      progress.error('Hata: ' + err.message);
      window.LabCore.showToast('Hata: ' + err.message, 'error');
    } finally {
      execBtn.disabled = false;
    }
  });

  function rasterToPngBuffer(file) {
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
          canvas.toBlob(async (blob) => resolve(await blob.arrayBuffer()), 'image/png');
        };
        img.onerror = () => reject(new Error('Görsel okunamadı'));
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }
}