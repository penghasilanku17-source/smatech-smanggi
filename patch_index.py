"""Ganti blok <script> aplikasi yang terpotong di index.html dengan <script src="app.js">.

Pemakaian (jalankan di folder yang berisi index.html dan app.js):
    python patch_index.py            # memakai index.html
    python patch_index.py index.html
Cadangan file asli disimpan sebagai index.html.bak
"""
import pathlib
import shutil
import sys

path = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "index.html")
html = path.read_text(encoding="utf-8")

marker = "SMATECH_SMANGGI_STATE_V2"
m = html.find(marker)
if m == -1:
    sys.exit("Penanda SMATECH_SMANGGI_STATE_V2 tidak ditemukan. Mungkin file sudah dipatch.")

start = html.rfind("<script>", 0, m)
end = html.find("</script>", m)
if start == -1 or end == -1:
    sys.exit("Blok <script> aplikasi tidak ditemukan.")
end += len("</script>")

shutil.copyfile(path, str(path) + ".bak")
path.write_text(html[:start] + '<script src="app.js"></script>' + html[end:], encoding="utf-8")
print("Berhasil. index.html sekarang memuat app.js (cadangan: %s.bak)" % path)
