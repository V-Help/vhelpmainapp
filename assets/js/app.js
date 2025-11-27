class VHelpccApp {
  constructor() {
    this.navbar = document.getElementById("navbar");
    this.mobileMenuBtn = document.getElementById("mobileMenuBtn");
    this.navLinks = document.getElementById("navLinks");
    this.backToTop = document.getElementById("backToTop");
    this.downloadBtn = document.getElementById("downloadBtn");

    // Supabase config - using service role key for RLS bypass
    this.supabaseUrl = "https://umsauywmuibaqbgfumwg.supabase.co";
    this.supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtc2F1eXdtdWliYXFiZ2Z1bXdnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzU4NDY0OCwiZXhwIjoyMDY5MTYwNjQ4fQ.1QhA7UzwxmZZ7kr_mIkFZO6s9cOgq3g5-5wjqL7CrXo";

    this.init();
  }

  init() {
    this.setupScrollEffects();
    this.setupMobileMenu();
    this.setupSmoothScrolling();
    this.setupIntersectionObserver();
    this.setupDownloadHandler();
    this.setupActiveNavigation();
    this.setupBackToTop();
  }

  setupScrollEffects() {
    let scrollTimeout;
    window.addEventListener(
      "scroll",
      () => {
        if (scrollTimeout) cancelAnimationFrame(scrollTimeout);
        scrollTimeout = requestAnimationFrame(() => {
          const scrollY = window.scrollY;

          if (scrollY > 50) {
            this.navbar.classList.add("scrolled");
            this.backToTop.classList.add("visible");
          } else {
            this.navbar.classList.remove("scrolled");
            this.backToTop.classList.remove("visible");
          }
        });
      },
      { passive: true }
    );
  }

  setupMobileMenu() {
    this.mobileMenuBtn.addEventListener("click", () => {
      this.mobileMenuBtn.classList.toggle("active");
      this.navLinks.classList.toggle("active");
    });

    document.addEventListener("click", (e) => {
      if (
        !this.navbar.contains(e.target) &&
        this.navLinks.classList.contains("active")
      ) {
        this.navLinks.classList.remove("active");
        this.mobileMenuBtn.classList.remove("active");
      }
    });

    this.navLinks.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        this.navLinks.classList.remove("active");
        this.mobileMenuBtn.classList.remove("active");
      });
    });
  }

  setupSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener("click", (e) => {
        e.preventDefault();
        const target = document.querySelector(anchor.getAttribute("href"));
        if (target) {
          target.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      });
    });
  }

  setupIntersectionObserver() {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px",
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");

          if (entry.target.classList.contains("stat-item")) {
            this.animateCounter(entry.target);
          }
        }
      });
    }, observerOptions);

    document.querySelectorAll(".fade-in, .stat-item").forEach((el) => {
      observer.observe(el);
    });

    this.fetchStats();
  }

  async fetchStats() {
    try {
      console.log("Fetching statistics from Supabase...");

      const usersResponse = await fetch(
        `${this.supabaseUrl}/rest/v1/users?select=uid`,
        {
          headers: {
            apikey: this.supabaseServiceKey,
            Authorization: `Bearer ${this.supabaseServiceKey}`,
          },
        }
      );

      const ordersResponse = await fetch(
        `${this.supabaseUrl}/rest/v1/orders?select=id`,
        {
          headers: {
            apikey: this.supabaseServiceKey,
            Authorization: `Bearer ${this.supabaseServiceKey}`,
          },
        }
      );

      if (!usersResponse.ok || !ordersResponse.ok) {
        const usersError = await usersResponse.text();
        const ordersError = await ordersResponse.text();
        console.error("Supabase errors:", { usersError, ordersError });
        throw new Error("Failed to fetch from Supabase");
      }

      const usersData = await usersResponse.json();
      const ordersData = await ordersResponse.json();

      const totalUsers = Array.isArray(usersData) ? usersData.length : 0;
      const totalOrders = Array.isArray(ordersData) ? ordersData.length : 0;

      console.log("Statistics fetched:", { totalUsers, totalOrders });

      this.updateStatsDisplay({
        targetStudents: 15000,
        totalOrders: totalOrders,
        totalUsers: totalUsers,
      });
    } catch (error) {
      console.error("Error fetching statistics:", error);
      document.querySelectorAll(".stat-item").forEach((item) => {
        item.querySelector(".stat-number").textContent = "Error";
      });
    }
  }

  updateStatsDisplay(statsData) {
    const statItems = document.querySelectorAll(".stat-item");

    statItems.forEach((item) => {
      const key = item.dataset.statKey;
      const value = statsData[key];

      if (value !== undefined) {
        item.dataset.target = value;
        this.animateCounter(item);
      }
    });
  }

  animateCounter(statItem) {
    if (statItem.dataset.animated) return;
    statItem.dataset.animated = true;

    const numberElement = statItem.querySelector(".stat-number");
    const target = parseInt(statItem.dataset.target);
    const statKey = statItem.dataset.statKey;
    let current = 0;
    const increment = Math.ceil(target / 100);

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }

      // Display raw values for users and orders, formatted for target students
      if (statKey === "totalUsers" || statKey === "totalOrders") {
        numberElement.textContent = current.toLocaleString();
      } else if (target >= 1000) {
        numberElement.textContent = (current / 1000).toFixed(1) + "K+";
      } else {
        numberElement.textContent = current.toLocaleString() + "+";
      }
    }, 30);
  }

  setupDownloadHandler() {
    this.downloadBtn.addEventListener("click", (e) => {
      e.preventDefault();
      this.handleDownload();
    });
  }

  async handleDownload() {
    const originalText = this.downloadBtn.innerHTML;

    this.downloadBtn.classList.add("loading");
    this.downloadBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Fetching Latest Version...';

    try {
      const response = await fetch(
        "https://firestore.googleapis.com/v1/projects/vhelp-user/databases/(default)/documents/app_config/version"
      );

      if (!response.ok) {
        throw new Error("Failed to fetch version info");
      }

      const data = await response.json();
      const downloadUrl = data.fields.downloadUrl.stringValue;
      const version = data.fields.latestVersion.stringValue;

      window.open(downloadUrl, "_blank");

      this.showNotification(`📱 Downloading V HELPCC v${version}`, "success");
    } catch (error) {
      console.error("Download error:", error);

      this.showNotification(
        "❌ Download failed. Please try again later.",
        "error"
      );
    } finally {
      setTimeout(() => {
        this.downloadBtn.classList.remove("loading");
        this.downloadBtn.innerHTML = originalText;
      }, 2000);
    }
  }

  showNotification(message, type = "success") {
    const notification = document.createElement("div");
    notification.className = "notification";
    notification.innerHTML = message;

    if (type === "error") {
      notification.style.background =
        "linear-gradient(135deg, #ef4444, #dc2626)";
    }

    document.body.appendChild(notification);

    setTimeout(() => notification.classList.add("show"), 100);

    setTimeout(() => {
      notification.classList.remove("show");
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  setupActiveNavigation() {
    const sections = document.querySelectorAll("section[id]");
    const navItems = document.querySelectorAll(".nav-links a[data-section]");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const activeNavItem = document.querySelector(
              `[data-section="${entry.target.id}"]`
            );

            navItems.forEach((item) => item.classList.remove("active"));

            if (activeNavItem) {
              activeNavItem.classList.add("active");
            }
          }
        });
      },
      {
        threshold: 0.3,
        rootMargin: "-100px 0px -100px 0px",
      }
    );

    sections.forEach((section) => observer.observe(section));
  }

  setupBackToTop() {
    this.backToTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new VHelpccApp();
});

window.addEventListener("load", () => {
  console.log("V HELPCC Landing Page fully loaded! 🚀");
});
