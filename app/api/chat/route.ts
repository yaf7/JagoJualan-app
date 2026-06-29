import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get("image") as File | null;
    const namaProduk = formData.get("namaProduk") as string;
    const hargaJual = formData.get("hargaJual") as string;
    const hargaKompetitor = formData.get("hargaKompetitor") as string;
    const chatHistoryStr = formData.get("chatHistory") as string;
    
    if (!imageFile || !chatHistoryStr) {
      return NextResponse.json({ error: "Data tidak lengkap." }, { status: 400 });
    }

    const chatHistory = JSON.parse(chatHistoryStr);
    
    // Format the chat history into a readable text for the prompt
    let historyText = "";
    for (const msg of chatHistory) {
      historyText += `${msg.role === 'user' ? 'Pengguna' : 'JagoJualan AI'}: ${msg.text}\n`;
    }

    // Convert image to base64
    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString("base64");
    const mimeType = imageFile.type || "image/jpeg";

    const systemPrompt = `Kamu adalah 'JagoJualan AI', konsultan bisnis UMKM elit tingkat dewa.
Konteks Produk UMKM saat ini:
- Nama Produk: ${namaProduk}
- Harga Jual: Rp${hargaJual}
- Harga Kompetitor: Rp${hargaKompetitor}

Berikut adalah riwayat percakapan kita:
${historyText}

TUGASMU:
Jawablah pertanyaan/pesan terakhir dari 'Pengguna' di atas.
Gunakan gaya bahasa santai, praktis, penuh empati, dan memotivasi khas konsultan bisnis kekinian. Berikan ide atau taktik yang *actionable* (bisa langsung dilakukan).
Batasi jawaban maksimal 2-3 paragraf singkat agar mudah dibaca.

WAJIB balas HANYA dengan JSON murni tanpa markdown \`\`\`json.
Format:
{
  "text": "(Jawaban kamu)"
}`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent([
      systemPrompt,
      { inlineData: { mimeType, data: base64Image } }
    ]);

    const responseText = result.response.text();

    let parsedResult;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch {
      return NextResponse.json({ error: "Gagal memproses jawaban AI." }, { status: 500 });
    }

    return NextResponse.json({ data: parsedResult });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Chat error:", errMsg);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
