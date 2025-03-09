const boardSize = 4; // 游戏尺寸
let tileSize; // 每个格子的像素大小（动态计算）
const gap = 10;      // 格子间隙（需与CSS一致）
let board;           // 游戏状态数组
let score;           // 当前得分
const canvas = document.getElementById('fireworks'); // 烟花画布
const ctx = canvas.getContext('2d');        
const fireworks = []; // 烟花粒子数组
const boardElement = document.getElementById('board'); // 游戏板DOM元素
const touchIndicator = document.getElementById('touch-indicator'); // 触摸指示器
const swipeDirectionElement = document.getElementById('swipe-direction'); // 滑动方向显示

// 触摸事件相关变量
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;
const MIN_SWIPE_DISTANCE = 30; // 最小滑动距离，单位像素

// 烟花参数配置
const FIREWORK_CONFIG = {
  particleCount: 50,      // 单次烟花粒子数量
  baseSpeed: 5,           // 基础移动速度
  fadeSpeed: 0.015,       // 透明度衰减速度
  sizeVariation: [2, 4],  // 粒子尺寸范围
  hueVariation: 30        // 颜色差异范围
};

// 在全局变量区域添加
let recentScores = []; // 按时间排序的历史记录
let topScores = [];    // 按分数排序的历史记录
const MAX_HISTORY = 5; // 每种类型保留的最大记录数

// 初始化游戏
document.addEventListener('DOMContentLoaded', () => {
  // 加载历史记录
  loadScoreHistory();
  
  // 计算适合当前屏幕的瓦片大小
  calculateTileSize();
  
  // 监听窗口大小变化
  window.addEventListener('resize', () => {
    calculateTileSize();
    updateBoard();
  });
  
  // 初始化游戏
  initializeGame();
  document.getElementById('reset').addEventListener('click', initializeGame);
  requestAnimationFrame(animateFireworks);
  
  // 添加触摸事件监听
  setupTouchEvents();
  
  // 添加历史记录按钮事件
  setupHistoryModal();
});

// 计算适合当前屏幕的瓦片大小
function calculateTileSize() {
  const boardWidth = boardElement.clientWidth;
  tileSize = (boardWidth - (boardSize + 1) * gap) / boardSize;
}

// 设置触摸事件
function setupTouchEvents() {
  // 直接在游戏板上添加触摸事件
  boardElement.addEventListener('touchstart', handleTouchStart, { passive: false });
  boardElement.addEventListener('touchmove', handleTouchMove, { passive: false });
  boardElement.addEventListener('touchend', handleTouchEnd, { passive: false });
  
  // 防止整个文档在游戏区域的触摸事件
  boardElement.addEventListener('touchmove', function(e) {
    e.preventDefault();
    e.stopPropagation();
  }, { passive: false });
}

// 处理触摸开始事件
function handleTouchStart(e) {
  // 阻止默认行为
  e.preventDefault();
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
  touchEndX = touchStartX; // 初始化结束位置为开始位置
  touchEndY = touchStartY;
}

// 处理触摸移动事件
function handleTouchMove(e) {
  // 阻止默认行为
  e.preventDefault();
  e.stopPropagation();
  
  touchEndX = e.touches[0].clientX;
  touchEndY = e.touches[0].clientY;
}

// 处理触摸结束事件
function handleTouchEnd(e) {
  // 阻止默认行为
  e.preventDefault();
  
  const deltaX = touchEndX - touchStartX;
  const deltaY = touchEndY - touchStartY;
  
  // 确保有足够的滑动距离
  if (Math.abs(deltaX) < MIN_SWIPE_DISTANCE && Math.abs(deltaY) < MIN_SWIPE_DISTANCE) {
    return;
  }
  
  // 判断滑动方向
  let direction;
  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    // 水平滑动
    direction = deltaX > 0 ? 'right' : 'left';
  } else {
    // 垂直滑动
    direction = deltaY > 0 ? 'down' : 'up';
  }
  
  // 显示滑动方向指示器
  showTouchIndicator(direction);
  
  // 执行移动
  const prevBoard = JSON.stringify(board);
  move(direction);
  
  if (prevBoard !== JSON.stringify(board)) {
    addRandomTile();
    updateBoard();
    checkGameOver();
  }
}

// 显示触摸指示器
function showTouchIndicator(direction) {
  const directionText = {
    'up': '上',
    'down': '下',
    'left': '左',
    'right': '右'
  };
  
  swipeDirectionElement.textContent = directionText[direction];
  touchIndicator.style.display = 'block';
  
  // 2秒后隐藏
  setTimeout(() => {
    touchIndicator.style.display = 'none';
  }, 1000);
}

