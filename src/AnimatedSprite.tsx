// AnimatedSprite.tsx
import React, { useEffect, useRef } from "react";
import gsap from "gsap";

interface AnimatedSpriteProps {
  emoji: string;
  gridPos: { x: number; y: number };
  cellSize: number;
  className?: string;
  teleporting?: boolean;
}

const AnimatedSprite: React.FC<AnimatedSpriteProps> = ({
  emoji,
  gridPos,
  cellSize,
  className,
}) => {
  const spriteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (spriteRef.current) {
      gsap.to(spriteRef.current, {
        x: (gridPos.x + 0.125) * cellSize,
        y: (gridPos.y + 0.125) * cellSize,
        duration: 0.2,
        ease: "power2.out",
      });
    }
  }, [gridPos, cellSize]);

  return (
    <div
      ref={spriteRef}
      className={`absolute text-center align-middle p-0 flex items-center justify-center ${className}`}
      style={{
        width: cellSize,
        height: cellSize,
        fontSize: "20px",
      }}
    >
      {emoji}
    </div>
  );
};

export default AnimatedSprite;
