document.addEventListener('DOMContentLoaded', function() {
    feather.replace();

    const youtubeUrlInput = document.getElementById('youtube-url');
    const pasteBtn = document.getElementById('paste-btn');
    const formatSelect = document.getElementById('format-select');
    const qualitySelect = document.getElementById('quality-select');
    const audioQualitySelect = document.getElementById('audio-quality-select');
    const qualityContainer = document.getElementById('quality-container');
    const audioQualityContainer = document.getElementById('audio-quality-container');
    const downloadBtn = document.getElementById('download-btn');

    pasteBtn.addEventListener('click', async function() {
        try {
            const text = await navigator.clipboard.readText();
            youtubeUrlInput.value = text;
            showNotification('URL успешно вставлен!', 'success');
        } catch (err) {
            showNotification('Не удалось вставить из буфера обмена.', 'error');
        }
    });

    youtubeUrlInput.addEventListener('input', function() {
        const url = this.value.trim();
        if (isValidYoutubeUrl(url)) {
            const videoId = extractYouTubeID(url);
            if (videoId) {
                document.getElementById('preview-container').classList.remove('hidden');
                document.getElementById('youtube-preview').src = `https://www.youtube.com/embed/${videoId}?autoplay=0`;
            }
        } else {
            document.getElementById('preview-container').classList.add('hidden');
            document.getElementById('youtube-preview').src = '';
        }
    });

    function extractYouTubeID(url) {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    }

    formatSelect.addEventListener('change', function() {
        if (this.value === 'mp3') {
            qualityContainer.classList.add('hidden');
            audioQualityContainer.classList.remove('hidden');
        } else {
            qualityContainer.classList.remove('hidden');
            audioQualityContainer.classList.add('hidden');
        }
    });
    
    downloadBtn.addEventListener('click', function() {
        const url = youtubeUrlInput.value.trim();
        const format = formatSelect.value;
        const quality = format === 'mp3' ? audioQualitySelect.value : qualitySelect.value;
        
        if (!url) {
            showNotification('Пожалуйста, введите URL-адрес видео на YouTube.', 'error');
            return;
        }
        if (!isValidYoutubeUrl(url)) {
            showNotification('Пожалуйста, введите действительный URL-адрес YouTube.', 'error');
            return;
        }
        
        Download(url, format, quality);
    });
    
    function isValidYoutubeUrl(url) {
        const regExp = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
        return regExp.test(url);
    }
    
    function Download(url, format, quality) {
        downloadBtn.disabled = true;
        const originalText = downloadBtn.innerHTML;
        downloadBtn.innerHTML = '<i data-feather="loader" class="mr-2 animate-spin"></i>Обработка...';
        feather.replace();
        
        fetch('/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, format, quality })
        })
        .then(response => response.json())
        .then(data => {
            showNotification(data.message, data.what);
            if (data.what === 'success' && data.filename) {
                window.location.href = '/get_file/' + data.filename;
            }
        })
        .catch(error => {
            showNotification('Ошибка сети: ' + error, 'error');
        })
        .finally(() => {
            downloadBtn.disabled = false;
            downloadBtn.innerHTML = originalText;
            feather.replace();
        });
    }
    
    function showNotification(message, type) {
        const existing = document.querySelector('.notification');
        if (existing) existing.remove();
        
        const notification = document.createElement('div');
        notification.className = `notification fixed top-4 right-4 px-6 py-4 rounded-lg shadow-lg text-white font-medium z-50 transform transition-transform duration-300 ${
            type === 'success' ? 'bg-green-500' : 'bg-red-500'
        }`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(150%)';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
});