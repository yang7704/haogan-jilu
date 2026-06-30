// ===== 好感度记录簿 - 前端逻辑 =====

// ===== 加分行为 =====
const bonusTasks = [
  { id: 'b0', icon: '💬', title: '今天和你聊天很开心，主动表达好感', desc: '聊完后真心说一句表扬或温暖的话，不藏心里', points: 1, time: '约5分钟' },
  { id: 'b00', icon: '🎮', title: '一起打游戏配合默契/玩得超开心', desc: '联机不吵架，互相配合，赢了一起狂输了一起扛', points: 1, time: '约1小时' },
  { id: 'b1', icon: '💬', title: '主动发起一次深度话题聊天', desc: '聊聊三观、童年、梦想之类的，不是日常寒暄', points: 2, time: '约1小时' },
  { id: 'b2', icon: '🎵', title: '分享一首有意义的歌并说明理由', desc: '不是随手转发，而是告诉TA为什么想到TA', points: 1, time: '约30分钟' },
  { id: 'b3', icon: '🧠', title: '记住对方提过的小细节并提起', desc: '"你上次说喜欢xxx，我今天看到这个就想到了"', points: 2, time: '约30分钟' },
  { id: 'b4', icon: '📸', title: '分享今日生活碎片', desc: '精心拍一组合照式的日常照片+一段文字分享', points: 1, time: '约30分钟' },
  { id: 'b5', icon: '🤝', title: '在对方低落时主动关心陪伴', desc: '不是敷衍的"抱抱"，而是认真倾听和回应', points: 2, time: '约1小时' },
  { id: 'b6', icon: '🎬', title: '推荐一部电影/书并说明推荐理由', desc: '认真挑选一部觉得TA会喜欢的，写好推荐语', points: 1, time: '约40分钟' },
  { id: 'b7', icon: '📞', title: '语音通话30分钟以上', desc: '好好聊天，不要一边刷手机一边嗯嗯啊啊', points: 2, time: '约30分钟' },
  { id: 'b8', icon: '🍿', title: '一起在线看一部电影', desc: '同步播放，边看边用文字或语音吐槽', points: 2, time: '约2小时' },
  { id: 'b9', icon: '📦', title: '寄一个小礼物或明信片', desc: '不需要贵重，能让对方摸到的东西最有温度', points: 3, time: '约1小时' },
  { id: 'b10', icon: '🔍', title: '分享一个自己的小故事', desc: '讲一件TA不知道的关于你的事，拉近距离', points: 2, time: '约30分钟' },
  { id: 'b11', icon: '🎮', title: '一起在线玩一次游戏', desc: '找一个两人都能玩的联机游戏，一起闯关', points: 2, time: '约1小时' },
  { id: 'b12', icon: '🌤️', title: '早上主动发一条有趣的消息', desc: '开启一天的话题，让对方醒来看到心情好', points: 1, time: '约15分钟' },
  { id: 'b13', icon: '🎤', title: '录一段语音说说今天的事', desc: '声音比文字更有温度，让对方听到你的语气', points: 1, time: '约30分钟' },
  { id: 'b14', icon: '💡', title: '精心准备一个有趣的话题', desc: '不是"吃了吗"，而是能让对话延续的好问题', points: 1, time: '约20分钟' },
  { id: 'b15', icon: '👀', title: '认真看完对方推荐的东西并反馈', desc: 'TA推荐的电影/书/歌，看完认真聊聊感受', points: 2, time: '约2小时' },
  { id: 'b16', icon: '📅', title: '记住对方的重要日期并提前祝福', desc: '考试、面试、生日，提前设好提醒主动祝福', points: 2, time: '约30分钟' },
];

// ===== 扣分提醒 =====
const penaltyTasks = [
  { id: 'p1', icon: '⏳', title: '超过24小时不回复消息', desc: '忙可以理解，但24小时一句都不回就有点说不过去了', points: -1 },
  { id: 'p2', icon: '👻', title: '连续3天不主动联系', desc: '单向维持的关系走不远，互动的节奏感很重要', points: -2 },
  { id: 'p3', icon: '📴', title: '约定好的通话临时取消', desc: '偶尔有急事可以理解，频繁取消会让人失落', points: -1 },
  { id: 'p4', icon: '😐', title: '消息回复特别敷衍', desc: '"嗯""哦""好的"连击，比不回消息更让人心累', points: -1 },
  { id: 'p5', icon: '🫥', title: '对方明显不开心时完全没察觉', desc: '不是说一定要哄，但至少要发现对方状态不对', points: -1 },
  { id: 'p6', icon: '🧊', title: '忽冷忽热让人摸不着头脑', desc: '今天聊得火热明天消失，这种落差很消耗好感', points: -2 },
];

