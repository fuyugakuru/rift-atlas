// Публичный ключ разрешён для браузера. Доступ к строкам ограничен RLS в базе.
(() => {
  const client = window.supabase?.createClient(
    "https://njguxarmxshnwxipxlxl.supabase.co",
    "sb_publishable_FApJoCwZo2y8aPCiB641uQ_BLvBBWKM",
  );
  const bounded = (promise) => {
    let timer;
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("Profile request timed out")), 15000);
      }),
    ]).finally(() => clearTimeout(timer));
  };
  let pendingUser,
    loadedUser,
    pendingLoad,
    savedProfile = { nickname: "Игрок", avatar: "mel" };
  const root = document.querySelector("#account-root");
  let epoch = 0;
  const avatarPicker = window.createProfileAvatarPicker?.(root, () => paintAvatar());
  const avatarValue = () => avatarPicker?.encoded() || root.querySelector("#profile-avatar").value;
  const applyAvatar = (value) => {
    if (avatarPicker) avatarPicker.apply(value);
    else root.querySelector("#profile-avatar").value = value;
  };
  const coverVideo = root?.querySelector("#profile-cover-video"),
    motionButton = root?.querySelector("#profile-motion-toggle");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let coverSource = "",
    motionPaused = false;
  function motionState() {
    if (!motionButton || !coverVideo) return;
    const playing = !coverVideo.paused;
    motionButton.textContent = playing ? "Ⅱ Пауза" : "▷ Анимация";
    motionButton.setAttribute("aria-pressed", String(playing));
  }
  function playCover() {
    if (!coverVideo || !coverSource || document.hidden) return;
    if (coverVideo.getAttribute("src") !== coverSource) {
      coverVideo.src = coverSource;
      coverVideo.load();
    }
    coverVideo.muted = true;
    coverVideo.play().catch(() => {
      motionState();
    });
  }
  function updateCoverMotion(src) {
    if (!coverVideo || !motionButton) return;
    if (src !== coverSource) {
      coverVideo.pause();
      coverVideo.classList.remove("is-playing");
      coverVideo.removeAttribute("src");
      coverVideo.load();
      coverSource = src || "";
    }
    motionButton.hidden = !coverSource;
    if (!coverSource) return;
    if (!motionPaused && !reduceMotion.matches && !navigator.connection?.saveData) playCover();
    else motionState();
  }
  if (coverVideo) {
    coverVideo.muted = true;
    coverVideo.addEventListener("playing", () => {
      coverVideo.classList.add("is-playing");
      motionState();
    });
    coverVideo.addEventListener("pause", motionState);
    coverVideo.addEventListener("error", () => {
      coverVideo.classList.remove("is-playing");
      if (motionButton) motionButton.hidden = true;
    });
    motionButton?.addEventListener("click", () => {
      if (coverVideo.paused) {
        motionPaused = false;
        playCover();
      } else {
        motionPaused = true;
        coverVideo.pause();
      }
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) coverVideo.pause();
      else if (!motionPaused && !reduceMotion.matches && api.user) playCover();
    });
    reduceMotion.addEventListener("change", () => {
      if (reduceMotion.matches) coverVideo.pause();
      else if (!motionPaused && api.user) playCover();
    });
  }
  const api = (window.RiftAccount = { user: null, loading: true, client, favorites: [] });
  function message(text, error = false) {
    const el =
      document.querySelector("#account-message") || document.querySelector("#account-toast");
    if (el) {
      el.textContent = text;
      el.classList.toggle("is-error", error);
      el.hidden = false;
    }
  }
  api.message = message;
  const emit = () =>
    window.dispatchEvent(new CustomEvent("rift-account-favorites", { detail: api.favorites }));
  const redirect = () => new URL("account.html", location.href).href.split("#")[0].split("?")[0];
  function errorText(e) {
    const text = e?.message || "";
    if (/invalid login/i.test(text)) return "Неверная почта или пароль.";
    if (/email not confirmed/i.test(text)) return "Подтверди почту по ссылке в письме.";
    if (/rate limit/i.test(text)) return "Слишком много попыток. Попробуй позже.";
    if (/fetch|network/i.test(text)) return "Нет связи с сервером. Попробуй ещё раз.";
    if (/password.*least/i.test(text)) return "Пароль должен содержать не меньше 8 символов.";
    if (/signups not allowed|email address.*not authorized/i.test(text))
      return "Регистрация пока недоступна: на сайте ещё настраивается отправка писем.";
    return "Не удалось выполнить действие. Попробуй позже.";
  }
  async function busy(button, work) {
    button.disabled = true;
    try {
      await work();
    } catch (e) {
      message(errorText(e), true);
    } finally {
      button.disabled = false;
    }
  }
  function display() {
    document.querySelectorAll("[data-account-link]").forEach((a) => {
      const label = a.querySelector("[data-account-label]") || a;
      label.textContent = api.user ? "Мой профиль" : "Войти";
    });
    if (!root) return;
    if (!api.user && coverVideo) coverVideo.pause();
    root.querySelector("#account-guest").hidden = !!api.user;
    root.querySelector("#account-member").hidden = !api.user;
    root.querySelector("#account-loading").hidden = !api.loading;
    if (api.user) root.querySelector("#account-email").textContent = api.user.email || "";
  }
  function load(user, force = false) {
    const id = user?.id || null;
    if (!force && pendingLoad && pendingUser === id) return pendingLoad;
    if (!force && loadedUser === id) return Promise.resolve();
    pendingUser = id;
    const job = loadProfile(user);
    pendingLoad = job;
    job.finally(() => {
      if (pendingLoad === job) pendingLoad = null;
    });
    return job;
  }
  async function loadProfile(user) {
    const turn = ++epoch;
    if (api.user?.id !== user?.id) {
      api.favorites = [];
      emit();
    }
    if (api.user?.id !== user?.id) loadedUser = undefined;
    api.user = user;
    api.loading = true;
    display();
    try {
      if (!user) {
        api.favorites = JSON.parse(localStorage.getItem("rift-favorites") || "[]");
        if (!Array.isArray(api.favorites)) api.favorites = [];
        emit();
        return;
      }
      const [f, p] = await bounded(
        Promise.all([
          client.from("favorites").select("champion_id").eq("user_id", user.id),
          client.from("profiles").select("nickname,avatar").eq("id", user.id).maybeSingle(),
        ]),
      );
      if (turn !== epoch) return;
      if (f.error || p.error) throw f.error || p.error;
      loadedUser = user.id;
      api.favorites = f.data.map((r) => r.champion_id);
      emit();
      if (root) {
        root.querySelector("#profile-nickname").value =
          p.data?.nickname || user.user_metadata?.nickname || "Игрок";
        applyAvatar(p.data?.avatar || "mel");
        savedProfile = {
          nickname: root.querySelector("#profile-nickname").value,
          avatar: avatarValue(),
        };
        paintAvatar();
        renderFavorites();
      }
    } catch (e) {
      if (turn === epoch) {
        api.favorites = [];
        emit();
        message("Не удалось загрузить профиль. Проверь соединение и обнови страницу.", true);
      }
    } finally {
      if (turn === epoch) {
        api.loading = false;
        display();
      }
    }
  }
  api.toggleFavorite = async (id) => {
    if (!api.user || api.loading) throw Error("Profile unavailable");
    const userId = api.user.id,
      turn = epoch,
      on = api.favorites.includes(id);
    const query = on
      ? client.from("favorites").delete().eq("user_id", userId).eq("champion_id", id)
      : client
          .from("favorites")
          .upsert(
            { user_id: userId, champion_id: id },
            { onConflict: "user_id,champion_id", ignoreDuplicates: true },
          );
    const { error } = await query;
    if (error) throw error;
    if (turn !== epoch) throw Error("Session changed");
    api.favorites = on ? api.favorites.filter((x) => x !== id) : [...api.favorites, id];
    emit();
    renderFavorites();
    return api.favorites;
  };
  function paintAvatar() {
    if (!root) return;
    const select = root.querySelector("#profile-avatar"),
      id = select.value;
    const choice = avatarPicker?.current(),
      custom = choice && !choice.base;
    root.querySelector("#profile-picture").src = custom
      ? choice.skin.avatar || choice.skin.image + "&w=256&h=256&fit=crop&auto=format"
      : "assets/champions/faces/" + id + ".webp";
    const cover = root.querySelector("#profile-cover");
    if (cover)
      cover.src = custom
        ? choice.skin.image + "&w=1280&auto=format"
        : select.selectedOptions[0]?.dataset.hero || "assets/champions/mel-hero.jpg";
    updateCoverMotion(
      custom ? choice.skin.animation : select.selectedOptions[0]?.dataset.coverVideo,
    );
    const name = root.querySelector("#profile-display-name");
    if (name) name.textContent = root.querySelector("#profile-nickname").value.trim() || "Игрок";
  }
  function editProfile(open, restore = false) {
    const panel = root?.querySelector("#profile-editor"),
      button = root?.querySelector("#profile-configure");
    if (!panel || !button) return;
    if (restore) {
      root.querySelector("#profile-nickname").value = savedProfile.nickname;
      applyAvatar(savedProfile.avatar);
      paintAvatar();
    }
    panel.hidden = !open;
    button.setAttribute("aria-expanded", String(open));
    if (open) root.querySelector("#profile-nickname").focus();
    else if (panel.contains(document.activeElement)) button.focus();
  }
  function renderFavorites() {
    if (!root) return;
    const count = root.querySelector("#profile-favorite-count");
    if (count) count.textContent = api.favorites.length;
    const list = root.querySelector("#profile-favorites");
    list.replaceChildren();
    for (const id of api.favorites) {
      const option = root.querySelector('#profile-avatar option[value="' + CSS.escape(id) + '"]');
      if (!option) continue;
      const a = document.createElement("a");
      a.href = id + ".html";
      a.className = "profile-favorite";
      const img = document.createElement("img");
      img.src = "assets/champions/faces/" + id + ".webp";
      img.alt = "";
      const label = document.createElement("span");
      label.textContent = option.textContent;
      a.append(img, label);
      list.append(a);
    }
    root.querySelector("#profile-empty").hidden = !!list.children.length;
  }
  if (!client) {
    api.loading = false;
    message("Не удалось загрузить модуль входа. Обнови страницу.", true);
    return;
  }
  if (root) {
    root
      .querySelector("#profile-configure")
      ?.addEventListener("click", () => editProfile(root.querySelector("#profile-editor").hidden));
    root
      .querySelector("#profile-cancel")
      ?.addEventListener("click", () => editProfile(false, true));
    root
      .querySelector("#profile-editor-close")
      ?.addEventListener("click", () => editProfile(false, true));
    root.querySelector("#profile-editor")?.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        editProfile(false, true);
      }
    });
    root.querySelectorAll("[data-auth-mode]").forEach((b) =>
      b.addEventListener("click", () => {
        const signup = b.dataset.authMode === "signup";
        root.querySelector("#auth-nickname-row").hidden = !signup;
        root.querySelector("#auth-nickname").required = signup;
        root.querySelector("#auth-submit").textContent = signup ? "Создать аккаунт" : "Войти";
        root.querySelector("#auth-form").dataset.mode = b.dataset.authMode;
        root.querySelector("#auth-password").autocomplete = signup
          ? "new-password"
          : "current-password";
        root
          .querySelectorAll("[data-auth-mode]")
          .forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      }),
    );
    root.querySelector("#auth-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      busy(root.querySelector("#auth-submit"), async () => {
        const email = form.elements.email.value.trim(),
          password = form.elements.password.value;
        const result =
          form.dataset.mode === "signup"
            ? await client.auth.signUp({
                email,
                password,
                options: {
                  emailRedirectTo: redirect(),
                  data: { nickname: form.elements.nickname.value.trim() },
                },
              })
            : await client.auth.signInWithPassword({ email, password });
        if (result.error) throw result.error;
        form.elements.password.value = "";
        message(
          form.dataset.mode === "signup"
            ? "Проверь почту: если регистрация доступна, придёт письмо для подтверждения."
            : "Вход выполнен.",
        );
      });
    });
    root.querySelector("#auth-reset").addEventListener("click", (event) =>
      busy(event.currentTarget, async () => {
        const email = root.querySelector("#auth-email");
        if (!email.reportValidity() || !email.value) return;
        const { error } = await client.auth.resetPasswordForEmail(email.value.trim(), {
          redirectTo: redirect(),
        });
        if (error) throw error;
        message("Если аккаунт существует, на почту придёт ссылка для восстановления.");
      }),
    );
    root.querySelector("#profile-form").addEventListener("submit", (event) => {
      event.preventDefault();
      busy(root.querySelector("#profile-save"), async () => {
        if (!api.user) throw Error("No session");
        const { error } = await client
          .from("profiles")
          .upsert({
            id: api.user.id,
            nickname: root.querySelector("#profile-nickname").value.trim(),
            avatar: avatarValue(),
            updated_at: new Date().toISOString(),
          });
        if (error) throw error;
        savedProfile = {
          nickname: root.querySelector("#profile-nickname").value.trim(),
          avatar: avatarValue(),
        };
        paintAvatar();
        editProfile(false);
        message("Профиль сохранён.");
      });
    });
    root.querySelector("#profile-avatar").addEventListener("change", paintAvatar);
    root.querySelector("#auth-signout").addEventListener("click", (event) =>
      busy(event.currentTarget, async () => {
        const { error } = await client.auth.signOut({ scope: "local" });
        if (error) throw error;
        message("Ты вышел из аккаунта.");
      }),
    );
    root.querySelector("#profile-import").addEventListener("click", (event) =>
      busy(event.currentTarget, async () => {
        let guest = [];
        try {
          guest = JSON.parse(localStorage.getItem("rift-favorites") || "[]");
        } catch {}
        const ids = Array.isArray(guest)
          ? [...new Set(guest)].filter(
              (id) =>
                typeof id === "string" &&
                root.querySelector('#profile-avatar option[value="' + CSS.escape(id) + '"]'),
            )
          : [];
        if (!ids.length) {
          message("В этом браузере нет гостевого избранного.");
          return;
        }
        const { error } = await client.from("favorites").upsert(
          ids.map((id) => ({ user_id: api.user.id, champion_id: id })),
          { onConflict: "user_id,champion_id", ignoreDuplicates: true },
        );
        if (error) throw error;
        await load(api.user, true);
        message("Избранное из этого браузера добавлено в аккаунт.");
      }),
    );
    root.querySelector("#recovery-form").addEventListener("submit", (event) => {
      event.preventDefault();
      busy(root.querySelector("#recovery-save"), async () => {
        const { error } = await client.auth.updateUser({
          password: root.querySelector("#recovery-password").value,
        });
        if (error) throw error;
        root.querySelector("#recovery-form").hidden = true;
        root.querySelector("#recovery-password").value = "";
        message("Пароль обновлён.");
      });
    });
  }
  client.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY" && root) root.querySelector("#recovery-form").hidden = false;
    setTimeout(() => load(session?.user || null), 0);
  });
  bounded(client.auth.getSession())
    .then(({ data, error }) => {
      if (error) {
        message("Не удалось проверить вход. Обнови страницу.", true);
        api.loading = false;
        display();
      } else load(data.session?.user || null);
    })
    .catch(() => {
      api.loading = false;
      display();
      message("Вход проверяется слишком долго. Обнови страницу и попробуй ещё раз.", true);
    });
})();
