# Photoshop_Image_Converter
Python script to convert and resize Photoshop images automatically.

# 🖼️ Photoshop Image Converter

A powerful and easy-to-use Photoshop script that automates **image conversion**, **resizing**, and **color profile adjustments**.  
Supports **multiple formats**, batch processing, and smart options for professional workflows.

---

## 🚀 Features

- ✅ Convert between formats: **WEBP, JPEG, PNG, TIFF, PSD, PDF**  
- 📂 Process **a single file, open document, or entire folder**  
- 🎨 Automatic **sRGB color profile conversion** (optional)  
- 📏 Resize images (with or without aspect ratio)  
- 🧠 Smart resize: prevents unwanted upscaling  
- 🧾 Custom output names and sequential numbering  
- ⚙️ Dynamic UI with format-specific settings (JPEG quality, PNG compression, etc.)

---

## 📦 Supported Formats

| Format | Description |
|--------|--------------|
| WEBP | High-efficiency modern format (Photoshop 23.2+ or plugin required) |
| JPEG | Adjustable quality (0–12) with Baseline, Optimized, or Progressive modes |
| PNG | Compression level 0–9, optional interlacing |
| TIFF | LZW, ZIP, JPEG compression + byte order control |
| PSD | Preserves layers and color profiles |
| PDF | Editable or lightweight export options |

---

## 🧰 How to Install

1. Download the script file:  
   **[`PS_Convert_Buni.jsx`](./PS_Convert_Buni.jsx)**

2. Move it into Photoshop’s scripts folder:
  
Windows:
C:\Program Files\Adobe\Adobe Photoshop [version]\Presets\Scripts

macOS:
/Applications/Adobe Photoshop [version]/Presets/Scripts


3. Restart Photoshop.

4. Access it from the menu:  
**File → Scripts → PS_Convert_Buni**

---

## 🖥️ How to Use

1. Choose the **source mode**:
- Active document
- Single file
- Entire folder

2. Configure your settings:
- Select format (WEBP, JPEG, etc.)
- Enable/disable sRGB conversion
- Set resize options (width/height)
- Choose output folder

3. Click **Save** — the script will process all selected images automatically.

---

## ⚠️ Notes

- For **WEBP support**, use Photoshop **23.2+** or install the [WebP plugin](https://github.com/webmproject/WebPShop).
- The script skips unsupported files automatically.
- Resize logic ensures images are not enlarged if “Don’t upscale” is checked.

---

## 📜 License

Released under the **MIT License** — feel free to use, modify, and improve.  
See the [LICENSE](./LICENSE) file for details.

---

## 💡 Credits

Developed by **Buni Hayashi**  
Optimized and tested for modern Photoshop automation workflows.



