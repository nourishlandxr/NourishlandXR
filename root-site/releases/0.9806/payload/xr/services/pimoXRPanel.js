import * as THREE from "../vendor/three.module.min.js?v=0.9806";
import { pimoIcon } from "./pimoEditorIcons.js?v=0.9806";

const ink = '#28483a', muted = '#687861', iconCache = new Map();
function icon(context, name, x, y, size, color) {
    if (!iconCache.has(name)) iconCache.set(name, [...new DOMParser().parseFromString(pimoIcon(name), 'image/svg+xml').querySelectorAll('path,line,rect,circle,polyline')].map(element => ({ tag: element.tagName, attrs: Object.fromEntries([...element.attributes].map(attr => [attr.name, attr.value])) })));
    context.save(); context.translate(x, y); context.scale(size / 24, size / 24); context.strokeStyle = color; context.lineWidth = 1.7; context.lineCap = context.lineJoin = 'round';
    for (const { tag, attrs: a } of iconCache.get(name)) {
        context.beginPath();
        if (tag === 'path') { context.stroke(new Path2D(a.d)); continue; }
        if (tag === 'line') { context.moveTo(+a.x1, +a.y1); context.lineTo(+a.x2, +a.y2); }
        if (tag === 'rect') context.roundRect(+a.x, +a.y, +a.width, +a.height, +(a.rx || 0));
        if (tag === 'circle') context.arc(+a.cx, +a.cy, +a.r, 0, Math.PI * 2);
        if (tag === 'polyline') { const points = a.points.trim().split(/[ ,]+/).map(Number); for (let i = 0; i < points.length; i += 2) context[i ? 'lineTo' : 'moveTo'](points[i], points[i + 1]); }
        context.stroke();
    }
    context.restore();
}

// One texture and one ray target per panel. Only content/focus changes upload it.
export function createPimoXRPanel({ width, height, pixels = 1000, name, glass = false }) {
    const canvas = document.createElement('canvas'); canvas.width = pixels; canvas.height = Math.round(pixels * height / width);
    const context = canvas.getContext('2d'), texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.minFilter = THREE.LinearFilter; texture.generateMipmaps = false;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, side: THREE.FrontSide })); mesh.name = name; mesh.userData.panel = name;
    let buttons = [], focus = '', painter;
    function text(value, x, y, { size = 30, color = glass?'#f1f2df':ink, width: max = pixels - x * 2, weight = 500, lines = 1 } = {}) {
        context.fillStyle = color; context.font = `${weight} ${size}px system-ui`; context.textAlign = 'left'; context.textBaseline = 'top';
        const words = String(value).replace(/\n/g, ' \n ').split(' '); let line = '', row = 0;
        for (let i = 0; i <= words.length; i++) {
            const word = words[i], next = line + (line ? ' ' : '') + (word || '');
            if (i === words.length || word === '\n' || context.measureText(next).width > max) {
                if (row === lines - 1 && i < words.length) { while (context.measureText(line + '…').width > max && line) line = line.slice(0, -1); line += '…'; }
                context.fillText(line, x, y + row * size * 1.3, max); row++; line = word === '\n' ? '' : word || ''; if (row >= lines) break;
            } else line = next;
        }
    }
    function button(id, title, x, y, w, h, { symbol, active = false, disabled = false, color, small = false, label = !symbol } = {}) {
        const focused = id === focus;
        buttons.push({ id, title, x, y, w, h, disabled });
        context.save(); context.globalAlpha = disabled ? .36 : 1; context.beginPath(); context.roundRect(x, y, w, h, Math.min(13, h / 5)); context.fillStyle = color || (active ? '#365e47' : focused ? '#dce6cf' : '#e9ecdf'); context.fill();
        context.strokeStyle = active || focused ? '#365e47' : '#c8d1bc'; context.lineWidth = focused ? 4 : 2; context.stroke();
        const foreground = active || color ? '#fffdf3' : ink;
        if (symbol) icon(context, symbol, label ? x + 16 : x + (w - 36) / 2, y + (h - 36) / 2, 36, foreground);
        if (label) text(`${active ? '✓ ' : ''}${title}`, x + (symbol ? 66 : 18), y + (h - (small ? 24 : 30)) / 2, { size: small ? 24 : 30, color: foreground, width: w - (symbol ? 80 : 32) });
        if (active && !label) { context.fillStyle = '#fffdf3'; context.beginPath(); context.arc(x + w - 10, y + 10, 4, 0, 7); context.fill(); }
        context.restore();
    }
    function render(draw = painter) {
        if (!draw) return; painter = draw; buttons = []; context.clearRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = glass?'rgba(14,38,29,.34)':'#f5f3e9'; context.beginPath(); context.roundRect(2, 2, canvas.width - 4, canvas.height - 4, 24); context.fill(); context.strokeStyle = '#b4c3a6'; context.lineWidth = 3; context.stroke();
        draw({ text, button, context, width: canvas.width, height: canvas.height, muted }); texture.needsUpdate = true;
    }
    return { mesh, render, get buttons() { return buttons; },
        hit(intersection) { if (!intersection?.uv || !mesh.visible) return null; const x = intersection.uv.x * canvas.width, y = (1 - intersection.uv.y) * canvas.height; return buttons.find(button => !button.disabled && x >= button.x && x <= button.x + button.w && y >= button.y && y <= button.y + button.h) || null; },
        hover(id) { if (focus === id) return; focus = id || ''; render(); },
        dispose() { mesh.geometry.dispose(); texture.dispose(); mesh.material.dispose(); }
    };
}
