// Download buttons open a picker for the three split APKs. Without JS they link to the release page.
// Each release also publishes fixed-name copies (VHELP-arm64.apk …, see the release workflow), and
// GitHub serves releases/latest/download/<name> from the newest release — so these links never go
// stale and never need the GitHub API (60 lookups/hour per IP, which a campus network shares).
// The API is asked once, only to show the version and file sizes; if it's rate-limited the links still work.
const RELEASE_API = "https://api.github.com/repos/vhelpcc/VHELP-releases/releases/latest";

const toast = document.getElementById("toast");
let toastTimer;
function say(msg, ms = 5000) {
  toast.textContent = msg;
  toast.classList.add("is-shown");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-shown"), ms);
}

const MB = (bytes) => Math.round(bytes / 1e6) + " MB";
const release = {
  tag: null, // filled from the API when it answers
  abis: {
    arm64: { size: 0, desc: "Nearly every Android phone from the last several years." },
    armeabi: { size: 0, desc: "Older 32-bit phones. Try this if the other one won't install." },
    x86_64: { size: 0, desc: "Chromebooks and Android emulators." },
  },
};
const apkUrl = (abi) =>
  release.abis[abi].url || `https://github.com/vhelpcc/VHELP-releases/releases/latest/download/VHELP-${abi}.apk`;

const dl = document.getElementById("dl");
const seg = dl.querySelector(".seg");
const go = document.getElementById("dlGo");
const radios = [...dl.querySelectorAll('input[name="abi"]')];

function renderAbi(animate) {
  const i = radios.findIndex((r) => r.checked);
  const abi = radios[i].value;
  seg.style.setProperty("--i", i);
  const apply = () => {
    go.href = apkUrl(abi);
    const size = release.abis[abi].size;
    dl.querySelector("[data-file]").textContent = size ? `${abi} · ${MB(size)}` : abi;
    dl.querySelector("[data-desc]").textContent = release.abis[abi].desc;
    dl.querySelector("[data-ver]").textContent = release.tag || "latest";
    dl.classList.remove("is-swapping");
  };
  if (!animate) return apply();
  dl.classList.add("is-swapping");
  setTimeout(apply, 180);
}
radios.forEach((r) => r.addEventListener("change", () => renderAbi(true)));
if (/CrOS/.test(navigator.userAgent)) radios[2].checked = true;
renderAbi(false);

let checkedLatest = false;
async function checkLatest() {
  if (checkedLatest) return;
  checkedLatest = true;
  try {
    const res = await fetch(RELEASE_API);
    if (!res.ok) return;
    const latest = await res.json();
    for (const a of latest.assets) {
      const fixed = a.name.match(/^VHELP-(arm64|armeabi|x86_64)\.apk$/)?.[1];
      const versioned = a.name.match(/^VHELP-v[\d.]+-(arm64|armeabi|x86_64)\.apk$/)?.[1];
      if (fixed) release.abis[fixed].size = a.size;
      // Releases published before the fixed-name copies existed: link the versioned file directly.
      if (versioned) {
        release.abis[versioned].size ||= a.size;
        if (!latest.assets.some((x) => x.name === `VHELP-${versioned}.apk`)) release.abis[versioned].url = a.browser_download_url;
      }
    }
    release.tag = latest.tag_name;
    renderAbi(false);
  } catch {
    // Offline or rate-limited: the links don't need this, only the version/size labels do.
  }
}

document.querySelectorAll("[data-download]").forEach((btn) =>
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    dl.showModal();
    window.lenis?.stop();
    document.documentElement.classList.remove("has-cursor");
    checkLatest();
  })
);
dl.addEventListener("close", () => {
  window.lenis?.start();
  if (window.cursorEnabled) document.documentElement.classList.add("has-cursor");
});
// Click on the backdrop closes it.
dl.addEventListener("click", (e) => e.target === dl && dl.close());
go.addEventListener("click", () => {
  const abi = radios.find((r) => r.checked).value;
  say(`Downloading VHELP ${release.tag || ""} (${abi}). Open the file to install.`.replace("  ", " "), 7000);
  setTimeout(() => dl.close(), 250);
});

