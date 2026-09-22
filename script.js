import { convertTimestamp, formatGMTDate } from "./time-utils.mjs";

const $ = (id) => document.getElementById(id);
const timeFormat = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
  timeZone: "UTC",
});
let milestones = [];
let lastPastCount = -1;
let currentTimestamp = 0;
let copyResult = "";
let toastTimer;
const dialog = $("converter-dialog");

function groupTimestamp(value) {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function showToast(message) {
  $("toast").textContent = message;
  $("toast").classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("toast").classList.remove("visible"), 2300);
}

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
    showToast("Copied to clipboard");
  } catch {
    showToast("Copy unavailable. Select the timestamp and copy it manually.");
  }
}

function updateClock() {
  const now = new Date();
  currentTimestamp = Math.floor(now.getTime() / 1000);
  const timestamp = $("unix-timestamp");
  const groups = groupTimestamp(currentTimestamp).split(" ");
  if (!timestamp.children.length) {
    timestamp.replaceChildren(
      ...groups.map(() => {
        const span = document.createElement("span");
        span.className = "digit-group";
        return span;
      }),
    );
  }
  groups.forEach((group, index) => {
    timestamp.children[index].textContent = group;
  });
  timestamp.dateTime = now.toISOString();
  timestamp.setAttribute("aria-label", String(currentTimestamp));
  $("utc-datetime").textContent =
    `${formatGMTDate(now)}  ·  ${timeFormat.format(now)}`;
  $("utc-datetime").dateTime = now.toISOString();
  $("second-marker").style.left = `${(now.getUTCSeconds() / 59) * 99}%`;
  if (milestones.length) {
    const pastCount = milestones.filter(
      (item) => item.timestamp <= currentTimestamp,
    ).length;
    if (pastCount !== lastPastCount) renderMilestones();
    document.querySelectorAll("[data-distance]").forEach((el) => {
      const diff = Number(el.dataset.distance) - currentTimestamp;
      const days = Math.floor(Math.abs(diff) / 86400);
      const distance = days
        ? `${days.toLocaleString("en-GB")} days`
        : `${Math.abs(diff).toLocaleString("en-GB")} sec`;
      el.textContent = diff > 0 ? `in ${distance}` : `${distance} ago`;
    });
  }
}

function createMilestone(item) {
  const row = document.createElement("button");
  row.className = "milestone-row";
  row.type = "button";
  row.setAttribute(
    "aria-label",
    `${item.description}, ${item.timestamp}. Convert to GMT`,
  );
  const timestamp = document.createElement("span");
  timestamp.className = "milestone-timestamp";
  timestamp.textContent = groupTimestamp(item.timestamp);
  const details = document.createElement("span");
  details.className = "milestone-details";
  const title = document.createElement("span");
  title.className = "milestone-description";
  title.textContent = item.description;
  const significance = document.createElement("span");
  significance.className = "milestone-significance";
  significance.textContent = item.significance || "";
  details.append(title, significance);
  const date = document.createElement("span");
  date.className = "milestone-date";
  date.textContent = formatGMTDate(new Date(item.timestamp * 1000));
  const distance = document.createElement("span");
  distance.className = "milestone-distance";
  distance.dataset.distance = item.timestamp;
  date.append(distance);
  const arrow = document.createElement("span");
  arrow.className = "row-arrow";
  arrow.setAttribute("aria-hidden", "true");
  arrow.textContent = "↗";
  row.append(timestamp, details, date, arrow);
  row.addEventListener("click", () => openConverter(item.timestamp));
  return row;
}

// Keep mobile browsing stable: expand on user interaction, never on clock updates.
const timeline = document.querySelector(".timeline");
const mobileLayout = matchMedia("(max-width: 760px)");
const milestoneSections = document.querySelectorAll(".milestones-section");
function setActiveSection(section) {
  if (mobileLayout.matches && section) {
    timeline.dataset.activeSection = section.classList.contains("past-section")
      ? "past"
      : "future";
  } else {
    delete timeline.dataset.activeSection;
  }
}
for (const section of milestoneSections) {
  section.addEventListener("focusin", (event) => {
    // A pointer click on a milestone must not move its target before click fires.
    if (event.target.matches(":focus-visible")) setActiveSection(section);
  });
  section.addEventListener("wheel", (event) => {
    if (!event.ctrlKey && Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
      setActiveSection(section);
    }
  }, { passive: true });
  section.addEventListener("touchmove", (event) => {
    if (event.touches.length === 1) setActiveSection(section);
  }, { passive: true });
}
document.addEventListener("pointerdown", (event) => {
  if (!event.target.closest(".milestones-section")) setActiveSection(null);
});
timeline.addEventListener("focusout", (event) => {
  if (!event.relatedTarget?.closest(".milestones-section")) setActiveSection(null);
});
mobileLayout.addEventListener("change", () => setActiveSection(null));

