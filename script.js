// Update the sample content in index.html.
const filterButtons = document.querySelectorAll(".filter-button");
const visibleCount = document.querySelector("#visible-count");
const emptyState = document.querySelector("#empty-state");
const menuToggle = document.querySelector(".menu-toggle");
const navLinks = document.querySelector("#nav-links");
const themeToggle = document.querySelector(".theme-toggle");
const portfolioConfig = window.PORTFOLIO_CONFIG;

function formatProjectCount(count) {
  return count > 15 ? "+15" : String(count).padStart(2, "0");
}

const portfolioClient = window.supabase?.createClient && portfolioConfig?.supabaseUrl && !portfolioConfig.supabaseUrl.includes("YOUR_PROJECT") && portfolioConfig.supabaseAnonKey && !portfolioConfig.supabaseAnonKey.includes("YOUR_SUPABASE")
  ? window.supabase.createClient(portfolioConfig.supabaseUrl, portfolioConfig.supabaseAnonKey)
  : null;

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const nextTheme = theme === "light" ? "dark" : "light";
  themeToggle.setAttribute("aria-label", `Switch to ${nextTheme} theme`);
  themeToggle.title = `Switch to ${nextTheme} theme`;
  themeToggle.querySelector(".theme-toggle-icon").textContent = theme === "light" ? "☾" : "☼";
  try {
    localStorage.setItem("portfolio-theme", theme);
  } catch {}
}

setTheme(document.documentElement.dataset.theme || "dark");
themeToggle.addEventListener("click", () => {
  setTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light");
});

// Tune these values to adjust the background's density, drift, and palette.
const flowSettings = {
  lineCount: 22,
  speed: 0.00012,
  colors: ["#D8B4FE", "#FFDAB9"]
};

const flowCanvas = document.querySelector(".flowing-lines");
const flowContext = flowCanvas?.getContext("2d");

if (flowCanvas && flowContext) {
  let flowWidth = 0;
  let flowHeight = 0;
  let animationFrame = 0;
  let lastFrameTime = 0;
  let lines = [];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function resizeFlowCanvas() {
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    flowWidth = window.innerWidth;
    flowHeight = window.innerHeight;
    flowCanvas.width = Math.round(flowWidth * pixelRatio);
    flowCanvas.height = Math.round(flowHeight * pixelRatio);
    flowContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    const lineCount = window.innerWidth < 700 ? 13 : flowSettings.lineCount;
    lines = Array.from({ length: lineCount }, (_, index) => ({
      offset: (index + 0.5) / lineCount,
      amplitude: 18 + Math.random() * 70,
      frequency: 0.7 + Math.random() * 1.2,
      phase: Math.random() * Math.PI * 2,
      opacity: 0.16 + Math.random() * 0.22,
      width: 0.55 + Math.random() * 0.65
    }));

    drawFlowLines(0);
  }

  function drawFlowLines(time) {
    flowContext.clearRect(0, 0, flowWidth, flowHeight);

    const gradient = flowContext.createLinearGradient(0, 0, flowWidth, flowHeight * 0.25);
    gradient.addColorStop(0, flowSettings.colors[0]);
    gradient.addColorStop(1, flowSettings.colors[1]);
    flowContext.lineCap = "round";

    lines.forEach((line, index) => {
      const phase = line.phase + time * flowSettings.speed * (index % 2 ? 1 : -1);
      const baseY = line.offset * flowHeight;

      flowContext.beginPath();
      flowContext.moveTo(-20, baseY + Math.sin(phase) * line.amplitude);
      flowContext.bezierCurveTo(
        flowWidth * 0.28,
        baseY + Math.sin(phase + line.frequency) * line.amplitude,
        flowWidth * 0.68,
        baseY + Math.cos(phase + line.frequency) * line.amplitude,
        flowWidth + 20,
        baseY + Math.sin(phase + line.frequency * 2) * line.amplitude
      );

      flowContext.strokeStyle = gradient;
      flowContext.globalAlpha = line.opacity * 0.3;
      flowContext.lineWidth = line.width * 5;
      flowContext.shadowBlur = 12;
      flowContext.shadowColor = flowSettings.colors[index % flowSettings.colors.length];
      flowContext.stroke();

      flowContext.globalAlpha = line.opacity;
      flowContext.lineWidth = line.width;
      flowContext.shadowBlur = 0;
      flowContext.stroke();
    });

    flowContext.globalAlpha = 1;
    flowContext.shadowBlur = 0;
  }

  function animateFlowLines(time) {
    if (document.hidden || reducedMotion.matches) {
      animationFrame = 0;
      return;
    }
    if (time - lastFrameTime >= 32) {
      drawFlowLines(time);
      lastFrameTime = time;
    }
    animationFrame = window.requestAnimationFrame(animateFlowLines);
  }

  function startFlowAnimation() {
    if (!document.hidden && !reducedMotion.matches && !animationFrame) {
      animationFrame = window.requestAnimationFrame(animateFlowLines);
    }
  }

  function handleMotionPreference() {
    if (reducedMotion.matches) {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      drawFlowLines(0);
    } else {
      startFlowAnimation();
    }
  }

  window.addEventListener("resize", resizeFlowCanvas, { passive: true });
  document.addEventListener("visibilitychange", startFlowAnimation);
  reducedMotion.addEventListener("change", handleMotionPreference);
  resizeFlowCanvas();
  startFlowAnimation();
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const selectedFilter = button.dataset.filter;
    let shown = 0;

    filterButtons.forEach((filterButton) => {
      const isSelected = filterButton === button;
      filterButton.classList.toggle("is-active", isSelected);
      filterButton.setAttribute("aria-pressed", String(isSelected));
    });

    document.querySelectorAll(".project-card").forEach((card) => {
      const categories = card.dataset.categories.split(" ");
      const shouldShow = selectedFilter === "all" || categories.includes(selectedFilter);
      card.hidden = !shouldShow;
      if (shouldShow) shown += 1;
    });

    visibleCount.textContent = formatProjectCount(shown);
    emptyState.hidden = shown > 0;
  });
});

