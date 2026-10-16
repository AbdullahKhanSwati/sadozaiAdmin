// Phones (iOS Safari especially): when the on-screen keyboard opens, the
// visible part of the page shrinks but `position: fixed` popups keep the full
// screen height, so a bottom-anchored dialog ends up BEHIND the keyboard.
//
// We publish the visible area as CSS variables (--vv-top / --vv-height; see
// index.css) so every dialog overlay sits exactly above the keyboard and can
// scroll, and we scroll the focused field into view once the keyboard is up.
export function installKeyboardViewport() {
  const vv = window.visualViewport;
  const root = document.documentElement;

  const keyboardOpen = () => !!vv && vv.height < window.innerHeight * 0.85;
  const isField = (el) => !!el && typeof el.matches === 'function'
    && el.matches('input, textarea, select, [contenteditable="true"]');

  const reveal = () => {
    const el = document.activeElement;
    if (!isField(el) || !keyboardOpen()) return;
    try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) { el.scrollIntoView(); }
  };

  const update = () => {
    if (!vv) return;
    root.style.setProperty('--vv-height', `${vv.height}px`);
    root.style.setProperty('--vv-top', `${vv.offsetTop}px`);
  };

  if (vv) {
    vv.addEventListener('resize', () => { update(); setTimeout(reveal, 50); });
    vv.addEventListener('scroll', update);
    update();
  }
  // The keyboard animates in after focus; check again once it has settled.
  document.addEventListener('focusin', () => setTimeout(reveal, 350));
}
