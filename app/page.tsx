"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import html2canvas from "html2canvas";

interface AnalysisResult {
  strategiBisnis: { judul: string; analisisVisual: string; saranTaktik: string };
  kontenLokal: { whatsapp: string; instagram: string };
  kontenEkspor: { englishTitle: string; englishDescription: string };
}

interface HistoryItem {
  id: number; created_at: string; nama_produk: string; harga_jual: number; harga_kompetitor: number;
  strategi_judul: string; analisis_visual: string; saran_taktik: string;
  wa_copy: string; ig_copy: string; en_title: string; en_desc: string;
}

function formatRupiah(v: string) { const n = v.replace(/\D/g, ""); return n.replace(/\B(?=(\d{3})+(?!\d))/g, "."); }
function parseRupiah(f: string) { return f.replace(/\./g, ""); }

/* ── SVG Icons ── */
const IconUpload = () => (
  <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
  </svg>
);
const IconCopy = () => (
  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
  </svg>
);
const IconCheck = () => (
  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);
const IconX = () => (
  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);
const IconArrow = () => (
  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
  </svg>
);

export default function Home() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [namaProduk, setNamaProduk] = useState("");
  const [hargaJual, setHargaJual] = useState("");
  const [hargaKompetitor, setHargaKompetitor] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const resultRef = useRef<HTMLDivElement>(null);
  const [chatMessages, setChatMessages] = useState<{role: 'user'|'ai', text: string}[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    try { const res = await fetch("/api/history"); const json = await res.json(); setHistory(json.data || []); }
    catch { console.error("Failed to fetch history"); }
    finally { setHistoryLoading(false); }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const handleImageSelect = (file: File) => {
    if (!file.type.startsWith("image/")) { setError("File harus berupa gambar."); return; }
    if (file.size > 10 * 1024 * 1024) { setError("Ukuran gambar maksimal 10MB."); return; }
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setImagePreview(result);
      
      // Auto compress image for faster API upload
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_SIZE = 1080;
        let { width, height } = img;
        if (width > height && width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
        else if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) setImageFile(new File([blob], "compressed.webp", { type: "image/webp" }));
          else setImageFile(file); // Fallback
        }, "image/webp", 0.8);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleImageSelect(f); };
  const removeImage = () => { setImageFile(null); setImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; };

  const handleSubmit = async () => {
    if (!imageFile) { setError("Upload foto produk terlebih dahulu."); return; }
    if (!namaProduk.trim()) { setError("Isi nama produk terlebih dahulu."); return; }
    const rj = parseRupiah(hargaJual), rk = parseRupiah(hargaKompetitor);
    if (!rj || !rk) { setError("Isi harga jual dan harga kompetitor."); return; }
    setIsLoading(true); setError(null); setResult(null); setChatMessages([]);
    try {
      const fd = new FormData(); fd.append("image", imageFile); fd.append("namaProduk", namaProduk); fd.append("hargaJual", rj); fd.append("hargaKompetitor", rk);
      const res = await fetch("/api/analyze", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Analisis gagal.");
      setResult(json.data); fetchHistory();
      setTimeout(() => { resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, 200);
    } catch (err) { setError(err instanceof Error ? err.message : "Terjadi kesalahan."); }
    finally { setIsLoading(false); }
  };

  const handleCopy = async (text: string, id: string) => {
    try { await navigator.clipboard.writeText(text); } catch { const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); }
    setCopiedField(id); setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDownloadReport = async () => {
    if (!resultRef.current) return;
    try {
      const canvas = await html2canvas(resultRef.current, { backgroundColor: '#09090b', scale: 2 });
      const imgData = canvas.toDataURL("image/jpeg", 0.9);
      const link = document.createElement("a");
      link.href = imgData;
      link.download = `Laporan_JagoJualan_${namaProduk || "UMKM"}.jpg`;
      link.click();
    } catch (err) {
      console.error("Gagal mendownload laporan", err);
      alert("Gagal memproses gambar. Coba lagi.");
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading || !imageFile) return;
    
    const newMsg = chatInput.trim();
    setChatInput("");
    const newHistory = [...chatMessages, { role: 'user' as const, text: newMsg }];
    setChatMessages(newHistory);
    setIsChatLoading(true);
    
    try {
      const fd = new FormData();
      fd.append("image", imageFile);
      fd.append("namaProduk", namaProduk);
      fd.append("hargaJual", parseRupiah(hargaJual));
      fd.append("hargaKompetitor", parseRupiah(hargaKompetitor));
      fd.append("chatHistory", JSON.stringify(newHistory));
      
      const res = await fetch("/api/chat", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menghubungi AI.");
      
      setChatMessages([...newHistory, { role: 'ai', text: json.data.text }]);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Terjadi kesalahan.");
      setChatMessages(newHistory.slice(0, -1)); // Revert
    } finally {
      setIsChatLoading(false);
    }
  };

  const fmtDate = (d: string) => new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: "var(--bg-primary)" }}>
      {/* ── BACKGROUND ORBS ── */}
      <div className="glow-orb glow-orb-1" />
      <div className="glow-orb glow-orb-2" />

      {/* ── NAVBAR ── */}
      <nav className="sticky top-0 z-50" style={{ background: "rgba(9, 9, 11, 0.7)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="max-w-2xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo-jagojualan.png" alt="JagoJualan" className="h-9 w-9 object-cover rounded-xl" />
            <span className="text-sm font-semibold tracking-wide" style={{ color: "var(--text-primary)" }}>JagoJualan</span>
          </div>
          <span className="label label-blue">Beta</span>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative z-10" id="hero">
        <div className="max-w-2xl mx-auto px-5 pt-16 pb-12 sm:pt-24 sm:pb-16 text-center">
          <div className="animate-in mb-6 inline-flex">
            <span className="shimmer-badge text-[11px] font-semibold tracking-wide uppercase text-white shadow-lg">
              Asisten AI UMKM
            </span>
          </div>
          <h1 className="animate-in-1 mb-5">
            <span className="font-sans font-bold text-5xl sm:text-6xl text-zinc-50" style={{ color: "#f8f9fa", lineHeight: 1.15, letterSpacing: "-0.03em", display: "block" }}>
              Stop banting harga,
            </span>
            <span className="font-sans font-bold text-5xl sm:text-6xl text-zinc-50" style={{ color: "#f8f9fa", lineHeight: 1.15, letterSpacing: "-0.03em", display: "block", marginTop: 4 }}>
              mulai jualan cerdas!
            </span>
          </h1>
          <p className="mt-6 text-lg animate-in-2 text-balance mx-auto" style={{ color: "var(--text-secondary)", maxWidth: "580px", lineHeight: 1.6 }}>
            Biar AI yang merangkai kata, Anda fokus urus pesanan. Unggah foto produk dan temukan strategi anti-perang harga, caption WA & IG, hingga konten ekspor dalam hitungan detik.
          </p>
        </div>
      </section>

      {/* ── INPUT FORM ── */}
      <section className="pb-12" id="input-section">
        <div className="max-w-2xl mx-auto px-5">
          <div className="surface-elevated p-5 sm:p-7 animate-in-3" style={{ boxShadow: "0 0 40px rgba(37, 99, 235, 0.1), inset 0 1px 0 rgba(255,255,255,0.05)" }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Analisis Produk</h2>
              <span className="label label-slate">Gemini AI</span>
            </div>

            {/* Upload */}
            <div
              className={`upload-area mb-5 ${isDragging ? "dragging" : ""} ${imagePreview ? "has-file" : ""}`}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onClick={() => !imagePreview && fileInputRef.current?.click()}
              id="upload-zone"
            >
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageSelect(f); }} id="file-input" />
              {imagePreview ? (
                <div className="relative">
                  <img src={imagePreview} alt="Preview" className="max-h-56 mx-auto rounded-lg object-contain" />
                  <button onClick={(e) => { e.stopPropagation(); removeImage(); }} className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center transition-colors" style={{ background: "rgba(0,0,0,0.6)", color: "white" }} id="remove-image" aria-label="Hapus gambar">
                    <IconX />
                  </button>
                </div>
              ) : (
                <div className="py-2">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: "var(--bg-subtle)", color: "var(--text-tertiary)" }}>
                    <IconUpload />
                  </div>
                  <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                    Klik atau seret foto produk ke sini
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
                    JPG, PNG, atau WEBP — maksimal 10MB
                  </p>
                </div>
              )}
            </div>

            {/* Nama Produk */}
            <div className="mb-4">
              <label htmlFor="nama-produk" className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Nama produk</label>
              <input id="nama-produk" type="text" placeholder="Contoh: Kripik Kaca Pedas Daun Jeruk" value={namaProduk} onChange={(e) => setNamaProduk(e.target.value)} className="input" />
            </div>

            {/* Prices */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
              <div>
                <label htmlFor="harga-jual" className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Harga jual</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm" style={{ color: "var(--text-tertiary)" }}>Rp</span>
                  <input id="harga-jual" type="text" inputMode="numeric" placeholder="50.000" value={hargaJual} onChange={(e) => setHargaJual(formatRupiah(e.target.value))} className="input" style={{ paddingLeft: 36 }} />
                </div>
              </div>
              <div>
                <label htmlFor="harga-kompetitor" className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Harga kompetitor</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm" style={{ color: "var(--text-tertiary)" }}>Rp</span>
                  <input id="harga-kompetitor" type="text" inputMode="numeric" placeholder="35.000" value={hargaKompetitor} onChange={(e) => setHargaKompetitor(formatRupiah(e.target.value))} className="input" style={{ paddingLeft: 36 }} />
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3.5 rounded-lg text-sm flex items-start gap-2" style={{ background: "var(--danger-bg)", color: "var(--danger)", border: "1px solid #fecaca" }} id="error-message">
                <span className="shrink-0 mt-px">!</span>
                <span>{error}</span>
              </div>
            )}

            <button onClick={handleSubmit} disabled={isLoading} className="btn-primary" id="submit-btn">
              {isLoading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                  <span>AI sedang meracik strategi<span className="dot-pulse"><span>.</span><span>.</span><span>.</span></span></span>
                </>
              ) : (
                <><span>Analisis Produk</span><IconArrow /></>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* ── LOADING ── */}
      {isLoading && (
        <section className="pb-12" id="loading-skeleton">
          <div className="max-w-2xl mx-auto px-5 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="surface p-5">
                <div className="flex items-center gap-3 mb-4"><div className="skeleton w-9 h-9 rounded-lg" /><div className="skeleton h-4 w-36" /></div>
                <div className="skeleton h-14 w-full mb-3 rounded-lg" />
                <div className="skeleton h-3.5 w-full mb-2" /><div className="skeleton h-3.5 w-3/4 mb-2" /><div className="skeleton h-3.5 w-1/2" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── RESULTS ── */}
      {result && (
        <section className="pb-12" id="result-section">
          <div className="max-w-2xl mx-auto px-5">
            <div className="flex items-center justify-between mb-4 animate-in">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)", letterSpacing: "0.08em" }}>Hasil Analisis</p>
              <button onClick={handleDownloadReport} className="text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors hover:bg-white/5" style={{ color: "var(--text-secondary)", border: "1px solid var(--border-default)" }} title="Download sebagai gambar">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Download Laporan
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5" ref={resultRef}>
              {/* Card 1: Strategy (Full Width) */}
              <div className="surface p-6 sm:p-8 animate-slide-up md:col-span-2 relative overflow-hidden" id="card-strategi">
                {/* Subtle background decoration */}
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full" style={{ background: "radial-gradient(circle, rgba(37,99,235,0.04) 0%, transparent 70%)", pointerEvents: "none" }} />

                <div className="flex items-center gap-2 mb-6">
                  <span className="label label-amber">Strategi Utama</span>
                  <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>Anti-Perang Harga</span>
                </div>

                <h3 className="font-serif text-2xl sm:text-3xl italic mb-6 sm:w-4/5" style={{ color: "var(--text-primary)", lineHeight: 1.25 }}>
                  "{result.strategiBisnis.judul}"
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-5" style={{ borderTop: "1px dashed var(--border-default)" }}>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--text-tertiary)" }} />
                      <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)", letterSpacing: "0.08em" }}>Analisis Visual</p>
                    </div>
                    <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.75 }}>{result.strategiBisnis.analisisVisual}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)", letterSpacing: "0.08em" }}>Saran Eksekusi</p>
                    </div>
                    <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.75 }}>{result.strategiBisnis.saranTaktik}</p>
                  </div>
                </div>
              </div>

              {/* Card 2: Copywriting */}
              <div className="surface p-5 sm:p-6 animate-in-1 flex flex-col h-full" id="card-lokal">
                <div className="flex items-center gap-2 mb-5">
                  <span className="label label-green">Sosial Media</span>
                  <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>Pasar Lokal</span>
                </div>
                <div className="space-y-5 flex-1">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>WhatsApp Broadcast</p>
                      <button className={`btn-copy ${copiedField === "wa" ? "copied" : ""}`} onClick={() => handleCopy(result.kontenLokal.whatsapp, "wa")} id="copy-wa">
                        {copiedField === "wa" ? <><IconCheck /><span>Disalin</span></> : <><IconCopy /><span>Salin</span></>}
                      </button>
                    </div>
                    <textarea readOnly value={result.kontenLokal.whatsapp} className="textarea" style={{ minHeight: "110px", background: "var(--bg-primary)" }} id="textarea-wa" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Instagram Caption</p>
                      <button className={`btn-copy ${copiedField === "ig" ? "copied" : ""}`} onClick={() => handleCopy(result.kontenLokal.instagram, "ig")} id="copy-ig">
                        {copiedField === "ig" ? <><IconCheck /><span>Disalin</span></> : <><IconCopy /><span>Salin</span></>}
                      </button>
                    </div>
                    <textarea readOnly value={result.kontenLokal.instagram} className="textarea" style={{ minHeight: "110px", background: "var(--bg-primary)" }} id="textarea-ig" />
                  </div>
                </div>
              </div>

              {/* Card 3: Export */}
              <div className="surface p-5 sm:p-6 animate-in-2 flex flex-col h-full" id="card-ekspor">
                <div className="flex items-center gap-2 mb-5">
                  <span className="label label-blue">Global</span>
                  <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>Siap Ekspor</span>
                </div>

                <div className="p-4 rounded-xl mb-5" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-default)" }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-tertiary)" }}>English Title</p>
                  <p className="font-serif text-xl italic" style={{ color: "var(--text-primary)", lineHeight: 1.3 }}>{result.kontenEkspor.englishTitle}</p>
                </div>

                <div className="flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>English Description</p>
                    <button className={`btn-copy ${copiedField === "en" ? "copied" : ""}`} onClick={() => handleCopy(result.kontenEkspor.englishDescription, "en")} id="copy-en">
                      {copiedField === "en" ? <><IconCheck /><span>Disalin</span></> : <><IconCopy /><span>Salin</span></>}
                    </button>
                  </div>
                  <textarea readOnly value={result.kontenEkspor.englishDescription} className="textarea flex-1" style={{ minHeight: "160px", background: "var(--bg-primary)" }} id="textarea-en" />
                </div>
              </div>
            </div>

            {/* INTERACTIVE CHAT */}
            <div className="mt-8 pt-8 animate-slide-up" style={{ borderTop: "1px dashed var(--border-default)" }}>
              <div className="flex items-center gap-2 mb-4">
                <span className="label label-blue">Tanya Asisten AI</span>
                <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>Punya pertanyaan lain seputar strategi ini?</span>
              </div>
              
              {chatMessages.length > 0 && (
                <div className="mb-4 space-y-3">
                  {chatMessages.map((msg, idx) => (
                    <div key={idx} className={`p-4 rounded-xl text-sm ${msg.role === 'user' ? 'bg-white/5 ml-8 border border-white/10' : 'mr-8'}`} style={{ color: msg.role === 'user' ? 'var(--text-primary)' : 'var(--text-secondary)', background: msg.role === 'ai' ? 'var(--bg-subtle)' : undefined, border: msg.role === 'ai' ? '1px solid var(--border-default)' : undefined, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                      {msg.text}
                    </div>
                  ))}
                  {isChatLoading && (
                    <div className="mr-8 p-4 rounded-xl text-sm w-32" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-default)' }}>
                       <span className="dot-pulse" style={{ color: "var(--text-tertiary)" }}><span>.</span><span>.</span><span>.</span></span>
                    </div>
                  )}
                </div>
              )}
              
              <form onSubmit={handleChatSubmit} className="relative">
                <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Contoh: Gimana cara bikin promo bundle buat produk ini?" className="input pr-12" disabled={isChatLoading} />
                <button type="submit" disabled={isChatLoading || !chatInput.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 disabled:opacity-50 disabled:hover:bg-blue-500/10 transition-colors">
                  <IconArrow />
                </button>
              </form>
            </div>
          </div>
        </section>
      )}

      {/* ── HISTORY ── */}
      <section className="pb-16 pt-4" id="history-section">
        <div className="max-w-2xl mx-auto px-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)", letterSpacing: "0.08em" }}>Riwayat Terakhir</p>
            {history.length > 0 && <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{history.length} analisis</span>}
          </div>

          {historyLoading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => (<div key={i} className="surface p-4"><div className="skeleton h-4 w-48 mb-2" /><div className="skeleton h-3 w-full mb-1.5" /><div className="skeleton h-3 w-2/3" /></div>))}</div>
          ) : history.length === 0 ? (
            <div className="surface p-8 text-center">
              <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>Belum ada riwayat analisis.</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>Hasil analisis akan muncul di sini.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((item, i) => (
                <div key={item.id} className={`surface-interactive p-4 animate-in${i === 0 ? "" : i === 1 ? "-1" : "-2"}`} id={`history-item-${item.id}`}>
                  <div className="flex items-start justify-between mb-1.5">
                    <h4 className="text-sm font-medium line-clamp-1" style={{ color: "var(--text-primary)" }}>{item.nama_produk || item.strategi_judul}</h4>
                    <span className="text-xs shrink-0 ml-3" style={{ color: "var(--text-tertiary)" }}>Rp{item.harga_jual.toLocaleString("id-ID")}</span>
                  </div>
                  <p className="text-xs line-clamp-2" style={{ color: "var(--text-tertiary)", lineHeight: 1.6 }}>{item.analisis_visual}</p>
                  <p className="text-[11px] mt-2" style={{ color: "var(--text-tertiary)" }}>{fmtDate(item.created_at)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer id="footer" style={{ borderTop: "1px solid var(--border-default)" }}>
        <div className="max-w-2xl mx-auto px-5 py-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo-jagojualan.png" alt="JagoJualan" className="h-7 w-7 object-cover rounded-lg opacity-80 hover:opacity-100 transition-opacity" />
            <span className="text-xs font-medium" style={{ color: "var(--text-tertiary)" }}>JagoJualan</span>
          </div>
          <div className="text-xs text-right space-y-1" style={{ color: "var(--text-tertiary)" }}>
            <p className="font-medium text-[11px] uppercase tracking-wide">Developed by Deyafa Arsetya</p>
            <p>Powered by Gemini AI · Supabase</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
