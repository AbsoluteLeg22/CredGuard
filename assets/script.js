document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("themeToggle");
  if (!btn) return;

  const saved = localStorage.getItem("cg_theme");
  if (saved === "light") {
    document.body.classList.add("light");
    btn.textContent = "🌙";
  } else {
    btn.textContent = "☀️";
  }

  btn.addEventListener("click", () => {
    document.body.classList.toggle("light");
    const isLight = document.body.classList.contains("light");
    btn.textContent = isLight ? "🌙" : "☀️";
    localStorage.setItem("cg_theme", isLight ? "light" : "dark");
  });
});

(() => {
  let buffer = "";
  let locked = false;

  document.addEventListener(
    "keydown",
    (e) => {
      if (locked) return;

      const tag = document.activeElement?.tagName || "";
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      const k = (e.key || "").toLowerCase();
      if (k.length !== 1) return;

      buffer += k;
      if (buffer.length > 24) buffer = buffer.slice(-24);

      if (buffer.includes("credguard")) {
        locked = true;
        buffer = "";

        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        window.location.replace("/admin-login");

        setTimeout(() => {
          locked = false;
        }, 2000);
      }
    },
    true
  );
})();

function animateCounter(el, target) {
  const duration = 900;
  const start = performance.now();
  const from = 0;

  function step(t) {
    const p = Math.min((t - start) / duration, 1);
    const value = Math.floor(from + (target - from) * (1 - Math.pow(1 - p, 3)));
    el.textContent = value.toLocaleString();
    if (p < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".counter").forEach((c) => {
    const target = Number(c.getAttribute("data-target") || "0");
    animateCounter(c, target);
  });
});

(function initParticles() {
  const canvas = document.getElementById("particles");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  resize();
  window.addEventListener("resize", resize);

  const COUNT = 80;
  const parts = Array.from({ length: COUNT }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: Math.random() * 2 + 0.8,
    vx: (Math.random() - 0.5) * 0.45,
    vy: (Math.random() - 0.5) * 0.45,
  }));

  function frame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(0, 230, 118, 0.85)";

    for (const p of parts) {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(frame);
  }

  frame();
})();

function scoreLabelFromRating(r) {
  return ["—", "Very weak", "Weak", "Moderate", "Strong", "Very strong"][r] || "—";
}

function barWidthFromRating(r) {
  return [0, 18, 38, 62, 82, 100][r] || 0;
}

function chipsFromSuggestions(sugs) {
  return (sugs || []).slice(0, 5).map((s) => {
    const t = (s || "").toLowerCase();
    if (t.includes("12")) return { text: "Make it longer", hint: "Try 12–16+ characters" };
    if (t.includes("uppercase")) return { text: "Add uppercase", hint: "A–Z" };
    if (t.includes("lowercase")) return { text: "Add lowercase", hint: "a–z" };
    if (t.includes("numbers") || t.includes("number")) return { text: "Add numbers", hint: "0–9" };
    if (t.includes("symbols") || t.includes("symbol")) return { text: "Add symbols", hint: "!@#" };
    if (t.includes("common weak password")) return { text: "Avoid common passwords", hint: s };
    if (t.includes("predictable")) return { text: "Avoid patterns", hint: s };
    return { text: "Improve", hint: s };
  });
}

