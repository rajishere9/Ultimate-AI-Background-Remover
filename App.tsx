
import React, { useState, useEffect, useCallback } from 'react';
import JSZip from 'jszip';
import { AppState, ImageStatus } from './types';
import type { ImageData, ProcessedImageData } from './types';
import { getGreenScreenImage } from './services/geminiService';
import ImageUploader from './components/ImageUploader';
import Spinner from './components/Spinner';
import { DownloadIcon, TrashIcon, RetryIcon, SparklesIcon, EyeIcon, XMarkIcon } from './components/icons';

const removeGreenScreen = (imageDataUrl: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Could not get 2d context from canvas'));
      }
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      const keyR = data[0];
      const keyG = data[1];
      const keyB = data[2];

      const tolerance = 80;
      const softness = 30; 

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        const distance = Math.sqrt(
            Math.pow(r - keyR, 2) +
            Math.pow(g - keyG, 2) +
            Math.pow(b - keyB, 2)
        );

        let newAlpha = 255;
        const lowerBound = tolerance - softness;

        if (distance < lowerBound) {
          newAlpha = 0;
        } else if (distance < tolerance) {
          newAlpha = ((distance - lowerBound) / softness) * 255;
        }
        
        data[i + 3] = newAlpha;
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = (err) => {
        reject(new Error('Failed to load image for client-side processing.'));
    };
    img.src = imageDataUrl;
  });
};

interface ImageCardProps {
  image: ProcessedImageData;
  onDownload: (id: string) => void;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
}

