"""Recorta el fondo de una fotografía con GrabCut (OpenCV) y guarda un PNG/WebP con transparencia.
Uso: python scripts/cutout.py entrada.webp salida.webp x y ancho alto [tamaño_máx]
(x y ancho alto = rectángulo que contiene el objeto)"""
import sys
import cv2
import numpy as np

src, dst, x, y, w, h = sys.argv[1], sys.argv[2], *map(int, sys.argv[3:7])
side = int(sys.argv[7]) if len(sys.argv) > 7 else 640
img = cv2.imread(src)
mask = np.zeros(img.shape[:2], np.uint8)
bgd = np.zeros((1, 65), np.float64)
fgd = np.zeros((1, 65), np.float64)
cv2.grabCut(img, mask, (x, y, w, h), bgd, fgd, 8, cv2.GC_INIT_WITH_RECT)
fg = np.where((mask == 1) | (mask == 3), 255, 0).astype(np.uint8)
# limpiar: quedarse con el mayor componente, rellenar huecos y suavizar el borde
n, lab, stats, _ = cv2.connectedComponentsWithStats(fg)
if n > 1:
    big = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    fg = np.where(lab == big, 255, 0).astype(np.uint8)
fg = cv2.morphologyEx(fg, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
fg = cv2.erode(fg, np.ones((3, 3), np.uint8))
alpha = cv2.GaussianBlur(fg, (0, 0), 1.6)
out = np.dstack([img, alpha])
ys, xs = np.where(alpha > 8)
out = out[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
s = side / max(out.shape[:2])
if s < 1:
    out = cv2.resize(out, None, fx=s, fy=s, interpolation=cv2.INTER_AREA)
cv2.imwrite(dst, out, [cv2.IMWRITE_WEBP_QUALITY, 90])
print(dst, out.shape)
