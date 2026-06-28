import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from "@/lib/supabase";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get("image") as File | null;
    const hargaJual = formData.get("hargaJual") as string;
    const hargaKompetitor = formData.get("hargaKompetitor") as string;
    
    console.log("Using API Key starting with:", process.env.GEMINI_API_KEY?.substring(0, 15));

    if (!imageFile || !hargaJual || !hargaKompetitor) {
      return NextResponse.json(
        { error: "Semua field wajib diisi (gambar, harga jual, harga kompetitor)." },
        { status: 400 }
      );
    }

    // Convert image to base64
    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString("base64");
    const mimeType = imageFile.type || "image/jpeg";

    // Build prompt
    const systemPrompt = `Kamu adalah 'JagoJualan AI', konsultan bisnis UMKM elit. Harga jual: Rp${hargaJual}. Harga kompetitor termurah: Rp${hargaKompetitor}. Analisis foto produk ini dengan teliti. Cari keunggulan visual (kebersihan, kerapian, kesan premium, dll) sebagai argumen MENGAPA user TIDAK perlu menurunkan harga. WAJIB balas HANYA dengan JSON murni tanpa markdown. Formatnya: { "strategiBisnis": { "judul": "...", "analisisVisual": "...", "saranTaktik": "..." }, "kontenLokal": { "whatsapp": "...", "instagram": "..." }, "kontenEkspor": { "englishTitle": "...", "englishDescription": "..." } }`;

    // Call Gemini API
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent([
      systemPrompt,
      {
        inlineData: {
          mimeType,
          data: base64Image,
        },
      },
    ]);

    const responseText = result.response.text();

    // Parse the JSON from Gemini response
    let parsedResult;
    try {
      // Try to extract JSON from the response (in case Gemini wraps it)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch {
      return NextResponse.json(
        { error: "AI gagal menghasilkan respons yang valid. Silakan coba lagi." },
        { status: 500 }
      );
    }

    // Save to Supabase
    try {
      await supabase.from("analisis").insert({
        harga_jual: parseInt(hargaJual),
        harga_kompetitor: parseInt(hargaKompetitor),
        strategi_judul: parsedResult.strategiBisnis?.judul || "",
        analisis_visual: parsedResult.strategiBisnis?.analisisVisual || "",
        saran_taktik: parsedResult.strategiBisnis?.saranTaktik || "",
        wa_copy: parsedResult.kontenLokal?.whatsapp || "",
        ig_copy: parsedResult.kontenLokal?.instagram || "",
        en_title: parsedResult.kontenEkspor?.englishTitle || "",
        en_desc: parsedResult.kontenEkspor?.englishDescription || "",
      });
    } catch (dbError) {
      console.error("Supabase insert error:", dbError);
      // Don't fail the request if DB save fails
    }

    return NextResponse.json({ data: parsedResult });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Analysis error:", errMsg);

    if (errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("Too Many Requests")) {
      return NextResponse.json(
        { error: "Kuota API harian sudah habis. Silakan coba lagi besok atau gunakan API key baru." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: `Terjadi kesalahan: ${errMsg}` },
      { status: 500 }
    );
  }
}
