export function initDownloaderModule() {
  const urlInput = document.getElementById('mediaUrlInput');
  const analyzeBtn = document.getElementById('analyzeUrlBtn');
  const resultCard = document.getElementById('downloaderResult');
  const thumb = document.getElementById('downloaderThumb');
  const title = document.getElementById('downloaderTitle');
  const author = document.getElementById('downloaderAuthor');
  const platform = document.getElementById('downloaderPlatform');
  const downloadBtns = document.querySelectorAll('.btn-download-opt');
  const resultBody = document.querySelector('.result-body');

  if (!analyzeBtn) return;

  analyzeBtn.addEventListener('click', async () => {
    const rawUrl = urlInput.value.trim();
    if (!rawUrl) {
      window.LabCore.showToast('Lütfen bir video linki yapıştırın.', 'warning');
      return;
    }

    window.LabCore.showToast('Link analiz ediliyor...', 'info');

    if (rawUrl.includes('youtube.com') || rawUrl.includes('youtu.be')) {
      try {
        const oembedUrl = `https://noembed.com/embed?url=${encodeURIComponent(rawUrl)}`;
        const res = await fetch(oembedUrl);
        const data = await res.json();

        resultCard.style.display = 'grid';
        platform.textContent = rawUrl.includes('/shorts/') ? 'YouTube Shorts' : 'YouTube';
        title.textContent = data.title || 'YouTube Videosu';
        author.textContent = data.author_name ? `Kanal: ${data.author_name}` : 'YouTube';

        const videoId = extractYouTubeID(rawUrl);
        thumb.src = videoId 
          ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` 
          : (data.thumbnail_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80');

        removeExistingProgressBar();
        window.LabCore.showToast('Video bilgileri alındı!');
        return;
      } catch (err) {
        console.warn('oEmbed hatası:', err);
      }
    }

    if (rawUrl.includes('instagram.com')) {
      resultCard.style.display = 'grid';
      platform.textContent = rawUrl.includes('/reel') ? 'Instagram Reels' : 'Instagram Medya';
      title.textContent = 'Instagram Video Gönderisi';
      author.textContent = '@instagram';
      thumb.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80';
      removeExistingProgressBar();
      window.LabCore.showToast('Instagram linki hazır!');
      return;
    }

    if (rawUrl.includes('x.com') || rawUrl.includes('twitter.com')) {
      resultCard.style.display = 'grid';
      platform.textContent = 'X (Twitter) Video';
      title.textContent = 'X Medya Akışı';
      author.textContent = '@x';
      thumb.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80';
      removeExistingProgressBar();
      window.LabCore.showToast('X linki hazır!');
      return;
    }

    resultCard.style.display = 'grid';
    platform.textContent = 'Evrensel Medya';
    title.textContent = 'Medya Bağlantısı';
    author.textContent = rawUrl;
    thumb.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80';
    removeExistingProgressBar();
    window.LabCore.showToast('Bağlantı algılandı.');
  });

  downloadBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      const rawUrl = urlInput.value.trim();
      const format = btn.dataset.format;

      if (!rawUrl) {
        window.LabCore.showToast('Lütfen önce bir link analiz edin.', 'warning');
        return;
      }

      btn.disabled = true;
      downloadBtns.forEach(b => { b.style.pointerEvents = 'none'; });

      const progress = window.LabCore.createLabProgress(resultBody, `${format.toUpperCase()} hazırlanıyor...`);
      progress.startAuto(85, 450);

      try {
        const response = await fetch(`${window.LabCore.API_BASE}/api/download`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: rawUrl, format: format })
        });

        const data = await response.json();

        if (response.ok && data.download_url) {
          progress.success('Dosya hazır, aktarılıyor!');
          window.LabCore.showToast('İndirme tamamlandı!');

          const downloadEndpoint = `${window.LabCore.API_BASE}${data.download_url}`;
          window.LabCore.triggerDownload(downloadEndpoint, '');
        } else {
          progress.error(data.detail || 'İndirme hatası.');
          window.LabCore.showToast(data.detail || 'İndirme hatası.', 'error');
        }
      } catch (err) {
        progress.error('Backend sunucusuna bağlanılamadı.');
        window.LabCore.showToast('Backend sunucusuna bağlanılamadı.', 'error');
      } finally {
        btn.disabled = false;
        downloadBtns.forEach(b => { b.style.pointerEvents = 'auto'; });
      }
    });
  });

  function removeExistingProgressBar() {
    const existing = resultBody ? resultBody.querySelector('.lab-progress-wrap') : null;
    if (existing) existing.remove();
  }

  function extractYouTubeID(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  }
}