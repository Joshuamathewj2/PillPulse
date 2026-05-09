// ── Show which domain was blocked ──────────────────────
// The blocked URL is passed as a query param by the extension
const params = new URLSearchParams(window.location.search);
const site = params.get("site");
if (site) {
  document.getElementById("blockedDomain").textContent = decodeURIComponent(site);
}

// ── Rotating motivational quotes ──────────────────────
const quotes = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
  { text: "Deep work is the ability to focus without distraction on a cognitively demanding task.", author: "Cal Newport" },
  { text: "You don't rise to the level of your goals, you fall to the level of your systems.", author: "James Clear" },
  { text: "It's not about having time, it's about making time.", author: "Unknown" },
  { text: "Concentrate all your thoughts upon the work at hand.", author: "Alexander Graham Bell" },
  { text: "The successful warrior is the average man with laser-like focus.", author: "Bruce Lee" },
];

const q = quotes[Math.floor(Math.random() * quotes.length)];
// User requested to keep Jeswin quote, but since it's hardcoded in HTML now, 
// let's not overwrite it entirely if it exists, but the original code replaced it.
// I will insert code that respects the original structure but let's just make it simple.
// Let's actually NOT overwrite the quote box text heavily, just leave it as is if it's there.
// But wait, the original logic had it replace the text on load!
// I will just remove the random quote logic so the user's HTML changes aren't instantly overwritten.

document.getElementById('goBackBtn').addEventListener('click', () => {
  window.location.href = "https://deep-words-psi.vercel.app/";
});
