import { GoogleGenAI, Modality, Type } from "@google/genai";
import { TryOnItem } from "../types";

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
    throw new Error("API_KEY environment variable not set");
}
const ai = new GoogleGenAI({ apiKey: API_KEY });

const parseGeminiError = (error: unknown): string => {
    if (error instanceof Error) {
        const message = error.message.toLowerCase();
        if (message.includes("api key not valid")) {
            return "The AI service is not configured correctly. Please contact support.";
        }
        if (message.includes("quota")) {
            return "The AI service is currently experiencing high demand. Please try again in a few minutes.";
        }
        if (message.includes("503") || message.includes("unavailable")) {
            return "The AI styling service is temporarily unavailable. Please try again later.";
        }
         if (message.includes("invalid argument") || message.includes("request was blocked")) {
            return "The request was blocked by the AI. This can happen if an image is unsuitable for processing. Please try a different photo.";
        }
    }
    return "An unexpected error occurred with the AI service. Please try again.";
};

/**
 * Uses Gemini to classify a clothing item into a specific category.
 * @param imageBase64 The base64 encoded image data.
 * @param mimeType The MIME type of the image.
 * @returns The category of the clothing item.
 */
export const classifyClothingItem = async (
  imageBase64: string,
  mimeType: string
): Promise<string> => {
  const PROMPT = `Analyze the provided image of a clothing item. Your task is to determine its category. The category must be one of the following exact string values: "outfits", "tops", "bottoms", "footwear", "headwear", "accessories". An "outfit" is a single item that covers both the top and bottom of the body, like a dress or a suit.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { data: imageBase64, mimeType: mimeType } },
          { text: PROMPT },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: {
              type: Type.STRING,
              enum: ["outfits", "tops", "bottoms", "footwear", "headwear", "accessories"],
              description: "The category of the clothing item."
            }
          },
          required: ['category']
        }
      },
    });

    const jsonResponse = JSON.parse(response.text);
    const category = jsonResponse.category;
    
    if (!category) {
        throw new Error("AI could not determine a valid category.");
    }
    
    return category;

  } catch (error) {
    console.error("Error calling Gemini API for classification:", error);
    const userFriendlyError = parseGeminiError(error);
    throw new Error(userFriendlyError);
  }
};


export const virtualTryOn = async (
  userImageBase64: string,
  userImageMimeType: string,
  catalogueItems: TryOnItem[],
  gender: 'female' | 'male'
): Promise<string | null> => {

  const itemDescriptions = catalogueItems.map(item => 
    `- A '${item.category}' item named '${item.name}'`
  ).join('\n');

  const PROMPT = `Your mission is to perform a hyper-realistic virtual try-on. You will create a new, high-fidelity photorealistic image where the person from the first image (the user, a ${gender}) is wearing the provided clothing item(s). The original user image and the clothing items are provided as subsequent images:
${itemDescriptions}

**CRITICAL INSTRUCTIONS FOR FLAWLESS IMAGE GENERATION:**

1.  **HYPER-ACCURATE BODY SHAPE DETECTION & RENDERING:**
    *   **This is a primary directive.** Your first step is to perform an exhaustive analysis of the user's body in the photo. Go beyond a general shape; capture the **precise, unique contours and proportions** of their individual physique.
    *   Identify subtle details: the curve of the shoulders, the specific shape of the waist and hips, the posture, and how they hold themselves. This is not a mannequin; it's a real person.
    *   The clothing must be rendered to fit *this specific person*. The final image should reflect how the fabric would genuinely hang, stretch, and fold on their unique body, resulting in a truly personalized and believable fit.
    *   The clothing item(s) MUST be placed with extreme precision on the corresponding body part (e.g., 'tops' on the torso, 'footwear' on feet).

2.  **EXPERT-LEVEL FABRIC SIMULATION & DRAPING:**
    *   **This is the most critical directive.** The final image's realism depends entirely on the draping.
    *   **Simulate Physics:** The fabric must behave according to the laws of physics. Consider gravity, causing the material to hang naturally. Simulate tension where the fabric is stretched over the body (like shoulders or hips) and compression where it bunches up (like at the elbows or waist).
    *   **Body Interaction:** The clothing must realistically interact with the body underneath. It should press against the skin where appropriate and create natural-looking folds and creases in response to the user's pose.
    *   **Material Properties:** Accurately represent the fabric's material. Silk should have a soft drape with fine highlights. Denim should be stiffer with more defined creases. Cotton should have a softer, more subtle texture.
    *   **Light & Shadow Mastery:** This is non-negotiable for realism. Generate intricate micro-shadows within every fold and crease. The highlights and shadows on the clothing must perfectly match the direction, intensity, and color of the lighting in the original user photo. The result MUST look three-dimensional and integrated, not like a flat sticker.

3.  **PRESERVE ORIGINAL IMAGE INTEGRITY:**
    *   The final output image MUST have the **exact same aspect ratio and dimensions** as the original user image. Do not crop, resize, or alter the orientation.
    *   The background, environment, and any parts of the user not covered by the new clothing MUST remain absolutely untouched and identical to the original photo.

4.  **SEAMLESS REPLACEMENT & INTEGRATION:**
    *   You must completely and cleanly replace any existing clothing the user is wearing in the target area. There should be no ghosting or blending of the old clothing with the new.
    *   The transition between the new clothing and the user's skin or other existing clothing must be flawless and imperceptible.

5.  **REALISTIC BODY PART GENERATION (IF REQUIRED):**
    *   If a body part necessary for an item is not visible (e.g., trying on shoes when feet are out of frame), you MUST realistically generate the missing body parts.
    *   These generated parts must be a perfect match for the user's build, posture, and skin tone as seen in the rest of the photo.

**FINAL QUALITY CHECK:** Before outputting the image, verify that it is indistinguishable from a real photograph. It must not look edited. The clothing must appear to be physically present in the original scene, worn by the user.`;

  
  const catalogueParts = catalogueItems.map(item => ({
    inlineData: {
      data: item.image.base64,
      mimeType: item.image.mimeType,
    },
  }));

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: userImageBase64,
              mimeType: userImageMimeType,
            },
          },
          ...catalogueParts,
          {
            text: PROMPT,
          },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return part.inlineData.data;
      }
    }
    
    throw new Error("The AI model did not return an image. This can happen if the input is unclear or violates safety policies. Please try a different photo.");

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    const userFriendlyError = parseGeminiError(error);
    throw new Error(userFriendlyError);
  }
};