// ===== 身份系统 =====
const IDENTITY_KEY = 'love_points_identity';
let viewerIdentity = null;

function getStoredIdentity() {
  try { return localStorage.getItem(IDENTITY_KEY); } catch(e) { return null; }
}
function storeIdentity(id) {
  try { localStorage.setItem(IDENTITY_KEY, id); } catch(e) {}
}

// ===== Socket.IO 连接 =====
let socket = null;
let useServer = false;
try {
  socket = io({ timeout: 3000, reconnectionAttempts: 2 });
  socket.on('connect', () => { useServer = true; });
} catch(e) {}

// ===== 状态 =====
let appData = null;
let currentTask = null;
let selectedPerson = 'personB';
let pendingAttachments = [];

const DEFAULT_DATA = {
  scores: { personA: { name: '小帅', points: 80 }, personB: { name: '一个大聪明', points: 73 } },
  activities: [],
  totalCompleted: 0
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ===== 初始化 =====
function init() {
  // 1. 尝试从 URL 参数获取身份
  const params = new URLSearchParams(window.location.search);
  const meParam = params.get('me');
  if (meParam === 'A' || meParam === 'B') {
    viewerIdentity = meParam === 'A' ? 'personA' : 'personB';
    storeIdentity(viewerIdentity);
  }

  // 2. 如果 URL 没有，检查本地存储
  if (!viewerIdentity) {
    const stored = getStoredIdentity();
    if (stored) {
      viewerIdentity = stored;
    }
  }

  // 3. 都没有，显示身份选择
  if (!viewerIdentity) {
    showIdentityPicker();
    return;
  }

  hideIdentityPicker();
  setupApp();
}

function setupApp() {
  loadLocalFallback();
  setTimeout(() => {
    if (!useServer && !appData) {
      appData = loadLocalData();
      updateUI();
      showToast('📱 离线模式 — 数据保存在本设备');
    }
  }, 2500);

  renderTasks();
  setupTabs();
  setupModal();
  setupNameEditing();
  setupAttachmentArea();
  createParticles();
}

// ===== 身份选择弹窗 =====
function showIdentityPicker() {
  const overlay = $('#identityOverlay');
  if (overlay) overlay.style.display = 'flex';

  const cards = $$('.identity-card');
  cards.forEach(card => {
    card.addEventListener('click', () => {
      const identity = card.dataset.identity;
      viewerIdentity = identity;
      storeIdentity(identity);
      hideIdentityPicker();
      setupApp();
    });
  });

  const switchLink = $('#switchIdentity');
  if (switchLink) {
    switchLink.addEventListener('click', (e) => {
      e.preventDefault();
      storeIdentity(null);
      try { localStorage.removeItem('love_points_data'); } catch(e) {}
      location.reload();
    });
  }
}

function hideIdentityPicker() {
  const overlay = $('#identityOverlay');
  if (overlay) overlay.style.display = 'none';
}

// 视角切换：登录者始终显示"我"
function getDisplayName(person) {
  if (!viewerIdentity) return appData?.scores[person]?.name || (person === 'personA' ? '左边' : '右边');
  if (person === viewerIdentity) return '我';
  return appData?.scores[person]?.name || 'TA';
}

function getAvatar(person) {
  // personA = 小帅（男生头像），personB = 一个大聪明（女生头像）
  // 不受 viewerIdentity 影响，固定对应
  if (person === 'personA') return '/images/avatar-me.jpg';
  return '/images/avatar-ta.jpg';
}

function getLeftPerson() { return viewerIdentity || 'personA'; }
function getRightPerson() { return viewerIdentity === 'personA' ? 'personB' : 'personA'; }

// ===== 本地存储 =====
const STORAGE_KEY = 'love_points_data';
const DATA_VERSION = 4;
function loadLocalData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data._version === DATA_VERSION) return data;
    }
  } catch(e) {}
  const defaults = JSON.parse(JSON.stringify(DEFAULT_DATA));
  defaults._version = DATA_VERSION;
  return defaults;
}
function saveLocalData(data) {
  try { data._version = DATA_VERSION; localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch(e) {}
}
function loadLocalFallback() {
  if (!useServer && !appData) { appData = loadLocalData(); updateUI(); }
}

// ===== Socket 事件 =====
if (socket) {
  socket.on('dataUpdate', (data) => {
    appData = data;
    saveLocalData(data);
    updateUI();
  });

  // 收到加分通知
  socket.on('bonusApplied', ({ activity, scores, target }) => {
    // 只有被加分的那个人（target）收到通知
    if (target === viewerIdentity) {
      const personName = getDisplayName(activity.person);
      let msg = personName + ' 给你加了 +' + activity.points + '分！';
      if (activity.note) msg += ' 📝 ' + activity.note;
      showToast(msg);
      showScorePop(activity.points);
      spawnConfetti();
    } else {
      // 加分的人自己看到确认提示
      showToast('已为 ' + getDisplayName(activity.person) + ' 加 +' + activity.points + '分 ✅');
      showScorePop(activity.points);
    }
  });

  socket.on('penaltyApplied', ({ activity }) => {
    showScorePop(activity.points);
    const leftPerson = getLeftPerson();
    const card = activity.person === leftPerson ? $('#personACard') : $('#personBCard');
    card.classList.add('flash');
    setTimeout(() => card.classList.remove('flash'), 600);
    let msg = getDisplayName(activity.person) + ' ' + activity.taskTitle + ' ' + activity.points + '分';
    if (activity.note) msg += ' 📝 ' + activity.note;
    showToast(msg);
  });

  socket.on('reset', () => { showToast('🔄 积分已重置'); });
}

// ===== 更新界面 =====
function updateUI() {
  if (!appData) return;
  const { scores, activities, totalCompleted } = appData;

  const left = getLeftPerson();
  const right = getRightPerson();

  animateScore('personAScore', scores[left].points);
  animateScore('personBScore', scores[right].points);
  $('#personAName').textContent = '我';
  $('#personBName').textContent = scores[right].name;

  const avatarA = $('#personACard').querySelector('.person-avatar-img');
  const avatarB = $('#personBCard').querySelector('.person-avatar-img');
  if (avatarA) avatarA.src = getAvatar(left);
  if (avatarB) avatarB.src = getAvatar(right);

  const total = scores.personA.points + scores.personB.points;
  animateScore('totalScore', total, true);

  const maxPoints = Math.max(Math.abs(scores.personA.points), Math.abs(scores.personB.points), 50);
  const maxBar = Math.max(maxPoints * 1.3, 60);
  const leftBar = $('#personABar'); const rightBar = $('#personBBar');
  if (leftBar) leftBar.style.width = Math.min(Math.max((scores[left].points / maxBar) * 100, 2), 100) + '%';
  if (rightBar) rightBar.style.width = Math.min(Math.max((scores[right].points / maxBar) * 100, 2), 100) + '%';
  $('#totalCompleted').textContent = totalCompleted;

  renderActivities(activities);
}

function animateScore(elementId, newValue) {
  const el = $('#' + elementId);
  if (!el) return;
  const oldValue = parseInt(el.textContent) || 0;
  if (oldValue === newValue) return;
  const duration = 600;
  const start = performance.now();
  function step(timestamp) {
    const progress = Math.min((timestamp - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(oldValue + (newValue - oldValue) * eased);
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
  el.style.transform = 'scale(1.3)';
  setTimeout(() => { el.style.transform = 'scale(1)'; }, 300);
}

// ===== 渲染任务列表 =====
function renderTasks() {
  const bonusList = $('#bonusTasks');
  const penaltyList = $('#penaltyTasks');

  bonusList.innerHTML = bonusTasks.map(t =>
    '<div class="task-item" data-task-id="' + t.id + '" data-type="bonus" data-points="' + t.points + '" data-title="' + t.title + '">' +
    '<div class="task-icon">' + t.icon + '</div>' +
    '<div class="task-content"><div class="task-title">' + t.title + '</div><div class="task-desc">' + t.desc + '</div></div>' +
    '<div class="task-points"><span class="points-bonus">+' + t.points + '分</span><div class="task-time">' + t.time + '</div></div></div>'
  ).join('');

  penaltyList.innerHTML = penaltyTasks.map(t =>
    '<div class="task-item penalty-item" data-task-id="' + t.id + '" data-type="penalty" data-points="' + t.points + '" data-title="' + t.title + '">' +
    '<div class="task-icon">' + t.icon + '</div>' +
    '<div class="task-content"><div class="task-title">' + t.title + '</div><div class="task-desc">' + t.desc + '</div></div>' +
    '<div class="task-points"><span class="points-penalty">' + t.points + '分</span></div></div>'
  ).join('');

  bonusList.querySelectorAll('.task-item').forEach(item => {
    item.addEventListener('click', () => openCompleteModal(item.dataset));
  });
  penaltyList.querySelectorAll('.task-item').forEach(item => {
    item.addEventListener('click', () => openCompleteModal(item.dataset));
  });
}

// ===== 标签切换 =====
function setupTabs() {
  const tabs = $$('.tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.tab;
      $('#bonusTasks').classList.toggle('active', target === 'bonus');
      $('#penaltyTasks').classList.toggle('active', target === 'penalty');
    });
  });
}

// ===== 弹窗逻辑 =====
function setupModal() {
  $('#cancelComplete').addEventListener('click', closeModal);
  $('#confirmComplete').addEventListener('click', () => {
    if (!currentTask) return;
    if (currentTask.type === 'bonus') {
      confirmBonusTask();
    } else {
      confirmPenaltyTask();
    }
  });
  $('#selectPersonA').addEventListener('click', () => selectModalPerson('personA'));
  $('#selectPersonB').addEventListener('click', () => selectModalPerson('personB'));
  $('#completeModal').addEventListener('click', (e) => {
    if (e.target === $('#completeModal')) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

function openCompleteModal(taskData) {
  currentTask = taskData;
  pendingAttachments = [];
  const { title, points, type } = taskData;
  const pts = parseInt(points);

  $('#modalTitle').textContent = title;

  // 更新弹窗中人物按钮文字
  if (viewerIdentity) {
    $('#selectPersonA').textContent = '我';
    $('#selectPersonB').textContent = getDisplayName(viewerIdentity === 'personA' ? 'personB' : 'personA');
  }

  const pointsEl = $('#modalPoints');

  if (type === 'bonus') {
    // 加分：直接生效，备注可选
    pointsEl.textContent = '+' + pts + ' 分';
    pointsEl.className = 'modal-points bonus';
    $('#completeModal').querySelector('.modal-heart').textContent = '✨';
    $('#confirmComplete').textContent = '✅ 确认提交';
    $('#modalNoteLabel').textContent = '备注（可选）';
    $('#modalNote').setAttribute('placeholder', '比如：手写了3页纸...（可不填）');
    $('#attachmentArea').style.display = 'none';
    $('#modalNoteRequired').style.display = 'none';
  } else {
    // 扣分：直接生效，原因必填，截图可选
    pointsEl.textContent = pts + ' 分';
    pointsEl.className = 'modal-points penalty';
    $('#completeModal').querySelector('.modal-heart').textContent = '📝';
    $('#confirmComplete').textContent = '⚠️ 确认提交';
    $('#modalNoteLabel').textContent = '原因（必填）';
    $('#modalNote').setAttribute('placeholder', '请说明具体原因，比如：昨天一整天没回消息...');
    $('#attachmentArea').style.display = 'block';
    $('#modalNoteRequired').style.display = 'block';
  }

  $('#modalNote').value = '';
  renderAttachmentPreviews();

  // 默认选中"我"
  if (viewerIdentity) {
    selectedPerson = viewerIdentity;
    selectModalPerson(viewerIdentity);
  } else {
    selectedPerson = 'personB';
    selectModalPerson('personB');
  }

  $('#completeModal').classList.add('active');
}

function closeModal() {
  $('#completeModal').classList.remove('active');
  currentTask = null;
  pendingAttachments = [];
  renderAttachmentPreviews();
}

function selectModalPerson(person) {
  selectedPerson = person;
  $('#selectPersonA').classList.toggle('active', person === 'personA');
  $('#selectPersonB').classList.toggle('active', person === 'personB');
}

// —— 加分提交（直接生效） ——
function confirmBonusTask() {
  if (!currentTask) return;
  const { taskId, title, points } = currentTask;
  const pts = parseInt(points);
  const note = $('#modalNote').value.trim();

  const payload = {
    person: selectedPerson,
    taskId,
    taskTitle: title,
    points: pts,
    type: 'bonus',
    note
  };

  if (useServer && socket && socket.connected) {
    socket.emit('applyBonus', payload);
  } else {
    // 离线模式：直接本地生效
    appData.scores[selectedPerson].points += pts;
    const activity = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      person: selectedPerson, taskId, taskTitle: title,
      points: pts, type: 'bonus', note,
      timestamp: Date.now()
    };
    appData.activities.unshift(activity);
    appData.totalCompleted++;
    if (appData.activities.length > 100) appData.activities = appData.activities.slice(0, 100);
    saveLocalData(appData);
    updateUI();
    showScorePop(pts);
    showToast(getDisplayName(selectedPerson) + ' +' + pts + '分 ✅');
  }

  closeModal();
}

// —— 扣分提交（直接生效，原因必填） ——
function confirmPenaltyTask() {
  if (!currentTask) return;
  const { taskId, title, points } = currentTask;
  const pts = parseInt(points);
  const note = $('#modalNote').value.trim();

  if (!note) {
    showToast('⚠️ 必须填写原因');
    return;
  }

  const payload = {
    person: selectedPerson,
    taskId,
    taskTitle: title,
    points: pts,
    type: 'penalty',
    note,
    attachments: pendingAttachments
  };

  if (useServer && socket && socket.connected) {
    socket.emit('applyPenalty', payload);
  } else {
    const actualPts = -Math.abs(pts);
    const activity = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      person: selectedPerson, taskId, taskTitle: title,
      points: actualPts, type: 'penalty', note,
      attachments: pendingAttachments,
      timestamp: Date.now()
    };
    appData.scores[selectedPerson].points += actualPts;
    appData.activities.unshift(activity);
    appData.totalCompleted++;
    if (appData.activities.length > 100) appData.activities = appData.activities.slice(0, 100);
    saveLocalData(appData);
    updateUI();
    showScorePop(actualPts);
    showToast(getDisplayName(selectedPerson) + ' ' + title + ' ' + actualPts + '分');
  }

  closeModal();
}

// ===== 图片附件处理 =====
function setupAttachmentArea() {
  const area = $('#attachmentDropZone');
  const input = $('#attachmentInput');

  area.addEventListener('click', () => input.click());

  input.addEventListener('change', (e) => {
    handleFiles(e.target.files);
    input.value = '';
  });

  area.addEventListener('dragover', (e) => { e.preventDefault(); area.classList.add('drag-over'); });
  area.addEventListener('dragleave', () => area.classList.remove('drag-over'));
  area.addEventListener('drop', (e) => {
    e.preventDefault();
    area.classList.remove('drag-over');
    handleFiles(e.dataTransfer.files);
  });

  document.addEventListener('paste', (e) => {
    if (!$('#completeModal').classList.contains('active')) return;
    if (!currentTask || currentTask.type !== 'penalty') return; // 只有扣分才允许粘贴截图
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        handleFiles([file]);
      }
    }
  });
}

