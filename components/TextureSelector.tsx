import React from 'react';
import Catalogue from './Catalogue';
import { FilterItem, ClassifyingItem } from '../types';
import { ArrowLeftIcon, ArrowRightIcon } from './icons';

type CatalogueData = Record<string, FilterItem[]>;
type SelectedItems = Record<string, FilterItem[]>;

interface StyleStepProps {
  gender: 'female' | 'male';
  onGenderChange: (gender: 'female' | 'male') => void;
  catalogue: CatalogueData;
  selectedItems: SelectedItems;
  onSelectedItemsChange: React.Dispatch<React.SetStateAction<SelectedItems>>;
  onStyleUpload: (files: File[]) => void;
  classifyingItems: ClassifyingItem[];
  onNext: () => void;
  onBack: () => void;
  canProceed: boolean;
}

const StyleStep: React.FC<StyleStepProps> = ({
  gender,
  onGenderChange,
  catalogue,
  selectedItems,
  onSelectedItemsChange,
  onStyleUpload,
  classifyingItems,
  onNext,
  onBack,
  canProceed
}) => {
  const itemsToTryOn = Object.values(selectedItems).flat();
  return (
    <div className="bg-[#1f1f1f] p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-white mb-4 text-center">2. Choose Your Style</h2>
      <div className="flex justify-center mb-4 bg-black rounded-lg p-1">
        <button
          onClick={() => onGenderChange('female')}
          className={`w-1/2 py-2 px-4 rounded-md text-sm font-semibold transition-colors ${
            gender === 'female' ? 'bg-white text-black shadow' : 'text-gray-400 hover:bg-gray-800'
          }`}
        >
          Female Styles
        </button>
        <button
          onClick={() => onGenderChange('male')}
          className={`w-1/2 py-2 px-4 rounded-md text-sm font-semibold transition-colors ${
            gender === 'male' ? 'bg-white text-black shadow' : 'text-gray-400 hover:bg-gray-800'
          }`}
        >
          Male Styles
        </button>
      </div>

      {itemsToTryOn.length > 0 && (
        <div className="bg-gray-800 border-l-4 border-gray-500 p-4 rounded-md mb-4 shadow-sm page-enter-active">
          <h3 className="text-lg font-bold text-white mb-3">Your Selections</h3>
          <div className="flex items-center gap-3 flex-wrap">
            {itemsToTryOn.map((item: FilterItem) => (
              <div key={item.id} className="relative w-16 h-20 rounded-md overflow-hidden border-2 border-gray-600 bg-black">
                <img src={item.image.url} alt={item.name} className="w-full h-full object-cover" />
                <div className="absolute bottom-0 left-0 right-0 p-0.5 bg-black bg-opacity-60">
                  <p className="text-white text-[10px] text-center truncate">{item.name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Catalogue
        catalogue={catalogue}
        selectedItems={selectedItems}
        onSelectedItemsChange={onSelectedItemsChange}
        onStyleUpload={onStyleUpload}
        classifyingItems={classifyingItems}
      />
      
       <div className="mt-6 flex flex-col sm:flex-row gap-4">
        <button
          onClick={onBack}
          className="w-full sm:w-auto flex items-center justify-center py-3 px-6 border-2 border-white text-white font-bold rounded-lg hover:bg-white hover:text-black transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5 mr-2" />
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!canProceed}
          className="flex-grow flex items-center justify-center py-3 px-6 bg-white text-black font-bold text-xl rounded-lg shadow-md hover:bg-gray-200 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
        >
          Next
          <ArrowRightIcon className="w-5 h-5 ml-2" />
        </button>
      </div>
    </div>
  );
};

export default StyleStep;
