document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const errorEl = document.getElementById('loginError');

    if (!username || !password) {
        errorEl.textContent = '请填写完整信息';
        errorEl.style.display = 'block';
        return;
    }

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (data.success) {
            // 根据角色跳转
            if (data.role === 'uploader') {
                window.location.href = '/upload.html';
            } else if (data.role === 'receiver') {
                window.location.href = '/receiver.html';
            }
        } else {
            errorEl.textContent = data.message || '登录失败';
            errorEl.style.display = 'block';
        }
    } catch (err) {
        errorEl.textContent = '网络错误，请重试';
        errorEl.style.display = 'block';
    }
});