function handleFiles(fileList) {
  for (const file of fileList) {
    if (!file.type.startsWith('image/')) continue;
    if (pendingAttachments.length >= 5) { showToast('最多添加5张图片'); break; }
    const reader = new FileReader();
    reader.onload = (e) => {
      pendingAttachments.push(e.target.result);
      renderAttachmentPreviews();
    };
    reader.readAsDataURL(file);
  }
}

function removeAttachment(index) {
  pendingAttachments.splice(index, 1);
  renderAttachmentPreviews();
}

function renderAttachmentPreviews() {
  const container = $('#attachmentPreviews');
  if (!container) return;
  container.innerHTML = pendingAttachments.map((src, i) =>
    '<div class="attach-preview"><img src="' + src + '" alt="截图' + (i+1) + '">' +
    '<button class="attach-remove" onclick="removeAttachment(' + i + ')">✕</button></div>'
  ).join('');
}

// ===== 昵称编辑 =====
function setupNameEditing() {
  const rightName = $('#personBName');
  if (rightName) {
    rightName.addEventListener('blur', () => {
      const right = getRightPerson();
      const name = rightName.textContent.trim();
      if (name && appData && name !== appData.scores[right]?.name) {
        appData.scores[right].name = name;
        if (useServer && socket && socket.connected) {
          socket.emit('updateName', { person: right, name });
        } else { saveLocalData(appData); updateUI(); }
      }
    });
    rightName.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); rightName.blur(); }
    });
  }

  // "我"不可编辑
  const leftName = $('#personAName');
  if (leftName) {
    leftName.contentEditable = 'false';
    leftName.style.cursor = 'default';
    leftName.style.borderBottom = 'none';
  }
}

