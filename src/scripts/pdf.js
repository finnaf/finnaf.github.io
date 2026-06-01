import * as pdfjsLib from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs';
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';

const url       = '../../assets/AFFORSELLES26-FINAL.pdf';
const canvas    = document.getElementById('pdf-canvas');
const ctx       = canvas.getContext('2d');
const prev      = document.getElementById('pdf-prev');
const next      = document.getElementById('pdf-next');
const contents  = document.getElementById('pdf-contents');
const numEl     = document.getElementById('pdf-page-num');
const cntEl     = document.getElementById('pdf-page-count');
const linkLayer = document.getElementById('pdf-link-layer');

const contentsPage = 5;

let pdfDoc         = null;
let pageNum        = 1;
let renderTask     = null; // current PDF.js render task
let pendingPage    = null; // queued page number if a render is in-flight
let pageCache      = new Map(); // pre-rendered offscreen canvases
let currentViewport = null;

// skeleton loader
function showSkeleton() {
  const container = canvas.parentElement;
  const w = container.clientWidth || 600;
  const h = Math.round(w * 1.414); // A4
  canvas.width  = w;
  canvas.height = h;
  
  let x = -w;
  function shimmer() {
    if (pdfDoc) return;

    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(0, 0, w, h);
    const grad = ctx.createLinearGradient(x, 0, x + w * 0.6, 0);
    grad.addColorStop(0,   'rgba(255,255,255,0)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0.45)');
    grad.addColorStop(1,   'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    x += 18;
    if (x > w * 1.5) x = -w;
    requestAnimationFrame(shimmer);
  }
  shimmer();
}

async function renderPage(num) {
  if (renderTask) {
    // render is already in-flight, cancel and queue the new page
    pendingPage = num;
    renderTask.cancel();
    return;
  }

  pendingPage = null;
  prev.disabled = true;
  next.disabled = true;

  // Use cached offscreen canvas if available
  if (pageCache.has(num)) {
    const cached = pageCache.get(num);
    canvas.width  = cached.width;
    canvas.height = cached.height;
    ctx.drawImage(cached, 0, 0);
    currentViewport = cached._viewport;
    numEl.textContent = num;
    prev.disabled = num <= 1;
    next.disabled = num >= pdfDoc.numPages;
    const page = await pdfDoc.getPage(num);
    await renderLinks(page, currentViewport);
    schedulePrerender(num);
    return;
  }

  const page       = await pdfDoc.getPage(num);
  const container  = canvas.parentElement;
  const viewBase   = page.getViewport({ scale: 1 });
  const scale      = Math.max(container.clientWidth / viewBase.width, 1);
  const viewport   = page.getViewport({ scale });
  currentViewport  = viewport;
  canvas.width     = viewport.width;
  canvas.height    = viewport.height;

  const task = page.render({ canvasContext: ctx, viewport });
  renderTask = task;

  try {
    await task.promise;
    renderTask = null;
    numEl.textContent = num;
    prev.disabled = num <= 1;
    next.disabled = num >= pdfDoc.numPages;
    await renderLinks(page, viewport);
    schedulePrerender(num);
  } catch (err) {
    renderTask = null;
    if (err?.name !== 'RenderingCancelledException') {
      console.error('Render error:', err);
    }
  }

  // drain queue
  if (pendingPage !== null) {
    const next_ = pendingPage;
    pendingPage  = null;
    renderPage(next_);
  }
}

function schedulePrerender(currentNum) {
  const targets = [currentNum + 1, currentNum - 1].filter(
    n => n >= 1 && n <= pdfDoc.numPages && !pageCache.has(n)
  );
  
  // stagger to prevent fighting with link rendering
  targets.forEach((n, i) => setTimeout(() => prerenderPage(n), 300 + i * 400));
}

async function prerenderPage(num) {
  if (pageCache.has(num) || !pdfDoc) return;

  try {
    const page = await pdfDoc.getPage(num);
    const container = canvas.parentElement;
    const viewBase = page.getViewport({ scale: 1 });
    const scale = Math.max(container.clientWidth / viewBase.width, 1);
    const viewport = page.getViewport({ scale });

    const offscreen = document.createElement('canvas');
    offscreen.width = viewport.width;
    offscreen.height = viewport.height;
    offscreen._viewport = viewport; // stash for link rendering later
    const offCtx = offscreen.getContext('2d');
    await page.render({ canvasContext: offCtx, viewport }).promise;
    pageCache.set(num, offscreen);
  } catch { }
}

// link rendering
async function resolveDestToPageIndex(dest) {
  let resolved = dest;
  if (typeof dest === 'string') resolved = await pdfDoc.getDestination(dest);
  if (!Array.isArray(resolved) || !resolved[0]) return null;
  return await pdfDoc.getPageIndex(resolved[0]);
}

async function renderLinks(page, viewport) {
  linkLayer.innerHTML = '';
  linkLayer.style.width  = canvas.width  + 'px';
  linkLayer.style.height = canvas.height + 'px';
  const annotations    = await page.getAnnotations();
  const internalLinks  = annotations.filter(a => a.subtype === 'Link' && a.dest);
  for (const annot of internalLinks) {
    const pageIndex = await resolveDestToPageIndex(annot.dest);
    if (pageIndex === null) continue;
    const targetPage = pageIndex + 1;
    const [x1, y1, x2, y2] = viewport.convertToViewportRectangle(annot.rect);
    const el = document.createElement('a');
    el.style.cssText = `
      position:absolute;
      left:${Math.min(x1,x2)}px; top:${Math.min(y1,y2)}px;
      width:${Math.abs(x2-x1)}px; height:${Math.abs(y2-y1)}px;
      cursor:pointer;
    `;
    el.title = `Go to page ${targetPage}`;
    el.addEventListener('click', e => {
      e.preventDefault();
      pageNum = targetPage;
      renderPage(pageNum);
    });
    linkLayer.appendChild(el);
  }
}

// LOAD

showSkeleton();

pdfjsLib.getDocument({
  url,
  rangeChunkSize: 65536, // fetch in 64 KB chunks via HTTP range requests
  disableStream: false,
  disableAutoFetch: false,
}).promise.then(pdf => {
  pdfDoc = pdf;
  cntEl.textContent = pdf.numPages;
  renderPage(pageNum);
}).catch(() => {
  canvas.style.display = 'none';
  document.getElementById('pdf-fallback').style.display = 'block';
});

prev.addEventListener('click', () => { if (pageNum > 1)               renderPage(--pageNum); });
next.addEventListener('click', () => { if (pageNum < pdfDoc.numPages) renderPage(++pageNum); });
contents.addEventListener('click', () => { 
    if (contentsPage < pdfDoc.numPages){
        pageNum = contentsPage;
        renderPage(pageNum);
    }
});