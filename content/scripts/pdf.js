import * as pdfjsLib from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs';
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';

const url    = '../../assets/AFFORSELLES26-FINAL.pdf';
const canvas = document.getElementById('pdf-canvas');
const ctx    = canvas.getContext('2d');
const prev   = document.getElementById('pdf-prev');
const next   = document.getElementById('pdf-next');
const numEl  = document.getElementById('pdf-page-num');
const cntEl  = document.getElementById('pdf-page-count');
const linkLayer = document.getElementById('pdf-link-layer');

let pdfDoc = null, pageNum = 1, rendering = false, currentViewport = null;

async function renderPage(num) {
    if (rendering) return;
    rendering = true;

    const page = await pdfDoc.getPage(num);

    const container = canvas.parentElement;
    const viewportBase = page.getViewport({ scale: 1 });
    const scale = Math.max(container.clientWidth / viewportBase.width, 1);
    const viewport = page.getViewport({ scale });

    currentViewport = viewport;
    canvas.width  = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: ctx, viewport }).promise;

    rendering = false;
    numEl.textContent = num;
    prev.disabled = num <= 1;
    next.disabled = num >= pdfDoc.numPages;

    await renderLinks(page, viewport);
}

// resolves a destination to a 0-based page index
async function resolveDestToPageIndex(dest) {
    let resolvedDest = dest;

    if (typeof dest === 'string') {
        resolvedDest = await pdfDoc.getDestination(dest);
    }

    if (!Array.isArray(resolvedDest) || !resolvedDest[0]) return null;

    // resolvedDest[0] is a page reference object
    return await pdfDoc.getPageIndex(resolvedDest[0]); // 0-based
}

// overlays clickable divs for each internal link
async function renderLinks(page, viewport) {
    linkLayer.innerHTML = '';
    linkLayer.style.width  = canvas.width  + 'px';
    linkLayer.style.height = canvas.height + 'px';

    const annotations = await page.getAnnotations();
    const internalLinks = annotations.filter(a => a.subtype === 'Link' && a.dest);

    for (const annot of internalLinks) {
        const pageIndex = await resolveDestToPageIndex(annot.dest);
        if (pageIndex === null) continue;

        const targetPage = pageIndex + 1; // convert to 1-based

        // PDF rect: [x1, y1, x2, y2] in PDF units (origin bottom-left)
        const [x1, y1, x2, y2] = viewport.convertToViewportRectangle(annot.rect);

        const left   = Math.min(x1, x2);
        const top    = Math.min(y1, y2);
        const width  = Math.abs(x2 - x1);
        const height = Math.abs(y2 - y1);

        const el = document.createElement('a');
        el.style.cssText = `
            position: absolute;
            left: ${left}px; top: ${top}px;
            width: ${width}px; height: ${height}px;
            cursor: pointer;
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

pdfjsLib.getDocument(url).promise.then(pdf => {
    pdfDoc = pdf;
    cntEl.textContent = pdf.numPages;
    renderPage(pageNum);
}).catch(() => {
    canvas.style.display = 'none';
    document.getElementById('pdf-fallback').style.display = 'block';
});

prev.addEventListener('click', () => { if (pageNum > 1)               renderPage(--pageNum); });
next.addEventListener('click', () => { if (pageNum < pdfDoc.numPages) renderPage(++pageNum); });