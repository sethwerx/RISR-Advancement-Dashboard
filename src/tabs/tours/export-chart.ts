export async function capturePng(node: HTMLElement): Promise<string> {
  const { toPng } = await import("html-to-image");
  const hidden = node.querySelectorAll<HTMLElement>(".export-hide");
  hidden.forEach((element) => {
    element.dataset.exportVisibility = element.style.visibility;
    element.style.visibility = "hidden";
  });
  try {
    return await toPng(node, {
      backgroundColor: "#ffffff",
      pixelRatio: 2,
      cacheBust: true,
    });
  } finally {
    hidden.forEach((element) => {
      element.style.visibility = element.dataset.exportVisibility ?? "";
    });
  }
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

export async function downloadPng(node: HTMLElement, filename: string) {
  const dataUrl = await capturePng(node);
  downloadDataUrl(dataUrl, filename.endsWith(".png") ? filename : `${filename}.png`);
}

export async function downloadPdf(node: HTMLElement, filename: string) {
  const dataUrl = await capturePng(node);
  const image = new Image();
  image.src = dataUrl;
  await image.decode();
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 28;
  const usableWidth = pageWidth - margin * 2;
  const usableHeight = pageHeight - margin * 2;
  const sliceHeight = Math.max(1, Math.floor((usableHeight / usableWidth) * image.width));
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not prepare the PDF.");
  canvas.width = image.width;
  let offset = 0;
  let page = 0;
  while (offset < image.height) {
    const height = Math.min(sliceHeight, image.height - offset);
    canvas.height = height;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, offset, image.width, height, 0, 0, image.width, height);
    if (page > 0) pdf.addPage();
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", margin, margin, usableWidth, height * (usableWidth / image.width));
    offset += height;
    page += 1;
  }
  pdf.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}