menuToggle.addEventListener("click", () => {
  const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!isExpanded));
  menuToggle.setAttribute("aria-label", isExpanded ? "Open navigation menu" : "Close navigation menu");
  navLinks.classList.toggle("is-open", !isExpanded);
});

navLinks.addEventListener("click", (event) => {
  if (event.target.closest("a")) {
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation menu");
    navLinks.classList.remove("is-open");
  }
});

// Keep the selected section visible in the fixed navigation.
const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    document.querySelectorAll('.nav-links a[href^="#"]').forEach((link) => {
      if (link.getAttribute("href") === `#${entry.target.id}`) {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  });
}, { rootMargin: "-30% 0px -60% 0px" });

document.querySelectorAll("main section[id]").forEach((section) => sectionObserver.observe(section));

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function addSafeExternalLink(container, url, label) {
  if (!url) return;
  try {
    const parsed = new URL(url);
    if (!["https:", "http:"].includes(parsed.protocol)) return;
    const link = makeElement("a", "", label);
    link.href = parsed.href;
    link.target = "_blank";
    link.rel = "noreferrer";
    const arrow = makeElement("span", "", "↗");
    arrow.setAttribute("aria-hidden", "true");
    link.append(" ", arrow);
    container.append(link);
  } catch {
    // Ignore invalid URLs entered in the admin panel.
  }
}

function renderPublicProjects(projects) {
  const projectGrid = document.querySelector("#project-grid");
  const categoryLabels = { "excel-sql": "EXCEL & SQL", python: "PYTHON & EDA", "power-bi": "POWER BI" };
  projectGrid.replaceChildren();

  projects.forEach((project, index) => {
    const card = makeElement("article", `project-card${project.featured ? " project-featured" : ""}`);
    card.dataset.categories = project.category;
    const visual = makeElement("div", "project-visual visual-dynamic");
    visual.setAttribute("aria-hidden", "true");
    visual.append(makeElement("span", "visual-topline", categoryLabels[project.category] || "DATA PROJECT"));
    visual.append(makeElement("span", "dynamic-visual-index mono", String(index + 1).padStart(2, "0")));
    visual.append(makeElement("strong", "dynamic-visual-title", project.title));
    visual.append(makeElement("span", "dynamic-visual-tools", (project.tools || []).join(" · ")));

    const body = makeElement("div", "project-body");
    const meta = makeElement("div", "project-meta");
    meta.append(makeElement("span", "project-type", categoryLabels[project.category] || "DATA PROJECT"));
    meta.append(makeElement("span", "project-number mono", `${String(index + 1).padStart(2, "0")} / ${String(projects.length).padStart(2, "0")}`));
    body.append(meta, makeElement("h3", "", project.title), makeElement("p", "", project.description || ""));

    const tags = makeElement("div", "tag-list");
    (project.tools || []).forEach((tool) => tags.append(makeElement("span", "", tool)));
    body.append(tags);

    const links = makeElement("div", "project-links");
    addSafeExternalLink(links, project.dashboard_url, "Live dashboard");
    addSafeExternalLink(links, project.github_url, "View project");
    if (links.childElementCount) body.append(links);
    card.append(visual, body);
    projectGrid.append(card);
  });

  const projectEmptyState = document.querySelector("#empty-state");
  projectEmptyState.textContent = "No projects have been added yet.";
  projectEmptyState.hidden = projects.length > 0;

  const counts = projects.reduce((result, project) => {
    result[project.category] = (result[project.category] || 0) + 1;
    return result;
  }, {});
  filterButtons.forEach((button) => {
    const count = button.dataset.filter === "all" ? projects.length : (counts[button.dataset.filter] || 0);
    const badge = button.querySelector("span");
    if (badge) badge.textContent = formatProjectCount(count);
  });
  visibleCount.textContent = formatProjectCount(projects.length);
}

