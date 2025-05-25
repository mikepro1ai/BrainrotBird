import React from 'react';
import { animated, useSpring } from '@react-spring/web';
import twitterBird from '../assets/twitter-bird.svg';

interface BirdProps {
  position: number;
  velocity: number;
}

const Bird: React.FC<BirdProps> = ({ position, velocity }) => {
  const spring = useSpring({
    from: { transform: 'translateY(0px) rotate(0deg)' },
    to: { 
      transform: `translateY(${position}px) rotate(${Math.min(Math.max(velocity * 5, -30), 90)}deg)`
    },
    config: { tension: 300 }
  });

  return (
    <animated.div
      style={{
        ...spring,
        width: '40px',
        height: '40px',
        position: 'absolute',
        left: '50px',
        zIndex: 2,
      }}
    >
      <img 
        src={twitterBird} 
        alt="Bird"
        style={{
          width: '100%',
          height: '100%',
        }}
      />
    </animated.div>
  );
};

export default Bird; 