const ImageCard: React.FC<ImageCardProps> = ({ image, onDownload, onRetry, onRemove }) => {
  const [showOriginal, setShowOriginal] = useState(false);

  return (
    <div className="group relative flex flex-col bg-gray-800/40 backdrop-blur-md border border-gray-700/50 rounded-3xl overflow-hidden transition-all duration-300 hover:bg-gray-800/60 hover:shadow-2xl hover:shadow-purple-500/10 hover:-translate-y-1">
      
      {/* Remove Button */}
      <button
        onClick={() => onRemove(image.id)}
        className="absolute top-3 right-3 z-30 p-1.5 rounded-full bg-black/30 hover:bg-red-500/80 text-white/70 hover:text-white transition-all border border-white/10 opacity-0 group-hover:opacity-100"
        title="Remove from list"
      >
        <XMarkIcon className="w-4 h-4" />
      </button>

      {/* Image Container */}
      <div className="relative w-full aspect-[4/5] bg-[url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAC1JREFUOE9jfPbs2X8GPEBTIBvCRgYGNlAXwY0kKMEE2EWwA/4KAnwAASwK8LoACwA65wGL9Fk67gAAAABJRU5ErkJggg==)] bg-center overflow-hidden">
        
        {/* Image Display Logic */}
        <div className="w-full h-full flex items-center justify-center p-4">
             {image.status === ImageStatus.COMPLETED && image.processedUrl ? (
                 <img 
                    src={showOriginal ? image.base64 : image.processedUrl} 
                    alt={image.name} 
                    className="max-w-full max-h-full object-contain drop-shadow-xl transition-opacity duration-200" 
                 />
             ) : (
                 <img 
                    src={image.base64} 
                    alt={image.name} 
                    className={`max-w-full max-h-full object-contain transition-all duration-500 ${image.status === ImageStatus.PROCESSING ? 'opacity-40 scale-95 blur-sm' : 'opacity-80'}`} 
                 />
             )}
        </div>

        {/* Status Overlays */}
        {image.status === ImageStatus.PROCESSING && (
           <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-black/30 backdrop-blur-sm">
             <Spinner />
             <p className="text-sm font-medium text-purple-200 mt-4 animate-pulse">Removing Background...</p>
             {image.error && (
               <p className="text-xs text-yellow-400 mt-2 px-4 text-center bg-black/50 rounded py-1">
                 {image.error}
               </p>
             )}
           </div>
        )}

        {image.status === ImageStatus.ERROR && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 z-10 p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-900/30 flex items-center justify-center mb-3 border border-red-500/30">
                <span className="text-2xl">✕</span>
            </div>
            <p className="font-semibold text-red-200 mb-1">Processing Failed</p>
            <p className="text-xs text-red-400/80 mb-4 line-clamp-3">{image.error}</p>
            <button
              onClick={() => onRetry(image.id)}
              className="flex items-center px-4 py-2 bg-red-600/20 text-red-300 rounded-lg hover:bg-red-600/40 transition-colors border border-red-500/30 text-sm font-medium"
            >
              <RetryIcon className="w-4 h-4 mr-2" />
              Try Again
            </button>
          </div>
        )}

        {/* Compare Toggle (Only when completed) */}
        {image.status === ImageStatus.COMPLETED && (
             <button
                className="absolute bottom-3 right-3 z-20 p-2 rounded-full bg-black/40 backdrop-blur-md text-white/70 hover:text-white hover:bg-black/60 transition-all border border-white/10"
                onMouseDown={() => setShowOriginal(true)}
                onMouseUp={() => setShowOriginal(false)}
                onMouseLeave={() => setShowOriginal(false)}
                onTouchStart={() => setShowOriginal(true)}
                onTouchEnd={() => setShowOriginal(false)}
                title="Hold to see original"
             >
                <EyeIcon className="w-5 h-5" />
             </button>
        )}

        {/* Badge */}
        {image.status === ImageStatus.COMPLETED && !showOriginal && (
            <div className="absolute top-3 left-3 z-20 px-2.5 py-1 rounded-full bg-green-500/20 backdrop-blur-md border border-green-500/30">
                <span className="text-xs font-bold text-green-300">PROCESSED</span>
            </div>
        )}
        {showOriginal && (
            <div className="absolute top-3 left-3 z-20 px-2.5 py-1 rounded-full bg-blue-500/20 backdrop-blur-md border border-blue-500/30">
                <span className="text-xs font-bold text-blue-300">ORIGINAL</span>
            </div>
        )}
        
        {/* Queued Badge */}
        {image.status === ImageStatus.QUEUED && (
            <div className="absolute top-3 left-3 z-20 px-2.5 py-1 rounded-full bg-gray-500/20 backdrop-blur-md border border-gray-500/30">
                <span className="text-xs font-bold text-gray-300">READY</span>
            </div>
        )}
      </div>

      {/* Footer Controls */}
      <div className="p-4 border-t border-gray-700/50 bg-gray-900/30 flex items-center justify-between">
        <div className="flex-1 min-w-0 mr-2">
            <p className="text-sm font-medium text-gray-200 truncate">{image.name}</p>
            <p className="text-xs text-gray-500 truncate mt-0.5">
                {image.status === ImageStatus.COMPLETED ? 'Background Removed' : image.status === ImageStatus.QUEUED ? 'Ready to process' : 'Processing'}
            </p>
        </div>

        {image.status === ImageStatus.COMPLETED && (
            <div className="flex items-center space-x-1">
                <button 
                    onClick={() => onRetry(image.id)} 
                    className="p-2 rounded-lg text-gray-400 hover:text-yellow-400 hover:bg-yellow-400/10 transition-colors" 
                    title="Redo"
                >
                    <RetryIcon className="w-5 h-5" />
                </button>
                <button 
                    onClick={() => onDownload(image.id)} 
                    className="p-2 rounded-lg text-purple-400 hover:text-white hover:bg-purple-600 transition-all shadow-lg shadow-purple-900/20" 
                    title="Download"
                >
                    <DownloadIcon className="w-5 h-5" />
                </button>
            </div>
        )}
      </div>
    </div>
  );
};


