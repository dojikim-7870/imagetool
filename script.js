"use strict";

document.addEventListener("DOMContentLoaded", () => {

  const qs = s => document.querySelector(s);
  const qsa = s => document.querySelectorAll(s);
  const safe = (el, fn) => el && fn();

  /* ---------------- 1. NAVBAR ---------------- */
  safe(qs(".hamburger"), () => {
    const burger = qs(".hamburger");
    const menu   = qs(".nav-menu");
    burger.addEventListener("click", () => {
      burger.classList.toggle("active");
      menu.classList.toggle("active");
    });
    qsa(".nav-menu a").forEach(a =>
      a.addEventListener("click", () => {
        burger.classList.remove("active");
        menu.classList.remove("active");
      })
    );
  });

  /* ---------------- 2. Upload Preview ---------------- */
  qsa(".upload-area").forEach(area => {
    const input = area.querySelector('input[type="file"]');
    if (!input) return;

    const stop = e => { e.preventDefault(); e.stopPropagation(); };
    ["dragenter","dragover","dragleave","drop"].forEach(ev => area.addEventListener(ev, stop));
    ["dragenter","dragover"].forEach(ev => area.addEventListener(ev, () => area.classList.add("drag-over")));
    ["dragleave","drop"].forEach(ev => area.addEventListener(ev, () => area.classList.remove("drag-over")));

    input.addEventListener("change", e => {
      const file = e.target.files[0];
      if (!file || !file.type.startsWith("image/")) return;

      const reader = new FileReader();
      reader.onload = ev => {
        Array.from(area.children).forEach(c => c !== input && c.remove());
        const img = new Image();
        img.src = ev.target.result;
        img.style.cssText = "max-height:150px;border-radius:10px;display:block;margin:0 auto";
        const name = document.createElement("p");
        name.textContent = file.name;
        name.style = "margin-top:8px;font-size:.9em;text-align:center";
        area.append(img, name);

        const res = qs("#" + area.id.replace("-upload","-result"));
        if(res) res.innerHTML = "";
      };
      reader.readAsDataURL(file);
    });

    area.addEventListener("drop", e => {
      if(e.dataTransfer.files.length){
        input.files = e.dataTransfer.files;
        input.dispatchEvent(new Event("change", {bubbles:true}));
      }
    });
  });

 /* ---------------- 3. Image Resizer ------ */
safe(qs("#resizer-input"), () => {
  const $f = qs("#resizer-input"), $w = qs("#resize-width"),
        $h = qs("#resize-height"), $ratio = qs("#maintain-ratio"),
        $p = qs("#resize-percentage"), $out = qs("#resizer-result");
  let oW = 0, oH = 0;

  $f.addEventListener("change", e => {
    const file = e.target.files[0]; if (!file) return;
    const r = new FileReader();
    r.onload = ev => {
      const img = new Image();
      img.onload = () => {
        oW = img.width; oH = img.height;
        $w.value = oW; $h.value = oH; upd();
      };
      img.src = ev.target.result;
    };
    r.readAsDataURL(file);
  });

  const upd = () => { 
    if (oW) $p.textContent = `(${Math.round($w.value / oW * 100)}%)`; 
  };

  $w.addEventListener("input", () => { 
    if ($ratio.checked) $h.value = Math.round($w.value * oH / oW); 
    upd(); 
  });
  $h.addEventListener("input", () => { 
    if ($ratio.checked) $w.value = Math.round($h.value * oW / oH); 
    upd(); 
  });

  window.resizeImage = () => {
    const file = $f.files?.[0]; 
    if (!file) return alert("Select image");

    const W = +$w.value, H = +$h.value; 
    if (!W || !H) return alert("Invalid size");

    const rd = new FileReader();
    rd.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = W; c.height = H;
        c.getContext("2d").drawImage(img, 0, 0, W, H);

        const url = c.toDataURL(file.type);

        // ← 여기서 에러 발생 가능성이 높음, 백틱 대신 문자열 연결 방식으로 변경
        $out.innerHTML = '<h4>Resized Image:</h4>' +
          '<img src="' + url + '" style="max-width:100%;border-radius:10px">' +
          '<a href="' + url + '" download="resized-' + file.name + '" class="download-btn">Download Resized Image</a>';
      };
      img.src = ev.target.result;
    };
    rd.readAsDataURL(file);
  };
});


