const menuButton = document.querySelector(".menu-toggle");
const siteNav = document.querySelector(".site-nav");
const yearNode = document.getElementById("year");
const config = window.FOREVER_FORWARD_CONFIG || {};

if (menuButton && siteNav) {
  menuButton.addEventListener("click", () => {
    const isOpen = siteNav.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(isOpen));
  });
}

if (yearNode) {
  yearNode.textContent = `${new Date().getFullYear()} | Move Forever Forward`;
}

function getConfigValue(path) {
  return path.split(".").reduce((value, key) => (value && value[key] ? value[key] : ""), config);
}

function setupIntegrationLinks() {
  document.querySelectorAll(".integration-link").forEach((link) => {
    const configPath = link.dataset.configPath;
    const fallback = link.dataset.fallback || link.getAttribute("href") || "#";
    const liveHref = configPath ? getConfigValue(configPath) : "";

    if (liveHref) {
      link.href = liveHref;
      link.classList.remove("is-placeholder");
      if (/^https?:\/\//.test(liveHref)) {
        link.target = "_blank";
        link.rel = "noreferrer";
      }
    } else {
      link.href = fallback;
      link.classList.add("is-placeholder");
    }
  });
}

function setupCalendlyZone() {
  const shell = document.querySelector(".calendly-shell");
  if (!shell) {
    return;
  }

  const calendlyUrl = getConfigValue(shell.dataset.calendlyConfig || "");
  if (!calendlyUrl) {
    return;
  }

  shell.innerHTML = `
    <p class="placeholder-title">Book Your Free Consultation</p>
    <iframe
      class="calendly-frame"
      src="${calendlyUrl}"
      title="Calendly scheduling"
      loading="lazy"
    ></iframe>
  `;
}

function setupRevealAnimations() {
  const nodes = document.querySelectorAll(".reveal, .reveal-stagger > *");
  if (!nodes.length) {
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.18 }
  );

  nodes.forEach((node) => observer.observe(node));
}

function setupParallax() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  const header = document.querySelector(".site-header");
  const root = document.documentElement;
  let ticking = false;

  const update = () => {
    const y = window.scrollY || window.pageYOffset || 0;
    root.style.setProperty("--scroll-y", y.toFixed(2));
    if (header) {
      header.classList.toggle("is-scrolled", y > 24);
    }
    ticking = false;
  };

  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    },
    { passive: true }
  );

  update();
}

function setupSpeakingForm() {
  const form = document.querySelector(".speaking-form");
  if (!form) {
    return;
  }

  const status = form.querySelector(".form-status");
  const endpoint = getConfigValue(form.dataset.endpointConfig || "");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!endpoint) {
      if (status) {
        status.textContent = "Form endpoint not set yet. Add it in config.js to make this live.";
      }
      return;
    }

    if (status) {
      status.textContent = "Sending request...";
    }

    try {
      const payload = {};
      new FormData(form).forEach((value, key) => {
        payload[key] = value;
      });

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("Request failed");
      }

      const result = await response.json().catch(() => ({ success: true }));
      if (result.success === false) {
        throw new Error(result.error || "Request failed");
      }

      form.reset();
      if (status) {
        status.textContent = "Request sent. Jacob will follow up soon.";
      }
    } catch (error) {
      if (status) {
        status.textContent = "Could not send request. Please email jacob@foreverforwardcoaching.com directly.";
      }
    }
  });
}

function setupCardHover() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }
  if (!window.matchMedia("(hover: hover)").matches) {
    return;
  }

  document.querySelectorAll(".card, .price-card").forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      const rect = card.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty("--mx", `${x}%`);
      card.style.setProperty("--my", `${y}%`);
    });
  });
}

setupIntegrationLinks();
setupCalendlyZone();
setupRevealAnimations();
setupParallax();
setupCardHover();
setupSpeakingForm();
