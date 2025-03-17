const express = require("express");
const cors = require("cors");
const cron = require("node-cron");
const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");

// 添加日志函数
function log(type, message, data = "") {
  const timestamp = new Date().toISOString();
  console.log(
    `[${timestamp}] [${type}] ${message}`,
    data ? JSON.stringify(data) : ""
  );
}

const app = express();
app.use(cors());
app.use(express.json());

// 存储所有定时任务
const tasks = new Map();
const TASKS_FILE = path.join(__dirname, "data", "tasks.json");

// 确保数据目录和文件存在
if (!fs.existsSync(path.join(__dirname, "data"))) {
  fs.mkdirSync(path.join(__dirname, "data"), { recursive: true });
}
if (!fs.existsSync(TASKS_FILE)) {
  fs.writeFileSync(TASKS_FILE, JSON.stringify([], null, 2), "utf8");
  log("INFO", "创建任务文件成功");
}

// 加载保存的任务
function loadTasks() {
  try {
    if (fs.existsSync(TASKS_FILE)) {
      const savedTasks = JSON.parse(fs.readFileSync(TASKS_FILE, "utf8"));
      log("INFO", "开始加载保存的任务", { count: savedTasks.length });
      for (const task of savedTasks) {
        scheduleTask(task);
      }
      log("INFO", "任务加载完成");
    }
  } catch (error) {
    log("ERROR", "加载任务失败", error);
  }
}

// 保存任务到文件
function saveTasks() {
  try {
    const tasksToSave = Array.from(tasks.values()).map((task) => ({
      sceneId: task.sceneId,
      notifyAt: task.notifyAt,
      sceneName: task.sceneName,
      elapsedTime: task.elapsedTime,
    }));

    // 确保目录存在
    if (!fs.existsSync(path.dirname(TASKS_FILE))) {
      fs.mkdirSync(path.dirname(TASKS_FILE), { recursive: true });
    }

    // 写入文件
    fs.writeFileSync(TASKS_FILE, JSON.stringify(tasksToSave, null, 2), "utf8");
    log("INFO", "任务保存到文件成功", {
      count: tasksToSave.length,
      tasks: tasksToSave,
    });
  } catch (error) {
    log("ERROR", "保存任务失败", { error: error.message, stack: error.stack });
  }
}

// 调度任务
function scheduleTask(taskData) {
  const { sceneId, notifyAt, sceneName, elapsedTime } = taskData;

  try {
    // 计算延迟时间（毫秒）
    const delay = notifyAt - Date.now();

    // 创建定时任务
    const task = setTimeout(async () => {
      try {
        await sendNotification(sceneName, elapsedTime);
      } catch (error) {
        log("ERROR", "发送通知失败", error);
      } finally {
        tasks.delete(sceneId);
        saveTasks();
      }
    }, delay);

    // 保存任务信息
    const taskInfo = {
      sceneId,
      notifyAt,
      sceneName,
      elapsedTime,
      timer: task,
    };

    tasks.set(sceneId, taskInfo);
    saveTasks();

    return true;
  } catch (error) {
    log("ERROR", "调度任务失败", error);
    return false;
  }
}

// 发送通知
async function sendNotification(sceneName, elapsedTime) {
  try {
    // 将毫秒数转换为时分秒格式
    const hours = Math.floor(elapsedTime / (1000 * 60 * 60));
    const minutes = Math.floor((elapsedTime % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((elapsedTime % (1000 * 60)) / 1000);

    const formattedTime = `${String(hours).padStart(2, "0")}:${String(
      minutes
    ).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

    const notificationText = encodeURIComponent(
      `${sceneName} 已计时 ${formattedTime}！`
    );
    log("INFO", "准备发送通知", { sceneName, elapsedTime, formattedTime });

    const response = await fetch(
      `https://api2.pushdeer.com/message/push?pushkey=PDU34110TMyo9xp7yZWOLFuwFGfREJp4Jwnapa3eY&text=${notificationText}`,
      { method: "GET" }
    );
    const result = await response.json();
    log("INFO", "通知发送成功", result);
  } catch (error) {
    log("ERROR", "发送通知失败", error);
  }
}

// 添加定时任务
app.post("/timer", (req, res) => {
  try {
    const taskData = req.body;
    log("INFO", "收到新的定时任务请求", taskData);

    // 验证必要字段
    if (!taskData.sceneId || !taskData.notifyAt || !taskData.sceneName) {
      log("ERROR", "任务数据不完整", taskData);
      return res.status(400).json({ success: false, error: "缺少必要字段" });
    }

    // 如果已存在任务，先清除
    if (tasks.has(taskData.sceneId)) {
      log("INFO", "清除已存在的任务", { sceneId: taskData.sceneId });
      clearTimeout(tasks.get(taskData.sceneId).timer);
      tasks.delete(taskData.sceneId);
    }

    // 调度新任务
    const success = scheduleTask(taskData);

    if (success) {
      res.json({ success: true });
    } else {
      res.status(500).json({ success: false, error: "创建任务失败" });
    }
  } catch (error) {
    log("ERROR", "处理任务请求失败", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 删除定时任务
app.delete("/timer/:sceneId", (req, res) => {
  const { sceneId } = req.params;
  log("INFO", "收到删除任务请求", { sceneId });

  if (tasks.has(sceneId)) {
    clearTimeout(tasks.get(sceneId).timer);
    tasks.delete(sceneId);
    saveTasks();
    log("INFO", "任务删除成功", { sceneId });
  }
  res.json({ success: true });
});

// 获取所有定时任务
app.get("/timers", (req, res) => {
  const allTasks = Array.from(tasks.values()).map((task) => ({
    sceneId: task.sceneId,
    notifyAt: task.notifyAt,
    sceneName: task.sceneName,
    elapsedTime: task.elapsedTime,
  }));
  log("INFO", "获取所有任务", { count: allTasks.length });
  res.json(allTasks);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  log("INFO", `服务器启动成功，监听端口 ${PORT}`);
  loadTasks(); // 启动时加载保存的任务
});
