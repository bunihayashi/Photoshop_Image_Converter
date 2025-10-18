/**
 * ConverterPro_v7_2_Simples.jsx
 * - Pasta (somente ela), arquivo único ou documento aberto
 * - Formatos: WEBP / JPEG / PNG / TIFF / PSD / PDF
 * - sRGB opcional (ON por padrão)
 * - Nome raiz opcional -> NOME_1, NOME_2, ... (se vazio, mantém nome original)
 * - Resize simples (com/sem proporção) + "não ampliar"
 * - Extensão sempre minúscula
 * - Painel de formato com swap dinâmico (sem espaços sobrando)
 */

#target photoshop
app.displayDialogs = DialogModes.NO;

(function main(){
    try{
        var srcMode = chooseSourceMode(); if (!srcMode) return;

        var srcFiles = [], srcRootFolder = null;
        if (srcMode === "active"){
            if (app.documents.length === 0){ alert("Nenhum documento aberto."); return; }
            srcFiles = [null];
        } else if (srcMode === "file"){
            var f = File.openDialog("Selecione a imagem…", "Imagens:*.*");
            if (!f) return; srcFiles = [f];
        } else {
            srcRootFolder = Folder.selectDialog("Selecione a PASTA de origem (somente esta pasta)");
            if (!srcRootFolder) return;
            srcFiles = listImagesInFolder(srcRootFolder);
            if (srcFiles.length === 0){ alert("Nenhuma imagem suportada encontrada na pasta."); return; }
        }

        var ui = buildDialog();
        if (ui.dlg.show() !== 1) return;

        var outRoot = new Folder(ui.pathField.text);
        if (!outRoot.exists){ alert("Pasta de destino inválida."); return; }

        var cnt=0, fails=0, start=Date.now(), seq = 1;

        for (var i=0; i<srcFiles.length; i++){
            var srcFile = (srcMode==="active") ? null : srcFiles[i];
            var doc = null, openedHere=false, work=null;

            try{
                if (srcMode==="active"){
                    doc = app.activeDocument;
                } else {
                    try{ doc = app.open(srcFile); openedHere = true; }
                    catch(openErr){
                        fails++;
                        if (srcFile && /\.webp$/i.test(srcFile.name)){
                            alert("Falha ao abrir: " + srcFile.name +
                                  "\nProvável falta de suporte ao WEBP.\nUse Photoshop 23.2+ ou instale o plugin WebP.");
                        }
                        continue;
                    }
                }

                work = doc.duplicate();

                if (ui.toSRGB.value) ensureSRGB(work);

                if (ui.resizeEnable.value){
                    safeResizeFlexible(
                        work,
                        ui.lockAspect.value,
                        toInt(ui.wField.text, 0),
                        toInt(ui.hField.text, 0),
                        ui.noUpscale.value
                    );
                }

                // Nome de saída
                var ext = getExtFromLabel(ui.fmtDropdown.selection.text).toLowerCase();
                var baseOutName = "";
                if (trim(ui.rootName.text).length > 0){
                    baseOutName = trim(ui.rootName.text) + "_" + (seq++);
                } else {
                    baseOutName = String(doc.name).replace(/\.[^\.]+$/, "");
                }

                var outFile = File(outRoot.fsName + "/" + baseOutName + ext);

                // >>> Agora usamos MÉTODOS para ler as opções do painel
                var ok = saveByFormatSmart(
                    work, outFile, ui,
                    toInt(ui.jpegQ(),10), ui.jpegModeIdx(),
                    toInt(ui.webpQ(),80), ui.webpLossless(),
                    toInt(ui.pngComp(),6), ui.pngInterlaced(),
                    ui.tifCompIdx(), ui.tifByteIdx(), ui.tifLayers(),
                    ui.pdfPresetIdx()
                );

                if (ok) cnt++; else fails++;

            }catch(e){
                fails++;
            }finally{
                if (work) try{ work.close(SaveOptions.DONOTSAVECHANGES); }catch(_){}
                if (openedHere && doc) try{ doc.close(SaveOptions.DONOTSAVECHANGES); }catch(_){}
            }
        }

        var secs = ((Date.now()-start)/1000).toFixed(1);
        alert("Concluído.\nSucesso: "+cnt+"\nFalhas: "+fails+"\nTempo: "+secs+"s\nDestino: "+outRoot.fsName);

    } catch(err){
        alert("Erro: " + err);
    }
})();

