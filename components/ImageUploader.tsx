import React, { useState, useCallback, useRef } from 'react';
import { UploadedImage } from '../types';
import { UploadIcon, RetryIcon } from './icons';

interface ImageUploaderProps {
  onImageAdd: (image: UploadedImage) => void;
}

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageAdd }) => {
  const [uploadedImage, setUploadedImage] = useState<UploadedImage | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File) => {
    if (file.size > MAX_FILE_SIZE_BYTES) {
        setError(`Image is too large. Max size is ${MAX_FILE_SIZE_MB}MB.`);
        return;
    }
    if (!file.type.startsWith('image/')) {
        setError('Please upload a valid image file (PNG, JPG, etc.).');
        return;
    }
    setError(null);

    const reader = new FileReader();
    reader.onloadend = () => {
        // Use the dataURL directly for persistence across page reloads
        const dataUrl = reader.result as string;
        const base64String = dataUrl.split(',')[1];
        const newImage: UploadedImage = {
            base64: base64String,
            mimeType: file.type,
            url: dataUrl,
            name: file.name
        };
        // We no longer set the local state here, as the parent component
        // will navigate away immediately after adding the image.
        onImageAdd(newImage);
    };
    reader.onerror = () => {
        setError("There was an error reading the file.");
    };
    reader.readAsDataURL(file);
  }, [onImageAdd]);


  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [processFile]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingOver(false);
  };

  const handleUploadClick = () => fileInputRef.current?.click();

  return (
    <div className="w-full h-full bg-black rounded-lg overflow-hidden flex flex-col justify-center items-center relative text-white">
       <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/png, image/jpeg, image/webp"
        aria-label="Upload your photo"
      />
      <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleUploadClick}
          className={`w-full h-full flex flex-col justify-center items-center text-center p-8 border-4 border-dashed rounded-lg cursor-pointer transition-colors duration-300 ${isDraggingOver ? 'border-gray-400 bg-gray-800' : 'border-gray-600 hover:border-gray-500'}`}
          role="button"
          tabIndex={0}
      >
          <UploadIcon className="h-16 w-16 text-gray-400" />
          <p className="mt-4 text-lg font-semibold text-gray-200">Drag & Drop Your Photo</p>
          <p className="text-gray-400">or click to browse</p>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>
    </div>
  );
};

export default ImageUploader;