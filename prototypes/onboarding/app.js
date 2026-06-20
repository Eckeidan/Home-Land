const panels = [...document.querySelectorAll(".step-panel")];
const stepButtons = [...document.querySelectorAll(".step-button")];
const form = document.querySelector("#onboarding-form");
const nextButton = document.querySelector("#next-button");
const backButton = document.querySelector("#back-button");
const progressLabel = document.querySelector("#progress-label");
const progressPercent = document.querySelector("#progress-percent");
const progressBar = document.querySelector("#progress-bar");
const saveExitButton = document.querySelector("#save-exit");
const toast = document.querySelector("#toast");
const autosaveState = document.querySelector("#autosave-state");

const insightTitle = document.querySelector("#insight-title");
const insightCopy = document.querySelector("#insight-copy");
const insightValue = document.querySelector("#insight-value");
const insightLabel = document.querySelector("#insight-label");
const insightDetail = document.querySelector("#insight-detail");

const insights = [
  {
    title: "Identity becomes the first trust signal.",
    copy: "Verified access creates a reliable foundation for every later action and audit event.",
    value: "1",
    label: "verified owner",
    detail: "The owner becomes the accountable workspace creator.",
  },
  {
    title: "Your organization is the security boundary.",
    copy: "Every property, lease, payment, document, and workflow is isolated inside this workspace.",
    value: "100%",
    label: "tenant scoped",
    detail: "No business record exists outside an organization context.",
  },
  {
    title: "Time zones are business rules.",
    copy: "Due dates, notices, reports, and maintenance SLAs must reflect where the property operates.",
    value: "UTC",
    label: "stored safely",
    detail: "Local business time remains explicit and predictable.",
  },
  {
    title: "Privileged access deserves a second proof.",
    copy: "Multi-factor authentication protects tenant, lease, document, and financial information.",
    value: "2×",
    label: "identity proof",
    detail: "Password plus a time-based authenticator challenge.",
  },
  {
    title: "Least privilege starts with the invitation.",
    copy: "Roles provide a safe starting point while the backend remains the final authorization authority.",
    value: "3",
    label: "focused roles",
    detail: "Manager, accountant, and maintenance access stay distinct.",
  },
  {
    title: "A property is more than a database row.",
    copy: "It becomes the operational anchor for occupancy, rent, maintenance, compliance, and reporting.",
    value: "1st",
    label: "portfolio asset",
    detail: "Start with reality, then expand through validated workflows.",
  },
  {
    title: "The unit connects every daily workflow.",
    copy: "Leases, tenants, payments, inspections, and work orders converge at the unit level.",
    value: "5",
    label: "future workflows",
    detail: "One structure supports leasing, rent, maintenance, documents, and reporting.",
  },
  {
    title: "Readiness is evaluated, not assumed.",
    copy: "The server checks authoritative records before it permits the workspace to become active.",
    value: "6/6",
    label: "controls complete",
    detail: "Activation remains explicit, idempotent, and auditable.",
  },
];

let currentStep = 1;
let toastTimer;

function setStep(nextStep) {
  currentStep = Math.max(0, Math.min(panels.length - 1, nextStep));
  const percent = Math.round(((currentStep + 1) / panels.length) * 100);

  panels.forEach((panel, index) => {
    panel.hidden = index !== currentStep;
  });

  stepButtons.forEach((button, index) => {
    button.classList.toggle("is-active", index === currentStep);
    button.classList.toggle("is-complete", index < currentStep);
    if (index === currentStep) {
      button.setAttribute("aria-current", "step");
    } else {
      button.removeAttribute("aria-current");
    }

    const indicator = button.querySelector(".step-indicator");
    indicator.textContent = index < currentStep ? "✓" : String(index + 1).padStart(2, "0");
  });

  progressLabel.textContent = `Step ${currentStep + 1} of ${panels.length}`;
  progressPercent.textContent = `${percent}%`;
  progressBar.style.width = `${percent}%`;
  backButton.style.visibility = currentStep === 0 ? "hidden" : "visible";
  nextButton.innerHTML =
    currentStep === panels.length - 1
      ? 'Activate workspace <span aria-hidden="true">↗</span>'
      : 'Continue <span aria-hidden="true">→</span>';

  const insight = insights[currentStep];
  insightTitle.textContent = insight.title;
  insightCopy.textContent = insight.copy;
  insightValue.textContent = insight.value;
  insightLabel.textContent = insight.label;
  insightDetail.textContent = insight.detail;

  document.title = `${stepButtons[currentStep].querySelector("strong").textContent} — The Home Land`;
  const activeHeading = panels[currentStep].querySelector("h2");
  activeHeading?.setAttribute("tabindex", "-1");
  activeHeading?.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showToast(title = "Progress saved", detail = "You can resume securely from this device.") {
  toast.querySelector("strong").textContent = title;
  toast.querySelector("small").textContent = detail;
  toast.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.hidden = true;
  }, 3200);
}

function simulateAutosave() {
  autosaveState.innerHTML = '<span aria-hidden="true">●</span> Saving changes…';
  window.setTimeout(() => {
    autosaveState.innerHTML = '<span aria-hidden="true">✓</span> All changes saved';
  }, 650);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (currentStep < panels.length - 1) {
    simulateAutosave();
    setStep(currentStep + 1);
    return;
  }

  showToast("Workspace ready", "Prototype activation completed without sending data.");
  nextButton.textContent = "Workspace active";
  nextButton.disabled = true;
});

backButton.addEventListener("click", () => setStep(currentStep - 1));

stepButtons.forEach((button) => {
  button.addEventListener("click", () => setStep(Number(button.dataset.stepTarget)));
});

document.querySelectorAll('input[type="radio"]').forEach((radio) => {
  radio.addEventListener("change", () => {
    document.querySelectorAll(".choice-card").forEach((card) => {
      card.classList.remove("is-selected");
    });
    radio.closest(".choice-card").classList.add("is-selected");
    simulateAutosave();
  });
});

document.querySelectorAll("input, select").forEach((control) => {
  control.addEventListener("change", simulateAutosave);
});

saveExitButton.addEventListener("click", () => {
  showToast();
});

setStep(currentStep);