/* ========================= UI ========================= */

function chooseSourceMode(){
    var dlg = new Window("dialog", "Fonte");
    dlg.orientation = "column"; dlg.alignChildren = "left";
    dlg.spacing = 6; dlg.margins = 10;

    var r1 = dlg.add("radiobutton", undefined, "Documento aberto");
    var r2 = dlg.add("radiobutton", undefined, "Arquivo único");
    var r3 = dlg.add("radiobutton", undefined, "Pasta (somente esta pasta)");
    if (app.documents.length>0) r1.value=true; else r2.value=true;

    var row = dlg.add("group"); row.alignment = "right";
    row.add("button", undefined, "Continuar", {name:"ok"});
    row.add("button", undefined, "Cancelar",  {name:"cancel"});

    if (dlg.show() !== 1) return null;
    if (r1.value) return "active"; if (r2.value) return "file"; return "folder";
}

function buildDialog(){
    var dlg = new Window("dialog", "Salvar como…");
    dlg.orientation = "column"; dlg.alignChildren = "fill";
    dlg.spacing = 8; dlg.margins = 12;

    // Linha 1: Formato
    var top = dlg.add("group"); top.alignChildren="left";
    top.add("statictext", undefined, "Formato:");
    var formats = ["WEBP (.webp)", "JPEG (.jpg)", "PNG (.png)", "TIFF (.tif)", "PSD (.psd)", "PDF (.pdf)"];
    var fmtDropdown = top.add("dropdownlist", undefined, formats); fmtDropdown.selection = 1; // JPEG padrão

    // Holder do painel do formato (cria/destroi a cada troca)
    var holder = dlg.add("group"); holder.orientation="column"; holder.alignChildren="fill";
    holder.margins = 0; holder.spacing = 6;
    var currentPanel = null;

    // Campos comuns
    var toSRGB = dlg.add("checkbox", undefined, "Converter para sRGB antes de salvar"); toSRGB.value = true;

    var nameRow = dlg.add("group");
    nameRow.add("statictext", undefined, "Nome raiz (opcional):");
    var rootName = nameRow.add("edittext", undefined, ""); rootName.characters = 20;

    var rzPanel = panel(dlg, "Resize (opcional)");
    var rzTop = rzPanel.add("group");
    var resizeEnable = rzTop.add("checkbox", undefined, "Ativar resize");
    var lockAspect   = rzTop.add("checkbox", undefined, "Manter proporção"); lockAspect.value = true;
    var noUpscale    = rzTop.add("checkbox", undefined, "Não ampliar"); noUpscale.value = true;

    var rzRow = rzPanel.add("group");
    rzRow.add("statictext", undefined, "Largura (px):");
    var wField = rzRow.add("edittext", undefined, "0"); wField.characters = 6;
    rzRow.add("statictext", undefined, "Altura (px):");
    var hField = rzRow.add("edittext", undefined, "0"); hField.characters = 6;

    var help = rzPanel.add("statictext", undefined,
      "Como usar o resize:\n" +
      "• Com “Manter proporção” LIGADO:\n" +
      "   - Preencha só Largura OU só Altura → o outro valor é calculado automaticamente.\n" +
      "   - Preencha Largura e Altura → a imagem CABE dentro da caixa (sem distorcer).\n" +
      "• Com “Manter proporção” DESLIGADO: a imagem é forçada exatamente para Largura × Altura (pode distorcer).\n" +
      "• “Não ampliar”: se a imagem já for menor, não aumenta (só reduz).",
      {multiline:true}
    );
    help.preferredSize = [500, 90];

    // Destino
    var pathRow = dlg.add("group");
    pathRow.add("statictext", undefined, "Salvar em:");
    var pathField = pathRow.add("edittext", undefined, Folder.desktop.fsName); pathField.characters = 40;
    var browseBtn = pathRow.add("button", undefined, "Selecionar…");
    browseBtn.onClick = function(){ var f = Folder.selectDialog("Escolha a pasta de destino"); if (f) pathField.text = f.fsName; };

    // Botões
    var btns = dlg.add("group"); btns.alignment="right";
    btns.add("button", undefined, "Salvar", {name:"ok"});
    btns.add("button", undefined, "Cancelar", {name:"cancel"});

    // Estado do painel por formato
    var state = {
        jpegQ: "10", jpegModeIdx: 1,
        webpQ: "80", webpLossless: false,
        pngComp: "6", pngInterlaced: false,
        tifCompIdx: 0, tifByteIdx: 0, tifLayers: false,
        pdfPresetIdx: 1
    };

    function buildWEBP(parent){
        var p = panel(parent, "WEBP");
        var r = p.add("group");
        r.add("statictext", undefined, "Qualidade 0–100:");
        var q = r.add("edittext", undefined, state.webpQ); q.characters = 3;
        var loss = p.add("checkbox", undefined, "Lossless (sem perdas)"); loss.value = state.webpLossless;
        p.onDeactivate = function(){ state.webpQ = q.text; state.webpLossless = loss.value; };
        p._webpQ = q; p._webpLossless = loss; return p;
    }
    function buildJPEG(parent){
        var p = panel(parent, "JPEG");
        var r1 = p.add("group");
        r1.add("statictext", undefined, "Qualidade 0–12:");
        var q = r1.add("edittext", undefined, state.jpegQ); q.characters = 3;
        var r2 = p.add("group");
        r2.add("statictext", undefined, "Modo:");
        var m = r2.add("dropdownlist", undefined, ["Baseline (Standard)", "Baseline (Optimized)", "Progressive"]); m.selection = state.jpegModeIdx;
        p.onDeactivate = function(){ state.jpegQ = q.text; state.jpegModeIdx = m.selection.index; };
        p._jpegQ = q; p._jpegModeIdx = function(){ return m.selection.index; }; return p;
    }
    function buildPNG(parent){
        var p = panel(parent, "PNG");
        var r1 = p.add("group");
        r1.add("statictext", undefined, "Compressão 0–9:");
        var c = r1.add("edittext", undefined, state.pngComp); c.characters = 2;
        var inter = p.add("checkbox", undefined, "Interlaced"); inter.value = state.pngInterlaced;
        p.onDeactivate = function(){ state.pngComp = c.text; state.pngInterlaced = inter.value; };
        p._pngComp = c; p._pngInterlaced = inter; return p;
    }
    function buildTIFF(parent){
        var p = panel(parent, "TIFF");
        var r1 = p.add("group");
        r1.add("statictext", undefined, "Compressão:");
        var comp = r1.add("dropdownlist", undefined, ["None", "LZW", "ZIP", "JPEG"]); comp.selection = state.tifCompIdx;
        var r2 = p.add("group");
        r2.add("statictext", undefined, "Byte order:");
        var bo = r2.add("dropdownlist", undefined, ["IBM (PC)", "Mac"]); bo.selection = state.tifByteIdx; // 'byte' é reservado
        var layers = p.add("checkbox", undefined, "Salvar camadas"); layers.value = state.tifLayers;
        p.onDeactivate = function(){ state.tifCompIdx = comp.selection.index; state.tifByteIdx = bo.selection.index; state.tifLayers = layers.value; };
        p._tifCompIdx = function(){ return comp.selection.index; };
        p._tifByteIdx = function(){ return bo.selection.index; };
        p._tifLayers  = layers; return p;
    }
    function buildPDF(parent){
        var p = panel(parent, "PDF");
        var r1 = p.add("group");
        r1.add("statictext", undefined, "Preset:");
        var preset = r1.add("dropdownlist", undefined, ["Alta qualidade (editável)", "Menor tamanho (não editável)"]); preset.selection = state.pdfPresetIdx;
        p.onDeactivate = function(){ state.pdfPresetIdx = preset.selection.index; };
        p._pdfPresetIdx = function(){ return preset.selection.index; }; return p;
    }

    function mountPanel(){
        var f = fmtDropdown.selection.text;
        if (currentPanel && typeof currentPanel.onDeactivate === "function") currentPanel.onDeactivate();
        while (holder.children.length) holder.remove(holder.children[0]);
        if (/WEBP/.test(f))      currentPanel = buildWEBP(holder);
        else if (/JPEG/.test(f)) currentPanel = buildJPEG(holder);
        else if (/PNG/.test(f))  currentPanel = buildPNG(holder);
        else if (/TIFF/.test(f)) currentPanel = buildTIFF(holder);
        else if (/PDF/.test(f))  currentPanel = buildPDF(holder);
        dlg.layout.layout(true);
    }
    fmtDropdown.onChange = mountPanel;
    mountPanel(); // inicial

    // >>> Retorno: MÉTODOS que leem o painel atual / state
    return {
        dlg:dlg, fmtDropdown:fmtDropdown,
        // métodos por formato:
        jpegQ: function(){ return (currentPanel && currentPanel._jpegQ) ? currentPanel._jpegQ.text : state.jpegQ; },
        jpegModeIdx: function(){ return (currentPanel && currentPanel._jpegModeIdx) ? currentPanel._jpegModeIdx() : state.jpegModeIdx; },
        webpQ: function(){ return (currentPanel && currentPanel._webpQ) ? currentPanel._webpQ.text : state.webpQ; },
        webpLossless: function(){ return (currentPanel && currentPanel._webpLossless) ? currentPanel._webpLossless.value : state.webpLossless; },
        pngComp: function(){ return (currentPanel && currentPanel._pngComp) ? currentPanel._pngComp.text : state.pngComp; },
        pngInterlaced: function(){ return (currentPanel && currentPanel._pngInterlaced) ? currentPanel._pngInterlaced.value : state.pngInterlaced; },
        tifCompIdx: function(){ return (currentPanel && currentPanel._tifCompIdx) ? currentPanel._tifCompIdx() : state.tifCompIdx; },
        tifByteIdx: function(){ return (currentPanel && currentPanel._tifByteIdx) ? currentPanel._tifByteIdx() : state.tifByteIdx; },
        tifLayers: function(){ return (currentPanel && currentPanel._tifLayers) ? currentPanel._tifLayers.value : state.tifLayers; },
        pdfPresetIdx: function(){ return (currentPanel && currentPanel._pdfPresetIdx) ? currentPanel._pdfPresetIdx() : state.pdfPresetIdx; },

        // comuns
        toSRGB:toSRGB,
        rootName:rootName,
        resizeEnable:resizeEnable, lockAspect:lockAspect, noUpscale:noUpscale,
        wField:wField, hField:hField,
        pathField:pathField
    };
}