// ---- copy email ----
document.querySelectorAll("[data-copy]").forEach((btn) => {
  const hint = btn.querySelector(".copy-hint");
  btn.addEventListener("click", async () => {
    const text = btn.dataset.copy;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Older browsers / insecure context: select-and-copy fallback.
      const ta = Object.assign(document.createElement("textarea"), { value: text });
      document.body.append(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    btn.classList.add("is-done");
    hint.textContent = "Copied";
    say("Email copied", 2500);
    setTimeout(() => {
      btn.classList.remove("is-done");
      hint.textContent = "Copy";
    }, 2000);
  });
});

// ---- logo: ">" types "help", turns into the "v" of vhelp, then back (same loop as the app header) ----
{
  const v = document.querySelector(".logo-v");
  const t = document.querySelector(".logo-t");
  const word = "help";
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    v.classList.add("is-v");
  } else {
    // Starts from the ">help" already in the markup.
    (async () => {
      await wait(900);
      for (;;) {
        v.classList.add("is-v");
        await wait(500 + 5000);
        v.classList.remove("is-v");
        await wait(500);
        for (let i = word.length - 1; i >= 0; i--) { t.textContent = word.slice(0, i); await wait(150); }
        for (let i = 1; i <= word.length; i++) { await wait(150); t.textContent = word.slice(0, i); }
        await wait(150);
      }
    })();
  }
}

// ---- nav: solid after the hero starts scrolling, hides on scroll down ----
const nav = document.getElementById("nav");
let lastY = 0;
addEventListener("scroll", () => {
  const y = scrollY;
  nav.classList.toggle("is-solid", y > 40);
  nav.classList.toggle("is-hidden", y > 400 && y > lastY);
  lastY = y;
}, { passive: true });

