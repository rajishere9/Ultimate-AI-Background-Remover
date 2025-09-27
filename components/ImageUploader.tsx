import React from 'react';
import { UploadIcon } from './icons';

interface ImageUploaderProps {
  onImagesSelect: (files: FileList) => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImagesSelect }) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onImagesSelect(e.dataTransfer.files);
    }
  };

  return (
    <div 
        className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center p-8"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
    >
        <div className="w-full border-2 border-dashed border-gray-600 rounded-2xl p-10 text-center cursor-pointer hover:border-purple-500 transition-colors duration-300 bg-gray-800/50">
            <div className="flex flex-col items-center justify-center text-gray-400">
                <UploadIcon className="w-16 h-16 mb-4 text-gray-500" />
                <h2 className="text-2xl font-bold text-gray-200 mb-2">Drag & Drop Your Images</h2>
                <p className="mb-6">or click to browse</p>
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
                    className="bg-purple-600 text-white font-semibold py-3 px-8 rounded-lg hover:bg-purple-700 transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
                >
                    Upload Images
                </button>
            </div>
        </div>
        <p className="mt-6 text-sm text-gray-500">Supported formats: PNG, JPG, WEBP</p>
    </div>
  );
};

export default ImageUploader;