function panel(parent, title){
    var p = parent.add("panel", undefined, title);
    p.orientation = "column"; p.alignChildren = "left";
    p.margins = 8; p.spacing = 6;
    return p;
}

/* ========================= Listagem (sem subpastas) ========================= */
function listImagesInFolder(folder){
    var exts = /\.(psd|psb|tif|tiff|jpg|jpeg|png|bmp|gif|webp)$/i;
    var out = [];
    var items = folder.getFiles();
    for (var i=0;i<items.length;i++){
        var it = items[i];
        if (it instanceof File && exts.test(it.name)) out.push(it);
    }
    return out;
}

/* ========================= Utilidades ========================= */
function getExtFromLabel(label){
    var m = label.match(/\((\..*?)\)/);
    return m ? m[1].replace(/[()]/g,"") : ".dat";
}
function toInt(s, def){ var n = parseInt(s,10); return isFinite(n)?n:def; }
function trim(s){ return String(s||"").replace(/^\s+|\s+$/g,""); }

/* ========================= sRGB ========================= */
function ensureSRGB(doc){
    try{
        var sRGB = "sRGB IEC61966-2.1";
        if (doc.colorProfileName && String(doc.colorProfileName).toLowerCase().indexOf("srgb") !== -1) return;
        doc.convertProfile(sRGB, Intent.RELATIVECOLORIMETRIC, true, false);
    }catch(e){}
}

