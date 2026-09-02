// 获取当前用户信息
(async function() {
    const res = await fetch('/api/me');
    const data = await res.json();
    if (!data.loggedIn || data.role !== 'uploader') {
        window.location.href = '/login.html';
        return;
    }
    document.getElementById('userName').textContent = data.name || '3号选手';
})();

// Socket 连接 (携带用户信息)
const socket = io({
    query: {
        username: document.getElementById('userName').textContent,
        role: 'uploader'
    }
});

// 初始化文件列表
socket.on('init-files', (files) => {
    renderTable(files);
});

// 文件上传 (HTTP)
async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file); // 实际我们只传元数据，因为模拟云端不存真实文件
    // 我们改为传元数据
    const meta = {
        fileName: file.name,
        fileType: file.type || '未知',
        fileSize: file.size
    };
    const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(meta)
    });
    const result = await res.json();
    if (result.success) {
        document.getElementById('uploadStatus').textContent = `✅ 文件 "${file.name}" 上传成功！`;
        // socket 会广播，不需手动刷新
    } else {
        document.getElementById('uploadStatus').textContent = `❌ 上传失败: ${result.error}`;
    }
}

// 监听新文件 (上传者也能看到)
socket.on('new-file', (file) => {
    // 追加到表格
    addFileToTable(file);
});

function renderTable(files) {
    const tbody = document.getElementById('fileTableBody');
    document.getElementById('fileCount').textContent = files.length + ' 个文件';
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
    const tbody = document.getElementById('fileTableBody');
    const row = document.createElement('tr');
    row.innerHTML = `
        <td><span style="color:#D4AF37;">📄</span> ${file.name}</td>
        <td>${file.type}</td>
        <td>${file.size}</td>
        <td>${file.time}</td>
        <td>${file.uploader || '系统'}</td>
    `;
    tbody.prepend(row);
    document.getElementById('fileCount').textContent = 
        parseInt(document.getElementById('fileCount').textContent) + 1 + ' 个文件';
}

// 拖拽/点击上传
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');

dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.style.borderColor = '#D4AF37'; });
dropZone.addEventListener('dragleave', () => { dropZone.style.borderColor = 'rgba(212,175,55,0.3)'; });
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
});
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) uploadFile(e.target.files[0]);
    fileInput.value = '';
});

// 退出
document.getElementById('logoutBtn').addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/login.html';
});