/* ---------------- 4. Image Compressor ---- */
safe(qs("#compressor-input"), () => {
  const $f = qs("#compressor-input"), $q = qs("#compress-quality"),
        $qv = qs("#quality-value"), $cv = qs("#compressor-canvas"),
        $out = qs("#compressor-result");
  $q.addEventListener("input", () => ($qv.textContent = $q.value + "%"));

  window.compressImage = () => {
    const file = $f.files?.[0]; if (!file) return alert("Select image");
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      $cv.width = img.width; $cv.height = img.height;
      $cv.getContext("2d").drawImage(img, 0, 0);
      const mime = /png$/i.test(file.type) ? "image/png" : "image/jpeg";
      $cv.toBlob(blob => {
        const blobURL = URL.createObjectURL(blob);
        $out.innerHTML = `<img src="${blobURL}" style="max-width:100%;border-radius:10px">
          <a href="${blobURL}" download="compressed-${file.name}" class="download-btn">Download</a>
          <p style="margin-top:8px">Original ${(file.size/1024).toFixed(1)} KB → ${(blob.size/1024).toFixed(1)} KB</p>`;
      }, mime, +$q.value / 100);
    };
    img.src = url;
  };
});

 /* ---------------- 5. Crop Tool ---------------- */
  safe(qs("#crop-input"), () => {
    const $f = qs("#crop-input"), $img = qs("#crop-image"), $wrap = qs("#crop-area"), $out = qs("#crop-result");
    let cropper = null;

    $f.addEventListener("change", e => {
      const file = e.target.files[0];
      if(!file) return;
      const url = URL.createObjectURL(file);
      $img.src = url;
      $wrap.style.display = "block";
      if(cropper) cropper.destroy();
      cropper = new Cropper($img, { viewMode:1, autoCropArea:1, responsive:true });
    });

    window.cropImage = () => {
      if(!cropper) return alert("Upload & set crop area first");
      const canvas = cropper.getCroppedCanvas();
      const url = canvas.toDataURL("image/png");
      $out.innerHTML = `
        <img src="${url}" style="max-width:100%;border-radius:10px">
        <a href="${url}" download="cropped-${$f.files[0].name}" class="download-btn">Download</a>
      `;
    };
  });

  /* ---------------- 6. OCR ---------------- */
  safe(qs("#ocr-input"), () => {
    const $f = qs("#ocr-input"), $out = qs("#ocr-result");
    let dataUrl = "";

    $f.addEventListener("change", e => {
      const file = e.target.files[0]; if(!file) return;
      const rd = new FileReader();
      rd.onload = ev => { dataUrl = ev.target.result; };
      rd.readAsDataURL(file);
    });

    window.runOCR = () => {
      if(!dataUrl) return alert("Upload first");
      $out.textContent = "⏳ Recognizing…";
      Tesseract.recognize(dataUrl, "eng", {
        logger: m => { if(m.status==="recognizing text") $out.textContent = `⏳ ${Math.round(m.progress*100)}%`; }
      })
      .then(({ data:{ text }}) => { $out.textContent = text || "(No text found)"; })
      .catch(err => { console.error(err); $out.textContent = "❌ OCR failed"; });
    };
  });

  /* ---------------- 7. Color Picker ---------------- */
  safe(qs("#colorpicker-input"), () => {
    const $f = qs("#colorpicker-input"), $cv = qs("#colorpicker-canvas"), $out = qs("#colorpicker-result");
    const ctx = $cv.getContext("2d");

    $f.addEventListener("change", e => {
      const file = e.target.files[0]; if(!file) return;
      const r = new FileReader();
      r.onload = ev => {
        const img = new Image();
        img.onload = () => {
          $cv.width = img.width; $cv.height = img.height;
          ctx.drawImage(img,0,0); $cv.style.display="block";
         $cv.onclick = p => {
  const rect = $cv.getBoundingClientRect();
  const scaleX = $cv.width / rect.width;
  const scaleY = $cv.height / rect.height;
  const x = (p.clientX - rect.left) * scaleX;
  const y = (p.clientY - rect.top) * scaleY;

  const d = ctx.getImageData(x, y, 1, 1).data;
  const hex = "#" + [d[0], d[1], d[2]].map(x => x.toString(16).padStart(2, "0")).join("");
  $out.innerHTML = `
    <div style="width:80px;height:80px;border:1px solid #ccc;border-radius:6px;background:${hex};margin:0 auto"></div>
    <p style="text-align:center;font-weight:bold;margin-top:8px">${hex.toUpperCase()}</p>
  `;
};
  /* ---------------- 8. Blur Background ---------------- */
  safe(qs("#blur-input"), () => {
    const $f = qs("#blur-input"), $r = qs("#blur-intensity"), $v = qs("#blur-value");
    const $cv = qs("#blur-canvas"), $out = qs("#blur-result");
    const ctx = $cv.getContext("2d"); 
    let img0 = null;

    $v.textContent = $r.value + "px";
    $r.addEventListener("input", () => ($v.textContent = $r.value + "px"));

    $f.addEventListener("change", e => {
      const file = e.target.files[0]; if(!file) return;
      const rd = new FileReader();
      rd.onload = ev => {
        const img = new Image();
        img.onload = () => { $cv.width=img.width; $cv.height=img.height; ctx.drawImage(img,0,0); img0=img; $cv.style.display="block"; };
        img.src = ev.target.result;
      };
      rd.readAsDataURL(file);
    });

    window.blurImage = () => {
      if(!img0) return alert("Upload first");
      ctx.filter = `blur(${+$r.value}px)`; ctx.drawImage(img0,0,0); ctx.filter="none";
      const url = $cv.toDataURL("image/png");
      $out.innerHTML = `<img src="${url}" style="max-width:100%;border-radius:10px">
                        <a href="${url}" download="blurred-${$f.files[0].name}" class="download-btn">Download</a>`;
    };
  });

});