/* ========================= Resize ========================= */
function safeResizeFlexible(doc, lockAspect, W, H, noUpscale){
    var w = doc.width.as("px")|0, h = doc.height.as("px")|0;
    if (!W && !H) return;

    if (lockAspect){
        if (W>0 && H<=0){
            if (noUpscale && w <= W) return;
            doc.resizeImage(new UnitValue(W,"px"), null, null, ResampleMethod.BICUBICSHARPER);
            return;
        }
        if (H>0 && W<=0){
            if (noUpscale && h <= H) return;
            doc.resizeImage(null, new UnitValue(H,"px"), null, ResampleMethod.BICUBICSHARPER);
            return;
        }
        if (W>0 && H>0){
            var sf = Math.min(W/w, H/h);
            if (noUpscale && sf >= 1) return;
            var newW = Math.round(w * sf), newH = Math.round(h * sf);
            doc.resizeImage(new UnitValue(newW,"px"), new UnitValue(newH,"px"), null, ResampleMethod.BICUBICSHARPER);
            return;
        }
    } else {
        if (W>0 && H>0){
            if (noUpscale && (w<=W && h<=H)) return;
            doc.resizeImage(new UnitValue(W,"px"), new UnitValue(H,"px"), null, ResampleMethod.BICUBIC);
        }
    }
}

