class Tetris {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.nextCanvas = document.getElementById('nextCanvas');
        this.nextCtx = this.nextCanvas.getContext('2d');
        
        this.BOARD_WIDTH = 10;
        this.BOARD_HEIGHT = 20;
        this.BLOCK_SIZE = 30;
        
        this.board = [];
        this.currentPiece = null;
        this.nextPiece = null;
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.gameRunning = false;
        this.gamePaused = false;
        this.dropTime = 0;
        this.dropInterval = 1000;
        
        // 触摸相关变量
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchStartTime = 0;
        this.swipeThreshold = 50;
        this.tapThreshold = 200;
        
        this.init();
        this.setupEventListeners();
    }
    
    init() {
        // 初始化游戏板
        this.board = Array(this.BOARD_HEIGHT).fill().map(() => Array(this.BOARD_WIDTH).fill(0));
        
        // 定义方块形状
        this.pieces = {
            I: {
                shape: [
                    [1, 1, 1, 1]
                ],
                color: '#00f5ff'
            },
            O: {
                shape: [
                    [1, 1],
                    [1, 1]
                ],
                color: '#ffff00'
            },
            T: {
                shape: [
                    [0, 1, 0],
                    [1, 1, 1]
                ],
                color: '#a000f0'
            },
            S: {
                shape: [
                    [0, 1, 1],
                    [1, 1, 0]
                ],
                color: '#00f000'
            },
            Z: {
                shape: [
                    [1, 1, 0],
                    [0, 1, 1]
                ],
                color: '#f00000'
            },
            J: {
                shape: [
                    [1, 0, 0],
                    [1, 1, 1]
                ],
                color: '#0000f0'
            },
            L: {
                shape: [
                    [0, 0, 1],
                    [1, 1, 1]
                ],
                color: '#ffa500'
            }
        };
        
        this.pieceTypes = Object.keys(this.pieces);
        this.generateNewPiece();
        this.draw();
    }
    
    setupEventListeners() {
        // 键盘事件
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        
        // 按钮事件
        document.getElementById('startBtn').addEventListener('click', () => this.startGame());
        document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetGame());
        
        // 虚拟键盘事件
        this.setupVirtualKeyboard();
        
        // 触摸事件
        this.setupTouchEvents();
        
        // 防止页面滚动
        document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    }
    
    setupVirtualKeyboard() {
        const keyButtons = document.querySelectorAll('.key-btn');
        keyButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const action = btn.getAttribute('data-action');
                this.handleVirtualKeyAction(action);
            });
            
            // 触摸反馈
            btn.addEventListener('touchstart', () => {
                btn.style.transform = 'scale(0.95)';
            });
            
            btn.addEventListener('touchend', () => {
                btn.style.transform = 'scale(1)';
            });
        });
    }
    
    setupTouchEvents() {
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));
    }
    
    handleTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
        this.touchStartTime = Date.now();
    }
    
    handleTouchMove(e) {
        e.preventDefault();
    }
    
    handleTouchEnd(e) {
        e.preventDefault();
        const touch = e.changedTouches[0];
        const deltaX = touch.clientX - this.touchStartX;
        const deltaY = touch.clientY - this.touchStartY;
        const deltaTime = Date.now() - this.touchStartTime;
        
        // 判断手势类型
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            // 水平滑动
            if (Math.abs(deltaX) > this.swipeThreshold) {
                if (deltaX > 0) {
                    this.movePiece(1, 0); // 右移
                } else {
                    this.movePiece(-1, 0); // 左移
                }
            }
        } else {
            // 垂直滑动
            if (Math.abs(deltaY) > this.swipeThreshold) {
                if (deltaY > 0) {
                    this.movePiece(0, 1); // 加速下落
                } else {
                    this.rotatePiece(); // 向上滑动旋转
                }
            }
        }
        
        // 点击（短时间触摸）
        if (deltaTime < this.tapThreshold && Math.abs(deltaX) < 20 && Math.abs(deltaY) < 20) {
            this.rotatePiece();
        }
    }
    
    handleVirtualKeyAction(action) {
        if (!this.gameRunning || this.gamePaused) return;
        
        switch(action) {
            case 'left':
                this.movePiece(-1, 0);
                break;
            case 'right':
                this.movePiece(1, 0);
                break;
            case 'down':
                this.movePiece(0, 1);
                break;
            case 'rotate':
                this.rotatePiece();
                break;
            case 'hardDrop':
                this.hardDrop();
                break;
        }
    }
    
    generateNewPiece() {
        if (!this.nextPiece) {
            this.nextPiece = this.createPiece();
        }
        
        this.currentPiece = this.nextPiece;
        this.nextPiece = this.createPiece();
        
        // 检查游戏是否结束
        if (this.checkCollision(this.currentPiece)) {
            this.gameOver();
        }
        
        this.drawNextPiece();
    }
    
    createPiece() {
        const type = this.pieceTypes[Math.floor(Math.random() * this.pieceTypes.length)];
        const piece = this.pieces[type];
        
        return {
            shape: piece.shape,
            color: piece.color,
            x: Math.floor(this.BOARD_WIDTH / 2) - Math.floor(piece.shape[0].length / 2),
            y: 0
        };
    }
    
    handleKeyPress(e) {
        if (!this.gameRunning || this.gamePaused) return;
        
        switch(e.key) {
            case 'ArrowLeft':
                this.movePiece(-1, 0);
                break;
            case 'ArrowRight':
                this.movePiece(1, 0);
                break;
            case 'ArrowDown':
                this.movePiece(0, 1);
                break;
            case 'ArrowUp':
                this.rotatePiece();
                break;
            case ' ':
                this.hardDrop();
                break;
        }
        
        e.preventDefault();
    }
    
    movePiece(dx, dy) {
        const newX = this.currentPiece.x + dx;
        const newY = this.currentPiece.y + dy;
        
        if (!this.checkCollision({...this.currentPiece, x: newX, y: newY})) {
            this.currentPiece.x = newX;
            this.currentPiece.y = newY;
            this.draw();
            return true;
        }
        
        if (dy > 0) {
            this.placePiece();
            this.clearLines();
            this.generateNewPiece();
        }
        
        return false;
    }
    
    rotatePiece() {
        const rotated = this.rotateMatrix(this.currentPiece.shape);
        const newPiece = {...this.currentPiece, shape: rotated};
        
        if (!this.checkCollision(newPiece)) {
            this.currentPiece.shape = rotated;
            this.draw();
        }
    }
    
    rotateMatrix(matrix) {
        const rows = matrix.length;
        const cols = matrix[0].length;
        const rotated = Array(cols).fill().map(() => Array(rows).fill(0));
        
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                rotated[j][rows - 1 - i] = matrix[i][j];
            }
        }
        
        return rotated;
    }
    
    hardDrop() {
        while (this.movePiece(0, 1)) {
            this.score += 2;
        }
        this.updateScore();
    }
    
    checkCollision(piece) {
        for (let y = 0; y < piece.shape.length; y++) {
            for (let x = 0; x < piece.shape[y].length; x++) {
                if (piece.shape[y][x]) {
                    const boardX = piece.x + x;
                    const boardY = piece.y + y;
                    
                    if (boardX < 0 || boardX >= this.BOARD_WIDTH || 
                        boardY >= this.BOARD_HEIGHT ||
                        (boardY >= 0 && this.board[boardY][boardX])) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    
    placePiece() {
        for (let y = 0; y < this.currentPiece.shape.length; y++) {
            for (let x = 0; x < this.currentPiece.shape[y].length; x++) {
                if (this.currentPiece.shape[y][x]) {
                    const boardX = this.currentPiece.x + x;
                    const boardY = this.currentPiece.y + y;
                    
                    if (boardY >= 0) {
                        this.board[boardY][boardX] = this.currentPiece.color;
                    }
                }
            }
        }
    }
    
    clearLines() {
        let linesCleared = 0;
        
        for (let y = this.BOARD_HEIGHT - 1; y >= 0; y--) {
            if (this.board[y].every(cell => cell !== 0)) {
                this.board.splice(y, 1);
                this.board.unshift(Array(this.BOARD_WIDTH).fill(0));
                linesCleared++;
                y++; // 重新检查同一行
            }
        }
        
        if (linesCleared > 0) {
            this.lines += linesCleared;
            this.score += linesCleared * 100 * this.level;
            this.level = Math.floor(this.lines / 10) + 1;
            this.dropInterval = Math.max(100, 1000 - (this.level - 1) * 100);
            this.updateScore();
        }
    }
    
    updateScore() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('level').textContent = this.level;
        document.getElementById('lines').textContent = this.lines;
    }
    
    draw() {
        // 清空画布
        this.ctx.fillStyle = '#1a202c';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制游戏板
        for (let y = 0; y < this.BOARD_HEIGHT; y++) {
            for (let x = 0; x < this.BOARD_WIDTH; x++) {
                if (this.board[y][x]) {
                    this.drawBlock(x, y, this.board[y][x]);
                }
            }
        }
        
        // 绘制当前方块
        if (this.currentPiece) {
            this.drawPiece(this.currentPiece);
        }
        
        // 绘制网格
        this.drawGrid();
    }
    
    drawBlock(x, y, color) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x * this.BLOCK_SIZE, y * this.BLOCK_SIZE, this.BLOCK_SIZE, this.BLOCK_SIZE);
        
        // 添加高光效果
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.fillRect(x * this.BLOCK_SIZE, y * this.BLOCK_SIZE, this.BLOCK_SIZE, 2);
        this.ctx.fillRect(x * this.BLOCK_SIZE, y * this.BLOCK_SIZE, 2, this.BLOCK_SIZE);
        
        // 添加阴影效果
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fillRect((x + 1) * this.BLOCK_SIZE - 2, y * this.BLOCK_SIZE, 2, this.BLOCK_SIZE);
        this.ctx.fillRect(x * this.BLOCK_SIZE, (y + 1) * this.BLOCK_SIZE - 2, this.BLOCK_SIZE, 2);
    }
    
    drawPiece(piece) {
        for (let y = 0; y < piece.shape.length; y++) {
            for (let x = 0; x < piece.shape[y].length; x++) {
                if (piece.shape[y][x]) {
                    this.drawBlock(piece.x + x, piece.y + y, piece.color);
                }
            }
        }
    }
    
    drawGrid() {
        this.ctx.strokeStyle = '#2d3748';
        this.ctx.lineWidth = 1;
        
        for (let x = 0; x <= this.BOARD_WIDTH; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * this.BLOCK_SIZE, 0);
            this.ctx.lineTo(x * this.BLOCK_SIZE, this.canvas.height);
            this.ctx.stroke();
        }
        
        for (let y = 0; y <= this.BOARD_HEIGHT; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * this.BLOCK_SIZE);
            this.ctx.lineTo(this.canvas.width, y * this.BLOCK_SIZE);
            this.ctx.stroke();
        }
    }
    
    drawNextPiece() {
        this.nextCtx.fillStyle = '#f8f9fa';
        this.nextCtx.fillRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
        
        if (this.nextPiece) {
            const blockSize = 16;
            const offsetX = (this.nextCanvas.width - this.nextPiece.shape[0].length * blockSize) / 2;
            const offsetY = (this.nextCanvas.height - this.nextPiece.shape.length * blockSize) / 2;
            
            for (let y = 0; y < this.nextPiece.shape.length; y++) {
                for (let x = 0; x < this.nextPiece.shape[y].length; x++) {
                    if (this.nextPiece.shape[y][x]) {
                        this.nextCtx.fillStyle = this.nextPiece.color;
                        this.nextCtx.fillRect(
                            offsetX + x * blockSize,
                            offsetY + y * blockSize,
                            blockSize,
                            blockSize
                        );
                        
                        // 添加边框
                        this.nextCtx.strokeStyle = '#ddd';
                        this.nextCtx.lineWidth = 1;
                        this.nextCtx.strokeRect(
                            offsetX + x * blockSize,
                            offsetY + y * blockSize,
                            blockSize,
                            blockSize
                        );
                    }
                }
            }
        }
    }
    
    startGame() {
        if (!this.gameRunning) {
            this.gameRunning = true;
            this.gamePaused = false;
            this.gameLoop();
            document.getElementById('startBtn').textContent = '重新开始';
        } else {
            this.resetGame();
            this.startGame();
        }
    }
    
    togglePause() {
        if (this.gameRunning) {
            this.gamePaused = !this.gamePaused;
            document.getElementById('pauseBtn').textContent = this.gamePaused ? '继续' : '暂停';
        }
    }
    
    resetGame() {
        this.gameRunning = false;
        this.gamePaused = false;
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.dropInterval = 1000;
        this.dropTime = 0;
        this.init();
        document.getElementById('startBtn').textContent = '开始';
        document.getElementById('pauseBtn').textContent = '暂停';
    }
    
    gameLoop() {
        if (!this.gameRunning) return;
        
        if (!this.gamePaused) {
            this.dropTime += 16; // 假设60FPS
            
            if (this.dropTime >= this.dropInterval) {
                this.movePiece(0, 1);
                this.dropTime = 0;
            }
        }
        
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
    
    gameOver() {
        this.gameRunning = false;
        alert(`游戏结束！\n最终分数: ${this.score}\n等级: ${this.level}\n消除行数: ${this.lines}`);
    }
}

// 初始化游戏
document.addEventListener('DOMContentLoaded', () => {
    new Tetris();
});
