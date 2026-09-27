import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, maskBase64, markedImageBase64, model = 'gemini-3.1-flash-lite-image', apiKey } = body;

    const resolvedApiKey = apiKey || req.headers.get('x-gemini-api-key') || process.env.GEMINI_API_KEY;

    if (!resolvedApiKey) {
      return NextResponse.json(
        {
          error: 'No Gemini API key found. Please input your Gemini API key in Settings (or use Local Mode for instant offline inpainting).',
        },
        { status: 400 }
      );
    }

    if (!imageBase64) {
      return NextResponse.json({ error: 'Missing base image data.' }, { status: 400 });
    }

    const ai = new GoogleGenAI({
      apiKey: resolvedApiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    // Helper to extract base64 and mime type
    const parseDataUrl = (dataUrl: string) => {
      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        return { mimeType: match[1], data: match[2] };
      }
      return { mimeType: 'image/png', data: dataUrl };
    };

    const baseImg = parseDataUrl(imageBase64);
    const parts: any[] = [
      {
        inlineData: {
          data: baseImg.data,
          mimeType: baseImg.mimeType,
        },
      },
    ];

    if (markedImageBase64) {
      const markedImg = parseDataUrl(markedImageBase64);
      parts.push({
        inlineData: {
          data: markedImg.data,
          mimeType: markedImg.mimeType,
        },
      });
    } else if (maskBase64) {
      const maskImg = parseDataUrl(maskBase64);
      parts.push({
        inlineData: {
          data: maskImg.data,
          mimeType: maskImg.mimeType,
        },
      });
    }

    const promptText =
      'Task: Watermark Removal and Content-Aware Inpainting.\n' +
      'Image 1 is the original image containing a watermark. The second image highlights the mask region where the watermark is located.\n' +
      'Seamlessly remove the watermark in that masked region. Inpaint and restore the background textures, gradient, lighting, and detail naturally to blend with the surroundings.\n' +
      'Preserve the rest of the image intact. Return only the cleaned restored image.';

    parts.push({ text: promptText });

    const selectedModel = model || 'gemini-3.1-flash-lite-image';

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: {
        parts,
      },
    });

    const candidate = response.candidates?.[0];
    if (!candidate || !candidate.content?.parts) {
      return NextResponse.json(
        { error: 'AI model did not return any content parts. Please check your image or try Local Mode.' },
        { status: 502 }
      );
    }

    // Search for image in output parts
    for (const part of candidate.content.parts) {
      if (part.inlineData && part.inlineData.data) {
        const mime = part.inlineData.mimeType || 'image/png';
        const resultImage = `data:${mime};base64,${part.inlineData.data}`;
        return NextResponse.json({ success: true, resultImage });
      }
    }

    // If no inline image was generated, check if text was returned explaining something
    let textResponse = '';
    for (const part of candidate.content.parts) {
      if (part.text) {
        textResponse += part.text + ' ';
      }
    }

    return NextResponse.json(
      {
        error:
          textResponse.trim() ||
          'The model returned a response without an edited image. Please ensure your API key supports Gemini Image Generation or switch to Local Mode.',
      },
      { status: 422 }
    );
  } catch (err: any) {
    console.error('Error during AI inpainting:', err);
    return NextResponse.json(
      {
        error: err?.message || 'Failed to process AI inpainting. You can use Local Mode for instant offline inpainting.',
      },
      { status: 500 }
    );
  }
}
