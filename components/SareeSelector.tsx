import React from 'react';
import { UploadedImage } from '../types';
import { CheckCircleIcon, ArrowLeftIcon, TryOnIcon } from './icons';

interface SelectStepProps {
  capturedImages: UploadedImage[];
  selectedImage: UploadedImage | null;
  onSelectImage: (image: UploadedImage) => void;
  onTryOn: () => void;
  onBack: () => void;
}

const SelectStep: React.FC<SelectStepProps> = ({
  capturedImages,
  selectedImage,
  onSelectImage,
  onTryOn,
  onBack,
}) => {
  return (
    <div className="bg-[#1f1f1f] p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-white mb-4 text-center">3. Select a Picture</h2>
      
      {capturedImages.length === 0 ? (
        <div className="bg-black rounded-lg p-6 text-center text-gray-400 h-full flex flex-col justify-center min-h-[300px]">
          <p>No pictures found.</p>
          <p className="text-sm mt-1">Go back to add a photo.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto p-2 bg-black rounded-lg">
          {capturedImages.map((image) => (
            <div
              key={image.url}
              onClick={() => onSelectImage(image)}
              className={`relative aspect-square cursor-pointer rounded-md overflow-hidden border-4 transition-all duration-200 ${
                selectedImage?.url === image.url ? 'border-white scale-105 shadow-2xl' : 'border-transparent hover:border-gray-500'
              }`}
              role="button"
              aria-pressed={selectedImage?.url === image.url}
              aria-label={`Select image ${image.name}`}
            >
              <img src={image.url} alt={image.name} className="w-full h-full object-cover" />
              {selectedImage?.url === image.url && (
                <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
                  <CheckCircleIcon className="w-10 h-10 text-white opacity-90" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-6 flex flex-col sm:flex-row gap-4">
        <button
          onClick={onBack}
          className="w-full sm:w-auto flex items-center justify-center py-3 px-6 border-2 border-white text-white font-bold rounded-lg hover:bg-white hover:text-black transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5 mr-2" />
          Back
        </button>
        <button
          onClick={onTryOn}
          disabled={!selectedImage}
          className="flex-grow flex items-center justify-center py-3 px-6 bg-white text-black font-bold text-xl rounded-lg shadow-md hover:bg-gray-200 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
        >
          <TryOnIcon className="w-7 h-7 mr-3" />
          Try It On
        </button>
      </div>
    </div>
  );
};

export default SelectStep;
