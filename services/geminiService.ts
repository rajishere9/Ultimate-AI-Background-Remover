import { GoogleGenAI, Modality } from "@google/genai";
import type { ImageData } from "../types";

const dataUrlToBase64 = (dataUrl: string): string => {
  return dataUrl.split(',')[1];
}

export const getGreenScreenImage = async (
  imageData: ImageData
): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const base64Data = dataUrlToBase64(imageData.base64);

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: imageData.mimeType,
            },
          },
          {
            text: 'Remove the background from this image. Replace the background with a solid, bright green screen color (#00FF00). The subject should be cleanly isolated. The output should be a standard image format like PNG or JPEG.',
          },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });
    
    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

    if (imagePart && imagePart.inlineData) {
      return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
    } else {
      const textResponse = response.text;
      if (textResponse) {
          throw new Error(`Model could not process image: ${textResponse}`);
      }
      throw new Error("Could not find processed image in the API response.");
    }
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to remove background: ${error.message}`);
    }
    throw new Error("An unknown error occurred while removing the background.");
  }
};
