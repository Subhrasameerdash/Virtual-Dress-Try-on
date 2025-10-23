import React, { useState } from 'react';
import { UploadedImage } from '../types';
import LiveTryOn from './LiveTryOn';
import ImageUploader from './ImageUploader';
import { CameraIcon, PhotoIcon } from './icons';

interface PhotoStepProps {
  onImageAdd: (image: UploadedImage) => void;
}

const PhotoStep: React.FC<PhotoStepProps> = ({ onImageAdd }) => {
  const [inputMode, setInputMode] = useState<'camera' | 'upload'>('camera');

  return (
    <div className="bg-[#1f1f1f] p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-white mb-4 text-center">1. Take or Upload Photo</h2>
      <div className="flex justify-center mb-4 bg-black rounded-lg p-1">
        <button
          onClick={() => setInputMode('camera')}
          className={`w-1/2 py-2 px-4 rounded-md text-sm font-semibold transition-colors ${
            inputMode === 'camera' ? 'bg-white text-black shadow' : 'text-gray-400 hover:bg-gray-800'
          }`}
        >
          <CameraIcon className="inline-block w-5 h-5 mr-2" />
          Live Camera
        </button>
        <button
          onClick={() => setInputMode('upload')}
          className={`w-1/2 py-2 px-4 rounded-md text-sm font-semibold transition-colors ${
            inputMode === 'upload' ? 'bg-white text-black shadow' : 'text-gray-400 hover:bg-gray-800'
          }`}
        >
          <PhotoIcon className="inline-block w-5 h-5 mr-2" />
          Upload Photo
        </button>
      </div>
      <div className="h-[65vh] max-h-[700px] bg-black rounded-lg flex items-center justify-center">
        {inputMode === 'camera' ? (
          <LiveTryOn onImageAdd={onImageAdd} />
        ) : (
          <ImageUploader onImageAdd={onImageAdd} />
        )}
      </div>
    </div>
  );
};

export default PhotoStep;