// When the past panel changes size, keep its nearest milestone at the bottom.
const pastScroll = $("past-scroll");
let pastAtPresent = true;
let returningToPresent = true;
// Only a new browsing gesture releases an explicit reset. Layout and font
// changes can emit scroll events too, but must not cancel that intent.
for (const type of ["wheel", "touchmove", "pointerdown", "keydown"]) {
  pastScroll.addEventListener(type, () => {
    returningToPresent = false;
  }, { passive: true });
}
pastScroll.addEventListener("scroll", () => {
  if (!returningToPresent) {
    pastAtPresent = pastScroll.scrollHeight - pastScroll.clientHeight - pastScroll.scrollTop < 2;
  }
}, { passive: true });
const pastResizeObserver = new ResizeObserver(() => {
  if (returningToPresent || pastAtPresent) pastScroll.scrollTop = pastScroll.scrollHeight;
});
pastResizeObserver.observe(pastScroll);
pastResizeObserver.observe($("milestone-container-top"));

// The space around and over the clock is also a timeline gesture area.
// Native list scrolling wins; only gestures in the extra space are forwarded.
const workspace = document.querySelector(".clock-workspace");
function timelineAtPoint(target, x, y) {
  const section = target.closest(".milestones-section");
  if (section) return section.querySelector(".milestone-scroll");
  const clock = document.querySelector(".main-clock").getBoundingClientRect();
  const past = mobileLayout.matches
    ? y < clock.top + clock.height / 2
    : x < clock.left + clock.width / 2;
  return $(past ? "past-scroll" : "future-scroll");
}
function canScroll(list, delta) {
  return delta < 0
    ? list.scrollTop > 0
    : list.scrollTop + list.clientHeight < list.scrollHeight - 1;
}
function browseTimeline(list, delta) {
  if (list === pastScroll) {
    returningToPresent = false;
    pastAtPresent = false;
  }
  setActiveSection(list.closest(".milestones-section"));
  list.scrollBy({ top: delta, behavior: "instant" });
}
workspace.addEventListener("wheel", (event) => {
  if (dialog.open || event.ctrlKey || !event.cancelable ||
      Math.abs(event.deltaY) <= Math.abs(event.deltaX) ||
      event.target.closest(".milestone-scroll")) return;
  const list = timelineAtPoint(event.target, event.clientX, event.clientY);
  const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? list.clientHeight : 1;
  const delta = event.deltaY * unit;
  // At the end of a timeline, leave normal page scrolling available.
  if (!canScroll(list, delta)) return;
  event.preventDefault();
  browseTimeline(list, delta);
}, { passive: false });

let timelineSwipe = null;
workspace.addEventListener("touchstart", (event) => {
  timelineSwipe = null;
  if (dialog.open || event.touches.length !== 1 ||
      event.target.closest(".milestone-scroll, button, a, input, select")) return;
  const touch = event.touches[0];
  timelineSwipe = {
    list: timelineAtPoint(event.target, touch.clientX, touch.clientY),
    x: touch.clientX,
    y: touch.clientY,
    started: false,
  };
}, { passive: true });
workspace.addEventListener("touchmove", (event) => {
  if (dialog.open || event.touches.length !== 1) {
    timelineSwipe = null;
    return;
  }
  if (!timelineSwipe || !event.cancelable) return;
  const touch = event.touches[0];
  const delta = timelineSwipe.y - touch.clientY;
  const horizontal = timelineSwipe.x - touch.clientX;
  if (!timelineSwipe.started) {
    if (Math.max(Math.abs(delta), Math.abs(horizontal)) < 8) return;
    if (Math.abs(horizontal) > Math.abs(delta)) {
      timelineSwipe = null;
      return;
    }
    timelineSwipe.started = true;
  }
  timelineSwipe.x = touch.clientX;
  timelineSwipe.y = touch.clientY;
  if (!canScroll(timelineSwipe.list, delta)) return;
  event.preventDefault();
  // Keep the starting list even as expansion moves the clock beneath a finger.
  browseTimeline(timelineSwipe.list, delta);
}, { passive: false });
for (const type of ["touchend", "touchcancel"]) {
  workspace.addEventListener(type, () => { timelineSwipe = null; }, { passive: true });
}