//-------------------
// 核心游戏逻辑
//-------------------
function initializeGame() {
  board = Array.from({ length: boardSize }, () => Array(boardSize).fill(0));
  score = 0;
  addRandomTile();
  addRandomTile();
  updateBoard();
}

function addRandomTile() {
  const emptyCells = [];
  board.forEach((row, i) => {
    row.forEach((cell, j) => {
      if (cell === 0) emptyCells.push({ i, j });
    });
  });

  if (emptyCells.length > 0) {
    const { i, j } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    board[i][j] = Math.random() < 0.9 ? 2 : 4;
  }
}

//---------------------
// 界面渲染系统
//---------------------
function updateBoard() {
  boardElement.innerHTML = ''; // 清空现有内容
  const boardRect = boardElement.getBoundingClientRect(); 

  board.forEach((row, i) => {
    row.forEach((cell, j) => {
      const tile = createTileElement(cell, i, j, boardRect);
      boardElement.appendChild(tile);
    });
  });

  document.getElementById('score').textContent = `得分: ${score}`;
}

function createTileElement(value, row, col, boardRect) {
  const tile = document.createElement('div');
  tile.className = 'tile';
  
  if (value !== 0) {
    tile.textContent = value;
    tile.style.backgroundColor = getTileBackgroundColor(value);
    tile.style.color = getTileTextColor(value);
    
    // 根据数字长度调整字体大小
    if (value >= 1024) {
      tile.style.fontSize = '80%';
    }
    if (value >= 16384) {
      tile.style.fontSize = '70%';
    }
  }
  
  return tile;
}

//--------------------
// 颜色配置系统
//--------------------
function getTileTextColor(value) {
  const textColors = {
    2: '#776e65',   // 浅色背景用深色文字
    4: '#776e65',
    8: '#f9f6f2',   // 深色背景用白色文字
    16: '#f9f6f2',
    32: '#ffffff',
    64: '#ffffff',
    128: '#ffffff',
    256: '#ffffff',
    512: '#ffffff',
    1024: '#ffffff',
    2048: '#ffffff'
  };
  return textColors[value] || '#776e65';
}

function getTileBackgroundColor(value) {
  const backgroundColors = {
    2: '#eee4da',
    4: '#ede0c8',
    8: '#f2b179',
    16: '#f59563',
    32: '#ff775c',
    64: '#e74c3c',
    128: '#f1c40f',
    256: '#e67e22',
    512: '#2ecc71',
    1024: '#3498db',
    2048: '#9b59b6'
  };
  return backgroundColors[value] || '#eee4da';
}

//-------------------
// 移动与合并逻辑
//-------------------
document.addEventListener('keydown', (event) => {
  const prevBoard = JSON.stringify(board);
  
  switch(event.key) {
    case 'ArrowUp': move('up'); break;
    case 'ArrowDown': move('down'); break;
    case 'ArrowLeft': move('left'); break;
    case 'ArrowRight': move('right'); break;
  }
  
  if (prevBoard !== JSON.stringify(board)) {
    addRandomTile();
    updateBoard();
    checkGameOver();
  }
});

function move(direction) {
  let moved = false;
  
  for (let i = 0; i < boardSize; i++) {
    const rawTiles = [];
    // 提取原始非空数据
    for (let j = 0; j < boardSize; j++) {
      const index = (direction === 'up' || direction === 'left') ? j : boardSize - 1 - j;
      const value = (direction === 'up' || direction === 'down') ? board[index][i] : board[i][index];
      if (value !== 0) rawTiles.push(value);
    }
    const mergedTiles = mergeTiles(rawTiles, i, direction);
    
    // 将数据填充回数组
    for (let j = 0; j < boardSize; j++) {
      const index = (direction === 'up' || direction === 'left') ? j : boardSize - 1 - j;
      const newValue = j < mergedTiles.length ? mergedTiles[j] : 0;
      
      if (direction === 'up' || direction === 'down') {
        if (board[index][i] !== newValue) {
          moved = true;
          board[index][i] = newValue;
        }
      } else {
        if (board[i][index] !== newValue) {
          moved = true;
          board[i][index] = newValue;
        }
      }
    }
  }
  
  return moved;
}

