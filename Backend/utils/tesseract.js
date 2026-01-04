import Tesseract from "tesseract.js";

export const imageExtract = async (file) => {
  try {
    const result = await Tesseract.recognize(file, 'eng', { logger: (e) => console.log(e) });
    return result.data.text || ''; // If no text is recognized, return an empty string
  } catch (error) {
    console.error('Error extracting text from image:', error);
    return ''; // Return an empty string in case of an error
  }
};
