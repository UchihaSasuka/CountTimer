let timers = new Map();

self.onmessage = function (e) {
  const { type, sceneId, duration, endTime } = e.data;

  if (type === "start-countdown") {
    // 清除可能存在的旧计时器
    if (timers.has(sceneId)) {
      clearTimeout(timers.get(sceneId));
    }

    // 设置新的计时器
    const timer = setTimeout(() => {
      self.postMessage({
        type: "countdown-end",
        sceneId: sceneId,
      });
    }, duration);

    timers.set(sceneId, timer);
  }
};