const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [images, setImages] = useState<ProcessedImageData[]>([]);

  const handleImagesSelect = (files: FileList) => {
    const imageFiles = Array.from(files);
    const newImages: ProcessedImageData[] = [];

    imageFiles.forEach(file => {
      const reader = new FileReader();
      const id = `${file.name}-${file.lastModified}-${Math.random()}`;
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        if (base64) {
          newImages.push({
            id,
            base64,
            mimeType: file.type,
            name: file.name,
            status: ImageStatus.QUEUED,
            processedUrl: null,
            error: null,
          });

          if(newImages.length === imageFiles.length) {
            setImages(prev => [...prev, ...newImages]);
            // We do NOT automatically set processing state here to allow preview.
            // If we are already processing, the useEffect will pick them up.
            // If we are IDLE, the user must click Start.
            
            // Optional: Pause processing to let user review new batch if desired? 
            // For now, we'll set to IDLE so user has to confirm even if they add more.
            setAppState(AppState.IDLE);
          }
        }
      };
      reader.readAsDataURL(file);
    });
  };
  
  const processImage = useCallback(async (imageData: ProcessedImageData) => {
    const MAX_ATTEMPTS = 3;
    const INITIAL_BACKOFF_MS = 2000;

    setImages(prev => prev.map(img => 
        img.id === imageData.id ? { ...img, status: ImageStatus.PROCESSING, error: null } : img
    ));

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            const greenScreenImage = await getGreenScreenImage(imageData);
            const transparentImage = await removeGreenScreen(greenScreenImage);
            
            setImages(prev => prev.map(img => 
                img.id === imageData.id 
                ? { ...img, status: ImageStatus.COMPLETED, processedUrl: transparentImage, error: null } 
                : img
            ));
            return; 
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            const isQuotaError = /quota|rate limit/i.test(errorMessage);

            if (isQuotaError && attempt < MAX_ATTEMPTS) {
                const delay = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1) + (Math.random() * 1000);
                const retryMessage = `Quota limit reached. Retrying in ${Math.round(delay / 1000)}s...`;
                
                setImages(prev => prev.map(img => 
                    img.id === imageData.id ? { ...img, status: ImageStatus.PROCESSING, error: retryMessage } : img
                ));

                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                const finalErrorMessage = isQuotaError 
                    ? `Failed due to quota limits after multiple attempts.`
                    : errorMessage;

                setImages(prev => prev.map(img => 
                    img.id === imageData.id ? { ...img, status: ImageStatus.ERROR, error: finalErrorMessage } : img
                ));
                return; 
            }
        }
    }
  }, []);

  useEffect(() => {
    if (appState !== AppState.PROCESSING) {
      return;
    }

    const CONCURRENT_LIMIT = 2;

    const processingCount = images.filter(
      (img) => img.status === ImageStatus.PROCESSING
    ).length;
    const queuedImages = images.filter(
      (img) => img.status === ImageStatus.QUEUED
    );

    if (queuedImages.length === 0 && processingCount === 0 && images.length > 0) {
      setAppState(AppState.RESULT);
      return;
    }
    
    const slotsAvailable = CONCURRENT_LIMIT - processingCount;

    if (slotsAvailable > 0 && queuedImages.length > 0) {
      const imagesToProcess = queuedImages.slice(0, slotsAvailable);
      imagesToProcess.forEach((img) => processImage(img));
    }
  }, [images, appState, processImage]);


  const handleReset = () => {
    if (window.confirm("Are you sure you want to clear all images?")) {
        setAppState(AppState.IDLE);
        setImages([]);
    }
  };

  const handleRemoveImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
    // If we remove the last image, reset state
    if (images.length <= 1) { // logic runs before state update completes, so check length <= 1
        setAppState(AppState.IDLE);
    }
  };

  const handleStartProcessing = () => {
    setAppState(AppState.PROCESSING);
  };
  
  const handleRetry = (id: string) => {
    setImages(prevImages =>
      prevImages.map(img =>
        img.id === id
          ? { ...img, status: ImageStatus.QUEUED, error: null, processedUrl: null }
          : img
      )
    );
    setAppState(AppState.PROCESSING);
  };

  const handleDownload = (id: string) => {
    const image = images.find(img => img.id === id);
    if (!image || !image.processedUrl) return;

    const link = document.createElement('a');
    link.href = image.processedUrl;
    const nameWithoutExt = image.name.split('.').slice(0, -1).join('.');
    link.download = `${nameWithoutExt}-no-bg.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAll = async () => {
    const zip = new JSZip();
    const completedImages = images.filter(img => img.status === ImageStatus.COMPLETED && img.processedUrl);
    
    if(completedImages.length === 0) return;

    for (const image of completedImages) {
        const response = await fetch(image.processedUrl!);
        const blob = await response.blob();
        const nameWithoutExt = image.name.split('.').slice(0, -1).join('.');
        zip.file(`${nameWithoutExt}-no-bg.png`, blob);
    }
    
    const content = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = 'background-removed-images.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };


  const completedCount = images.filter(img => img.status === ImageStatus.COMPLETED).length;
  const queuedCount = images.filter(img => img.status === ImageStatus.QUEUED).length;
  const hasImages = images.length > 0;

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col relative overflow-x-hidden">
      {/* Background Gradients */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-900/20 blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-900/20 blur-[100px]"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 w-full pt-12 pb-8 px-4 text-center">
        <div className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 mb-6 backdrop-blur-sm">
            <SparklesIcon className="w-4 h-4 text-purple-400 mr-2" />
            <span className="text-xs font-semibold text-purple-300 uppercase tracking-wider">Powered by Gemini 2.5</span>
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-white mb-4 drop-shadow-lg">
          AI Background <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">Remover</span>
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
          Instantly remove backgrounds from your photos with high precision. Just drop your images and let the AI do the rest.
        </p>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-grow w-full max-w-[1600px] mx-auto px-4 pb-20 flex flex-col items-center">
        
        {!hasImages && (
             <div className="w-full mt-8 animate-fade-in-up">
                <ImageUploader onImagesSelect={handleImagesSelect} />
             </div>
        )}

        {hasImages && (
            <div className="w-full animate-fade-in">
                 {/* Action Bar (Floating or Sticky) */}
                 <div className="sticky top-4 z-50 flex flex-wrap items-center justify-between bg-gray-900/70 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-4 mb-8 shadow-2xl max-w-4xl mx-auto">
                    <div className="flex items-center space-x-4 mb-2 sm:mb-0">
                        <div className="bg-gray-800 rounded-lg px-3 py-1.5 border border-gray-700 flex items-center">
                            <span className="text-sm text-gray-400 mr-2">Status:</span>
                            {appState === AppState.PROCESSING ? (
                                <div className="flex items-center">
                                    <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse mr-2"></div>
                                    <span className="text-sm font-semibold text-white">Processing...</span>
                                </div>
                            ) : queuedCount > 0 ? (
                                 <div className="flex items-center">
                                    <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></div>
                                    <span className="text-sm font-semibold text-white">Ready to start</span>
                                </div>
                            ) : (
                                <div className="flex items-center">
                                    <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                                    <span className="text-sm font-semibold text-white">Completed</span>
                                </div>
                            )}
                        </div>
                        <div className="hidden sm:block text-sm text-gray-500">
                            {completedCount} / {images.length} Done
                        </div>
                    </div>

                    <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
                        
                        {/* Primary Action Button: Start Processing */}
                        {appState !== AppState.PROCESSING && queuedCount > 0 && (
                            <button
                                onClick={handleStartProcessing}
                                className="flex items-center px-6 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-sm font-bold shadow-lg shadow-purple-500/30 transition-all hover:-translate-y-0.5 animate-pulse-subtle"
                            >
                                <SparklesIcon className="w-4 h-4 mr-2" />
                                Remove Backgrounds
                            </button>
                        )}

                         {/* Add more images button (mini uploader) */}
                         <div className="relative overflow-hidden">
                            <input 
                                type="file" 
                                className="absolute inset-0 opacity-0 cursor-pointer" 
                                multiple 
                                accept="image/*" 
                                onChange={(e) => e.target.files && handleImagesSelect(e.target.files)}
                            />
                             <button className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium transition-colors border border-gray-700">
                                + Add More
                            </button>
                         </div>

                         {completedCount > 0 && (
                            <button
                              onClick={handleDownloadAll}
                              className="flex items-center px-4 py-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white text-sm font-medium shadow-lg shadow-green-900/20 transition-all hover:-translate-y-0.5"
                            >
                              <DownloadIcon className="w-4 h-4 mr-2" />
                              Download All
                            </button>
                        )}
                        
                        <button
                          onClick={handleReset}
                          className="flex items-center px-3 py-2 rounded-lg bg-red-900/20 text-red-400 hover:bg-red-900/40 border border-red-900/30 text-sm font-medium transition-colors"
                          title="Clear All"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                    </div>
                 </div>

                 {/* Grid */}
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 md:gap-8">
                    {images.map(image => (
                        <ImageCard key={image.id} image={image} onDownload={handleDownload} onRetry={handleRetry} onRemove={handleRemoveImage} />
                    ))}
                 </div>
            </div>
        )}
      </main>

      <footer className="relative z-10 w-full text-center py-8 border-t border-gray-800/50 mt-auto">
        <p className="text-gray-600 text-sm">
            Designed for creators. Powered by Google Gemini.
        </p>
      </footer>
    </div>
  );
};

export default App;
