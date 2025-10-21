/**
 * Reads a File object and converts it to a base64 encoded string.
 * This function wraps the FileReader API in a Promise for easier async/await usage.
 * @param file The file to read.
 * @returns A Promise that resolves with the base64 string (without the data URI prefix).
 */
export const readFileAsBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      // The result includes the data URI prefix (e.g., "data:image/png;base64,"), 
      // which we strip off to get just the base64 data.
      if (typeof reader.result === 'string') {
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      } else {
        reject(new Error("Failed to read file as a data URL string."));
      }
    };
    reader.onerror = () => {
      reject(new Error("There was an error reading the file."));
    };
    reader.readAsDataURL(file);
  });
};
