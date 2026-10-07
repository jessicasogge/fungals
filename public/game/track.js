// Count game events on GoatCounter, alongside the page visits its script
// counts on its own (once a GoatCounter script is added to the pages). Each
// event shows up on the dashboard like a page, e.g.
// "level-complete/sacchi/level-3". No cookies and nothing personal is sent. If the script didn't load (an ad blocker, or
// playing offline), this quietly does nothing; GoatCounter also skips
// localhost, so playing locally isn't counted.
export function track(name, title = name) {
  try {
    window.goatcounter?.count?.({ path: name, title, event: true });
  } catch {
    // Counting is never worth breaking the game over.
  }
}
