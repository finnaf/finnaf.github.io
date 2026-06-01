import * as pdfjsLib from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs';
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';

const url    = '../assets/AFFORSELLES26-FINAL.pdf';
const canvas = document.getElementById('pdf-canvas');
const ctx    = canvas.getContext('2d');
const prev   = document.getElementById('pdf-prev');
const next   = document.getElementById('pdf-next');
const numEl  = document.getElementById('pdf-page-num');
const cntEl  = document.getElementById('pdf-page-count');

let pdfDoc = null, pageNum = 1, rendering = false;

function renderPage(num) {
    if (rendering) return;

    rendering = true;
    pdfDoc.getPage(num).then(page => {
        // Scale to container width, min 1x
        const container = canvas.parentElement;
        const viewportBase = page.getViewport({ scale: 1 });
        const scale = Math.max(container.clientWidth / viewportBase.width, 1);
        const viewport = page.getViewport({ scale });

        canvas.width  = viewport.width;
        canvas.height = viewport.height;

        page.render({ canvasContext: ctx, viewport }).promise.then(() => {
        rendering = false;
        numEl.textContent = num;
        prev.disabled = num <= 1;
        next.disabled = num >= pdfDoc.numPages;
        });
    });
}

pdfjsLib.getDocument(url).promise.then(pdf => {
pdfDoc = pdf;
cntEl.textContent = pdf.numPages;
renderPage(pageNum);
}).catch(() => {
document.getElementById('pdf-canvas').style.display = 'none';
document.getElementById('pdf-fallback').style.display = 'block';
});

prev.addEventListener('click', () => { if (pageNum > 1) renderPage(--pageNum); });
next.addEventListener('click', () => { if (pageNum < pdfDoc.numPages) renderPage(++pageNum); });