// ===== 活动记录渲染 =====
function renderActivities(activities) {
  const list = $('#activityList');
  if (!activities || activities.length === 0) {
    list.innerHTML = '<div class="activity-empty">还没有记录，先从一件小事开始吧 ☕</div>';
    return;
  }

  list.innerHTML = activities.map(a => {
    let icon = '🌟';
    let cssClass = 'positive';
    let pointsText = '+' + a.points;

    if (a.type === 'penalty') {
      icon = '⚠️'; cssClass = 'negative'; pointsText = '' + a.points;
    }

    const time = new Date(a.timestamp).toLocaleString('zh-CN', {
      month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const personName = getDisplayName(a.person);

    const attachHTML = (a.attachments && a.attachments.length > 0) ?
      '<div class="activity-attachments">' +
      a.attachments.map(src => '<img src="' + src + '" class="activity-thumb" onclick="viewFullImage(this.src)" title="点击查看大图">').join('') +
      '</div>' : '';

    return '<div class="activity-item"><div class="activity-icon">' + icon + '</div>' +
      '<div class="activity-detail"><div><strong>' + personName + '</strong> ' + a.taskTitle + '</div>' +
      (a.note ? '<div class="activity-note">📝 ' + a.note + '</div>' : '') +
      attachHTML +
      '<div class="activity-meta">' + time + '</div></div>' +
      '<div class="activity-score ' + cssClass + '">' + pointsText + '</div></div>';
  }).join('');
}

function viewFullImage(src) {
  const overlay = document.createElement('div');
  overlay.className = 'img-viewer-overlay';
  overlay.innerHTML = '<img src="' + src + '" class="img-viewer-img">';
  overlay.addEventListener('click', () => overlay.remove());
  document.body.appendChild(overlay);
}

// ===== 特效 =====
function showScorePop(points) {
  const pop = $('#scorePop');
  const isPositive = points > 0;
  pop.textContent = (isPositive ? '+' : '') + points;
  pop.className = 'score-pop ' + (isPositive ? 'positive' : 'negative');
  pop.style.left = '50%'; pop.style.top = '45%';
  pop.style.transform = 'translate(-50%, -50%)';
  pop.style.animation = 'none'; pop.offsetHeight;
  pop.style.animation = 'popUp 1.2s ease-out forwards';
}

function spawnConfetti() {
  const emojis = ['🎉', '✨', '🌟', '🎊', '☕', '🌈', '🍀', '🔥'];
  for (let i = 0; i < 30; i++) {
    setTimeout(() => {
      const el = document.createElement('div');
      el.className = 'confetti';
      el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      el.style.left = Math.random() * 100 + '%';
      el.style.top = -(Math.random() * 40) + 'px';
      el.style.fontSize = (16 + Math.random() * 20) + 'px';
      el.style.animationDuration = (2 + Math.random() * 3) + 's';
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 3500);
    }, i * 40);
  }
}

function showToast(message) {
  const container = $('#toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function createParticles() {
  const container = $('#particles');
  const particleEmojis = ['✨', '🌿', '☕', '🌈', '🌸', '🍃', '🪷', '🌱'];
  for (let i = 0; i < 15; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.textContent = particleEmojis[Math.floor(Math.random() * particleEmojis.length)];
    particle.style.left = Math.random() * 100 + '%';
    particle.style.animationDuration = (10 + Math.random() * 20) + 's';
    particle.style.animationDelay = Math.random() * 15 + 's';
    particle.style.fontSize = (12 + Math.random() * 16) + 'px';
    container.appendChild(particle);
  }
}

init();
