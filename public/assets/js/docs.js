const baseEl = document.getElementById("baseUrl");
const copyBtn = document.getElementById("copyBase");

if (baseEl) baseEl.textContent = location.origin;

copyBtn?.addEventListener("click", async () => {
  const text = baseEl.textContent.trim();
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const range = document.createRange();
    range.selectNodeContents(baseEl);
    const sel = getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    document.execCommand("copy");
    sel.removeAllRanges();
  }
  const old = copyBtn.textContent;
  copyBtn.textContent = "TERSALIN";
  setTimeout(() => (copyBtn.textContent = old), 1500);
});
