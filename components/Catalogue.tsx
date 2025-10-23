import React, { useState, useRef, useCallback } from 'react';
import { FilterItem, ClassifyingItem } from '../types';
import { PlusIcon, LoadingSpinner, ErrorIcon, CheckCircleIcon } from './icons';

type CatalogueData = Record<string, FilterItem[]>;
type SelectedItems = Record<string, FilterItem[]>;

interface CatalogueProps {
  catalogue: CatalogueData;
  selectedItems: SelectedItems;
  onSelectedItemsChange: React.Dispatch<React.SetStateAction<SelectedItems>>;
  onStyleUpload: (files: File[]) => void;
  classifyingItems: ClassifyingItem[];
}

const CATEGORIES = [
  { id: 'outfits', name: 'Outfits' },
  { id: 'tops', name: 'Tops' },
  { id: 'bottoms', name: 'Bottoms' },
  { id: 'footwear', name: 'Footwear' },
  { id: 'headwear', name: 'Headwear' },
  { id: 'accessories', name: 'Accessories' },
];

// --- Internal Components (previously in separate files) ---

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const StyleUploader: React.FC<{ onStyleUpload: (files: File[]) => void; classifyingItems: ClassifyingItem[] }> = ({ onStyleUpload, classifyingItems }) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback((files: File[]) => {
    setError(null);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    if (imageFiles.length === 0 && files.length > 0) {
      setError("No valid image files found.");
      return;
    }
    const validSizeFiles = imageFiles.filter(file => file.size <= MAX_FILE_SIZE_BYTES);
    const oversizedCount = imageFiles.length - validSizeFiles.length;
    if (oversizedCount > 0) {
      setError(`${oversizedCount} image(s) exceeded the ${MAX_FILE_SIZE_MB}MB limit.`);
    }
    if (validSizeFiles.length > 0) {
      onStyleUpload(validSizeFiles);
    }
  }, [onStyleUpload]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(Array.from(e.target.files));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [processFiles]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files?.length > 0) processFiles(Array.from(e.dataTransfer.files));
  }, [processFiles]);

  return (
    <div className="mb-4">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg, image/webp" multiple />
      <div onDrop={handleDrop} onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }} onDragLeave={() => setIsDraggingOver(false)} onClick={() => fileInputRef.current?.click()}
        className={`bg-black border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors duration-300 ${isDraggingOver ? 'border-gray-400 bg-gray-800' : 'border-gray-600 hover:border-gray-500'}`} role="button" tabIndex={0}>
        <div className="flex flex-col items-center justify-center">
          <PlusIcon />
          <p className="mt-1 text-sm font-semibold text-gray-300">Add Your Styles</p>
          <p className="text-xs text-gray-500">Drag & drop or click to upload</p>
        </div>
      </div>
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      {classifyingItems.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-bold text-gray-400 mb-2">Classifying new items...</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {classifyingItems.map(item => (
              <div key={item.id} className="relative aspect-[3/4] rounded-md overflow-hidden bg-gray-800">
                <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center p-1">
                  {item.error ? (
                    <><ErrorIcon /><p className="text-red-400 text-xs text-center mt-1">{item.error}</p></>
                  ) : (
                    <><LoadingSpinner /><p className="text-white text-xs text-center mt-2">Classifying...</p></>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const ItemGrid: React.FC<{ filterItems: FilterItem[]; selectedItems: FilterItem[]; onSelectItem: (item: FilterItem) => void; }> = ({ filterItems, selectedItems, onSelectItem }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 min-h-[10rem]">
      {filterItems.map((item) => {
        const isSelected = selectedItems.some(selected => selected.id === item.id);
        return (
          <div key={item.id} onClick={() => onSelectItem(item)} onKeyDown={(e) => e.key === 'Enter' && onSelectItem(item)}
            className={`relative group aspect-[3/4] cursor-pointer rounded-lg overflow-hidden border-4 transition-all duration-200 ${isSelected ? 'border-white scale-105 shadow-2xl' : 'border-transparent hover:border-gray-500'}`}
            role="button" tabIndex={0} aria-pressed={isSelected} aria-label={`Select ${item.name}`}>
            <img src={item.image.url} alt={item.name} className="w-full h-full object-cover" />
            {isSelected && (
              <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center transition-opacity duration-300">
                <CheckCircleIcon className="w-10 h-10 text-white opacity-90" />
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 p-1 bg-black bg-opacity-60">
              <p className="text-white text-xs text-center truncate" title={item.name}>{item.name}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// --- Main Catalogue Component ---

const Catalogue: React.FC<CatalogueProps> = ({ catalogue, selectedItems, onSelectedItemsChange, onStyleUpload, classifyingItems }) => {
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].id);

  const handleSelectItem = (item: FilterItem, category: string) => {
    onSelectedItemsChange(prev => {
        const newSelected = { ...prev };
        Object.keys(newSelected).forEach(key => { newSelected[key] = [...(newSelected[key] || [])]; });

        const categoryItems = newSelected[category];
        const isSelected = categoryItems.some(i => i.id === item.id);

        if (isSelected) {
            newSelected[category] = categoryItems.filter(i => i.id !== item.id);
        } else {
            newSelected[category].push(item);
            if (category === 'outfits') {
                newSelected.tops = [];
                newSelected.bottoms = [];
            } else if (category === 'tops' || category === 'bottoms') {
                newSelected.outfits = [];
            }
        }
        return newSelected;
    });
  };

  return (
    <div className="w-full">
      <StyleUploader onStyleUpload={onStyleUpload} classifyingItems={classifyingItems} />
      
      <div className="border-b border-gray-700 mb-4">
        <nav className="-mb-px flex space-x-2 sm:space-x-4 overflow-x-auto" aria-label="Tabs">
          {CATEGORIES.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`whitespace-nowrap py-3 px-2 sm:px-4 border-b-2 font-medium text-sm transition-colors ${
                activeCategory === category.id ? 'border-white text-white' : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
              }`}
              aria-current={activeCategory === category.id ? 'page' : undefined}>
              {category.name} ({catalogue[category.id]?.length || 0})
            </button>
          ))}
        </nav>
      </div>

      <div>
        {(catalogue[activeCategory] || []).length > 0 ? (
           <ItemGrid
            filterItems={catalogue[activeCategory] || []}
            selectedItems={selectedItems[activeCategory] || []}
            onSelectItem={(item) => handleSelectItem(item, activeCategory)}
          />
        ) : (
          <div className="text-center py-10 px-4 bg-black rounded-lg">
            <p className="text-gray-400">No items in this category yet.</p>
            <p className="text-sm text-gray-500 mt-1">Upload new styles to see them here!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Catalogue;