async function analyzePasswordLive(password) {
  const res = await fetch("/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  return await res.json();
}

async function updateStrengthUI(password) {
  const scoreEl = document.getElementById("scoreLabel");
  const bar = document.getElementById("strengthBar");
  const stars = document.getElementById("stars");
  const crack = document.getElementById("crackTime");
  const sugList = document.getElementById("suggestions");
  const chipsWrap = document.getElementById("chips");
  const successCheck = document.getElementById("successCheck");

  const strengthCard = scoreEl ? scoreEl.closest(".glass-card") : null;

  if (!scoreEl || !bar || !stars || !crack || !sugList || !chipsWrap) return;

  const clearAnim = () => {
    if (strengthCard) strengthCard.classList.remove("is-typing", "is-weak", "success-sweep");
    if (successCheck) successCheck.classList.remove("on");
  };

  if (!password) {
    clearAnim();
    scoreEl.textContent = "—";
    bar.style.width = "0%";
    bar.classList.remove("glow");
    stars.textContent = "☆☆☆☆☆";
    crack.textContent = "—";
    sugList.innerHTML = `<li class="muted">Enter a password to begin analysis.</li>`;
    chipsWrap.innerHTML = "";
    return;
  }

  if (strengthCard) strengthCard.classList.add("is-typing");

  const data = await analyzePasswordLive(password);
  const r = Number(data.rating || 0);

  scoreEl.textContent = scoreLabelFromRating(r);
  bar.style.width = barWidthFromRating(r) + "%";
  bar.classList.add("glow");
  stars.textContent = "★".repeat(r) + "☆".repeat(5 - r);
  crack.textContent = data.crack_time || "—";

  const sugs = data.suggestions || [];
  sugList.innerHTML = sugs.length
    ? sugs.map((s) => `<li>${s}</li>`).join("")
    : `<li>✔ Looks good — no obvious improvements needed.</li>`;

  const chips = chipsFromSuggestions(sugs);
  chipsWrap.innerHTML = chips
    .map((c) => `<button type="button" class="chip" title="${c.hint}">${c.text}</button>`)
    .join("");

  if (strengthCard) strengthCard.classList.remove("is-typing");

  if (strengthCard && r <= 2) {
    strengthCard.classList.remove("is-weak");
    void strengthCard.offsetWidth;
    strengthCard.classList.add("is-weak");
  }

  if (strengthCard && r === 5) {
    strengthCard.classList.remove("success-sweep");
    void strengthCard.offsetWidth;
    strengthCard.classList.add("success-sweep");
    if (successCheck) successCheck.classList.add("on");
  } else {
    if (successCheck) successCheck.classList.remove("on");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const pw = document.getElementById("passwordInput");
  const toggle = document.getElementById("togglePw");

  if (pw) {
    let t;
    pw.addEventListener("input", () => {
      clearTimeout(t);

      t = setTimeout(async () => {
        await updateStrengthUI(pw.value);
        pw.dispatchEvent(new Event("input", { bubbles: true }));
      }, 140);
    });
  }

  if (toggle && pw) {
    toggle.addEventListener("click", () => {
      pw.type = pw.type === "password" ? "text" : "password";
      toggle.textContent = pw.type === "password" ? "👁️" : "🙈";
    });
  }
});

async function previewAnalyze(password) {
  const res = await fetch("/preview-analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  return await res.json();
}

function attachMiniChecker(opts) {
  const pw = document.getElementById(opts.inputId);
  const toggle = document.getElementById(opts.toggleId);

  const scoreEl = document.getElementById(opts.scoreId);
  const bar = document.getElementById(opts.barId);
  const stars = document.getElementById(opts.starsId);
  const crack = document.getElementById(opts.crackId);
  const sugList = document.getElementById(opts.suggestionsId);
  const chipsWrap = document.getElementById(opts.chipsId);
  const successCheck = document.getElementById(opts.checkId);

  const previewNote = document.getElementById("previewNote");

  if (!pw || !scoreEl || !bar || !stars || !crack || !sugList || !chipsWrap) return;

  const card = scoreEl.closest(".glass-card");

  const resetUI = () => {
    if (card) card.classList.remove("is-typing", "is-weak", "success-sweep");
    if (successCheck) successCheck.classList.remove("on");
    if (previewNote) previewNote.classList.remove("show");

    scoreEl.textContent = "—";
    bar.style.width = "0%";
    bar.classList.remove("glow");
    stars.textContent = "☆☆☆☆☆";
    crack.textContent = "—";
    sugList.innerHTML = `<li class="muted">Enter a password to begin analysis.</li>`;
    chipsWrap.innerHTML = "";
  };

  const applyUI = async () => {
    const password = pw.value || "";
    if (!password) return resetUI();

    if (previewNote) previewNote.classList.add("show");
    if (card) card.classList.add("is-typing");

    const data = await previewAnalyze(password);
    const r = Number(data.rating || 0);

    scoreEl.textContent = scoreLabelFromRating(r);
    bar.style.width = barWidthFromRating(r) + "%";
    bar.classList.add("glow");
    stars.textContent = "★".repeat(r) + "☆".repeat(5 - r);
    crack.textContent = data.crack_time || "—";

    const sugs = data.suggestions || [];
    sugList.innerHTML = sugs.length
      ? sugs.map((s) => `<li>${s}</li>`).join("")
      : `<li>✔ Looks good — no obvious improvements needed.</li>`;

    const chips = chipsFromSuggestions(sugs);
    chipsWrap.innerHTML = chips
      .map((c) => `<button type="button" class="chip" title="${c.hint}">${c.text}</button>`)
      .join("");

    if (card) card.classList.remove("is-typing");

    if (card && r <= 2) {
      card.classList.remove("is-weak");
      void card.offsetWidth;
      card.classList.add("is-weak");
    }

    if (card && r === 5) {
      card.classList.remove("success-sweep");
      void card.offsetWidth;
      card.classList.add("success-sweep");
      if (successCheck) successCheck.classList.add("on");
    } else {
      if (successCheck) successCheck.classList.remove("on");
    }
  };

  let t;
  pw.addEventListener("input", () => {
    clearTimeout(t);
    t = setTimeout(applyUI, 140);
  });

  if (toggle) {
    toggle.addEventListener("click", () => {
      pw.type = pw.type === "password" ? "text" : "password";
      toggle.textContent = pw.type === "password" ? "👁️" : "🙈";
    });
  }

  resetUI();
}

document.addEventListener("DOMContentLoaded", () => {
  attachMiniChecker({
    inputId: "homePasswordInput",
    toggleId: "homeTogglePw",
    scoreId: "homeScoreLabel",
    barId: "homeStrengthBar",
    starsId: "homeStars",
    crackId: "homeCrackTime",
    suggestionsId: "homeSuggestions",
    chipsId: "homeChips",
    checkId: "homeSuccessCheck",
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("passwordInput");
  if (!input) return;

  const chkLength = document.getElementById("chkLength");
  const chkLengthMeta = document.getElementById("chkLengthMeta");
  const chkUpper = document.getElementById("chkUpper");
  const chkLower = document.getElementById("chkLower");
  const chkNum = document.getElementById("chkNum");
  const chkSym = document.getElementById("chkSym");
  const whyBox = document.getElementById("whyBox");

  const hasUpper = (s) => /[A-Z]/.test(s);
  const hasLower = (s) => /[a-z]/.test(s);
  const hasNum = (s) => /[0-9]/.test(s);
  const hasSym = (s) => /[^A-Za-z0-9]/.test(s);

  function setCheck(el, ok) {
    if (!el) return;
    el.classList.toggle("ok", !!ok);
    const icon = el.querySelector(".chk-icon");
    if (icon) icon.textContent = ok ? "✔" : "○";
  }

  function updateWhy(password) {
    if (!whyBox) return;
    if (!password) {
      whyBox.textContent = "Start typing to see why your score changes.";
      return;
    }
    if (password.length < 12) return (whyBox.textContent = "Increase length to 12+ for the biggest strength boost.");
    if (!hasUpper(password)) return (whyBox.textContent = "Add uppercase letters (A–Z) to increase variety.");
    if (!hasLower(password)) return (whyBox.textContent = "Add lowercase letters (a–z) to improve mix.");
    if (!hasNum(password)) return (whyBox.textContent = "Add numbers (0–9) to make guessing harder.");
    if (!hasSym(password)) return (whyBox.textContent = "Add symbols (!@#…) to increase complexity.");
    whyBox.textContent = "Nice — you meet the key criteria. Consider making it longer for extra strength.";
  }

  function updateChecklist() {
    const p = input.value || "";
    if (chkLengthMeta) chkLengthMeta.textContent = String(p.length);

    setCheck(chkLength, p.length >= 12);
    setCheck(chkUpper, hasUpper(p));
    setCheck(chkLower, hasLower(p));
    setCheck(chkNum, hasNum(p));
    setCheck(chkSym, hasSym(p));
    updateWhy(p);
  }

  function addLength(p) {
    const pad = "x9Q";
    return (p || "") + pad + (p.length < 6 ? "Secure" : "");
  }

  function addUpper(p) {
    return hasUpper(p) ? p : (p || "") + "A";
  }

  function addNumbers(p) {
    return hasNum(p) ? p : (p || "") + "7";
  }

  function addSymbols(p) {
    return hasSym(p) ? p : (p || "") + "!";
  }

  function shuffleMix(p) {
    const s = (p || "");
    if (s.length < 2) return s;
    const arr = s.split("");
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.join("");
  }

  document.querySelectorAll(".sg-action-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.getAttribute("data-action");
      let p = input.value || "";

      if (action === "length") p = addLength(p);
      if (action === "uppercase") p = addUpper(p);
      if (action === "numbers") p = addNumbers(p);
      if (action === "symbols") p = addSymbols(p);
      if (action === "shuffle") p = shuffleMix(p);

      input.value = p;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  });

  document.querySelectorAll(".acc-btn").forEach((b) => {
    b.addEventListener("click", () => {
      const expanded = b.getAttribute("aria-expanded") === "true";
      b.setAttribute("aria-expanded", String(!expanded));

      const panel = b.nextElementSibling;
      if (panel && panel.classList.contains("acc-panel")) {
        panel.style.maxHeight = !expanded ? panel.scrollHeight + "px" : "0px";
      }

      const icon = b.querySelector(".acc-icon");
      if (icon) icon.textContent = !expanded ? "−" : "+";
    });
  });

  input.addEventListener("input", updateChecklist);
  updateChecklist();
});

async function checkCommonPassword() {
  const input = document.getElementById("commonCheckInput");
  const result = document.getElementById("commonCheckResult");
  if (!input || !result) return;

  const password = input.value || "";

  if (!password.trim()) {
    result.textContent = "Enter a password to run the weak password check.";
    result.style.color = "";
    return;
  }

  result.textContent = "Checking security pattern...";
  result.style.color = "";

  try {
    const response = await fetch("/check-common", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ password })
    });

    const data = await response.json();
    result.textContent = data.message || "Check complete.";

    if (data.status === "weak") {
      result.style.color = "#ff5a7a";
    } else if (data.status === "warning") {
      result.style.color = "#ffd166";
    } else {
      result.style.color = "#00ff88";
    }
  } catch (error) {
    result.textContent = "Unable to run the weak password check right now.";
    result.style.color = "";
  }
}

