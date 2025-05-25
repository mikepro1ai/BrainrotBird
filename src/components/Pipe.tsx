import React from 'react';

interface PipeProps {
  height: number;
  top: boolean;
}

const Pipe: React.FC<PipeProps> = ({ height, top }) => {
  return (
    <div
      style={{
        width: '60px',
        height: `${height}px`,
        background: 'green',
        position: 'absolute',
        top: top ? 0 : undefined,
        bottom: top ? undefined : 0,
      }}
    />
  );
};

export default Pipe; 