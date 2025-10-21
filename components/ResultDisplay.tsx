
import React from 'react';
import { LoadingSpinner, PlaceholderLookIcon, ErrorIcon } from './icons';

interface ResultDisplayProps {
  isLoading: boolean;
  error: string | null;
  generatedImages: string[];
  elapsedTime: number | null;
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({ isLoading, error, generatedImages, elapsedTime }) => {
  if (isLoading && generatedImages.length === 0) {
    return (
      <div className="w-full h-full flex flex-col justify-center items-center text-center p-4 min-h-[400px]">
        <LoadingSpinner />
        <p className="mt-4 text-lg font-semibold text-stone-700">Styling your look(s)...</p>
        <p className="text-gray-500">This may take a moment.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex flex-col justify-center items-center text-center p-4 bg-red-50 rounded-lg border border-red-200 min-h-[400px]">
        <ErrorIcon />
        <p className="mt-4 text-lg font-semibold text-red-700">Oops! Something went wrong.</p>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (generatedImages.length > 0) {
    return (
      <div className="w-full h-full flex flex-col items-center">
        {isLoading && (
            <div className="mb-4 flex items-center text-stone-600 animate-pulse">
                <LoadingSpinner/>
                <p className="ml-2 font-semibold">Generating more looks...</p>
            </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
            {generatedImages.map((image, index) => (
                <div 
                    key={index} 
                    className="relative w-full animate-fade-in rounded-lg flex flex-col items-center"
                >
                    <h3 className="text-lg font-bold text-stone-700 mb-2">Look #{index + 1}</h3>
                    {/* 
                      This container enforces a 9:16 aspect ratio for a consistent, portrait-oriented preview.
                      - `aspect-[9/16]` sets the aspect ratio.
                      - `bg-stone-200` provides a background for images that don't perfectly match the ratio (letterboxing).
                      - `overflow-hidden` ensures the image stays within the rounded corners.
                    */}
                    <div className="w-full aspect-[9/16] bg-stone-200 rounded-lg shadow-2xl overflow-hidden animate-shimmer">
                        <img
                            src={`data:image/png;base64,${image}`}
                            alt={`Generated look ${index + 1}`}
                            // The image scales to fit completely inside the container while maintaining its original aspect ratio.
                            className="w-full h-full object-contain"
                        />
                    </div>
                    <a 
                        href={`data:image/png;base64,${image}`} 
                        download={`your-new-style-${index + 1}.png`}
                        className="mt-4 py-2 px-6 bg-pink-600 text-white font-semibold rounded-lg shadow-md hover:bg-pink-700 transition-colors text-sm"
                        >
                        Download Look
                    </a>
                </div>
            ))}
        </div>
        {elapsedTime !== null && !isLoading && (
            <p className="text-sm text-gray-500 mt-6">
                ✨ {generatedImages.length} {generatedImages.length > 1 ? 'looks' : 'look'} styled in {elapsedTime.toFixed(2)} seconds
            </p>
        )}
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col justify-center items-center text-center p-4 bg-stone-100 rounded-lg min-h-[400px]">
      <PlaceholderLookIcon />
      <p className="mt-4 text-lg font-semibold text-stone-700">Your styled outfit will appear here</p>
      <p className="text-gray-500">Upload a photo, choose a style, and click "Try It On" to see the magic.</p>
    </div>
  );
};

export default ResultDisplay;
