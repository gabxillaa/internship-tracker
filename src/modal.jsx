import React from 'react';

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Background Overlay */}
      <div 
        className="absolute inset-0 bg-pink-200/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      ></div>
      
      {/* Modal Card */}
      <div className="relative bg-white/90 backdrop-blur-xl border-4 border-white rounded-[40px] shadow-[0_20px_50px_rgba(255,182,193,0.4)] w-full max-w-md overflow-hidden animate-zoom-in">
        {/* Cute Header Decor */}
        <div className="bg-pink-100/50 p-6 text-center relative">
          <button 
            onClick={onClose}
            className="cursor-pointer absolute top-4 right-4 text-pink-300 hover:text-pink-500 transition-colors"
          >
            <i className="fa-solid fa-circle-xmark text-2xl"></i>
          </button>
          <div className="text-4xl mb-2">✨</div>
          <h2 className="font-display font-black text-2xl text-pink-500 uppercase tracking-tight">{title}</h2>
        </div>

        <div className="p-8">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;