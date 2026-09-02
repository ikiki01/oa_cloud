require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
});

// ---------- 中间件 ----------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session 配置 (生产环境请使用 redis 或数据库)
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-super-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 1天
}));

// ---------- 模拟用户数据库 ----------
const USERS = {
    'user3': { password: '123456', role: 'uploader', name: '3号选手' },
    'user4': { password: '123456', role: 'receiver', name: '4号选手' },
};

// ---------- 模拟云端文件存储 ----------
let cloudFiles = [];
let fileIdCounter = 1;

// ---------- 路由 ----------

// 登录 API
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = USERS[username];
    if (!user || user.password !== password) {
        return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }
    req.session.user = { username, role: user.role, name: user.name };
    res.json({ success: true, role: user.role, name: user.name });
});

// 登出
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// 检查登录状态 (用于前端路由守卫)
app.get('/api/me', (req, res) => {
    if (req.session.user) {
        res.json({ loggedIn: true, ...req.session.user });
    } else {
        res.json({ loggedIn: false });
    }
});

// 获取文件列表 (需登录)
app.get('/api/files', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: '未登录' });
    res.json(cloudFiles);
});

// 上传文件 (需登录，仅 uploader 允许)
app.post('/api/upload', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: '未登录' });
    if (req.session.user.role !== 'uploader') {
        return res.status(403).json({ error: '无权限上传' });
    }
    const { fileName, fileType, fileSize } = req.body;
    // 模拟文件保存，实际应该保存到磁盘或云存储，这里仅存元数据
    const newFile = {
        id: fileIdCounter++,
        name: fileName,
        type: fileType || '未知',
        size: (fileSize / 1024).toFixed(2) + ' KB',
        time: new Date().toLocaleString('zh-CN'),
        uploader: req.session.user.name,
    };
    cloudFiles.unshift(newFile);

    // 广播给所有接收者 (receiver 角色)
    io.to('receiver-room').emit('new-file', newFile);

    res.json({ success: true, file: newFile });
});

// ---------- Socket.IO ----------
io.use((socket, next) => {
    // 从 handshake 中获取 session (需要额外中间件，简便起见，使用查询参数传递 sessionId)
    // 但我们这里使用 session 共享，需要安装 express-socket.io-session，这里做简化，
    // 我们通过查询参数传递 userId (临时方案)
    // 实际生产应使用 jwt 或共享 session。
    // 这里演示：客户端连接时带上 username 和 role (登录后前端存储)
    const { username, role } = socket.handshake.query;
    if (username && role) {
        socket.data.username = username;
        socket.data.role = role;
        return next();
    }
    // 若无，拒绝连接
    next(new Error('认证失败'));
});

io.on('connection', (socket) => {
    console.log(`客户端连接: ${socket.id}, 用户: ${socket.data.username}`);

    // 将接收者加入专门房间
    if (socket.data.role === 'receiver') {
        socket.join('receiver-room');
        // 发送现有文件列表
        socket.emit('init-files', cloudFiles);
    }

    // 上传者也可以查看文件列表 (但不上传，仅查看)
    if (socket.data.role === 'uploader') {
        socket.emit('init-files', cloudFiles);
    }

    socket.on('disconnect', () => {
        console.log('客户端断开');
    });
});

// ---------- 启动服务器 ----------
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
});