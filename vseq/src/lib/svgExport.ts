/**
 * Export an SVG element or a DOM element as SVG/PNG.
 */

/**
 * Download an SVG element as an SVG file.
 */
export function downloadSvg(svgElement: SVGSVGElement, filename: string) {
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svgElement);

    // Add XML declaration and namespace if missing
    if (!source.includes('xmlns=')) {
        source = source.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    }

    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Download a DOM element as PNG via canvas.
 */
export function downloadPng(svgElement: SVGSVGElement, filename: string, scale = 2) {
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svgElement);
    if (!source.includes('xmlns=')) {
        source = source.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    }

    const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();

    img.onload = () => {
        const canvas = document.createElement('canvas');
        const bbox = svgElement.getBBox();
        const width = svgElement.viewBox.baseVal.width || bbox.width || 800;
        const height = svgElement.viewBox.baseVal.height || bbox.height || 600;
        canvas.width = width * scale;
        canvas.height = height * scale;
        const ctx = canvas.getContext('2d')!;
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(blob => {
            if (!blob) return;
            const pngUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = pngUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(pngUrl);
        }, 'image/png');

        URL.revokeObjectURL(url);
    };

    img.src = url;
}

/**
 * Trigger browser print dialog for the current page.
 */
export function printView() {
    window.print();
}
