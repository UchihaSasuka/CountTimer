// 场景类定义
class Scene {
  constructor(name) {
    this.id = Date.now().toString();
    this.name = name;
    this.createdAt = new Date();
    this.timer = {
      startTime: null,
      elapsedTime: 0,
      isRunning: false,
      isPaused: false,
      interval: null,
      lastPausedTime: null,
    };
    this.countdown = {
      duration: 0,
      remainingTime: 0,
      isRunning: false,
      isPaused: false,
      interval: null,
      endTime: null,
    };
  }
}

// 应用主类
class TimerApp {
  constructor() {
    this.scenes = [];
    this.init();
  }

  init() {
    this.loadFromStorage();
    this.bindElements();
    this.bindEvents();
    this.renderScenes();
  }

  bindElements() {
    this.sceneNameInput = document.getElementById("sceneNameInput");
    this.addSceneBtn = document.getElementById("addSceneBtn");
    this.sceneList = document.getElementById("sceneList");
  }

  bindEvents() {
    this.addSceneBtn.addEventListener("click", () => this.createScene());
  }

  // 场景管理方法
  createScene() {
    const name = this.sceneNameInput.value.trim();
    if (!name) return;

    const scene = new Scene(name);
    this.scenes.push(scene);
    this.saveToStorage();
    this.renderScenes();
    this.sceneNameInput.value = "";
  }

  deleteScene(sceneId) {
    if (confirm("确定要删除这个场景吗？")) {
      this.scenes = this.scenes.filter((scene) => scene.id !== sceneId);
      this.saveToStorage();
      this.renderScenes();
    }
  }

  // 存储相关方法
  saveToStorage() {
    localStorage.setItem("scenes", JSON.stringify(this.scenes));
  }

  loadFromStorage() {
    const savedScenes = localStorage.getItem("scenes");
    if (savedScenes) {
      this.scenes = JSON.parse(savedScenes);
    }
  }

  // 渲染方法
  renderScenes() {
    this.sceneList.innerHTML = "";
    this.scenes.forEach((scene) => {
      const card = this.createSceneCard(scene);
      this.sceneList.appendChild(card);
    });
  }

  createSceneCard(scene) {
    const card = document.createElement("div");
    card.className = "scene-card";
    card.dataset.sceneId = scene.id;

    // 判断当前是正计时还是倒计时模式
    const isCountdownMode =
      scene.countdown.isRunning || scene.countdown.remainingTime > 0;
    const isAnyTimerRunning =
      scene.timer.isRunning || scene.countdown.isRunning;

    card.innerHTML = `
        <button class="delete-button">删除</button>
        <h3>${scene.name}</h3>
        
        ${
          !isCountdownMode
            ? `
        <div class="timer-info">
            <span class="elapsed-time">${this.formatTime(
              scene.timer.elapsedTime
            )}</span>
            <span class="start-time">${
              scene.timer.startTime
                ? "开始于: " +
                  new Date(scene.timer.startTime).toLocaleTimeString()
                : ""
            }</span>
        </div>
        `
            : `
        <div class="countdown-info">
            <span class="remaining-time">${this.formatTime(
              scene.countdown.remainingTime
            )}</span>
        </div>
        `
        }
        
        <div class="action-buttons">
            <button class="button timer-start" ${
              isAnyTimerRunning ? "disabled" : ""
            }>开始计时</button>
            <button class="button timer-pause" ${
              !isAnyTimerRunning ? "disabled" : ""
            }>暂停</button>
            <button class="button timer-reset">重置</button>
            <button class="button countdown-set" ${
              isAnyTimerRunning ? "disabled" : ""
            }>设置倒计时</button>
        </div>
    `;

    this.bindCardEvents(card, scene);
    return card;
  }

