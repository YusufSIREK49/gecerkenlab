/**
 * BTÜ Geçerken Lab - Çekirdek Motor (labs-core.js)
 */

window.LabCore = (function () {
  const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://127.0.0.1:8001'
    : '';

  function cleanBaseName(fileName) {
    const lastDot = fileName.lastIndexOf('.');
    return lastDot !== -1 ? fileName.substring(0, lastDot) : fileName;
  }

  function switchLabPanel(tabId) {
    const sections = document.querySelectorAll('.lab-section');
    sections.forEach(sec => {
      sec.classList.toggle('active', sec.id === tabId);
    });

    if (window.LabsNavbar) {
      window.LabsNavbar.setActiveTab(tabId);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function createLabProgress(container, titleText) {
    const existing = container.querySelector('.lab-progress-wrap');
    if (existing) existing.remove();

    const wrap = document.createElement('div');
    wrap.className = 'lab-progress-wrap';
    wrap.style.marginTop = '16px';
    wrap.innerHTML = `
      <div class="progress-info-row" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <span class="progress-status-text" style="font-size:13px; font-weight:600; color:var(--ink);"><i class="fa-solid fa-spinner fa-spin" style="color:var(--emerald);"></i> ${titleText}</span>
        <span class="progress-percent" style="font-family:'JetBrains Mono', monospace; font-size:13px; font-weight:700; color:var(--emerald-mid);">%0</span>
      </div>
      <div class="progress-track" style="width:100%; height:8px; background:rgba(0,0,0,0.06); border-radius:99px; overflow:hidden;">
        <div class="progress-bar-fill" style="width:0%; height:100%; background:linear-gradient(90deg, var(--emerald) 0%, var(--gold, #40E0D0) 100%); transition:width 0.3s ease;"></div>
      </div>
    `;
    container.appendChild(wrap);

    const fillBar = wrap.querySelector('.progress-bar-fill');
    const statusText = wrap.querySelector('.progress-status-text');
    const percentText = wrap.querySelector('.progress-percent');

    let currentPercent = 0;
    let timer = null;

    return {
      startAuto(maxWait = 85, intervalMs = 350, stepMax = 8) {
        currentPercent = 10;
        fillBar.style.width = '10%';
        percentText.textContent = '%10';

        timer = setInterval(() => {
          if (currentPercent < maxWait) {
            currentPercent += Math.floor(Math.random() * stepMax) + 3;
            if (currentPercent > maxWait) currentPercent = maxWait;
            fillBar.style.width = `${currentPercent}%`;
            percentText.textContent = `%${currentPercent}`;
          }
        }, intervalMs);
      },
      update(percent, message) {
        currentPercent = percent;
        fillBar.style.width = `${percent}%`;
        percentText.textContent = `%${percent}`;
        if (message) {
          statusText.innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="color:var(--emerald);"></i> ${message}`;
        }
      },
      success(message = 'İşlem tamamlandı, dosya aktarılıyor!') {
        if (timer) clearInterval(timer);
        fillBar.style.width = '100%';
        percentText.textContent = '%100';
        statusText.innerHTML = `<i class="fa-solid fa-circle-check" style="color:var(--emerald);"></i> ${message}`;
        setTimeout(() => {
          wrap.style.opacity = '0';
          wrap.style.transition = 'opacity 0.4s ease';
          setTimeout(() => wrap.remove(), 400);
        }, 3000);
      },
      error(message = 'İşlem başarısız oldu.') {
        if (timer) clearInterval(timer);
        fillBar.style.background = '#ef4444';
        statusText.innerHTML = `<i class="fa-solid fa-circle-xmark" style="color:#ef4444;"></i> ${message}`;
        setTimeout(() => {
          wrap.style.opacity = '0';
          wrap.style.transition = 'opacity 0.4s ease';
          setTimeout(() => wrap.remove(), 400);
        }, 4000);
      },
      remove() {
        if (timer) clearInterval(timer);
        wrap.remove();
      }
    };
  }

  function showToast(message, type = 'success') {
    const container = document.getElementById('labToastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'lab-toast';

    let icon = '<i class="fa-solid fa-circle-check" style="color: var(--gold, #40E0D0);"></i>';
    if (type === 'warning') icon = '<i class="fa-solid fa-triangle-exclamation" style="color: #f59e0b;"></i>';
    if (type === 'error') icon = '<i class="fa-solid fa-circle-xmark" style="color: #ef4444;"></i>';
    if (type === 'info') icon = '<i class="fa-solid fa-circle-info" style="color: var(--gold, #40E0D0);"></i>';

    toast.innerHTML = `
      <div class="lab-toast-content">
        ${icon}
        <span>${message}</span>
      </div>
      <button type="button" class="lab-toast-close" title="Kapat">&times;</button>
    `;
    container.appendChild(toast);

    const closeBtn = toast.querySelector('.lab-toast-close');
    closeBtn.addEventListener('click', () => removeToast(toast));

    let timer = setTimeout(() => {
      removeToast(toast);
    }, 6000);

    toast.addEventListener('mouseenter', () => clearTimeout(timer));
    toast.addEventListener('mouseleave', () => {
      timer = setTimeout(() => removeToast(toast), 3000);
    });

    function removeToast(el) {
      el.style.opacity = '0';
      el.style.transform = 'translateX(50px)';
      el.style.transition = 'all 0.3s ease';
      setTimeout(() => el.remove(), 300);
    }
  }

  function triggerDownload(url, filename) {
    const a = document.createElement('a');
    a.download = filename;
    a.href = url;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function triggerBlobDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    triggerDownload(url, filename);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return {
    API_BASE,
    cleanBaseName,
    switchLabPanel,
    createLabProgress,
    showToast,
    triggerDownload,
    triggerBlobDownload
  };
})();