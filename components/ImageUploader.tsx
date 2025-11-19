
import React, { useState } from 'react';
import { UploadIcon, ImageIcon, SparklesIcon } from './icons';

interface ImageUploaderProps {
  onImagesSelect: (files: FileList) => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImagesSelect }) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      onImagesSelect(event.target.files);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onImagesSelect(e.dataTransfer.files);
    }
  };

  return (
    <div 
        className="w-full max-w-3xl mx-auto px-6"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
    >
        <div className={`
            relative group w-full rounded-3xl border-2 border-dashed transition-all duration-300 ease-in-out p-12
            ${isDragging 
                ? 'border-purple-400 bg-purple-900/20 scale-[1.02] shadow-[0_0_30px_rgba(168,85,247,0.2)]' 
                : 'border-gray-700 bg-gray-800/30 hover:border-purple-500/50 hover:bg-gray-800/50'}
        `}>
            {/* Decorative glowing blobs */}
            <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-purple-600/20 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 right-0 translate-x-1/2 translate-y-1/2 w-32 h-32 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative z-10 flex flex-col items-center justify-center text-center space-y-6">
                <div className={`
                    w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300
                    ${isDragging ? 'bg-purple-500 text-white rotate-12' : 'bg-gray-800 text-purple-400 group-hover:scale-110 group-hover:text-purple-300 shadow-xl'}
                `}>
                    {isDragging ? <UploadIcon className="w-12 h-12" /> : <ImageIcon className="w-10 h-10" />}
                </div>

                <div className="space-y-2">
                    <h2 className="text-3xl font-bold text-white">
                        {isDragging ? "Drop it like it's hot!" : "Upload your images"}
                    </h2>
                    <p className="text-gray-400 text-lg max-w-md mx-auto">
                        Drag & drop anywhere or click below. We support PNG, JPG, and WEBP.
                    </p>
                </div>

                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/png, image/jpeg, image/webp"
                    className="hidden"
                    multiple
                />
                
                <button
                    onClick={handleButtonClick}
                    className="group relative inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold text-white transition-all duration-200 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl hover:from-purple-500 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 focus:ring-offset-gray-900 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transform hover:-translate-y-0.5"
                >
                    <SparklesIcon className="w-5 h-5 mr-2 animate-pulse" />
                    Select Images
                </button>
            </div>
        </div>
        
        <div className="mt-8 flex justify-center space-x-8 text-gray-500 text-sm">
            <div className="flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-2"></span>Fast Processing</div>
            <div className="flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2"></span>High Quality</div>
            <div className="flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-purple-500 mr-2"></span>Secure</div>
        </div>
    </div>
  );
};

export default ImageUploader;