async function runRainbowDemo() {
  const input = document.getElementById("rainbowInput");
  const hashBox = document.getElementById("rainbowHash");
  const result = document.getElementById("rainbowResult");
  const lookupViz = document.getElementById("lookupViz");
  const lookupSteps = document.getElementById("lookupSteps");

  if (!input || !hashBox || !result || !lookupViz || !lookupSteps) return;

  const password = input.value || "";

  if (!password.trim()) {
    result.textContent = "Enter a password to run the rainbow table demonstration.";
    result.style.color = "";
    hashBox.textContent = "";
    lookupViz.style.display = "none";
    lookupSteps.innerHTML = "";
    return;
  }

  result.textContent = "Running demonstration...";
  result.style.color = "";
  hashBox.textContent = "";
  lookupViz.style.display = "block";
  lookupSteps.innerHTML = "";

  try {
    const response = await fetch("/rainbow-demo", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ password })
    });

    const data = await response.json();

    hashBox.textContent = data.target_hash || "";
    lookupSteps.innerHTML = "";

    if (Array.isArray(data.steps)) {
      data.steps.forEach((step) => {
        const row = document.createElement("div");
        row.className = "lookup-row lookup-step";
        row.innerHTML = `<b>Tried:</b> ${step.word}<br><span class="muted">${step.hash}</span>${step.match ? "<br><b>Match found</b>" : ""}`;
        lookupSteps.appendChild(row);
      });
    }

    if (data.status === "compromised") {
      result.textContent = `Match found. This password was recovered from the demonstration hash list as "${data.matched_password}".`;
      result.style.color = "#ff5a7a";
    } else {
      result.textContent = "No match was found in the demonstration list.";
      result.style.color = "#00ff88";
    }
  } catch (error) {
    lookupViz.style.display = "none";
    lookupSteps.innerHTML = "";
    hashBox.textContent = "";
    result.textContent = "Unable to run the rainbow table demonstration right now.";
    result.style.color = "";
  }
}