function renderPublicSkills(skills) {
  ["analysis", "tools"].forEach((category) => {
    const list = document.querySelector(`[data-skill-category="${category}"]`);
    const names = skills.filter((skill) => skill.category === category);
    if (!list) return;
    list.replaceChildren(...names.map((skill) => makeElement("li", "", skill.name)));
  });
}

function renderPublicCertificates(certificates) {
  const list = document.querySelector("#training-list");
  list.replaceChildren();
  if (!certificates.length) {
    list.append(makeElement("p", "training-empty", "No training records have been added yet."));
    return;
  }
  const statuses = { completed: "مكتملة", "in-progress": "قيد الدراسة", upcoming: "قادمة" };
  certificates.forEach((certificate, index) => {
    const item = makeElement("article", "training-item");
    const details = makeElement("div");
    details.append(makeElement("h3", "", certificate.title));
    details.append(makeElement("p", "", certificate.organization));
    details.append(makeElement("span", "training-detail", certificate.details || ""));
    item.append(makeElement("span", "training-mark", String(index + 1).padStart(2, "0")), details);
    if (certificate.credential_url) {
      const link = makeElement("a", "credential-link", "↗");
      link.setAttribute("aria-label", `عرض الشهادة: ${certificate.title}`);
      link.target = "_blank";
      link.rel = "noreferrer";
      try {
        const url = new URL(certificate.credential_url);
        if (["https:", "http:"].includes(url.protocol)) link.href = url.href;
        else link.removeAttribute("target");
      } catch {
        link.removeAttribute("target");
      }
      item.append(link);
    } else {
      item.append(makeElement("span", "training-status", statuses[certificate.status] || ""));
    }
    list.append(item);
  });
}

async function loadPublicContent() {
  if (!portfolioClient) return;
  const tables = ["projects", "skills", "certificates"];
  try {
    const results = await Promise.all(tables.map((table) => portfolioClient.from(table).select("*").order("sort_order", { ascending: true })));
    results.forEach((result, index) => {
      if (result.error || !result.data) return;
      switch (tables[index]) {
        case "projects": renderPublicProjects(result.data); break;
        case "skills": renderPublicSkills(result.data); break;
        case "certificates": renderPublicCertificates(result.data); break;
      }
    });
  } catch (error) {
    console.error("Portfolio content could not be loaded.", error);
  }
}

// Contact messages are private in Supabase; visitors can only submit them.
const contactForm = document.querySelector("#contact-form");
const formNote = document.querySelector("#form-note");

contactForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(contactForm);
  const values = {
    name: String(formData.get("name")).trim(),
    email: String(formData.get("email")).trim(),
    message: String(formData.get("message")).trim()
  };

  if (portfolioClient) {
    const submitButton = contactForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    formNote.textContent = "Sending your message...";
    try {
      const { error } = await portfolioClient.from("messages").insert(values);
      if (error) {
        formNote.textContent = "Your message could not be sent right now. Please email me directly.";
        return;
      }
      contactForm.reset();
      formNote.textContent = "Thanks, your message has been sent.";
    } catch {
      formNote.textContent = "Your message could not be sent right now. Please email me directly.";
    } finally {
      submitButton.disabled = false;
    }
    return;
  }

  const contactEmail = portfolioConfig?.contactEmail;
  if (!contactEmail || contactEmail.includes("example.com")) {
    formNote.textContent = "Contact is not connected yet. Please try again later.";
    return;
  }
  const subject = `Portfolio inquiry from ${values.name}`;
  const body = `${values.message}\n\nFrom: ${values.name}\nReply to: ${values.email}`;
  formNote.textContent = "Your email app is opening with your message ready to send.";
  window.location.href = `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
});

document.querySelector("#current-year").textContent = String(new Date().getFullYear());
loadPublicContent();