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
  const nodes = document.querySelectorAll(".reveal");
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

function setupSpeakingForm() {
  const form = document.querySelector(".speaking-form");
  if (!form) {
    return;
  }

  const status = form.querySelector(".form-status");
  const endpoint = getConfigValue(form.dataset.endpointConfig || "");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);

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
      const response = await fetch(endpoint, {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        throw new Error("Request failed");
      }

      form.reset();
      if (status) {
        status.textContent = "Request sent. We will follow up soon.";
      }
    } catch (error) {
      if (status) {
        status.textContent = "Could not send request. Check the endpoint and try again.";
      }
    }
  });
}

setupIntegrationLinks();
setupCalendlyZone();
setupRevealAnimations();
setupSpeakingForm();
