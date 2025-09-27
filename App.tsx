import React, { useState, useEffect, useCallback } from 'react';
import JSZip from 'jszip';
import { AppState, ImageStatus } from './types';
import type { ImageData, ProcessedImageData } from './types';
import { getGreenScreenImage } from './services/geminiService';
import ImageUploader from './components/ImageUploader';
import Spinner from './components/Spinner';
import { DownloadIcon, TrashIcon } from './components/icons';

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
}

const ImageCard: React.FC<ImageCardProps> = ({ image, onDownload }) => {
  return (
    <div className="flex flex-col items-center">
      <div className="w-full aspect-square bg-gray-800 rounded-2xl overflow-hidden flex items-center justify-center shadow-lg relative bg-[url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAC1JREFUOE9jfPbs2X8GPEBTIBvCRgYGNlAXwY0kKMEE2EWwA/4KAnwAASwK8LoACwA65wGL9Fk67gAAAABJRU5ErkJggg==)] bg-center">
        {image.status === ImageStatus.PROCESSING && <Spinner />}
        {image.status === ImageStatus.COMPLETED && image.processedUrl && (
          <img src={image.processedUrl} alt={`${image.name} with background removed`} className="max-w-full max-h-full object-contain" />
        )}
        {image.status === ImageStatus.ERROR && (
          <div className="p-4 text-center text-red-400 flex flex-col items-center justify-center">
            <span className="text-2xl mb-2">😔</span>
            <p className="font-semibold">Failed</p>
            <p className="text-sm text-gray-400 mt-2">{image.error}</p>
          </div>
        )}
        {(image.status === ImageStatus.QUEUED) && (
             <img src={image.base64} alt={image.name} className="max-w-full max-h-full object-contain opacity-50" />
        )}
      </div>
      <div className="w-full flex items-center justify-between mt-3 px-1">
        <p className="text-sm text-gray-400 truncate" title={image.name}>{image.name}</p>
        {image.status === ImageStatus.COMPLETED && (
            <button onClick={() => onDownload(image.id)} className="text-purple-400 hover:text-purple-300" aria-label={`Download ${image.name}`}>
                <DownloadIcon className="w-6 h-6" />
            </button>
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

          // Once all files are read, update state
          if(newImages.length === imageFiles.length) {
            setImages(newImages);
            setAppState(AppState.PROCESSING);
          }
        }
      };
      reader.readAsDataURL(file);
    });
  };
  
  const processImage = useCallback(async (imageData: ProcessedImageData) => {
    setImages(prev => prev.map(img => img.id === imageData.id ? { ...img, status: ImageStatus.PROCESSING } : img));
    try {
      const greenScreenImage = await getGreenScreenImage(imageData);
      const transparentImage = await removeGreenScreen(greenScreenImage);
      setImages(prev => prev.map(img => img.id === imageData.id ? { ...img, status: ImageStatus.COMPLETED, processedUrl: transparentImage } : img));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setImages(prev => prev.map(img => img.id === imageData.id ? { ...img, status: ImageStatus.ERROR, error: errorMessage } : img));
    }
  }, []);

  useEffect(() => {
    const processQueue = async () => {
        const queuedImage = images.find(img => img.status === ImageStatus.QUEUED);
        if (queuedImage) {
            await processImage(queuedImage);
        } else {
            // No more queued images, check if processing is done
            const isProcessing = images.some(img => img.status === ImageStatus.PROCESSING);
            if (!isProcessing && images.length > 0) {
                setAppState(AppState.RESULT);
            }
        }
    };

    if(appState === AppState.PROCESSING) {
        processQueue();
    }
  }, [images, appState, processImage]);


  const handleReset = () => {
    setAppState(AppState.IDLE);
    setImages([]);
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


  const renderContent = () => {
    switch (appState) {
      case AppState.IDLE:
        return <ImageUploader onImagesSelect={handleImagesSelect} />;
      case AppState.PROCESSING:
      case AppState.RESULT:
        const completedCount = images.filter(img => img.status === ImageStatus.COMPLETED).length;
        return (
          <div className="w-full max-w-7xl mx-auto flex flex-col items-center">
             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 w-full p-4 md:p-8">
                {images.map(image => (
                    <ImageCard key={image.id} image={image} onDownload={handleDownload} />
                ))}
             </div>

            {appState === AppState.RESULT && (
                <div className="mt-8 flex items-center space-x-4">
                    {completedCount > 0 && (
                        <button
                          onClick={handleDownloadAll}
                          className="flex items-center justify-center bg-green-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-green-700 transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
                        >
                          <DownloadIcon className="w-5 h-5 mr-2" />
                          Download All ({completedCount})
                        </button>
                    )}
                   <button
                      onClick={handleReset}
                      className="flex items-center justify-center bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-gray-700 transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
                    >
                      <TrashIcon className="w-5 h-5 mr-2" />
                      Clear All
                    </button>
                </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <header className="w-full text-center mb-8 md:mb-12">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
            Ultimate AI Background Remover
          </span>
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-400">
          Upload multiple images and watch the magic happen. Powered by Gemini.
        </p>
      </header>
      <main className="w-full flex-grow flex items-center justify-center">
        {renderContent()}
      </main>
      <footer className="w-full text-center text-gray-500 text-sm py-4 mt-8">
        Built with React, Tailwind CSS, and the Google Gemini API.
      </footer>
    </div>
  );
};

export default App;