function mergeTiles(tiles, lineIndex, direction) {
  const merged = [];
  let lastMergePosition = -1; // 记录发生合并的位置

  for (let i = 0; i < tiles.length; i++) {
    if (merged.length > 0 && tiles[i] === merged[merged.length - 1] && lastMergePosition !== merged.length - 1) {
      merged[merged.length - 1] *= 2;
      score += merged[merged.length - 1];
      lastMergePosition = merged.length - 1;
      
      // 触发烟花效果
      const position = calculateMergePosition(lineIndex, merged.length - 1, direction);
      if (position) triggerFireworks(position.x, position.y);
    } else {
      merged.push(tiles[i]);
    }
  }
  
  while (merged.length < boardSize) merged.push(0); 
  return merged;
}

//-------------------
// 烟花定位系统
//-------------------
function calculateMergePosition(lineIndex, mergedIndex, direction) {
  const boardRect = boardElement.getBoundingClientRect();
  
  let row, col;
  
  switch(direction) {
    case 'up':
      row = mergedIndex;
      col = lineIndex;
      break;
    case 'down':
      row = boardSize - 1 - mergedIndex;
      col = lineIndex;
      break;
    case 'left':
      row = lineIndex;
      col = mergedIndex;
      break;
    case 'right':
      row = lineIndex;
      col = boardSize - 1 - mergedIndex;
      break;
  }
  
  // 计算实际像素位置
  const cellSize = boardRect.width / boardSize;
  
  return {
    x: boardRect.left + col * cellSize + cellSize/2,
    y: boardRect.top + row * cellSize + cellSize/2
  };
}

//--------------------
// 烟花效果系统
//--------------------
function triggerFireworks(x, y) {
  const { 
    particleCount, 
    baseSpeed,
    fadeSpeed,
    sizeVariation,
    hueVariation
  } = FIREWORK_CONFIG;

  // 根据设备性能调整粒子数量
  const actualParticleCount = window.innerWidth < 500 ? 
    Math.floor(particleCount / 2) : particleCount;

  for (let i = 0; i < actualParticleCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = baseSpeed * Math.random();
    
    fireworks.push({
      x, // 初始X位置
      y, // 初始Y位置
      size: sizeVariation[0] + Math.random() * (sizeVariation[1] - sizeVariation[0]),
      color: `hsl(${30 + Math.random() * hueVariation}, 100%, 50%)`, // 限制在暖色范围
      velocity: {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed
      },
      alpha: 1,
      decay: fadeSpeed + Math.random() * 0.01
    });
  }
}

function animateFireworks() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 实时更新画布尺寸以匹配窗口
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  fireworks.forEach((particle, index) => {
    // 更新粒子状态
    particle.x += particle.velocity.x;
    particle.y += particle.velocity.y;
    particle.alpha -= particle.decay;
    
    // 绘制粒子
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fillStyle = particle.color;
    ctx.globalAlpha = particle.alpha;
    ctx.fill();
    
    // 移除透明粒子
    if (particle.alpha <= 0) {
      fireworks.splice(index, 1);
    }
  });
  
  requestAnimationFrame(animateFireworks);
}

//--------------------
// 历史分数记录系统
//--------------------
function loadScoreHistory() {
  // 从本地存储加载历史记录
  const savedRecentScores = localStorage.getItem('recentScores');
  const savedTopScores = localStorage.getItem('topScores');
  
  recentScores = savedRecentScores ? JSON.parse(savedRecentScores) : [];
  topScores = savedTopScores ? JSON.parse(savedTopScores) : [];
  
  // 显示历史记录
  updateScoreHistory();
}

function saveScore(finalScore) {
  const scoreRecord = {
    score: finalScore,
    date: new Date().toISOString()
  };
  
  // 添加到最近记录
  recentScores.unshift(scoreRecord);
  if (recentScores.length > MAX_HISTORY) {
    recentScores.pop();
  }
  
  // 添加到最高分记录并排序
  topScores.push(scoreRecord);
  topScores.sort((a, b) => b.score - a.score); // 按分数降序排序
  if (topScores.length > MAX_HISTORY) {
    topScores.splice(MAX_HISTORY);
  }
  
  // 保存到本地存储
  localStorage.setItem('recentScores', JSON.stringify(recentScores));
  localStorage.setItem('topScores', JSON.stringify(topScores));
  
  // 更新显示
  updateScoreHistory();
}

