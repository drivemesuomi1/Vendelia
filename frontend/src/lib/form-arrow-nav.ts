/**
 * Arrow Up / Arrow Down move between the fields of a form (or an open dialog), like Shift+Tab / Tab.
 *
 * Left alone so native behaviour keeps working:
 * - a dropdown (<select>) while its list is open; closed, the arrows move on. Open it with Space or Alt+Down,
 * - radio, number, range, date and time inputs (the arrow keys change their value),
 * - comboboxes and fields with a suggestion list,
 * - a multi-line text box until the caret is at the very start (Up) or very end (Down) of its text,
 * - anything with Ctrl / Alt / Shift / Meta held, or while an IME is composing,
 * - fields outside a <form> or <dialog>, so page scrolling is never hijacked.
 * It does not wrap around: at the first or last control the key does nothing.
 */

const CONTROLS = "input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])";
const OWN_ARROWS = new Set(["radio", "number", "range", "date", "time", "datetime-local", "month", "week"]);
const TEXT_LIKE = new Set(["text", "email", "password", "search", "tel", "url"]);

/** The dropdown whose list we believe is open (browsers do not tell us), so its arrow keys pick an option. */
let openSelect: HTMLSelectElement | null = null;

function isVisible(el: HTMLElement) {
  // A collapsed <details> keeps its fields in the DOM but they cannot take focus.
  if (el.closest("details:not([open])")) return false;
  return el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";
}

function usesArrowsItself(el: HTMLElement, key: "ArrowUp" | "ArrowDown") {
  if (el instanceof HTMLSelectElement) return openSelect === el;
  if (el.getAttribute("role") === "combobox" || el.hasAttribute("aria-autocomplete") || el.getAttribute("aria-expanded") === "true") return true;
  if (el instanceof HTMLInputElement) {
    if (OWN_ARROWS.has(el.type)) return true;
    if (el.list) return true; // <datalist> suggestions
  }
  if (el instanceof HTMLTextAreaElement) {
    // Wrapped text has no line breaks to count, so only leave a text box from its very start (Up) or very end (Down).
    const { selectionStart, selectionEnd, value } = el;
    if (selectionStart !== selectionEnd) return true; // a selection: let the key collapse it
    return key === "ArrowUp" ? selectionStart > 0 : selectionEnd < value.length;
  }
  return false;
}

/** Keeps track of when a dropdown list is open or closed. */
function trackSelect(e: Event) {
  const t = e.target;
  if (!(t instanceof HTMLSelectElement)) return;
  if (e.type === "mousedown") openSelect = openSelect === t ? null : t;
  else if (e.type === "keydown") {
    const k = e as KeyboardEvent;
    if (k.key === " " || k.key === "F4" || (k.altKey && k.key === "ArrowDown")) openSelect = openSelect === t ? null : t;
    else if (k.key === "Escape" || k.key === "Enter" || k.key === "Tab") openSelect = null;
  } else openSelect = null; // change or blur
}

export function handleFormArrowKey(e: KeyboardEvent) {
  if (e.defaultPrevented || e.isComposing || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
  if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
  const target = e.target;
  if (!(target instanceof HTMLElement) || !target.matches(CONTROLS)) return;
  if (usesArrowsItself(target, e.key)) return;

  const scope = target.closest("form") ?? target.closest("dialog");
  if (!scope) return;

  const controls = Array.from(scope.querySelectorAll<HTMLElement>(CONTROLS)).filter((c) => c.tabIndex !== -1 && isVisible(c));
  const index = controls.indexOf(target);
  if (index === -1) return;

  // Take the first control in that direction that really accepts focus; if none does, leave the key alone.
  const step = e.key === "ArrowDown" ? 1 : -1;
  for (let i = index + step; i >= 0 && i < controls.length; i += step) {
    const next = controls[i]!;
    next.focus();
    if (document.activeElement !== next) continue;
    e.preventDefault();
    // Land at the end of the text, like tabbing into a filled field.
    if (next instanceof HTMLTextAreaElement || (next instanceof HTMLInputElement && TEXT_LIKE.has(next.type))) {
      const end = next.value.length;
      next.setSelectionRange(end, end);
    }
    return;
  }
}

/** Turns the feature on for the whole page; returns a function that turns it off. */
export function installFormArrowNav() {
  const track = ["mousedown", "keydown", "change", "focusout"] as const;
  document.addEventListener("keydown", handleFormArrowKey);
  for (const type of track) document.addEventListener(type, trackSelect, true);
  return () => {
    document.removeEventListener("keydown", handleFormArrowKey);
    for (const type of track) document.removeEventListener(type, trackSelect, true);
    openSelect = null;
  };
}
