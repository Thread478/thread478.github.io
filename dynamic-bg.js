// 动态背景相关代码
const canvas = document.getElementById('dynamic-bg');
const ctx = canvas.getContext('2d');

// 设置Canvas尺寸
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

// 初始化尺寸
resizeCanvas();
window.addEventListener('resize', () => {
  resizeCanvas();
  initBackgroundElements(); // 重新初始化背景元素
});

// 鼠标位置跟踪
const mouse = {
  x: null,
  y: null,
  radius: 150
};

window.addEventListener('mousemove', (e) => {
  mouse.x = e.x;
  mouse.y = e.y;
});

// 几何元素类定义
class Point {
  constructor() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.size = Math.random() * 2 + 1;
    this.speedX = Math.random() * 0.5 - 0.25;
    this.speedY = Math.random() * 0.5 - 0.25;
    this.color = this.getRandomColor();
  }
  
  getRandomColor() {
    // 根据当前模式选择颜色
    const isDark = document.body.classList.contains('dark-mode');
    const lightColors = [
      '#5d4037', // primary
      '#64748b', // secondary
      '#f1c40f', // accent
      '#8b5a2b', 
      '#a0522d'
    ];
    const darkColors = [
      '#f1c40f', // accent
      '#d4af37', 
      '#e0c68c',
      '#f5deb3',
      '#f9f2e8'
    ];
    const colors = isDark ? darkColors : lightColors;
    return colors[Math.floor(Math.random() * colors.length)];
  }
  
  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    
    // 边界检测
    if (this.x > canvas.width) this.x = 0;
    else if (this.x < 0) this.x = canvas.width;
    
    if (this.y > canvas.height) this.y = 0;
    else if (this.y < 0) this.y = canvas.height;
    
    // 鼠标交互
    if (mouse.x && mouse.y) {
      const dx = mouse.x - this.x;
      const dy = mouse.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < mouse.radius) {
        const force = (mouse.radius - distance) / mouse.radius;
        const angle = Math.atan2(dy, dx);
        this.x -= Math.cos(angle) * force * 2;
        this.y -= Math.sin(angle) * force * 2;
      }
    }
  }
  
  draw() {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

class Line {
  constructor(points) {
    this.points = points;
    this.maxDistance = 100;
  }
  
  draw() {
    const isDark = document.body.classList.contains('dark-mode');
    const baseColor = isDark ? 'rgba(241, 196, 15, ' : 'rgba(93, 64, 55, ';
    
    ctx.lineWidth = 0.5;
    
    for (let i = 0; i < this.points.length; i++) {
      for (let j = i + 1; j < this.points.length; j++) {
        const dx = this.points[i].x - this.points[j].x;
        const dy = this.points[i].y - this.points[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < this.maxDistance) {
          const opacity = 1 - (distance / this.maxDistance);
          ctx.strokeStyle = `${baseColor}${opacity * 0.2})`;
          
          ctx.beginPath();
          ctx.moveTo(this.points[i].x, this.points[i].y);
          ctx.lineTo(this.points[j].x, this.points[j].y);
          ctx.stroke();
        }
      }
    }
  }
}

class Triangle {
  constructor() {
    this.size = Math.random() * 30 + 10;
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.speed = Math.random() * 0.3 + 0.1;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.01;
    this.opacity = Math.random() * 0.3 + 0.1;
  }
  
  getColor() {
    const isDark = document.body.classList.contains('dark-mode');
    return isDark 
      ? `rgba(241, 196, 15, ${this.opacity})` 
      : `rgba(100, 116, 139, ${this.opacity})`;
  }
  
  update() {
    this.x += Math.cos(this.rotation) * this.speed;
    this.y += Math.sin(this.rotation) * this.speed;
    this.rotation += this.rotationSpeed;
    
    // 边界环绕
    if (this.x > canvas.width + this.size) this.x = -this.size;
    else if (this.x < -this.size) this.x = canvas.width + this.size;
    
    if (this.y > canvas.height + this.size) this.y = -this.size;
    else if (this.y < -this.size) this.y = canvas.height + this.size;
  }
  
  draw() {
    ctx.fillStyle = this.getColor();
    ctx.beginPath();
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    
    ctx.moveTo(0, -this.size);
    ctx.lineTo(this.size, this.size);
    ctx.lineTo(-this.size, this.size);
    ctx.closePath();
    
    ctx.fill();
    ctx.restore();
  }
}

class MathFunction {
  constructor() {
    this.type = Math.floor(Math.random() * 3); // 0: sine, 1: cosine, 2: quadratic
    this.xOffset = Math.random() * canvas.width;
    this.yOffset = Math.random() * canvas.height;
    this.scale = Math.random() * 30 + 20;
    this.speed = (Math.random() - 0.5) * 0.5;
    this.opacity = Math.random() * 0.3 + 0.1;
  }
  
  getColor() {
    const isDark = document.body.classList.contains('dark-mode');
    return isDark 
      ? `rgba(249, 242, 232, ${this.opacity})` 
      : `rgba(93, 64, 55, ${this.opacity})`;
  }
  
  update() {
    this.xOffset += this.speed;
    
    // 边界环绕
    if (this.xOffset > canvas.width + this.scale * 2) {
      this.xOffset = -this.scale * 2;
    } else if (this.xOffset < -this.scale * 2) {
      this.xOffset = canvas.width + this.scale * 2;
    }
  }
  
  draw() {
    ctx.strokeStyle = this.getColor();
    ctx.lineWidth = 1;
    ctx.beginPath();
    
    for (let x = 0; x < canvas.width; x += 2) {
      let y;
      const normalizedX = (x - this.xOffset) / this.scale;
      
      switch (this.type) {
        case 0: // 正弦波
          y = Math.sin(normalizedX) * this.scale + this.yOffset;
          break;
        case 1: // 余弦波
          y = Math.cos(normalizedX) * this.scale + this.yOffset;
          break;
        case 2: // 二次函数
          y = normalizedX * normalizedX * 0.5 * this.scale + this.yOffset;
          break;
      }
      
      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    
    ctx.stroke();
  }
}

// 背景元素数组
const pointsArray = [];
const trianglesArray = [];
const functionsArray = [];

// 初始化背景元素
function initBackgroundElements() {
  // 清空数组
  pointsArray.length = 0;
  trianglesArray.length = 0;
  functionsArray.length = 0;
  
  // 创建点
  const pointCount = Math.floor((canvas.width * canvas.height) / 15000);
  for (let i = 0; i < pointCount; i++) {
    pointsArray.push(new Point());
  }
  
  // 创建三角形
  const triangleCount = Math.floor((canvas.width * canvas.height) / 500000);
  for (let i = 0; i < triangleCount; i++) {
    trianglesArray.push(new Triangle());
  }
  
  // 创建数学函数曲线
  const functionCount = 2;
  for (let i = 0; i < functionCount; i++) {
    functionsArray.push(new MathFunction());
  }
}

// 动画循环
function animateBackground() {
  // 半透明背景，创造轨迹效果
  const isDark = document.body.classList.contains('dark-mode');
  ctx.fillStyle = isDark ? 'rgba(47, 43, 38, 0.1)' : 'rgba(249, 242, 232, 0.1)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // 绘制连接线
  const lines = new Line(pointsArray);
  lines.draw();
  
  // 更新和绘制所有元素
  pointsArray.forEach(point => {
    point.update();
    point.draw();
  });
  
  trianglesArray.forEach(triangle => {
    triangle.update();
    triangle.draw();
  });
  
  functionsArray.forEach(func => {
    func.update();
    func.draw();
  });
  
  requestAnimationFrame(animateBackground);
}

// 模式切换时更新颜色
function updateBackgroundColors() {
  // 更新点的颜色
  pointsArray.forEach(point => {
    point.color = point.getRandomColor();
  });
}

// 初始化并启动动画
initBackgroundElements();
animateBackground();

// 将背景颜色更新添加到现有模式切换功能
modeToggle.addEventListener('click', () => {
  // 原有代码保持不变...
  
  // 添加背景颜色更新
  updateBackgroundColors();
});
