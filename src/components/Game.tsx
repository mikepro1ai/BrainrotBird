import React, { useState, useEffect, useCallback, useRef } from 'react';
import Bird from './Bird';
import Pipe from './Pipe';
import gameOverSound from '../assets/bruh.mp3';
import collisionSound from '../assets/wetfart.mp3';
import backgroundMusic from '../assets/BasshunterDotA8bit.mp3';

const GRAVITY = 0.7;
const JUMP_FORCE = -8;
const PIPE_GAP = 150;
const PIPE_INTERVAL = 2000;
const BASE_PIPE_SPEED = 6.25;
const SPEED_INCREASE = 0.025; // 2.5% increase per pipe

// Create a single music instance outside the component
const backgroundMusicInstance = new Audio(backgroundMusic);
backgroundMusicInstance.loop = true;
backgroundMusicInstance.volume = 0.5;

const Game: React.FC = () => {
  const [birdPosition, setBirdPosition] = useState(250);
  const [velocity, setVelocity] = useState(0);
  const [pipes, setPipes] = useState<{ x: number; height: number; passed: boolean; scored: boolean }[]>([]);
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const collisionRef = useRef<HTMLAudioElement | null>(null);
  const lastScoredPipeRef = useRef<number | null>(null);

  // Initialize game over sound
  useEffect(() => {
    audioRef.current = new Audio(gameOverSound);
    collisionRef.current = new Audio(collisionSound);
    collisionRef.current.volume = 1.0; // Full volume for the collision sound
  }, []);

  // Handle background music
  useEffect(() => {
    const playMusic = async () => {
      try {
        await backgroundMusicInstance.play();
      } catch (err) {
        console.log('Autoplay prevented - will try again');
        const handleInteraction = async () => {
          await backgroundMusicInstance.play();
          document.removeEventListener('click', handleInteraction);
        };
        document.addEventListener('click', handleInteraction);
      }
    };

    playMusic();

    return () => {
      backgroundMusicInstance.pause();
      backgroundMusicInstance.currentTime = 0;
    };
  }, []);

  const playGameOverSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
    }
  };

  const playCollisionSound = () => {
    if (collisionRef.current) {
      collisionRef.current.currentTime = 0;
      collisionRef.current.play();
    }
  };

  const startGame = () => {
    setIsGameStarted(true);
    setBirdPosition(250);
    setVelocity(0);
    setPipes([]);
    setScore(0);
    setSpeedMultiplier(1);
    setIsGameOver(false);
    lastScoredPipeRef.current = null;
  };

  const jump = useCallback(() => {
    if (!isGameOver && isGameStarted) {
      setVelocity(JUMP_FORCE);
    }
  }, [isGameOver, isGameStarted]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        jump();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [jump]);

  useEffect(() => {
    if (!isGameStarted || isGameOver) return;

    const gameLoop = setInterval(() => {
      setBirdPosition((prev) => {
        const newPosition = prev + velocity;
        if (newPosition > 500 || newPosition < 0) {
          setIsGameOver(true);
          playCollisionSound();
          playGameOverSound();
          return prev;
        }
        return newPosition;
      });
      setVelocity((prev) => prev + GRAVITY);
    }, 20);

    return () => clearInterval(gameLoop);
  }, [velocity, isGameOver, isGameStarted]);

  useEffect(() => {
    if (!isGameStarted || isGameOver) return;

    const pipeGenerator = setInterval(() => {
      const height = Math.random() * (400 - PIPE_GAP);
      setPipes((prev) => [...prev, { x: 800, height, passed: false, scored: false }]);
    }, PIPE_INTERVAL);

    return () => clearInterval(pipeGenerator);
  }, [isGameOver, isGameStarted]);

  useEffect(() => {
    if (!isGameStarted || isGameOver) return;

    const pipeInterval = setInterval(() => {
      setPipes((prev) => {
        return prev
          .map((pipe) => {
            const newX = pipe.x - (BASE_PIPE_SPEED * speedMultiplier);
            
            const birdLeft = 50;
            const birdRight = birdLeft + 40;
            const birdTop = birdPosition;
            const birdBottom = birdPosition + 40;
            
            const pipeLeft = newX;
            const pipeRight = newX + 60;
            
            if (
              birdRight > pipeLeft && 
              birdLeft < pipeRight && 
              (birdTop < pipe.height || birdBottom > pipe.height + PIPE_GAP)
            ) {
              setIsGameOver(true);
              playCollisionSound();
              playGameOverSound();
            }

            // Only score if pipe center passes bird center and hasn't been scored
            const pipeCenter = newX + 30;
            const birdCenter = birdLeft + 20;
            
            if (!pipe.scored && pipeCenter < birdCenter && pipe.x + 30 >= birdCenter) {
              if (lastScoredPipeRef.current !== newX) {
                setScore(s => s + 1);
                setSpeedMultiplier(prev => prev + SPEED_INCREASE);
                lastScoredPipeRef.current = newX;
                return { ...pipe, x: newX, passed: true, scored: true };
              }
            }

            return { ...pipe, x: newX };
          })
          .filter((pipe) => pipe.x > -100);
      });
    }, 16);

    return () => clearInterval(pipeInterval);
  }, [isGameOver, birdPosition, speedMultiplier, isGameStarted]);

  const restartGame = () => {
    startGame();
  };

  return (
    <div
      onClick={isGameStarted ? jump : undefined}
      style={{
        height: '500px',
        width: '100%',
        backgroundColor: 'lightblue',
        position: 'relative',
        overflow: 'hidden',
        cursor: isGameStarted ? 'pointer' : 'default',
      }}
    >
      {!isGameStarted ? (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            padding: '20px',
            borderRadius: '10px',
            boxShadow: '0 0 10px rgba(0, 0, 0, 0.2)',
          }}
        >
          <h1 style={{ marginBottom: '20px', color: '#333' }}>Flappy Bird</h1>
          <p style={{ marginBottom: '20px', color: '#666' }}>
            Press SPACE or click to jump
          </p>
          <button
            onClick={startGame}
            style={{
              padding: '10px 30px',
              fontSize: '18px',
              cursor: 'pointer',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              transition: 'background-color 0.3s',
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#45a049'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#4CAF50'}
          >
            Start Game
          </button>
        </div>
      ) : (
        <>
          <Bird position={birdPosition} velocity={velocity} />
          {pipes.map((pipe, i) => (
            <div key={i} style={{ position: 'absolute', left: pipe.x, top: 0, height: '100%' }}>
              <Pipe height={pipe.height} top />
              <Pipe height={500 - pipe.height - PIPE_GAP} top={false} />
            </div>
          ))}
          
          <div
            style={{
              position: 'absolute',
              top: '20px',
              left: '20px',
              fontSize: '24px',
              fontWeight: 'bold',
            }}
          >
            Score: {score}
          </div>

          {isGameOver && (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                padding: '20px',
                borderRadius: '10px',
                boxShadow: '0 0 10px rgba(0, 0, 0, 0.2)',
              }}
            >
              <h1>Game Over!</h1>
              <p style={{ marginBottom: '20px', fontSize: '20px' }}>
                Final Score: {score}
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  restartGame();
                }}
                style={{
                  padding: '10px 20px',
                  fontSize: '18px',
                  cursor: 'pointer',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  transition: 'background-color 0.3s',
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#45a049'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#4CAF50'}
              >
                Restart
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Game; 