  bindCardEvents(card, scene) {
    const startBtn = card.querySelector(".timer-start");
    const pauseBtn = card.querySelector(".timer-pause");
    const resetBtn = card.querySelector(".timer-reset");
    const deleteBtn = card.querySelector(".delete-button");
    const countdownBtn = card.querySelector(".countdown-set");

    startBtn.addEventListener("click", () => this.startTimer(scene));
    pauseBtn.addEventListener("click", () => {
      if (scene.timer.isRunning) {
        this.pauseTimer(scene);
      } else if (scene.countdown.isRunning) {
        this.pauseCountdown(scene);
      }
    });

    // 添加重置确认
    resetBtn.addEventListener("click", () => {
      if (confirm("确定要重置计时器吗？所有计时数据将被清除。")) {
        this.resetAll(scene);
      }
    });

    deleteBtn.addEventListener("click", () => this.deleteScene(scene.id));
    countdownBtn.addEventListener("click", () => this.setCountdown(scene));
  }

  // 工具方法
  formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    return `${String(hours).padStart(2, "0")}:${String(minutes % 60).padStart(
      2,
      "0"
    )}:${String(seconds % 60).padStart(2, "0")}`;
  }

  // 计时器相关方法
  startTimer(scene) {
    // 如果倒计时在运行，先停止它
    if (scene.countdown.isRunning) {
      this.stopCountdown(scene);
    }

    if (scene.timer.isRunning) return;

    scene.timer.isRunning = true;
    scene.timer.isPaused = false;

    if (!scene.timer.startTime) {
      scene.timer.startTime = Date.now();
    } else if (scene.timer.lastPausedTime) {
      const pauseDuration = Date.now() - scene.timer.lastPausedTime;
      scene.timer.startTime += pauseDuration;
    }

    scene.timer.interval = setInterval(() => {
      scene.timer.elapsedTime = Date.now() - scene.timer.startTime;
      this.updateSceneDisplay(scene);
    }, 10);

    this.updateSceneDisplay(scene);
    this.saveToStorage();
  }

  pauseTimer(scene) {
    if (!scene.timer.isRunning || scene.timer.isPaused) return;

    clearInterval(scene.timer.interval);
    scene.timer.isRunning = false;
    scene.timer.isPaused = true;
    scene.timer.lastPausedTime = Date.now();

    this.updateSceneDisplay(scene);
    this.saveToStorage();
  }

  resetAll(scene) {
    // 重置正计时
    clearInterval(scene.timer.interval);
    scene.timer = {
      startTime: null,
      elapsedTime: 0,
      isRunning: false,
      isPaused: false,
      lastPausedTime: null,
      interval: null,
    };

    // 重置倒计时
    clearInterval(scene.countdown.interval);
    scene.countdown = {
      duration: 0,
      remainingTime: 0,
      isRunning: false,
      isPaused: false,
      endTime: null,
      interval: null,
    };

    // 重新渲染整个卡片以确保状态完全重置
    const oldCard = document.querySelector(`[data-scene-id="${scene.id}"]`);
    if (oldCard) {
      const newCard = this.createSceneCard(scene);
      oldCard.parentNode.replaceChild(newCard, oldCard);
    }

    this.saveToStorage();
  }

  // 倒计时相关方法
  setCountdown(scene) {
    const dialog = document.getElementById("countdownDialog");
    const form = dialog.querySelector("form");
    const cancelBtn = dialog.querySelector(".cancel");

    // 重置表单
    form.reset();

    // 取消按钮事件
    cancelBtn.onclick = () => {
      dialog.close();
    };

    // 表单提交事件
    form.onsubmit = (e) => {
      e.preventDefault();
      const hours = parseInt(document.getElementById("hours").value) || 0;
      const minutes = parseInt(document.getElementById("minutes").value) || 0;
      const seconds = parseInt(document.getElementById("seconds").value) || 0;

      const duration = (hours * 3600 + minutes * 60 + seconds) * 1000;
      if (duration > 0) {
        this.startCountdown(scene, duration);
      }
      dialog.close();
    };

    dialog.showModal();
  }

  startCountdown(scene, duration) {
    // 如果正计时在运行，先停止它
    if (scene.timer.isRunning) {
      this.resetTimer(scene);
    }

    // 清除之前的倒计时（如果存在）
    if (scene.countdown.interval) {
      clearInterval(scene.countdown.interval);
    }

    scene.countdown.duration = duration;
    scene.countdown.remainingTime = duration;
    scene.countdown.isRunning = true;
    scene.countdown.isPaused = false;
    scene.countdown.endTime = Date.now() + duration;

    scene.countdown.interval = setInterval(() => {
      const now = Date.now();
      scene.countdown.remainingTime = Math.max(
        0,
        scene.countdown.endTime - now
      );

      if (scene.countdown.remainingTime <= 0) {
        this.stopCountdown(scene);
        this.notifyCountdownEnd(scene);
        return;
      }

      this.updateSceneDisplay(scene);
    }, 100);

    // 重新渲染整个卡片
    const oldCard = document.querySelector(`[data-scene-id="${scene.id}"]`);
    if (oldCard) {
      const newCard = this.createSceneCard(scene);
      oldCard.parentNode.replaceChild(newCard, oldCard);
    }

    this.saveToStorage();
  }

  pauseCountdown(scene) {
    if (!scene.countdown.isRunning || scene.countdown.isPaused) return;

    clearInterval(scene.countdown.interval);
    scene.countdown.isRunning = false;
    scene.countdown.isPaused = true;
    scene.countdown.remainingTime = scene.countdown.endTime - Date.now();

    this.updateSceneDisplay(scene);
    this.saveToStorage();
  }

  stopCountdown(scene) {
    clearInterval(scene.countdown.interval);
    scene.countdown = {
      duration: 0,
      remainingTime: 0,
      isRunning: false,
      isPaused: false,
      endTime: null,
      interval: null,
    };

    // 重新渲染卡片更新显示和按钮状态
    const oldCard = document.querySelector(`[data-scene-id="${scene.id}"]`);
    if (oldCard) {
      const newCard = this.createSceneCard(scene);
      oldCard.parentNode.replaceChild(newCard, oldCard);
    }

    this.saveToStorage();
  }

  // 通知相关方法
  async notifyCountdownEnd(scene) {
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification(`${scene.name} 倒计时结束！`);
      } else if (Notification.permission !== "denied") {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          new Notification(`${scene.name} 倒计时结束！`);
        }
      }
    }
  }

  // 更新显示
  updateSceneDisplay(scene) {
    const card = document.querySelector(`[data-scene-id="${scene.id}"]`);
    if (!card) return;

    const timerDisplay = card.querySelector(".elapsed-time");
    const startTimeDisplay = card.querySelector(".start-time");
    const countdownDisplay = card.querySelector(".remaining-time");

    if (timerDisplay) {
      timerDisplay.textContent = this.formatTime(scene.timer.elapsedTime);
    }

    if (startTimeDisplay && scene.timer.startTime) {
      startTimeDisplay.textContent = `开始于: ${new Date(
        scene.timer.startTime
      ).toLocaleTimeString()}`;
    }

    if (countdownDisplay) {
      countdownDisplay.textContent = this.formatTime(
        scene.countdown.remainingTime
      );
    }

    // 更新按钮状态
    const startBtn = card.querySelector(".timer-start");
    const pauseBtn = card.querySelector(".timer-pause");
    const countdownBtn = card.querySelector(".countdown-set");

    // 当任一计时器运行时，禁用开始计时和设置倒计时按钮
    if (startBtn)
      startBtn.disabled = scene.timer.isRunning || scene.countdown.isRunning;
    if (countdownBtn)
      countdownBtn.disabled =
        scene.timer.isRunning || scene.countdown.isRunning;

    // 只有在有计时器运行时才启用暂停按钮
    if (pauseBtn)
      pauseBtn.disabled = !scene.timer.isRunning && !scene.countdown.isRunning;
  }
}

// 启动应用
document.addEventListener("DOMContentLoaded", () => {
  window.timerApp = new TimerApp();
});
