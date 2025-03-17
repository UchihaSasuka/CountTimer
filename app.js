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
      notifyAt: null, // 添加通知时间点
      notified: false, // 添加通知状态标记
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
    this.initNotifications();
    // 添加音频元素
    this.notificationSound = new Audio();
    this.notificationSound.src = "notification.mp3";
    this.notificationSound.volume = 1.0; // 最大音量
    this.notificationSound.loop = true; // 循环播放直到用户响应
    this.notificationSound.preload = "auto";
    this.initWorker();
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
  async createScene() {
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

      // 恢复每个场景的计时器状态
      this.scenes.forEach((scene) => {
        // 恢复正计时
        if (scene.timer.isRunning) {
          scene.timer.interval = setInterval(() => {
            scene.timer.elapsedTime = Date.now() - scene.timer.startTime;
            this.updateSceneDisplay(scene);
          }, 10);
        }

        // 恢复倒计时
        if (scene.countdown.isRunning) {
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
        }
      });
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
      scene.timer.isRunning ||
      scene.countdown.isRunning ||
      scene.timer.isPaused ||
      scene.countdown.isPaused;

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
            <div class="time-info">
              <span class="start-time">${
                scene.timer.startTime
                  ? "开始于: " +
                    new Date(scene.timer.startTime).toLocaleTimeString()
                  : ""
              }</span>
              ${
                scene.timer.notifyAt
                  ? `<span class="notify-time">通知时间: ${new Date(
                      scene.timer.notifyAt
                    ).toLocaleTimeString()}</span>`
                  : ""
              }
            </div>
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
              !scene.timer.isRunning &&
              !scene.timer.isPaused &&
              !scene.countdown.isRunning &&
              !scene.countdown.isPaused
                ? "disabled"
                : ""
            }>
              ${
                scene.timer.isPaused || scene.countdown.isPaused
                  ? "继续"
                  : "暂停"
              }
            </button>
            <button class="button timer-reset">重置</button>
            <button class="button countdown-set" ${
              isAnyTimerRunning ? "disabled" : ""
            }>设置倒计时</button>
            ${
              scene.timer.isRunning
                ? `<button class="button set-notify">设置通知</button>`
                : ""
            }
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
    const notifyBtn = card.querySelector(".set-notify");

    startBtn.addEventListener("click", () => this.startTimer(scene));
    pauseBtn.addEventListener("click", () => this.pauseTimer(scene));
    resetBtn.addEventListener("click", () => {
      if (confirm("确定要重置计时器吗？所有计时数据将被清除。")) {
        this.resetAll(scene);
      }
    });
    deleteBtn.addEventListener("click", () => this.deleteScene(scene.id));
    countdownBtn.addEventListener("click", () => this.setCountdown(scene));

    // 添加通知按钮事件
    if (notifyBtn) {
      notifyBtn.addEventListener("click", () =>
        this.showNextNotificationDialog(scene)
      );
    }
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

    // 创建时间设置对话框
    const timeSetterDialog = document.createElement("dialog");
    timeSetterDialog.className = "time-setter-dialog";
    timeSetterDialog.innerHTML = `
      <form method="dialog">
        <h3>设置开始时间</h3>
        <div class="time-setter">
          <input type="datetime-local" id="dialogStartTimeInput" />
        </div>
        <div class="notification-setter">
          <h4>设置通知时间</h4>
          <div class="time-inputs">
            <div class="input-group">
              <input type="number" id="notifyHours" min="0" value="0" />
              <label>小时</label>
            </div>
            <div class="input-group">
              <input type="number" id="notifyMinutes" min="0" max="59" value="0" />
              <label>分钟</label>
            </div>
          </div>
        </div>
        <div class="dialog-buttons">
          <button type="button" class="button cancel">使用当前时间</button>
          <button type="submit" class="button confirm">确定</button>
        </div>
      </form>
    `;
    document.body.appendChild(timeSetterDialog);

    // 获取对话框中的输入框元素
    const startTimeInput = timeSetterDialog.querySelector(
      "#dialogStartTimeInput"
    );

    // 设置默认值为当前时间
    const now = new Date();
    const beijingTime = new Date(
      now.getTime() - now.getTimezoneOffset() * 60000
    ).toISOString();
    startTimeInput.max = beijingTime.slice(0, 16);
    startTimeInput.value = beijingTime.slice(0, 16);

    const form = timeSetterDialog.querySelector("form");
    const cancelBtn = timeSetterDialog.querySelector(".cancel");

    cancelBtn.onclick = () => {
      const notifyHours =
        parseInt(document.getElementById("notifyHours").value) || 0;
      const notifyMinutes =
        parseInt(document.getElementById("notifyMinutes").value) || 0;
      const notifyOffset = (notifyHours * 60 + notifyMinutes) * 60 * 1000;

      timeSetterDialog.close();
      timeSetterDialog.remove();
      this.startTimerWithTime(scene, Date.now(), notifyOffset);
    };

    form.onsubmit = (e) => {
      e.preventDefault();
      const baseTime = new Date(startTimeInput.value);
      baseTime.setSeconds(0);
      const selectedTime = baseTime.getTime();

      // 计算通知时间
      const notifyHours =
        parseInt(document.getElementById("notifyHours").value) || 0;
      const notifyMinutes =
        parseInt(document.getElementById("notifyMinutes").value) || 0;
      const notifyOffset = (notifyHours * 60 + notifyMinutes) * 60 * 1000;

      if (selectedTime) {
        this.startTimerWithTime(scene, selectedTime, notifyOffset);
      }
      timeSetterDialog.close();
      timeSetterDialog.remove();
    };

    timeSetterDialog.showModal();
  }

  startTimerWithTime(scene, startTimeValue, notifyOffset) {
    scene.timer.isRunning = true;
    scene.timer.isPaused = false;
    scene.timer.startTime = startTimeValue;

    // 精确到秒
    if (notifyOffset > 0) {
      const startTimeSec = Math.floor(startTimeValue / 1000) * 1000;
      scene.timer.notifyAt = startTimeSec + notifyOffset;
    } else {
      scene.timer.notifyAt = null;
    }

    scene.timer.notified = false;
    scene.timer.lastPausedTime = null;

    if (scene.timer.interval) {
      clearInterval(scene.timer.interval);
    }

    scene.timer.interval = setInterval(() => {
      const now = Date.now();
      scene.timer.elapsedTime = now - scene.timer.startTime;

      // 检查是否需要发送通知
      if (
        scene.timer.notifyAt &&
        !scene.timer.notified &&
        now >= scene.timer.notifyAt
      ) {
        this.notifyTimerAlert(scene);
        scene.timer.notified = true;
      }

      this.updateSceneDisplay(scene);
    }, 10);

    // 如果设置了通知时间，创建服务端定时任务
    if (scene.timer.notifyAt) {
      const notifyElapsedTime = notifyOffset; // 这是预计的通知时刻已计时时间
      fetch("http://192.168.50.244:3000/timer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sceneId: scene.id,
          notifyAt: scene.timer.notifyAt,
          sceneName: scene.name,
          elapsedTime: notifyOffset, // 使用通知时间点减去开始时间
        }),
      }).catch((error) => console.error("创建定时任务失败:", error));
    }

    // 更新显示
    const oldCard = document.querySelector(`[data-scene-id="${scene.id}"]`);
    if (oldCard) {
      const newCard = this.createSceneCard(scene);
      oldCard.parentNode.replaceChild(newCard, oldCard);
    }

    this.saveToStorage();
  }

  pauseTimer(scene) {
    // 处理正计时的暂停/恢复
    if (scene.timer.isRunning || scene.timer.isPaused) {
      if (scene.timer.isRunning) {
        // 暂停正计时
        clearInterval(scene.timer.interval);
        scene.timer.isRunning = false;
        scene.timer.isPaused = true;
        scene.timer.lastPausedTime = Date.now();
      } else {
        // 恢复正计时
        scene.timer.isRunning = true;
        scene.timer.isPaused = false;

        // 计算暂停期间经过的时间，并调整开始时间
        const pauseDuration = Date.now() - scene.timer.lastPausedTime;
        scene.timer.startTime += pauseDuration;
        scene.timer.lastPausedTime = null;

        scene.timer.interval = setInterval(() => {
          scene.timer.elapsedTime = Date.now() - scene.timer.startTime;
          this.updateSceneDisplay(scene);
        }, 10);
      }
    }

    // 处理倒计时的暂停/恢复
    if (scene.countdown.isRunning || scene.countdown.isPaused) {
      if (scene.countdown.isRunning) {
        // 暂停倒计时
        clearInterval(scene.countdown.interval);
        scene.countdown.isRunning = false;
        scene.countdown.isPaused = true;
        scene.countdown.pausedAt = Date.now();
      } else {
        // 恢复倒计时
        scene.countdown.isRunning = true;
        scene.countdown.isPaused = false;

        // 调整结束时间，考虑暂停的时间
        const pauseDuration = Date.now() - scene.countdown.pausedAt;
        scene.countdown.endTime += pauseDuration;
        scene.countdown.pausedAt = null;

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
      }
    }

    this.updateSceneDisplay(scene);
    this.saveToStorage();
  }

  resetAll(scene) {
    // 删除服务端定时任务
    fetch("http://192.168.50.244:3000/timer/" + scene.id, {
      method: "DELETE",
    }).catch((error) => console.error("删除定时任务失败:", error));

    // 重置正计时
    clearInterval(scene.timer.interval);
    scene.timer = {
      startTime: null,
      elapsedTime: 0,
      isRunning: false,
      isPaused: false,
      lastPausedTime: null,
      interval: null,
      notifyAt: null,
      notified: false,
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

    scene.countdown = {
      duration: duration,
      remainingTime: duration,
      isRunning: true,
      isPaused: false,
      endTime: Date.now() + duration,
      interval: null,
      pausedAt: null,
    };

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

    // 创建服务端定时任务
    fetch("http://192.168.50.244:3000/timer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sceneId: scene.id,
        notifyAt: scene.countdown.endTime,
        sceneName: scene.name,
        elapsedTime: this.formatTime(duration),
      }),
    }).catch((error) => console.error("创建定时任务失败:", error));

    // 立即更新显示
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
    try {
      const notificationText = encodeURIComponent(`${scene.name} 倒计时结束！`);
      const response = await fetch(
        `https://api2.pushdeer.com/message/push?pushkey=PDU34110TMyo9xp7yZWOLFuwFGfREJp4Jwnapa3eY&text=${notificationText}`,
        {
          mode: "no-cors",
        }
      );

      console.log("通知发送成功");
    } catch (error) {
      console.error("通知发送失败:", error);
    }
  }

  // 添加 iOS 专用通知方法
  showIOSNotification(sceneName) {
    // 1. 创建一个临时的通知元素
    const notification = document.createElement("div");
    notification.className = "ios-notification";
    notification.innerHTML = `
      <div class="ios-notification-content">
        <div class="ios-notification-title">${sceneName}</div>
        <div class="ios-notification-message">倒计时结束！</div>
      </div>
    `;

    document.body.appendChild(notification);

    // 2. 动画显示
    setTimeout(() => {
      notification.classList.add("show");
    }, 100);

    // 3. 几秒后自动消失
    setTimeout(() => {
      notification.classList.remove("show");
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 5000);

    // 点击关闭
    notification.addEventListener("click", () => {
      notification.classList.remove("show");
      setTimeout(() => {
        notification.remove();
      }, 300);
    });
  }

  // 修改声音播放方法
  async playNotificationSound() {
    try {
      // 优先使用预加载的音频元素
      await this.notificationSound.play();
    } catch (error) {
      // 如果音频元素播放失败，尝试使用 Web Audio API
      try {
        const audioContext = new (window.AudioContext ||
          window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        gainNode.gain.value = 0.1;
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime);

        oscillator.start();
        setTimeout(() => {
          oscillator.stop();
          audioContext.close();
        }, 200);
      } catch (webAudioError) {
        console.log("所有音频播放方式都失败:", webAudioError);
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
      startTimeDisplay.textContent = `开始于: ${this.formatDateTime(
        scene.timer.startTime
      )}`;
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

    const isAnyTimerRunning =
      scene.timer.isRunning ||
      scene.countdown.isRunning ||
      scene.timer.isPaused ||
      scene.countdown.isPaused;

    if (startBtn) {
      startBtn.disabled = isAnyTimerRunning;
    }
    if (countdownBtn) {
      countdownBtn.disabled = isAnyTimerRunning;
    }
    if (pauseBtn) {
      pauseBtn.disabled =
        !scene.timer.isRunning &&
        !scene.timer.isPaused &&
        !scene.countdown.isRunning &&
        !scene.countdown.isPaused;
      pauseBtn.textContent =
        scene.timer.isPaused || scene.countdown.isPaused ? "继续" : "暂停";
    }
  }

  // 添加一个新的日期时间格式化方法
  formatDateTime(timestamp) {
    const date = new Date(timestamp);
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  }

  async initNotifications() {
    // 移除 Service Worker 相关代码，因为我们使用 HTTP API 发送通知
    try {
      // 可以保留一些初始化逻辑，如果需要的话
      console.log("通知系统初始化成功");
    } catch (error) {
      console.error("通知初始化失败:", error);
    }
  }

  // 添加正计时通知方法
  async notifyTimerAlert(scene) {
    try {
      const notificationText = encodeURIComponent(
        `${scene.name} 已计时 ${this.formatTime(scene.timer.elapsedTime)}！`
      );
      const response = await fetch(
        `https://api2.pushdeer.com/message/push?pushkey=PDU34110TMyo9xp7yZWOLFuwFGfREJp4Jwnapa3eY&text=${notificationText}`,
        {
          mode: "no-cors",
        }
      );

      console.log("通知发送成功");

      // 移除自动弹出对话框
      // this.showNextNotificationDialog(scene);
    } catch (error) {
      console.error("通知发送失败:", error);
    }
  }

  // 添加设置下一次通知时间的对话框
  showNextNotificationDialog(scene) {
    const dialog = document.createElement("dialog");
    dialog.className = "time-setter-dialog";
    dialog.innerHTML = `
      <form method="dialog">
        <h3>设置下一次通知时间</h3>
        <div class="notification-setter">
          ${
            scene.timer.notifyAt
              ? `<div class="last-notify">上次通知时间: ${new Date(
                  scene.timer.notifyAt
                ).toLocaleTimeString()}</div>`
              : ""
          }
          <div class="time-inputs">
            <div class="input-group">
              <input type="number" id="nextNotifyHours" min="0" value="0" />
              <label>小时</label>
            </div>
            <div class="input-group">
              <input type="number" id="nextNotifyMinutes" min="0" max="59" value="0" />
              <label>分钟</label>
            </div>
          </div>
        </div>
        <div class="dialog-buttons">
          <button type="button" class="button cancel">取消</button>
          <button type="submit" class="button confirm">确定</button>
        </div>
      </form>
    `;
    document.body.appendChild(dialog);

    const form = dialog.querySelector("form");
    const cancelBtn = dialog.querySelector(".cancel");

    cancelBtn.onclick = () => {
      dialog.close();
      dialog.remove();
    };

    form.onsubmit = (e) => {
      e.preventDefault();
      const hours =
        parseInt(document.getElementById("nextNotifyHours").value) || 0;
      const minutes =
        parseInt(document.getElementById("nextNotifyMinutes").value) || 0;
      const notifyOffset = (hours * 60 + minutes) * 60 * 1000;

      if (notifyOffset > 0) {
        const baseTime =
          scene.timer.notifyAt || Math.floor(Date.now() / 1000) * 1000;
        scene.timer.notifyAt = baseTime + notifyOffset;
        scene.timer.notified = false;

        // 计算到通知时刻时的已计时时间
        const notifyElapsedTime = scene.timer.notifyAt - scene.timer.startTime;

        fetch("http://192.168.50.244:3000/timer", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sceneId: scene.id,
            notifyAt: scene.timer.notifyAt,
            sceneName: scene.name,
            elapsedTime: notifyElapsedTime, // 使用预计的通知时刻计时时间
          }),
        }).catch((error) => console.error("创建定时任务失败:", error));

        // 立即更新显示
        const oldCard = document.querySelector(`[data-scene-id="${scene.id}"]`);
        if (oldCard) {
          const newCard = this.createSceneCard(scene);
          oldCard.parentNode.replaceChild(newCard, oldCard);
        }

        this.saveToStorage();
      }

      dialog.close();
      dialog.remove();
    };

    dialog.showModal();
  }

  initWorker() {
    try {
      this.worker = new Worker("timer-worker.js");
      this.worker.onmessage = (e) => {
        const { type, sceneId } = e.data;
        if (type === "notification-triggered") {
          const scene = this.scenes.find((s) => s.id === sceneId);
          if (scene) {
            scene.timer.notified = true;
            this.saveToStorage();
          }
        }
      };
    } catch (error) {
      console.error("Worker 初始化失败:", error);
    }
  }
}

// 启动应用
document.addEventListener("DOMContentLoaded", () => {
  window.timerApp = new TimerApp();
});
