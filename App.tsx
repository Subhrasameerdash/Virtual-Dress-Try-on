import React, { useState, useCallback, useEffect } from 'react';
import { FilterItem, UploadedImage, TryOnItem, ClassifyingItem } from './types';
import { virtualTryOn, classifyClothingItem } from './services/geminiService';
import { loadCatalogueFromStorage, saveCatalogueToStorage, clearAllCataloguesFromStorage } from './utils/storage';
import { readFileAsBase64 } from './utils/imageUtils';
import { FEMALE_CATALOGUE_DATA, MALE_CATALOGUE_DATA } from './constants';
import { HeaderIcon, TrashIcon, CheckCircleIcon, ArrowLeftIcon, ArrowRightIcon } from './components/icons';

// Import the new page components
import PhotoStep from './components/BlouseColorPicker'; // Repurposed for PhotoStep
import StyleStep from './components/TextureSelector'; // Repurposed for StyleStep
import SelectStep from './components/SareeSelector'; // Repurposed for SelectStep
import ResultStep from './components/ResultDisplay'; // Repurposed for ResultStep

type CatalogueData = Record<string, FilterItem[]>;
type SelectedItems = Record<string, FilterItem[]>;

// Helper function to generate all outfit combinations from selected items
const generateOutfitCombinations = (selectedItems: SelectedItems): TryOnItem[][] => {
  const outfits: TryOnItem[][] = [];
  
  const cartesian = <T,>(...arrays: T[][]): T[][] => {
    const nonEmptyArrays = arrays.filter(arr => arr.length > 0);
    if (nonEmptyArrays.length === 0) return [[]];
    return nonEmptyArrays.reduce<T[][]>(
      (acc, val) => acc.flatMap(d => val.map(e => [...d, e])),
      [[]]
    );
  };
  
  const toTryOnItem = (item: FilterItem, category: string): TryOnItem => ({...item, category});

  const baseItems: TryOnItem[][] = [];
  if (selectedItems.outfits.length > 0) {
      baseItems.push(...selectedItems.outfits.map(item => [toTryOnItem(item, 'outfits')]));
  } else {
      const tops = selectedItems.tops.map(item => toTryOnItem(item, 'tops'));
      const bottoms = selectedItems.bottoms.map(item => toTryOnItem(item, 'bottoms'));
      cartesian(tops, bottoms).forEach(combo => baseItems.push(combo));
  }

  const footwear = selectedItems.footwear.map(item => toTryOnItem(item, 'footwear'));
  const headwear = selectedItems.headwear.map(item => toTryOnItem(item, 'headwear'));
  const accessories = selectedItems.accessories.map(item => toTryOnItem(item, 'accessories'));

  const accessoryCombos = cartesian(footwear, headwear, accessories);

  if (baseItems.length === 0) {
      return accessoryCombos.filter(combo => combo.length > 0);
  }

  baseItems.forEach(base => {
      accessoryCombos.forEach(combo => {
          outfits.push([...base, ...combo]);
      });
  });

  return outfits;
};

