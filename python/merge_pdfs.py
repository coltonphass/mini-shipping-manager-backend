# python/merge_pdfs.py
# Runs from the python/ folder. Adjust path to labels as needed.
from PyPDF2 import PdfMerger
import os
import sys

# path to labels folder relative to this script
labels_dir = os.path.join(os.path.dirname(__file__), '..', 'backend', 'labels')
out_file = os.path.join(os.path.dirname(__file__), '..', 'backend', 'merged_labels.pdf')

if not os.path.exists(labels_dir):
    print("Labels directory not found:", labels_dir)
    sys.exit(1)

merger = PdfMerger()
files = sorted([f for f in os.listdir(labels_dir) if f.lower().endswith('.pdf')])
if not files:
    print("No PDF files to merge in", labels_dir)
    sys.exit(0)

for fname in files:
    path = os.path.join(labels_dir, fname)
    merger.append(path)

merger.write(out_file)
merger.close()
print("Merged", len(files), "files to", out_file)
