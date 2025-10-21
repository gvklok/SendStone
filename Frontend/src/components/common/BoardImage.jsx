import React from 'react';
import boardImage from '../../assets/board.png';

const BoardImage = ({ className = "", size = "medium" }) => {
  const sizeClasses = {
    small: "w-[85%] h-[85%]",
    medium: "w-[85%] h-[85%]",
    large: "w-[85%] h-[85%]",
    full: "w-[85%] h-[85%]"
  };

  return (
    <img 
      src={boardImage} 
      alt="Climbing board with holds" 
      className={`${sizeClasses[size]} object-contain ${className}`}
    />
  );
};

export default BoardImage;