/* ========================= Salvar ========================= */
function saveByFormatSmart(
    doc, outFile, ui,
    jpegQ, jpegModeIdx,
    webpQ, webpLossless,
    pngComp, pngInterlaced,
    tifCompIdx, tifByteIdx, tifLayers,
    pdfPresetIdx
){
    try{
        var label = ui.fmtDropdown.selection.text;

        switch (true){
            case /WEBP/.test(label):
                var ok = trySaveWEBP_AD(doc, outFile, webpQ, webpLossless) || trySaveWEBP_Plugin(doc, outFile, webpQ, webpLossless);
                if (ok) return true;
                alert("Seu Photoshop não expôs a API do WEBP para script.\nAtualize o Photoshop (23.2+) ou instale o plugin WEBP.");
                return false;

            case /JPEG/.test(label):
                var jpg = new JPEGSaveOptions();
                jpg.quality = Math.max(0, Math.min(12, jpegQ|0));
                jpg.embedColorProfile = true;
                jpg.formatOptions =
                    jpegModeIdx===2 ? FormatOptions.PROGRESSIVE :
                    jpegModeIdx===1 ? FormatOptions.OPTIMIZEDBASELINE :
                                      FormatOptions.STANDARDBASELINE;
                doc.flatten();
                doc.saveAs(outFile, jpg, true);
                return true;

            case /PNG/.test(label):
                var png = new PNGSaveOptions();
                png.compression = Math.max(0, Math.min(9, pngComp|0));
                png.interlaced = !!pngInterlaced;
                doc.flatten();
                doc.saveAs(outFile, png, true);
                return true;

            case /TIFF/.test(label):
                var tif = new TiffSaveOptions();
                tif.imageCompression = [TIFFEncoding.NONE, TIFFEncoding.TIFFLZW, TIFFEncoding.ZIP, TIFFEncoding.JPEG][tifCompIdx] || TIFFEncoding.NONE;
                tif.byteOrder = (tifByteIdx===1) ? ByteOrder.MACOS : ByteOrder.IBM;
                tif.layers = !!tifLayers;
                doc.saveAs(outFile, tif, true);
                return true;

            case /PSD/.test(label):
                var psd = new PhotoshopSaveOptions();
                psd.embedColorProfile = true; psd.layers = true;
                doc.saveAs(outFile, psd, true);
                return true;

            case /PDF/.test(label):
                var pdf = new PDFSaveOptions();
                pdf.embedColorProfile = true;
                pdf.preserveEditing = (pdfPresetIdx===0); // alta qualidade = editável
                doc.flatten();
                doc.saveAs(outFile, pdf, true);
                return true;
        }
    } catch(e){}
    return false;
}

/* ========================= WEBP ========================= */
function trySaveWEBP_AD(doc, outFile, quality, lossless){
    try{
        var s2t = stringIDToTypeID;
        var desc = new ActionDescriptor();
        var saveID = s2t("save"), asID=s2t("as"), inID=s2t("in"),
            copyID=s2t("copy"), lowerCase=s2t("lowerCase"), extID=s2t("extension");
        var webpFormatID = s2t("webpFormat");
        var webpOpt = new ActionDescriptor();
        try { webpOpt.putInteger(s2t("webpQuality"), Math.max(0, Math.min(100, quality|0))); } catch(_){}
        try { webpOpt.putBoolean(s2t("webpLossless"), !!lossless); } catch(_){}
        desc.putObject(asID, webpFormatID, webpOpt);
        desc.putPath(inID, outFile);
        desc.putBoolean(copyID, true);
        desc.putBoolean(lowerCase, true);
        desc.putEnumerated(extID, s2t("extensionType"), s2t("lowercase"));
        executeAction(saveID, desc, DialogModes.NO);
        return outFile.exists;
    } catch(e){ return false; }
}
function trySaveWEBP_Plugin(doc, outFile, quality, lossless){
    try{
        if (typeof WebPSaveOptions === 'function'){
            var w = new WebPSaveOptions();
            if ("quality" in w)  w.quality  = Math.max(0, Math.min(100, quality|0));
            if ("lossless" in w) w.lossless = !!lossless;
            doc.saveAs(outFile, w, true);
            return true;
        }
    } catch(e){}
    return false;
}
