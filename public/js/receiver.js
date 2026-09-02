(async function() {
    const res = await fetch('/api/me');
    const data = await res.json();
    if (!data.loggedIn || data.role !== 'receiver') {
        window.location.href = '/login.html';
        return;
    }
    document.getElementById('userName').textContent = data.name || '4号选手';
})();

// Socket 连接
const socket = io({
    query: {
        username: document.getElementById('userName').textContent,
        role: 'receiver'
    }
});

// 初始化文件列表
socket.on('init-files', (files) => {
    renderTable(files);
});

// 新文件到来 → 触发醒目提醒
socket.on('new-file', (file) => {
    addFileToTable(file);
    triggerAlert(file);
});

function renderTable(files) {
    const tbody = document.getElementById('receiverTableBody');
    document.getElementById('receiverFileCount').textContent = files.length + ' 个文件';
    tbody.innerHTML = files.map(f => `
        <tr>
            <td><span style="color:#D4AF37;">📄</span> ${f.name}</td>
            <td>${f.type}</td>
            <td>${f.size}</td>
            <td>${f.time}</td>
            <td>${f.uploader || '系统'}</td>
        </tr>
    `).join('');
}

function addFileToTable(file) {
    const tbody = document.getElementById('receiverTableBody');
    const row = document.createElement('tr');
    row.innerHTML = `
        <td><span style="color:#D4AF37;">📄</span> ${file.name}</td>
        <td>${file.type}</td>
        <td>${file.size}</td>
        <td>${file.time}</td>
        <td>${file.uploader || '系统'}</td>
    `;
    tbody.prepend(row);
    document.getElementById('receiverFileCount').textContent = 
        parseInt(document.getElementById('receiverFileCount').textContent) + 1 + ' 个文件';
}

// ----- 醒目提醒 -----
function triggerAlert(file) {
    const banner = document.getElementById('liveBanner');
    const overlay = document.getElementById('alertOverlay');
    const fileNameEl = document.getElementById('alertFileName');

    // 横幅
    banner.textContent = `⚡ 新战略文件 "${file.name}" 已到达云端！请立即整合！`;
    banner.classList.remove('banner-hidden');
    banner.classList.add('banner-show');

    // 弹窗
    fileNameEl.textContent = file.name;
    overlay.classList.remove('hidden');

    // 自动关闭（15秒后）
    setTimeout(() => {
        closeAlert();
    }, 15000);
}

window.closeAlert = function() {
    document.getElementById('alertOverlay').classList.add('hidden');
    document.getElementById('liveBanner').classList.remove('banner-show');
    document.getElementById('liveBanner').classList.add('banner-hidden');
};

// 退出
document.getElementById('logoutBtn').addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/login.html';
});