// ---- motion (skipped entirely if the CDN scripts didn't load) ----
if (window.gsap && window.ScrollTrigger && window.SplitText) {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.documentElement.classList.add("js");
  gsap.registerPlugin(ScrollTrigger, SplitText);
  // Pinned sections change page height, so neither a restored scroll position nor the browser's own
  // #hash jump lands in the right place. Take both over and scroll once the layout is final (below).
  const arrivalHash = location.hash;
  if (arrivalHash) history.replaceState(null, "", location.pathname + location.search);
  history.scrollRestoration = "manual";
  scrollTo(0, 0);
  ScrollTrigger.config({ ignoreMobileResize: true });

  // Smooth scroll
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = window.lenis = new Lenis({ lerp: 0.09 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  document.querySelectorAll('a[href^="#"]').forEach((a) =>
    a.addEventListener("click", (e) => {
      const target = document.querySelector(a.getAttribute("href"));
      if (!target) return;
      e.preventDefault();
      if (lenis) { lenis.resize(); lenis.scrollTo(target, { duration: 1.4 }); } else target.scrollIntoView();
      history.replaceState(null, "", a.getAttribute("href"));
    })
  );

  document.fonts.ready.then(() => {
    document.documentElement.classList.remove("loading");
    // Homepage-only sections; other pages (privacy) share the nav, cursor, picker and reveals.
    if (document.querySelector(".hero")) {
      // ---- hero entrance ----
      if (!reduce) {
        const heroLines = SplitText.create(".hero h1", { type: "lines", mask: "lines" });
        gsap.timeline({ defaults: { ease: "expo.out" } })
          .from(heroLines.lines, { yPercent: 110, duration: 1.4, stagger: 0.12 })
          .from(".hero [data-fade]", { y: 20, opacity: 0, duration: 1, stagger: 0.1 }, 0.35)
          .from(".hp-c", { "--ty": "70vh", duration: 1.6 }, 0.1)
          .from(".hp-l, .hp-r", { "--ty": "70vh", "--rot": "0deg", autoAlpha: 0, duration: 1.8, stagger: 0.08 }, 0.3);
      }

      // hero drifts away as you scroll
      const heroST = { trigger: ".hero", start: "top top", end: "bottom top", scrub: true };
      gsap.to(".hero-copy, .hero-side", { y: -120, opacity: 0, ease: "none", scrollTrigger: heroST });
      gsap.to(".hero-phones", { y: -220, ease: "none", scrollTrigger: heroST });

      // ---- academics: pinned phone, screens wipe in ----
      const shots = gsap.utils.toArray(".acad-phone img").slice(1);
      const items = gsap.utils.toArray(".acad-list li");
      gsap.set(shots, { clipPath: "inset(100% 0% 0% 0%)" });
      const acad = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: ".acad",
          pin: ".acad-pin",
          start: "top top",
          end: () => "+=" + innerHeight * shots.length,
          scrub: 0.6,
          onUpdate: (st) => {
            const i = Math.round(st.progress * shots.length);
            items.forEach((li, k) => li.classList.toggle("is-on", k === i));
          },
        },
      });
      shots.forEach((img, i) => {
        acad.to(img, { clipPath: "inset(0% 0% 0% 0%)", duration: 1 }, i + 0.2);
      });

      // ---- statement: words darken as you read ----
      const words = SplitText.create("[data-read]", { type: "words", wordsClass: "word" }).words;
      gsap.to(words, {
        color: "#121212",
        stagger: 0.1,
        ease: "none",
        scrollTrigger: { trigger: ".statement", start: "top 70%", end: "bottom 70%", scrub: true },
      });

      // ---- campus: vertical scroll drives the track sideways ----
      const track = document.querySelector(".h-track");
      const dist = () => Math.max(0, track.scrollWidth - innerWidth);
      gsap.to(track, {
        x: () => -dist(),
        ease: "none",
        scrollTrigger: {
          trigger: ".hscroll",
          pin: ".h-pin",
          start: "top top",
          end: () => "+=" + dist(),
          scrub: 0.6,
          invalidateOnRefresh: true,
        },
      });

      // ---- dark band: the V draws itself and settles ----
      const path = document.querySelector(".band-v path");
      const len = path.getTotalLength();
      gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
      const bandST = { trigger: ".band", start: "top 80%", end: "bottom 60%", scrub: 0.8 };
      gsap.to(path, { strokeDashoffset: 0, ease: "none", scrollTrigger: bandST });
      gsap.fromTo(".band-v", { rotate: -25, scale: 0.7 }, { rotate: 0, scale: 1, ease: "none", scrollTrigger: bandST });
    }

    // ---- line + fade reveals below the fold ----
    if (!reduce) {
      gsap.utils.toArray("main [data-lines], .foot [data-lines]").forEach((el) => {
        const lines = SplitText.create(el, { type: "lines", mask: "lines" }).lines;
        gsap.from(lines, {
          yPercent: 110,
          duration: 1.3,
          stagger: 0.1,
          ease: "expo.out",
          scrollTrigger: { trigger: el, start: "top 85%" },
        });
      });
      gsap.utils.toArray(".h-md, .faq-list details, .h-track li, .foot-cols").forEach((el) => {
        gsap.from(el, { y: 30, opacity: 0, duration: 1, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 90%" } });
      });
      gsap.from(".foot-word", {
        yPercent: 60,
        ease: "none",
        scrollTrigger: { trigger: ".foot", start: "top bottom", end: "bottom bottom", scrub: true },
      });
    }
    // ---- cursor: a blue disc, difference-blended so it inverts over light and dark sections ----
    if (matchMedia("(hover: hover) and (pointer: fine)").matches) {
      const dot = document.querySelector(".cursor");
      const dur = reduce ? 0 : 0.35;
      const x = gsap.quickTo(dot, "x", { duration: dur, ease: "power3" });
      const y = gsap.quickTo(dot, "y", { duration: dur, ease: "power3" });
      window.cursorEnabled = true;
      document.documentElement.classList.add("has-cursor");
      addEventListener("mousemove", (e) => {
        x(e.clientX);
        y(e.clientY);
        dot.classList.add("is-on");
      }, { passive: true });
      document.addEventListener("mouseleave", () => dot.classList.remove("is-on"));
      document.addEventListener("mouseover", (e) => {
        const hot = e.target.closest("a, button, summary, label, .h-track li");
        gsap.to(dot, { scale: hot ? 2.4 : 1, duration: 0.4, ease: "power3" });
      });
    }

    // Keyboard focus should never land on something still fading in.
    document.addEventListener("focusin", (e) => {
      const el = e.target.closest("details, .h-track li, .foot-cols, [data-fade]");
      if (el) gsap.set(el, { opacity: 1, y: 0 });
    });
    if (document.querySelector(".row-list")) ScrollTrigger.create({
      trigger: ".row-list",
      start: "top 85%",
      once: true,
      onEnter: () => document.querySelector(".row-list").classList.add("is-in"),
    });

    ScrollTrigger.refresh();
    // Arriving with a #hash (e.g. from the privacy page): ScrollTrigger may re-measure a few times while
    // the page settles (load, scrollbar appearing), each time moving the target. Re-land after every
    // refresh until the visitor scrolls on their own.
    const target = arrivalHash && document.querySelector(arrivalHash);
    if (target) {
      const land = () => {
        const y = target.getBoundingClientRect().top + scrollY;
        // Lenis caches the page height and clamps to it; the pins just made the page taller.
        if (lenis) { lenis.resize(); lenis.scrollTo(y, { immediate: true, force: true }); } else scrollTo(0, y);
      };
      const stop = () => {
        ScrollTrigger.removeEventListener("refresh", land);
        ["wheel", "touchstart", "keydown", "pointerdown"].forEach((ev) => removeEventListener(ev, stop));
      };
      ScrollTrigger.addEventListener("refresh", land);
      ["wheel", "touchstart", "keydown", "pointerdown"].forEach((ev) => addEventListener(ev, stop, { passive: true }));
      history.replaceState(null, "", arrivalHash);
      ScrollTrigger.refresh();
    }
  });
}
