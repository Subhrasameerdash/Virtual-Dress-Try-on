import React from 'react';
import { LoadingSpinner, PlaceholderLookIcon, ErrorIcon, ArrowLeftIcon } from './icons';

interface ResultStepProps {
  isLoading: boolean;
  error: string | null;
  generatedImages: string[];
  elapsedTime: number | null;
  onTryAgain: () => void;
  onStartOver: () => void;
}

const ResultStep: React.FC<ResultStepProps> = ({ isLoading, error, generatedImages, elapsedTime, onTryAgain, onStartOver }) => {
  const renderContent = () => {
    if (isLoading && generatedImages.length === 0) {
      return (
        <div className="w-full h-full flex flex-col justify-center items-center text-center p-4 min-h-[400px]">
          <LoadingSpinner />
          <p className="mt-4 text-lg font-semibold text-gray-200">Styling your look(s)...</p>
          <p className="text-gray-400">This may take a moment.</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="w-full h-full flex flex-col justify-center items-center text-center p-4 bg-red-900 bg-opacity-30 rounded-lg border border-red-500 min-h-[400px]">
          <ErrorIcon />
          <p className="mt-4 text-lg font-semibold text-red-300">Oops! Something went wrong.</p>
          <p className="text-red-400 mt-1">{error}</p>
        </div>
      );
    }

    if (generatedImages.length > 0) {
      return (
        <div className="w-full h-full flex flex-col items-center">
          {isLoading && (
            <div className="mb-4 flex items-center text-gray-400 animate-pulse">
              <LoadingSpinner />
              <p className="ml-2 font-semibold">Generating more looks...</p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
            {generatedImages.map((image, index) => (
              <div key={index} className="w-full page-enter-active flex flex-col items-center">
                <h3 className="text-lg font-bold text-white mb-2">Look #{index + 1}</h3>
                <div className="w-full aspect-[9/16] bg-black rounded-lg shadow-2xl overflow-hidden animate-shimmer">
                  <img
                    src={`data:image/png;base64,${image}`}
                    alt={`Generated look ${index + 1}`}
                    className="w-full h-full object-contain"
                  />
                </div>
                <a
                  href={`data:image/png;base64,${image}`}
                  download={`your-new-style-${index + 1}.png`}
                  className="mt-4 py-2 px-6 bg-white text-black font-semibold rounded-lg shadow-md hover:bg-gray-300 transition-colors text-sm"
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
      <div className="w-full h-full flex flex-col justify-center items-center text-center p-4 bg-black rounded-lg min-h-[400px]">
        <PlaceholderLookIcon />
        <p className="mt-4 text-lg font-semibold text-gray-200">Your styled outfit will appear here</p>
        <p className="text-gray-400">Something went wrong or the process was interrupted.</p>
      </div>
    );
  };

  return (
    <div className="bg-[#1f1f1f] p-6 rounded-lg shadow-lg">
       <h2 className="text-2xl font-bold text-white mb-4 text-center">4. See Your New Look</h2>
      {renderContent()}
      <div className="mt-6 pt-6 border-t border-gray-700 flex flex-col sm:flex-row gap-4">
        <button
            onClick={onTryAgain}
            className="w-full sm:w-auto flex items-center justify-center py-3 px-6 border-2 border-white text-white font-bold rounded-lg hover:bg-white hover:text-black transition-colors"
        >
            <ArrowLeftIcon className="w-5 h-5 mr-2"/>
            Try Different Styles
        </button>
         <button
            onClick={onStartOver}
            className="flex-grow w-full sm:w-auto flex items-center justify-center py-3 px-6 bg-white text-black font-bold rounded-lg hover:bg-gray-300 transition-colors"
        >
            Start Over
        </button>
      </div>
    </div>
  );
};

export default ResultStep;
