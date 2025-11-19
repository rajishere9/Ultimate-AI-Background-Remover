
import React from 'react';

const Spinner: React.FC = () => (
  <div className="relative flex justify-center items-center">
    <div className="animate-ping absolute inline-flex h-12 w-12 rounded-full bg-purple-400 opacity-20"></div>
    <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-700 border-t-purple-500 border-r-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]"></div>
  </div>
);

export default Spinner;
