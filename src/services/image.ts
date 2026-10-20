export async function mapToPng(
  svg: SVGSVGElement,
  options: { title: string; subtitle: string; legend: string; color: string },
): Promise<Blob> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", "1000");
  clone.setAttribute("height", "620");
  clone.querySelectorAll(".map-label").forEach((n) => {
    n.setAttribute("font-family", "Arial, sans-serif");
    n.setAttribute("font-size", "9");
    n.setAttribute("fill", "#657466");
    n.setAttribute("stroke", "#edf1ed");
    n.setAttribute("stroke-width", "2");
    n.setAttribute("paint-order", "stroke");
  });
  clone
    .querySelectorAll("[tabindex]")
    .forEach((n) => n.removeAttribute("tabindex"));
  const url = URL.createObjectURL(
    new Blob([new XMLSerializer().serializeToString(clone)], {
      type: "image/svg+xml;charset=utf-8",
    }),
  );
  try {
    const image = new Image();
    image.decoding = "sync";
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(Error("SVG rendering failed"));
      image.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = 2000;
    canvas.height = 1600;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw Error("Canvas unavailable");
    ctx.scale(2, 2);
    ctx.fillStyle = "#f8f7f2";
    ctx.fillRect(0, 0, 1000, 800);
    ctx.fillStyle = "#344b3b";
    ctx.font = "34px Georgia, serif";
    ctx.fillText(options.title, 42, 55);
    ctx.fillStyle = "#7b8874";
    ctx.font = "13px Arial, sans-serif";
    ctx.fillText(options.subtitle, 44, 80);
    ctx.drawImage(image, 0, 100, 1000, 620);
    ctx.fillStyle = options.color;
    ctx.beginPath();
    ctx.arc(48, 754, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#65775e";
    ctx.font = "12px Arial, sans-serif";
    ctx.fillText(options.legend, 62, 758);
    ctx.textAlign = "right";
    ctx.font = "11px Arial, sans-serif";
    ctx.fillText("Made with Natural Earth · Our Little World", 958, 758);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(Error("PNG encoding failed"))),
        "image/png",
      ),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
