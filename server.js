const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// 增加请求体大小限制以支持 base64 图片
app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ===== 数据存储 =====
const DATA_FILE = path.join(__dirname, 'data.json');

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch (e) { console.error('加载数据失败:', e.message); }
  return {
    scores: { personA: { name: '你的名字', points: 80 }, personB: { name: 'TA的名字', points: 73 } },
    activities: [],
    totalCompleted: 0
  };
}

function saveData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) { console.error('保存数据失败:', e.message); }
}

let appData = loadData();

// ===== REST API =====
app.get('/api/data', (req, res) => {
  res.json(appData);
});

app.post('/api/reset', (req, res) => {
  appData = {
    scores: { personA: { name: '你的名字', points: 80 }, personB: { name: 'TA的名字', points: 73 } },
    activities: [],
    totalCompleted: 0
  };
  saveData(appData);
  io.emit('dataUpdate', appData);
  io.emit('reset');
  res.json({ success: true });
});

// ===== Socket.IO 实时通信 =====
io.on('connection', (socket) => {
  console.log('💌 新连接:', socket.id);
  socket.emit('dataUpdate', appData);

  // —— 加分：直接生效，通知对方 ——
  socket.on('applyBonus', (payload) => {
    const { person, taskId, taskTitle, points, note } = payload;

    if (!['personA', 'personB'].includes(person)) return;
    if (points <= 0) return;

    const pts = Math.abs(points);

    // 加分
    appData.scores[person].points += pts;

    // 写活动日志
    const activity = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      person,
      taskId,
      taskTitle,
      points: pts,
      type: 'bonus',
      note: note || '',
      timestamp: Date.now()
    };

    appData.activities.unshift(activity);
    appData.totalCompleted++;
    if (appData.activities.length > 100) appData.activities = appData.activities.slice(0, 100);

    saveData(appData);
    io.emit('dataUpdate', appData);
    // 通知对方有人加分了
    io.emit('bonusApplied', { activity, scores: appData.scores, target: person });
  });

  // —— 扣分（不需确认，原因必填，截图可选） ——
  socket.on('applyPenalty', (payload) => {
    const { person, taskId, taskTitle, points, note, attachments } = payload;

    if (!['personA', 'personB'].includes(person)) return;

    const actualPoints = -Math.abs(points);
    const activity = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      person,
      taskId,
      taskTitle,
      points: actualPoints,
      type: 'penalty',
      note: note || '',
      attachments: attachments || [],
      timestamp: Date.now()
    };

    appData.scores[person].points += actualPoints;
    appData.activities.unshift(activity);
    appData.totalCompleted++;

    if (appData.activities.length > 100) appData.activities = appData.activities.slice(0, 100);

    saveData(appData);
    io.emit('dataUpdate', appData);
    io.emit('penaltyApplied', { activity, scores: appData.scores });
  });

  // —— 更新昵称 ——
  socket.on('updateName', (payload) => {
    const { person, name } = payload;
    if (['personA', 'personB'].includes(person) && name && name.trim()) {
      appData.scores[person].name = name.trim();
      saveData(appData);
      io.emit('dataUpdate', appData);
    }
  });

  socket.on('disconnect', () => {
    console.log('👋 断开连接:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🌱 好感度记录簿运行在 http://0.0.0.0:${PORT}`);
});