function updateScoreHistory() {
  try {
    // 更新最近记录列表
    const recentList = document.getElementById('recent-scores');
    if (!recentList) return; // 安全检查
    
    recentList.innerHTML = '';
    
    if (recentScores.length === 0) {
      const emptyMessage = document.createElement('li');
      emptyMessage.textContent = '暂无记录';
      emptyMessage.style.textAlign = 'center';
      recentList.appendChild(emptyMessage);
    } else {
      recentScores.forEach(record => {
        const li = document.createElement('li');
        try {
          const date = new Date(record.date);
          const formattedDate = `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
          
          li.innerHTML = `
            <span class="score-value">${record.score}</span>
            <span class="score-date">${formattedDate}</span>
          `;
        } catch (e) {
          // 日期解析失败时的备用显示
          li.innerHTML = `
            <span class="score-value">${record.score}</span>
            <span class="score-date">未知时间</span>
          `;
        }
        recentList.appendChild(li);
      });
    }
    
    // 更新最高分记录列表
    const topList = document.getElementById('top-scores');
    if (!topList) return; // 安全检查
    
    topList.innerHTML = '';
    
    if (topScores.length === 0) {
      const emptyMessage = document.createElement('li');
      emptyMessage.textContent = '暂无记录';
      emptyMessage.style.textAlign = 'center';
      topList.appendChild(emptyMessage);
    } else {
      topScores.forEach(record => {
        const li = document.createElement('li');
        try {
          const date = new Date(record.date);
          const formattedDate = `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
          
          li.innerHTML = `
            <span class="score-value">${record.score}</span>
            <span class="score-date">${formattedDate}</span>
          `;
        } catch (e) {
          // 日期解析失败时的备用显示
          li.innerHTML = `
            <span class="score-value">${record.score}</span>
            <span class="score-date">未知时间</span>
          `;
        }
        topList.appendChild(li);
      });
    }
  } catch (error) {
    console.error('更新历史记录时出错:', error);
  }
}

//--------------------
// 游戏状态检查
//--------------------
function checkGameOver() {
  let hasMoves = false;
  
  // 检查空单元格
  board.forEach(row => {
    if (row.includes(0)) hasMoves = true;
  });
  
  // 检查横向合并可能性
  for (let i = 0; i < boardSize; i++) {
    for (let j = 0; j < boardSize - 1; j++) {
      if (board[i][j] === board[i][j + 1] && board[i][j] !== 0) {
        hasMoves = true;
        break;
      }
    }
  }
  
  // 检查纵向合并可能性
  for (let j = 0; j < boardSize; j++) {
    for (let i = 0; i < boardSize - 1; i++) {
      if (board[i][j] === board[i + 1][j] && board[i][j] !== 0) {
        hasMoves = true;
        break;
      }
    }
  }
  
  if (!hasMoves) {
    // 保存分数记录
    saveScore(score);
    
    setTimeout(() => alert(`游戏结束！最终得分：${score}`), 100);
  }
}

// 设置历史记录弹出层
function setupHistoryModal() {
  const historyButton = document.getElementById('history-button');
  const historyOverlay = document.getElementById('history-overlay');
  const closeHistory = document.getElementById('close-history');
  const historyTabs = document.querySelectorAll('.history-tab');
  const historyModal = document.querySelector('.history-modal');
  
  // 打开历史记录
  historyButton.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    historyOverlay.classList.add('active');
    document.body.style.overflow = 'hidden'; // 防止背景滚动
    
    // 强制重绘以确保样式正确应用
    setTimeout(function() {
      historyModal.style.opacity = '1';
    }, 10);
  });
  
  // 关闭历史记录
  closeHistory.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    historyOverlay.classList.remove('active');
    document.body.style.overflow = 'auto';
  });
  
  // 点击背景关闭，但阻止点击模态框本身关闭
  historyOverlay.addEventListener('click', function(e) {
    if (e.target === historyOverlay) {
      historyOverlay.classList.remove('active');
      document.body.style.overflow = 'auto';
    }
  });
  
  // 阻止模态框点击事件冒泡
  historyModal.addEventListener('click', function(e) {
    e.stopPropagation();
  });
  
  // 标签切换
  historyTabs.forEach(tab => {
    tab.addEventListener('click', function() {
      // 移除所有标签和内容的active类
      document.querySelectorAll('.history-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.history-content').forEach(c => c.classList.remove('active'));
      
      // 添加当前标签和对应内容的active类
      this.classList.add('active');
      const tabName = this.getAttribute('data-tab');
      document.getElementById(`${tabName}-content`).classList.add('active');
    });
  });
}
