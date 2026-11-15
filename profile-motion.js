// Два одинаковых ролика перекрываются на стыке, без перемотки видимого слоя.
window.createProfileCoverMotion = (first, button) => {
  if (!first || !button) return { update() {}, pause() {} };
  const second = first.cloneNode(false);
  second.removeAttribute("id");
  first.after(second);
  const videos = [first, second],
    reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const frames = new Map();
  let source = "",
    active = 0,
    desired = false,
    transitioning = false,
    generation = 0,
    timer;
  const fade = 700;
  for (const video of videos) {
    video.loop = false;
    video.removeAttribute("loop");
    video.removeAttribute("autoplay");
    video.muted = true;
    video.preload = "auto";
  }
  function paintButton() {
    const playing = desired && !document.hidden;
    button.hidden = !source;
    button.textContent = playing ? "Ⅱ Пауза" : "▷ Анимация";
    button.setAttribute("aria-pressed", String(playing));
  }
  function pause() {
    videos.forEach((video) => video.pause());
    for (const [video, handle] of frames) video.cancelVideoFrameCallback?.(handle);
    frames.clear();
    paintButton();
  }
  function watch(video, turn) {
    if (!video.requestVideoFrameCallback || frames.has(video)) return;
    frames.set(
      video,
      video.requestVideoFrameCallback(() => {
        frames.delete(video);
        if (turn !== generation || video !== videos[active] || video.paused) return;
        checkBoundary(video);
        watch(video, turn);
      }),
    );
  }
  async function start() {
    if (!source || !desired || document.hidden) return;
    const turn = generation,
      video = videos[active];
    try {
      await video.play();
      if (turn !== generation) return;
      video.classList.add("is-playing");
      watch(video, turn);
    } catch {
      if (turn === generation) desired = false;
    }
    paintButton();
  }
  async function crossfade() {
    if (transitioning || !desired || document.hidden) return;
    transitioning = true;
    const turn = generation,
      old = videos[active],
      nextIndex = 1 - active,
      next = videos[nextIndex];
    try {
      next.currentTime = 0;
      await next.play();
      if (turn !== generation) return;
      if (!desired || document.hidden) {
        next.pause();
        transitioning = false;
        return;
      }
      active = nextIndex;
      next.classList.add("is-playing");
      old.classList.remove("is-playing");
      watch(next, turn);
      timer = setTimeout(() => {
        if (turn !== generation) return;
        old.pause();
        old.currentTime = 0;
        transitioning = false;
      }, fade);
    } catch {
      transitioning = false;
    }
  }
  function checkBoundary(video) {
    if (video !== videos[active] || !Number.isFinite(video.duration)) return;
    if (video.duration - video.currentTime <= Math.min(0.8, video.duration / 4)) crossfade();
  }
  for (const video of videos) {
    video.addEventListener("timeupdate", () => checkBoundary(video));
    video.addEventListener("ended", () => {
      if (video === videos[active]) crossfade();
    });
    video.addEventListener("error", () => {
      if (video === videos[active]) {
        desired = false;
        paintButton();
      }
    });
  }
  button.addEventListener("click", () => {
    desired = !desired;
    if (desired) start();
    else pause();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pause();
    else start();
  });
  reduce.addEventListener("change", () => {
    if (reduce.matches) {
      desired = false;
      pause();
    }
  });
  return {
    update(src) {
      src = src || "";
      if (src === source) return;
      generation++;
      clearTimeout(timer);
      transitioning = false;
      source = src;
      active = 0;
      for (const [video, handle] of frames) video.cancelVideoFrameCallback?.(handle);
      frames.clear();
      for (const video of videos) {
        video.pause();
        video.classList.remove("is-playing");
        video.removeAttribute("src");
        if (source) video.src = source;
        video.load();
      }
      desired = !!source && !reduce.matches && !navigator.connection?.saveData;
      paintButton();
      start();
    },
    pause() {
      desired = false;
      pause();
    },
  };
};
