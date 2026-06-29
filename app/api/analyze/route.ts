import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from "@/lib/supabase";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get("image") as File | null;
    const namaProduk = formData.get("namaProduk") as string;
    const hargaJual = formData.get("hargaJual") as string;
    const hargaKompetitor = formData.get("hargaKompetitor") as string;
    
    console.log("Using API Key starting with:", process.env.GEMINI_API_KEY?.substring(0, 15));

    if (!imageFile || !namaProduk || !hargaJual || !hargaKompetitor) {
      return NextResponse.json(
        { error: "Semua field wajib diisi (gambar, nama produk, harga jual, harga kompetitor)." },
        { status: 400 }
      );
    }

    // Convert image to base64
    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString("base64");
    const mimeType = imageFile.type || "image/jpeg";

    // Build prompt
    const systemPrompt = `Kamu adalah 'JagoJualan AI', konsultan bisnis UMKM elit tingkat dewa.
Tugasmu: Menganalisis foto produk ini untuk membantu UMKM "menang tanpa perang harga".
Nama Produk: ${namaProduk}
Harga jual UMKM: Rp${hargaJual}. Harga kompetitor termurah: Rp${hargaKompetitor}.

INSTRUKSI WAJIB:
1. Apapun objek utamanya, ASUMSIKAN itu adalah produk jualan UMKM dengan nama "${namaProduk}". HANYA tolak jika gambar sepenuhnya gelap gulita atau murni selfie wajah tanpa barang. Jika ditolak, kembalikan JSON: { "error": "Gambar tidak terdeteksi sebagai produk jualan. Harap unggah foto produk yang lebih jelas." }
2. Jika valid, cari keunggulan visual produk "${namaProduk}" ini (kebersihan, kerapian, kesan premium, bahan, detail) sebagai argumen MENGAPA pelanggan pantas membayar lebih mahal (Rp${hargaJual}) dibanding kompetitor (Rp${hargaKompetitor}).
3. Buat COPYWRITING yang persuasif (gunakan teknik psikologi marketing, FOMO, atau value-driven), sebutkan nama produk secara natural, lengkapi dengan EMOJI yang relevan agar siap disalin-tempel.
4. Buat deskripsi ekspor dalam bahasa Inggris profesional, SEO-friendly, dan memukau pembeli global.

WAJIB balas HANYA dengan JSON murni (tanpa tag markdown \`\`\`json).
Format JSON:
{
  "strategiBisnis": {
    "judul": "(Judul strategi singkat, menarik, berkelas. Maksimal 6 kata)",
    "analisisVisual": "(Penjelasan tajam mengapa produk di foto ini terlihat lebih mahal/berkualitas dari kompetitor. Fokus pada detail visual. Maks 3 kalimat)",
    "saranTaktik": "(Saran taktik jualan praktis di lapangan untuk UMKM agar percaya diri dengan harganya. Maks 3 kalimat)"
  },
  "kontenLokal": {
    "whatsapp": "(Teks broadcast WA santai tapi jualan, gunakan sapaan akrab, tonjolkan kualitas visual produk, akhiri dengan Call to Action & emoji yang pas)",
    "instagram": "(Caption IG estetik, format rapi dengan spasi, gunakan hashtag relevan, tonjolkan value/kualitas, gunakan emoji)"
  },
  "kontenEkspor": {
    "englishTitle": "(Judul produk B.Inggris, standar e-commerce internasional premium)",
    "englishDescription": "(Deskripsi B.Inggris yang profesional, menonjolkan kualitas, SEO-friendly, siap pakai)"
  }
}`;

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
        
        // Handle invalid image error from Gemini
        if (parsedResult.error) {
          return NextResponse.json(
            { error: parsedResult.error },
            { status: 400 }
          );
        }
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
        nama_produk: namaProduk,
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