const Stepper: React.FC<{ currentStep: number }> = ({ currentStep }) => {
  const steps = ['Photo', 'Style', 'Select', 'Result'];
  return (
    <div className="flex items-center justify-center space-x-4 md:space-x-8 p-4 mb-4 md:mb-8">
      {steps.map((name, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === currentStep;
        const isCompleted = stepNumber < currentStep;
        return (
          <React.Fragment key={stepNumber}>
            <div className="flex items-center space-x-2">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full text-lg font-bold transition-all duration-300 ${
                  isActive ? 'bg-white text-black' : isCompleted ? 'bg-gray-600 text-white' : 'border-2 border-gray-600 text-gray-400'
                }`}
              >
                {isCompleted ? <CheckCircleIcon className="w-5 h-5" /> : stepNumber}
              </div>
              <span className={`hidden md:block font-semibold ${isActive ? 'text-white' : 'text-gray-400'}`}>{name}</span>
            </div>
            {index < steps.length - 1 && (
              <div className={`flex-1 h-1 rounded ${isCompleted ? 'bg-gray-600' : 'bg-gray-800'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

const App: React.FC = () => {
  const [step, setStep] = useState(1);
  const [selectedImage, setSelectedImage] = useState<UploadedImage | null>(null);
  const [capturedImages, setCapturedImages] = useState<UploadedImage[]>([]);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number | null>(null);
  const [gender, setGender] = useState<'female' | 'male'>('female');
  const [classifyingItems, setClassifyingItems] = useState<ClassifyingItem[]>([]);

  const [femaleCatalogue, setFemaleCatalogue] = useState<CatalogueData>(() => loadCatalogueFromStorage('female') || FEMALE_CATALOGUE_DATA);
  const [maleCatalogue, setMaleCatalogue] = useState<CatalogueData>(() => loadCatalogueFromStorage('male') || MALE_CATALOGUE_DATA);

  const initialSelected: SelectedItems = { outfits: [], tops: [], bottoms: [], footwear: [], headwear: [], accessories: [] };
  const [selectedItems, setSelectedItems] = useState<SelectedItems>(initialSelected);

  // --- PERSISTENCE LOGIC ---
  useEffect(() => {
    // Load state from sessionStorage on initial mount
    const savedStep = sessionStorage.getItem('vto_step');
    const savedCaptured = sessionStorage.getItem('vto_capturedImages');
    const savedSelected = sessionStorage.getItem('vto_selectedImage');
    const savedGenerated = sessionStorage.getItem('vto_generatedImages');
    const savedGender = sessionStorage.getItem('vto_gender');

    if (savedStep) setStep(JSON.parse(savedStep));
    if (savedCaptured) setCapturedImages(JSON.parse(savedCaptured));
    if (savedSelected) setSelectedImage(JSON.parse(savedSelected));
    if (savedGenerated) setGeneratedImages(JSON.parse(savedGenerated));
    if (savedGender) setGender(JSON.parse(savedGender));
  }, []);

  // Save state to sessionStorage whenever it changes
  useEffect(() => { sessionStorage.setItem('vto_step', JSON.stringify(step)); }, [step]);
  useEffect(() => { sessionStorage.setItem('vto_capturedImages', JSON.stringify(capturedImages)); }, [capturedImages]);
  useEffect(() => { sessionStorage.setItem('vto_selectedImage', JSON.stringify(selectedImage)); }, [selectedImage]);
  useEffect(() => { sessionStorage.setItem('vto_generatedImages', JSON.stringify(generatedImages)); }, [generatedImages]);
  useEffect(() => { sessionStorage.setItem('vto_gender', JSON.stringify(gender)); }, [gender]);

  // --- CATALOGUE MANAGEMENT ---
  useEffect(() => { saveCatalogueToStorage('female', femaleCatalogue); }, [femaleCatalogue]);
  useEffect(() => { saveCatalogueToStorage('male', maleCatalogue); }, [maleCatalogue]);

  const handleItemAdd = useCallback((item: FilterItem, category: string) => {
    const setCatalogue = gender === 'female' ? setFemaleCatalogue : setMaleCatalogue;
    setCatalogue(prev => ({ ...prev, [category]: [...(prev[category] || []), item] }));
  }, [gender]);

  const handleStyleUpload = useCallback(async (files: File[]) => {
    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
    for (const file of files) {
      const tempId = `${Date.now()}-${file.name}`;
      const fileUrl = URL.createObjectURL(file);
      setClassifyingItems(prev => [...prev, { id: tempId, name: file.name, url: fileUrl, error: null }]);
      try {
        const base64String = await readFileAsBase64(file);
        const category = await classifyClothingItem(base64String, file.type);
        const newItem: FilterItem = {
          id: tempId, name: file.name.split('.').slice(0, -1).join('.') || 'Style Item',
          image: { base64: base64String, mimeType: file.type, url: fileUrl, name: file.name }
        };
        handleItemAdd(newItem, category);
        setClassifyingItems(prev => prev.filter(item => item.id !== tempId));
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Classification failed.";
        setClassifyingItems(prev => prev.map(item => item.id === tempId ? { ...item, error: errorMessage } : item));
      }
      await delay(4500); // Respect API rate limits
    }
  }, [handleItemAdd]);

  const handleImageAdd = (image: UploadedImage) => {
    setCapturedImages(prev => [image, ...prev]);
    if (!selectedImage) setSelectedImage(image); // Auto-select the first image added
    setStep(2); // Go to next step
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset the session? This will remove all photos and clear your uploaded styles from browser storage.")) {
      sessionStorage.clear();
      clearAllCataloguesFromStorage();
      setCapturedImages([]);
      setSelectedImage(null);
      setGeneratedImages([]);
      setError(null);
      setElapsedTime(null);
      setClassifyingItems([]);
      setSelectedItems(initialSelected);
      setFemaleCatalogue(FEMALE_CATALOGUE_DATA);
      setMaleCatalogue(MALE_CATALOGUE_DATA);
      setStep(1);
    }
  };

  const handleGenderChange = (newGender: 'female' | 'male') => {
    if (gender !== newGender) {
      setGender(newGender);
      setSelectedItems(initialSelected);
      setError(null);
    }
  };

  const handleApplyFilter = async () => {
    if (!selectedImage) {
      setError("Please select a photo first.");
      return;
    }
    const outfitsToTry = generateOutfitCombinations(selectedItems);
    if (outfitsToTry.length === 0) {
      setError("Please select at least one clothing item.");
      return;
    }
    if (outfitsToTry.flat().some(item => !item.image.base64)) {
      setError("A selected style is a placeholder. Please upload real clothing items.");
      return;
    }

    setStep(4); // Move to results page
    setIsLoading(true);
    setGeneratedImages([]);
    setError(null);
    setElapsedTime(null);
    const startTime = performance.now();
    
    const results: string[] = [];
    for (const outfit of outfitsToTry) {
      try {
        const result = await virtualTryOn(selectedImage.base64, selectedImage.mimeType, outfit, gender);
        if (result) {
          results.push(result);
          setGeneratedImages(prev => [...prev, result]);
        }
      } catch (err) {
        const outfitName = outfit.map(i => i.name).join(', ');
        setError(`Failed to generate look for: ${outfitName}. Reason: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setIsLoading(false);
        return;
      }
    }

    const endTime = performance.now();
    setElapsedTime((endTime - startTime) / 1000);
    setIsLoading(false);
  };
  
  const currentCatalogue = gender === 'female' ? femaleCatalogue : maleCatalogue;

  return (
    <div className="bg-[#121212] min-h-screen text-gray-200">
      <header className="bg-[#1f1f1f] border-b border-gray-700 p-4 flex items-center justify-between">
        <div className="flex items-center">
            <HeaderIcon />
            <h1 className="text-2xl font-bold text-white ml-3">Style Studio</h1>
        </div>
        <button onClick={handleReset} className="flex items-center py-2 px-4 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 transition-colors text-sm">
            <TrashIcon />
            <span className="ml-2 hidden sm:inline">Reset Session</span>
        </button>
      </header>
      <main className="p-4 md:p-8 max-w-screen-lg mx-auto">
        <Stepper currentStep={step} />
        <div className="page-enter-active">
          {step === 1 && <PhotoStep onImageAdd={handleImageAdd} />}
          {step === 2 && (
            <StyleStep
              gender={gender}
              onGenderChange={handleGenderChange}
              catalogue={currentCatalogue}
              selectedItems={selectedItems}
              onSelectedItemsChange={setSelectedItems}
              onStyleUpload={handleStyleUpload}
              classifyingItems={classifyingItems}
              onNext={() => setStep(3)}
              onBack={() => setStep(1)}
              canProceed={Object.values(selectedItems).flat().length > 0}
            />
          )}
          {step === 3 && (
            <SelectStep
              capturedImages={capturedImages}
              selectedImage={selectedImage}
              onSelectImage={setSelectedImage}
              onTryOn={handleApplyFilter}
              onBack={() => setStep(2)}
            />
          )}
          {step === 4 && (
            <ResultStep
              isLoading={isLoading}
              error={error}
              generatedImages={generatedImages}
              elapsedTime={elapsedTime}
              onTryAgain={() => {
                setError(null);
                setGeneratedImages([]);
                setStep(2);
              }}
              onStartOver={handleReset}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