function resetTimeline(smooth = true) {
  returningToPresent = true;
  pastAtPresent = true;
  setActiveSection(null);
  const behavior =
    smooth && !matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "smooth"
      : "instant";
  $("past-scroll").scrollTo({ top: $("past-scroll").scrollHeight, behavior });
  $("future-scroll").scrollTo({ top: 0, behavior });
}

function renderMilestones() {
  const past = milestones.filter((item) => item.timestamp <= currentTimestamp);
  const future = milestones.filter((item) => item.timestamp > currentTimestamp);
  lastPastCount = past.length;
  $("milestone-container-top").classList.add("past");
  $("milestone-container-bottom").classList.add("future");
  $("milestone-container-top").replaceChildren(...past.map(createMilestone));
  $("milestone-container-bottom").replaceChildren(
    ...future.map(createMilestone),
  );
  resetTimeline(false);
}

function convert() {
  try {
    const result = convertTimestamp(
      $("timestamp-input").value,
      $("timestamp-unit").value,
    );
    $("converter-error").hidden = true;
    $("timestamp-input").removeAttribute("aria-invalid");
    $("result-date").textContent = formatGMTDate(result.date);
    $("result-time").textContent =
      timeFormat.format(result.date) +
      ($("timestamp-unit").value === "milliseconds"
        ? `.${String(result.date.getUTCMilliseconds()).padStart(3, "0")}`
        : "");
    $("result-iso").textContent = result.iso;
    copyResult = result.iso;
    $("conversion-result").hidden = false;
  } catch (error) {
    $("converter-error").textContent = error.message;
    $("converter-error").hidden = false;
    $("timestamp-input").setAttribute("aria-invalid", "true");
    $("conversion-result").hidden = true;
    copyResult = "";
  }
}

function openConverter(value = Math.floor(Date.now() / 1000)) {
  $("timestamp-unit").value = "seconds";
  $("timestamp-input").value = value;
  convert();
  dialog.showModal();
  $("timestamp-input").focus();
  $("timestamp-input").select();
}

document
  .querySelectorAll("[data-open-converter]")
  .forEach((button) => button.addEventListener("click", () => openConverter()));
$("close-converter").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  const rect = dialog.getBoundingClientRect();
  if (
    event.target === dialog &&
    (event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom)
  )
    dialog.close();
});
$("converter-form").addEventListener("submit", (event) => {
  event.preventDefault();
  convert();
});
$("timestamp-input").addEventListener("input", () => {
  $("conversion-result").hidden = true;
  $("converter-error").hidden = true;
  $("timestamp-input").removeAttribute("aria-invalid");
  copyResult = "";
});
$("timestamp-unit").addEventListener("change", convert);
$("use-now").addEventListener("click", () => {
  $("timestamp-input").value =
    $("timestamp-unit").value === "milliseconds"
      ? Date.now()
      : Math.floor(Date.now() / 1000);
  convert();
});
$("copy-result").addEventListener("click", () => {
  if (copyResult) copyText(copyResult);
});
$("copy-clock").addEventListener("click", () =>
  copyText(String(Math.floor(Date.now() / 1000))),
);
$("back-to-now").addEventListener("click", () => resetTimeline());

// The clock and converter remain usable even if milestone data cannot load.
updateClock();
let timer = setInterval(updateClock, 1000);
document.addEventListener("visibilitychange", () => {
  clearInterval(timer);
  if (!document.hidden) {
    updateClock();
    timer = setInterval(updateClock, 1000);
  }
});
fetch("./data/milestones.json")
  .then((response) => {
    if (!response.ok) throw new Error("Milestones could not load.");
    return response.json();
  })
  .then((data) => {
    if (!Array.isArray(data.milestones))
      throw new Error("Invalid milestone data.");
    milestones = data.milestones
      .filter(
        (item) =>
          Number.isSafeInteger(item.timestamp) &&
          Math.abs(item.timestamp * 1000) <= 8.64e15 &&
          typeof item.description === "string",
      )
      .sort((a, b) => a.timestamp - b.timestamp);
    if (!milestones.length) throw new Error("No milestones available.");
    updateClock();
  })
  .catch(() => {
    $("milestone-error").textContent =
      "Milestones could not load. Refresh to try again.";
    $("milestone-error").hidden = false;
  });
