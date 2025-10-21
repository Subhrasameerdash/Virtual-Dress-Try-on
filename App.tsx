import React, { useState, useCallback, useEffect } from 'react';
import { FilterItem, UploadedImage, TryOnItem, ClassifyingItem } from './types';
import { virtualTryOn, classifyClothingItem } from './services/geminiService';
import { loadCatalogueFromStorage, saveCatalogueToStorage, clearAllCataloguesFromStorage } from './utils/storage';
import { readFileAsBase64 } from './utils/imageUtils';
import Catalogue from './components/Catalogue';
import ResultDisplay from './components/ResultDisplay';
import { HeaderIcon, TryOnIcon, CameraIcon, PhotoIcon, CheckCircleIcon, TrashIcon } from './components/icons';
import LiveTryOn from './components/LiveTryOn';
import ImageUploader from './components/ImageUploader';
import { FEMALE_CATALOGUE_DATA, MALE_CATALOGUE_DATA } from './constants';

type CatalogueData = Record<string, FilterItem[]>;
type SelectedItems = Record<string, FilterItem[]>;

// Helper function to generate all outfit combinations from selected items
const generateOutfitCombinations = (selectedItems: SelectedItems): TryOnItem[][] => {
  const outfits: TryOnItem[][] = [];
  const selectedCats = Object.keys(selectedItems).filter(cat => selectedItems[cat].length > 0);

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


const App: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<UploadedImage | null>(null);
  const [capturedImages, setCapturedImages] = useState<UploadedImage[]>([]);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<'camera' | 'upload'>('camera');
  const [elapsedTime, setElapsedTime] = useState<number | null>(null);
  const [gender, setGender] = useState<'female' | 'male'>('female');
  const [classifyingItems, setClassifyingItems] = useState<ClassifyingItem[]>([]);

  // Initialize catalogues from local storage or fall back to mock data
  const [femaleCatalogue, setFemaleCatalogue] = useState<CatalogueData>(
    () => loadCatalogueFromStorage('female') || FEMALE_CATALOGUE_DATA
  );
  const [maleCatalogue, setMaleCatalogue] = useState<CatalogueData>(
    () => loadCatalogueFromStorage('male') || MALE_CATALOGUE_DATA
  );

  // Save catalogues to local storage whenever they change
  useEffect(() => {
    saveCatalogueToStorage('female', femaleCatalogue);
  }, [femaleCatalogue]);

  useEffect(() => {
    saveCatalogueToStorage('male', maleCatalogue);
  }, [maleCatalogue]);

  const initialSelected: SelectedItems = {
    outfits: [], tops: [], bottoms: [], footwear: [], headwear: [], accessories: []
  };
  const [selectedItems, setSelectedItems] = useState<SelectedItems>(initialSelected);

  const handleItemAdd = useCallback((item: FilterItem, category: string) => {
    const setCatalogue = gender === 'female' ? setFemaleCatalogue : setMaleCatalogue;
    setCatalogue(prevCatalogue => ({
      ...prevCatalogue,
      [category]: [...(prevCatalogue[category] || []), item],
    }));
  }, [gender]);

  const handleStyleUpload = useCallback(async (files: File[]) => {
    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

    // Process files sequentially to avoid hitting API rate limits.
    for (const file of files) {
        const tempId = `${Date.now()}-${file.name}`;
        const fileUrl = URL.createObjectURL(file);
        
        // Add to the classifying list immediately for UI feedback.
        setClassifyingItems(prev => [...prev, { id: tempId, name: file.name, url: fileUrl, error: null }]);
        
        try {
            // Await the file reading and classification for each file before proceeding to the next.
            const base64String = await readFileAsBase64(file);
            const category = await classifyClothingItem(base64String, file.type);
            
            const uploadedImage: UploadedImage = {
                base64: base64String, mimeType: file.type, url: fileUrl, name: file.name,
            };
            const newItem: FilterItem = {
                id: tempId,
                name: file.name.split('.').slice(0, -1).join('.') || 'Style Item',
                image: uploadedImage,
            };
            handleItemAdd(newItem, category);
            
            // Remove the item from the classifying list upon successful completion.
            setClassifyingItems(prev => prev.filter(item => item.id !== tempId));

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Classification failed.";
            console.error(`Error processing file ${file.name}:`, err);
            
            // Update the item in the classifying list with an error message to inform the user.
            setClassifyingItems(prev => 
                prev.map(item => 
                    item.id === tempId ? { ...item, error: errorMessage } : item
                )
            );
        }

        // The free tier for Gemini Flash is often limited to 15 requests per minute.
        // This means we must wait at least 4 seconds between calls (60s / 15 = 4s).
        // We use a 4.5-second delay to be safe.
        await delay(4500); // 4.5-second delay
    }
  }, [handleItemAdd]);

  const handleImageAdd = (image: UploadedImage) => {
    setCapturedImages(prev => [image, ...prev]);
    setSelectedImage(image);
    setGeneratedImages([]);
    setError(null);
  };
  
  const handleSelectImage = (image: UploadedImage) => {
    setSelectedImage(image);
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset the session? This will remove all captured photos and clear your uploaded styles from browser storage.")) {
      capturedImages.forEach(img => {
        if (img.url.startsWith('blob:')) URL.revokeObjectURL(img.url);
      });
      setCapturedImages([]);
      setSelectedImage(null);
      setGeneratedImages([]);
      setError(null);
      setElapsedTime(null);
      setClassifyingItems([]);
      setSelectedItems(initialSelected);
      // Clear storage and reset catalogues to default
      clearAllCataloguesFromStorage();
      setFemaleCatalogue(FEMALE_CATALOGUE_DATA);
      setMaleCatalogue(MALE_CATALOGUE_DATA);
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

    const hasPlaceholderItem = outfitsToTry.flat().some(item => !item.image.base64);
    if (hasPlaceholderItem) {
        setError("A selected style is a placeholder. Please upload real clothing items to use the try-on feature.");
        return;
    }

    setIsLoading(true);
    setGeneratedImages([]);
    setError(null);
    setElapsedTime(null);
    const startTime = performance.now();
    
    const results: string[] = [];
    for (const outfit of outfitsToTry) {
        try {
            const result = await virtualTryOn(
                selectedImage.base64,
                selectedImage.mimeType,
                outfit,
                gender
            );
            if(result) {
                results.push(result);
                setGeneratedImages([...results]); // Show results as they arrive
            }
        } catch (err) {
            const outfitName = outfit.map(i => i.name).join(', ');
            setError(`Failed to generate look for: ${outfitName}. Reason: ${err instanceof Error ? err.message : 'Unknown error'}`);
            setIsLoading(false);
            return; // Stop on first error
        }
    }

    const endTime = performance.now();
    setElapsedTime((endTime - startTime) / 1000);
    setIsLoading(false);
  };
  
  const currentCatalogue = gender === 'female' ? femaleCatalogue : maleCatalogue;
  const itemsToTryOn = Object.values(selectedItems).flat();

  return (
    <div className="bg-stone-50 min-h-screen text-stone-800">
      <header className="bg-white shadow-sm p-4 flex items-center justify-center">
        <HeaderIcon />
        <h1 className="text-3xl font-bold text-stone-800 ml-3">Style Studio</h1>
      </header>
      <main className="p-4 md:p-8 max-w-screen-2xl mx-auto">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-md h-full">
                <h2 className="text-2xl font-bold text-stone-700 mb-4">2. Choose Your Style</h2>
                <div className="flex justify-center mb-4 bg-gray-100 rounded-lg p-1">
                   <button onClick={() => handleGenderChange('female')} className={`w-1/2 py-2 px-4 rounded-md text-sm font-semibold transition-colors ${gender === 'female' ? 'bg-pink-600 text-white shadow' : 'text-gray-600'}`}>Female Styles</button>
                   <button onClick={() => handleGenderChange('male')} className={`w-1/2 py-2 px-4 rounded-md text-sm font-semibold transition-colors ${gender === 'male' ? 'bg-pink-600 text-white shadow' : 'text-gray-600'}`}>Male Styles</button>
                </div>
                {itemsToTryOn.length > 0 && (
                  <div className="bg-pink-50 border-l-4 border-pink-400 p-4 rounded-md mb-4 shadow-sm animate-fade-in">
                      <h3 className="text-lg font-bold text-stone-700 mb-3">Your Selections</h3>
                      <div className="flex items-center gap-3 flex-wrap">
                          {/* FIX: Add explicit type to 'item' to resolve type inference issue. */}
                          {itemsToTryOn.map((item: FilterItem) => (
                              <div key={item.id} className="relative w-16 h-20 rounded-md overflow-hidden border-2 border-pink-300 bg-white">
                                  <img src={item.image.url} alt={item.name} className="w-full h-full object-cover" />
                                  <div className="absolute bottom-0 left-0 right-0 p-0.5 bg-black bg-opacity-50">
                                      <p className="text-white text-[10px] text-center truncate">{item.name}</p>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
                )}
                 <Catalogue catalogue={currentCatalogue} selectedItems={selectedItems} onSelectedItemsChange={setSelectedItems} onStyleUpload={handleStyleUpload} classifyingItems={classifyingItems}/>
            </div>
          </div>
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-2xl font-bold text-stone-700 mb-4">1. Take or Upload Photos</h2>
              <div className="flex justify-center mb-4 bg-gray-100 rounded-lg p-1">
                 <button onClick={() => setInputMode('camera')} className={`w-1/2 py-2 px-4 rounded-md text-sm font-semibold transition-colors ${inputMode === 'camera' ? 'bg-pink-600 text-white shadow' : 'text-gray-600'}`}><CameraIcon className="inline-block w-5 h-5 mr-2"/>Live Camera</button>
                 <button onClick={() => setInputMode('upload')} className={`w-1/2 py-2 px-4 rounded-md text-sm font-semibold transition-colors ${inputMode === 'upload' ? 'bg-pink-600 text-white shadow' : 'text-gray-600'}`}><PhotoIcon className="inline-block w-5 h-5 mr-2"/>Upload Photo</button>
              </div>
              <div className="h-[75vh] max-h-[800px] bg-stone-100 rounded-lg flex items-center justify-center">
                {inputMode === 'camera' ? (<LiveTryOn onImageAdd={handleImageAdd} />) : (<ImageUploader onImageAdd={handleImageAdd} />)}
              </div>
            </div>
          </div>
          <div className="space-y-6 flex flex-col">
            <div className="bg-white p-6 rounded-lg shadow-md flex-grow">
                <h2 className="text-2xl font-bold text-stone-700 mb-4">3. Select a Picture</h2>
                {capturedImages.length === 0 ? (
                    <div className="bg-stone-100 rounded-lg p-6 text-center text-stone-500 h-full flex flex-col justify-center">
                        <p>Your captured and uploaded pictures will appear here.</p>
                        <p className="text-sm mt-1">Take a picture or upload one to get started.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-2 max-h-[45vh] overflow-y-auto p-2 bg-stone-100 rounded-lg">
                        {capturedImages.map((image) => (
                            <div key={image.url} onClick={() => handleSelectImage(image)} className={`relative aspect-square cursor-pointer rounded-md overflow-hidden border-4 transition-all duration-200 ${selectedImage?.url === image.url ? 'border-pink-500 scale-105 shadow-lg' : 'border-transparent hover:border-pink-300'}`} role="button" aria-pressed={selectedImage?.url === image.url} aria-label={`Select image ${image.name}`}>
                                <img src={image.url} alt={image.name} className="w-full h-full object-cover" />
                                {selectedImage?.url === image.url && (<div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center"><CheckCircleIcon className="w-8 h-8 text-white opacity-90" /></div>)}
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <button onClick={handleApplyFilter} disabled={isLoading || !selectedImage || itemsToTryOn.length === 0} className="w-full flex items-center justify-center py-4 px-6 bg-pink-600 text-white font-bold text-xl rounded-lg shadow-md hover:bg-pink-700 transition-all duration-300 transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:scale-100">
              {isLoading ? (<><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Styling Your Look...</>) : (<><TryOnIcon className="w-7 h-7 mr-3" />Try It On</>)}
            </button>
             <button onClick={handleReset} className="w-full flex items-center justify-center py-2 px-4 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed">
                <TrashIcon />
                <span className="ml-2">Reset Session & Styles</span>
            </button>
          </div>
        </div>
        <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-stone-700 mb-4">4. See Your New Look</h2>
            <ResultDisplay isLoading={isLoading} error={error} generatedImages={generatedImages} elapsedTime={elapsedTime} />
        </div>
      </main>
    </div>
  );
};

export default App;