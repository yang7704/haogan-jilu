const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const https = require('https');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// 增加请求体大小限制以支持 base64 图片
app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ===== JSONBin.io 云端存储配置 =====
const JSONBIN_BIN_ID = '6A43d9CBDA38895dFE1691BF';
const JSONBIN_API_KEY = '$2a$10$0rwI/HIB7qKb4jLiVAr3gOHSGDX3DNoFoXuYs6YCFn9xSaZPxTcW.';
const JSONBIN_URL = 'https://api.jsonbin.io/v3/b';

// 本地缓存文件（备用）
const DATA_FILE = path.join(__dirname, 'data.json');

// 从 JSONBin 读取数据
function loadDataFromCloud(callback) {
  const options = {
    hostname: 'api.jsonbin.io',
    path: '/v3/b/' + JSONBIN_BIN_ID + '/latest',
    method: 'GET',
    headers: {
      'X-Master-Key': JSONBIN_API_KEY,
      'Content-Type': 'application/json'
    }
  };

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        if (json.record) {
          console.log('✅ 从云端读取数据成功');
          callback(null, json.record);
        } else {
          console.error('云端数据格式异常:', data);
          callback(new Error('云端数据格式异常'), null);
        }
      } catch (e) {
        console.error('解析云端数据失败:', e.message, data);
        callback(e, null);
      }
    });
  });

  req.on('error', (e) => {
    console.error('读取云端数据失败:', e.message);
    callback(e, null);
  });

  req.end();
}

// 保存数据到 JSONBin
function saveDataToCloud(data, callback) {
  const postData = JSON.stringify(data);

  const options = {
    hostname: 'api.jsonbin.io',
    path: '/v3/b/' + JSONBIN_BIN_ID,
    method: 'PUT',
    headers: {
      'X-Master-Key': JSONBIN_API_KEY,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = https.request(options, (res) => {
    let responseData = '';
    res.on('data', chunk => responseData += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(responseData);
        if (json.success || res.statusCode === 200) {
          console.log('✅ 数据已保存到云端');
          if (callback) callback(null);
        } else {
          console.error('保存云端数据失败:', responseData);
          if (callback) callback(new Error('保存失败'));
        }
      } catch (e) {
        console.error('解析保存响应失败:', e.message);
        if (callback) callback(e);
      }
    });
  });

  req.on('error', (e) => {
    console.error('保存云端数据失败:', e.message);
    if (callback) callback(e);
  });

  req.write(postData);
  req.end();
}

// 加载数据（优先云端，失败用本地）
function loadData() {
  return {
    scores: { personA: { name: '小帅', points: 80 }, personB: { name: '一个大聪明', points: 74 } },
    activities: [],
    totalCompleted: 0
  };
}

let appData = loadData();
let dataLoaded = false;

// 启动时从云端加载数据
loadDataFromCloud((err, data) => {
  if (!err && data) {
    appData = data;
    dataLoaded = true;
    // 备份到本地
    try { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8'); } catch(e) {}
    console.log('🌐 云端数据已加载');
  } else {
    // 云端失败，尝试本地
    try {
      if (fs.existsSync(DATA_FILE)) {
        appData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        dataLoaded = true;
        console.log('💾 使用本地数据（云端不可用）');
      }
    } catch (e) {
      console.error('加载本地数据失败:', e.message);
    }
  }
});

// 保存数据（保存到云端 + 本地备份）
function saveData(data) {
  // 先保存到云端
  saveDataToCloud(data, (err) => {
    if (err) {
      console.error('⚠️ 云端保存失败，仅保存到本地');
    }
  });
  // 本地备份
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) { console.error('保存本地备份失败:', e.message); }
}

// ===== REST API =====
app.get('/api/data', (req, res) => {
  // 如果云端数据还没加载完，先试试重新加载
  if (!dataLoaded) {
    loadDataFromCloud((err, data) => {
      if (!err && data) {
        appData = data;
        dataLoaded = true;
      }
      res.json(appData);
    });
  } else {
    res.json(appData);
  }
});

app.post('/api/reset', (req, res) => {
  appData = {
    scores: { personA: { name: '小帅', points: 80 }, personB: { name: '一个大聪明', points: 74 } },
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

  // —— 加分：直接生效 + 通知对方 ——
  socket.on('applyBonus', (payload) => {
    const { person, taskId, taskTitle, points, note, attachments } = payload;
    if (!['personA', 'personB'].includes(person)) return;
    if (points <= 0) return;

    const activity = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      person,
      taskId,
      taskTitle,
      points: Math.abs(points),
      type: 'bonus',
      note: note || '',
      attachments: attachments || [],
      timestamp: Date.now()
    };

    appData.scores[person].points += Math.abs(points);
    appData.activities.unshift(activity);
    appData.totalCompleted++;

    if (appData.activities.length > 100) appData.activities = appData.activities.slice(0, 100);

    saveData(appData);
    io.emit('dataUpdate', appData);
    // 通知对方
    io.emit('bonusNotified', { activity, scores: appData.scores });
  });

  // —— 扣分（需理由，截图可选） ——
  socket.on('applyPenalty', (payload) => {
    const { person, taskId, taskTitle, points, note, attachments } = payload;
    if (!['personA', 'personB'].includes(person)) return;
    if (!note || !note.trim()) return; // 理由必填

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
