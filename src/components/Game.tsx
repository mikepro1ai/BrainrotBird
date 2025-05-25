import React, { useState, useEffect, useCallback, useRef } from 'react';
import Bird from './Bird';
import Pipe from './Pipe';
import gameOverSound from '../assets/bruh.mp3';
import collisionSound from '../assets/wetfart.mp3';
import backgroundMusic from '../assets/BasshunterDotA8bit.mp3';
import levelUpSound from '../assets/level-up.mp3';

const GRAVITY = 0.5;
const JUMP_FORCE = -6.4;
const PIPE_GAP = 173;
const NORMAL_PIPE_INTERVAL = 2000;
const ADVANCED_PIPE_INTERVAL = 1800;
const BASE_PIPE_SPEED = 5;
const SPEED_INCREASE_PER_LEVEL = 0.25;
const POINTS_PER_PIPE = 10;
const POINTS_FOR_LEVEL_UP = 50;
const ADVANCED_MODE_LEVEL = 3;
const ADVANCED_SPEED_BOOST = 0.2;
const NORMAL_PIPE_SPACING = 800;
const ADVANCED_PIPE_SPACING = 980;
const ADVANCED_DOUBLE_PIPE_SPACING = 1274;
const DOUBLE_PIPE_CHANCE = 0.2;
const MAX_PIPES_ADVANCED = 4;
const MAJOR_SPEED_BOOST_INTERVAL = 3;
const MAJOR_SPEED_BOOST = 0.25;
const LIGHTNING_EFFECTS_LEVEL = 4;

// Create a single music instance outside the component
const backgroundMusicInstance = new Audio(backgroundMusic);
backgroundMusicInstance.loop = true;
backgroundMusicInstance.volume = 0.5;

const Game: React.FC = () => {
  const [birdPosition, setBirdPosition] = useState(250);
  const [velocity, setVelocity] = useState(0);
  const [pipes, setPipes] = useState<{ x: number; height: number; scored: boolean }[]>([]);
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [lastLevelUpScore, setLastLevelUpScore] = useState(0);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [isGameActive, setIsGameActive] = useState(false);
  const [showStartMessage, setShowStartMessage] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [screenShakeActive, setScreenShakeActive] = useState(false);
  const [showLightning, setShowLightning] = useState(false);
  const [lightningPosition, setLightningPosition] = useState({ x: 0, y: 0 });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const collisionRef = useRef<HTMLAudioElement | null>(null);
  const levelUpRef = useRef<HTMLAudioElement | null>(null);
  const lastScoredPipeRef = useRef<number | null>(null);

  // Initialize sounds
  useEffect(() => {
    audioRef.current = new Audio(gameOverSound);
    collisionRef.current = new Audio(collisionSound);
    levelUpRef.current = new Audio(levelUpSound);
    collisionRef.current.volume = 1.0;
    if (levelUpRef.current) levelUpRef.current.volume = 1.0;
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
    setLastLevelUpScore(0);
    setCurrentLevel(1);
    setSpeedMultiplier(1);
    setIsGameOver(false);
    setShowStartMessage(true);
    setShowLevelUp(false);
    setIsAdvancedMode(false);
    setScreenShakeActive(false);
    setShowLightning(false);
    
    setTimeout(() => {
      setIsGameActive(true);
      setShowStartMessage(false);
    }, 3000);
  };

  const jump = useCallback(() => {
    if (!isGameOver && isGameStarted) {
      setVelocity(JUMP_FORCE);
    }
  }, [isGameOver, isGameStarted]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        if (!isGameStarted) {
          startGame();
        } else {
          jump();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [jump, isGameStarted]);

  useEffect(() => {
    if (!isGameStarted || isGameOver || !isGameActive) return;

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
  }, [velocity, isGameOver, isGameStarted, isGameActive]);

  useEffect(() => {
    if (!isGameStarted || isGameOver || !isGameActive) return;

    const pipeInterval = setInterval(() => {
      setPipes(prevPipes => {
        return prevPipes.map(pipe => {
          const currentSpeedMultiplier = isAdvancedMode ? 
            speedMultiplier * (1 + ADVANCED_SPEED_BOOST) : 
            speedMultiplier;
          
          const moveSpeed = isAdvancedMode ? 
            BASE_PIPE_SPEED * currentSpeedMultiplier * 0.9 :
            BASE_PIPE_SPEED * currentSpeedMultiplier;
          
          const newX = pipe.x - moveSpeed;
          
          const birdLeft = 50;
          const birdRight = birdLeft + 40;
          const birdTop = birdPosition;
          const birdBottom = birdPosition + 40;
          
          const pipeLeft = newX;
          const pipeRight = newX + 60;
          
          // Check collision
          if (
            birdRight > pipeLeft && 
            birdLeft < pipeRight && 
            (birdTop < pipe.height || birdBottom > pipe.height + PIPE_GAP)
          ) {
            setIsGameOver(true);
            playCollisionSound();
            playGameOverSound();
          }

          // Score only if pipe hasn't been scored and has passed the bird
          if (!pipe.scored && pipeRight < birdLeft) {
            setScore(prev => prev + POINTS_PER_PIPE);
            return { ...pipe, x: newX, scored: true };
          }

          return { ...pipe, x: newX };
        }).filter(pipe => pipe.x > -100);
      });
    }, 16);

    return () => clearInterval(pipeInterval);
  }, [isGameOver, birdPosition, speedMultiplier, isGameStarted, isGameActive, isAdvancedMode]);

  useEffect(() => {
    if (!isGameStarted || isGameOver || !isGameActive) return;

    const pipeGenerator = setInterval(() => {
      setPipes(prevPipes => {
        if (isAdvancedMode && prevPipes.length >= MAX_PIPES_ADVANCED) {
          return prevPipes;
        }

        const height = Math.random() * (400 - PIPE_GAP);
        const baseX = isAdvancedMode ? ADVANCED_PIPE_SPACING : NORMAL_PIPE_SPACING;
        
        const adjustedHeight = isAdvancedMode ? 
          Math.max(100, Math.min(height, 300)) :
          height;
        
        if (isAdvancedMode && Math.random() < DOUBLE_PIPE_CHANCE) {
          const height2 = Math.random() * (400 - PIPE_GAP);
          const adjustedHeight2 = Math.max(100, Math.min(height2, 300));
          return [
            ...prevPipes, 
            { x: baseX, height: adjustedHeight, scored: false },
            { x: ADVANCED_DOUBLE_PIPE_SPACING, height: adjustedHeight2, scored: false }
          ];
        }
        return [...prevPipes, { x: baseX, height: adjustedHeight, scored: false }];
      });
    }, isAdvancedMode ? ADVANCED_PIPE_INTERVAL : NORMAL_PIPE_INTERVAL);

    return () => clearInterval(pipeGenerator);
  }, [isGameOver, isGameStarted, isGameActive, isAdvancedMode]);

  // Level up effect
  useEffect(() => {
    const shouldLevelUp = score > 0 && score - lastLevelUpScore >= POINTS_FOR_LEVEL_UP;
    
    if (shouldLevelUp) {
      const nextLevel = currentLevel + 1;
      setShowLevelUp(true);
      setLastLevelUpScore(score);
      setCurrentLevel(nextLevel);
      
      // Regular speed increase
      let newSpeedMultiplier = speedMultiplier + SPEED_INCREASE_PER_LEVEL;
      
      // Additional boost every 3 levels
      if (nextLevel > 1 && nextLevel % MAJOR_SPEED_BOOST_INTERVAL === 0) {
        newSpeedMultiplier += MAJOR_SPEED_BOOST;
      }
      
      setSpeedMultiplier(newSpeedMultiplier);
      
      // Activate advanced mode at level 3
      if (nextLevel === ADVANCED_MODE_LEVEL) {
        setIsAdvancedMode(true);
      }

      // Screen shake effect
      setScreenShakeActive(true);
      setTimeout(() => setScreenShakeActive(false), 500);
      
      if (levelUpRef.current) {
        levelUpRef.current.currentTime = 0;
        levelUpRef.current.play();
      }
      
      setTimeout(() => {
        setShowLevelUp(false);
      }, 1000);
    }
  }, [score, lastLevelUpScore, currentLevel, speedMultiplier]);

  // Lightning effects for level 4+
  useEffect(() => {
    if (!isGameStarted || isGameOver || !isGameActive || currentLevel < LIGHTNING_EFFECTS_LEVEL) return;
    
    const lightningInterval = setInterval(() => {
      if (Math.random() < 0.1) { // 10% chance of lightning
        const x = Math.random() * 100; // Random position (percentage)
        const y = Math.random() * 100;
        setLightningPosition({ x, y });
        setShowLightning(true);
        
        setTimeout(() => {
          setShowLightning(false);
        }, 200);
      }
    }, 1000);
    
    return () => clearInterval(lightningInterval);
  }, [isGameStarted, isGameOver, isGameActive, currentLevel]);
  
  // Update Pipe component styling
  const getPipeStyle = (height: number, top: boolean) => {
    const baseStyle = {
      width: '60px',
      height: `${height}px`,
      position: 'absolute' as const,
      top: top ? 0 : undefined,
      bottom: top ? undefined : 0,
    };

    if (isAdvancedMode) {
      return {
        ...baseStyle,
        background: 'linear-gradient(90deg, #330000 0%, #440000 50%, #330000 100%)',
        boxShadow: 'inset 0 0 20px rgba(0, 0, 0, 0.8)',
        border: '1px solid rgba(80, 0, 0, 0.3)',
        opacity: 0.85,
      };
    }

    return {
      ...baseStyle,
      background: 'green',
    };
  };

  return (
    <div className="game-container">
      <div
        onClick={isGameStarted ? jump : undefined}
        className="game-area"
        style={{
          backgroundColor: isAdvancedMode ? '#660000' : 'lightblue',
          animation: screenShakeActive ? 'screenShake 0.5s ease-in-out' : 'none',
          transition: 'background-color 1s ease',
        }}
      >
        {/* Advanced mode visual effects */}
        {isAdvancedMode && (
          <>
            <div className="fire-overlay" />
            <div className="warning-text">ADVANCED MODE</div>
          </>
        )}

        {/* Lightning effects for level 4+ */}
        {showLightning && (
          <div 
            className="lightning" 
            style={{
              left: `${lightningPosition.x}%`,
              top: `${lightningPosition.y}%`,
            }}
          />
        )}

        {/* Level display */}
        <div className="level-display">
          Level: {currentLevel}
        </div>

        {showLevelUp && (
          <div className="level-up-wrapper">
            <div className="level-up-container">
              <div className="level-up-text">
                Level {currentLevel - 1} Complete
                {currentLevel === ADVANCED_MODE_LEVEL && (
                  <div className="advanced-warning">PREPARE FOR ADVANCED MODE!</div>
                )}
                {currentLevel % MAJOR_SPEED_BOOST_INTERVAL === 0 && (
                  <div className="speed-boost-warning">SPEED BOOST!</div>
                )}
              </div>
            </div>
          </div>
        )}

        {showStartMessage && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              padding: '20px',
              borderRadius: '10px',
              boxShadow: '0 0 10px rgba(0, 0, 0, 0.2)',
              zIndex: 100,
              textAlign: 'center',
              animation: 'fadeInOut 3s forwards'
            }}
          >
            <p style={{ fontSize: '18px', color: '#333', margin: 0 }}>
              tap on the screen or click your mouse to gain height
            </p>
          </div>
        )}

        {/* Copyright notice and GitHub link */}
        <div
          style={{
            position: 'absolute',
            bottom: '10px',
            right: '10px',
            fontSize: '12px',
            color: '#333',
            fontStyle: 'italic',
            zIndex: 100,
            textShadow: '1px 1px 2px rgba(255, 255, 255, 0.5)',
            textAlign: 'right'
          }}
        >
          <div>© made by</div>
          <a
            href="https://github.com/mikepro1ai/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#333',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '4px'
            }}
          >
            <svg height="16" viewBox="0 0 16 16" width="16" style={{fill: '#333'}}>
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
            </svg>
            mikepro1ai
          </a>
        </div>

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
                <div style={getPipeStyle(pipe.height, true)} className={isAdvancedMode ? 'advanced-pipe' : ''} />
                <div style={getPipeStyle(500 - pipe.height - PIPE_GAP, false)} className={isAdvancedMode ? 'advanced-pipe' : ''} />
              </div>
            ))}
            
            <div className="score-display">
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
                    startGame();
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

      <style>
        {`
          html, body {
            margin: 0;
            padding: 0;
            height: 100%;
            overflow-x: hidden;
          }

          .game-container {
            display: flex;
            justify-content: center;
            align-items: center;
            width: 100%;
            height: 100vh;
            padding: 0;
            box-sizing: border-box;
          }

          .game-area {
            position: relative;
            width: 500px;
            height: 500px;
            overflow: hidden;
            cursor: pointer;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.3);
            border-radius: 8px;
          }

          .level-up-wrapper {
            position: absolute;
            top: 30%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 1000;
            perspective: 1000px;
            width: 90%;
            max-width: 300px;
            padding: 0 10px;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            pointer-events: none;
          }

          .level-display {
            position: absolute;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.5);
            color: white;
            padding: 5px 10px;
            border-radius: 5px;
            font-size: 16px;
            z-index: 100;
          }

          .score-display {
            position: absolute;
            top: 20px;
            left: 20px;
            background: rgba(0, 0, 0, 0.5);
            color: white;
            padding: 5px 10px;
            border-radius: 5px;
            font-size: 16px;
            z-index: 100;
          }

          @keyframes fadeInOut {
            0% { opacity: 0; }
            20% { opacity: 1; }
            80% { opacity: 1; }
            100% { opacity: 0; }
          }

          .fire-text-container {
            position: relative;
            display: inline-block;
          }

          .fire-text-container::before,
          .fire-text-container::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(45deg, #ff0000, #ff7300, #fffb00, #ff0000);
            background-size: 400% 400%;
            animation: fireGradient 3s ease infinite;
            filter: blur(20px);
            opacity: 0.7;
            z-index: -1;
            border-radius: 10px;
          }

          .fire-text-container::after {
            filter: blur(40px);
            animation: fireGradient 3s ease infinite reverse;
          }

          @keyframes fireGradient {
            0% {
              background-position: 0% 50%;
            }
            50% {
              background-position: 100% 50%;
            }
            100% {
              background-position: 0% 50%;
            }
          }

          @keyframes fireText {
            0% {
              opacity: 0;
              transform: translateX(-50%) translateY(-30px) scale(0.8);
            }
            15% {
              opacity: 0.9;
              transform: translateX(-50%) translateY(0) scale(1.1);
            }
            25% {
              transform: translateX(-50%) translateY(0) scale(1);
            }
            85% {
              opacity: 0.9;
              transform: translateX(-50%) translateY(0) scale(1);
            }
            100% {
              opacity: 0;
              transform: translateX(-50%) translateY(-30px) scale(0.8);
            }
          }

          @keyframes flicker {
            0%, 19.999%, 22%, 62.999%, 64%, 64.999%, 70%, 100% {
              opacity: 0.99;
              text-shadow: 
                -1px -1px 0 #FFA500, 
                1px -1px 0 #FFA500, 
                -1px 1px 0 #FFA500, 
                1px 1px 0 #FFA500,
                0 -2px 8px #FF8C00,
                0 0 20px #FF4500,
                0 0 30px #FF0000,
                0 0 40px #FF8C00,
                0 0 60px #FF4500,
                0 0 80px #FF0000;
            }
            20%, 21.999%, 63%, 63.999%, 65%, 69.999% {
              opacity: 0.4;
              text-shadow: none;
            }
          }

          .level-up-container {
            text-align: center;
            animation: levelUpAnim 1s ease-out forwards;
            transform-style: preserve-3d;
            width: 100%;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            alignItems: center;
            gap: 10px;
          }

          .level-up-text {
            font-size: min(32px, 5vw);
            color: ${isAdvancedMode ? '#ff3300' : 'rgba(255, 215, 0, 0.8)'};
            text-shadow: 
              0 0 8px ${isAdvancedMode ? 'rgba(255, 0, 0, 0.8)' : 'rgba(255, 140, 0, 0.6)'},
              0 0 15px ${isAdvancedMode ? 'rgba(255, 0, 0, 0.6)' : 'rgba(255, 69, 0, 0.4)'};
            margin: 0;
            padding: 10px 20px;
            background: rgba(0, 0, 0, ${isAdvancedMode ? '0.6' : '0.4'});
            border-radius: 8px;
            border: 1px solid ${isAdvancedMode ? 'rgba(255, 0, 0, 0.6)' : 'rgba(255, 215, 0, 0.4)'};
            animation: ${isAdvancedMode ? 'advancedPulse' : 'pulseGlow'} 0.5s ease-in-out infinite alternate;
            white-space: nowrap;
            display: block;
            min-width: min-content;
            max-width: 100%;
            font-weight: 500;
            letter-spacing: 0.5px;
          }

          @keyframes levelUpAnim {
            0% {
              opacity: 0;
              transform: scale(0.8) translateY(20px);
            }
            20% {
              opacity: 0.8;
              transform: scale(1) translateY(0);
            }
            80% {
              opacity: 0.8;
              transform: scale(1) translateY(0);
            }
            100% {
              opacity: 0;
              transform: scale(0.8) translateY(-20px);
            }
          }

          @keyframes pulseGlow {
            from {
              filter: brightness(0.9);
            }
            to {
              filter: brightness(1.1);
            }
          }

          .fire-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(0deg, 
              rgba(255, 0, 0, 0.3) 0%,
              transparent 20%,
              transparent 80%,
              rgba(255, 0, 0, 0.3) 100%
            );
            pointer-events: none;
            animation: fireEffect 3s infinite alternate;
            mix-blend-mode: screen;
          }

          .warning-text {
            position: absolute;
            top: 20px;
            right: 20px;
            color: #ff0000;
            font-size: 24px;
            font-weight: bold;
            text-shadow: 0 0 10px #ff0000;
            animation: warningPulse 1s infinite alternate;
          }

          .advanced-warning {
            color: #ff0000;
            font-size: 0.6em;
            margin-top: 10px;
            text-shadow: 0 0 10px #ff0000;
            animation: warningPulse 0.5s infinite alternate;
          }

          @keyframes screenShake {
            0%, 100% {
              transform: translateX(0);
            }
            25% {
              transform: translateX(-5px);
            }
            75% {
              transform: translateX(5px);
            }
          }

          @keyframes fireEffect {
            0% {
              opacity: 0.5;
              transform: translateY(0);
            }
            50% {
              opacity: ${isAdvancedMode ? '0.9' : '0.7'};
              transform: translateY(-5px) scaleY(1.05);
            }
            100% {
              opacity: 0.5;
              transform: translateY(-10px);
            }
          }

          @keyframes warningPulse {
            from {
              opacity: 0.7;
              transform: scale(0.98);
              text-shadow: 0 0 10px #ff0000;
            }
            to {
              opacity: 1;
              transform: scale(1.02);
              text-shadow: 0 0 20px #ff0000, 0 0 40px #ff0000;
            }
          }

          @keyframes advancedPulse {
            from {
              filter: brightness(0.8) hue-rotate(-10deg);
            }
            to {
              filter: brightness(1.2) hue-rotate(10deg);
            }
          }

          .advanced-pipe {
            animation: pipeFlicker 2s infinite alternate;
            transition: all 0.3s ease;
          }

          @keyframes pipeFlicker {
            0% {
              opacity: 0.85;
              filter: brightness(0.95) contrast(1);
            }
            50% {
              opacity: 0.75;
              filter: brightness(0.9) contrast(1.1);
            }
            100% {
              opacity: 0.85;
              filter: brightness(0.95) contrast(1);
            }
          }

          .speed-boost-warning {
            color: #ffff00;
            font-size: 0.6em;
            margin-top: 5px;
            text-shadow: 0 0 10px #ffff00;
            animation: warningPulse 0.5s infinite alternate;
          }

          .lightning {
            position: absolute;
            width: 120px;
            height: 200px;
            background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 64"><path d="M18 0 L14 24 L22 26 L12 64 L16 36 L8 34 L18 0" fill="%23ffff00" stroke="%23ffffff" stroke-width="1"/></svg>') no-repeat center center;
            background-size: contain;
            filter: drop-shadow(0 0 10px rgba(255, 255, 0, 0.8));
            z-index: 100;
            transform: translate(-50%, -50%) scale(${Math.random() * 0.5 + 0.8});
            animation: lightningFlash 0.2s linear;
            pointer-events: none;
          }

          @keyframes lightningFlash {
            0%, 100% {
              opacity: 0;
            }
            10%, 90% {
              opacity: 1;
            }
            50% {
              opacity: 0.8;
            }
          }

          @media (max-width: 768px) {
            .game-area {
              width: 100%;
              height: 100vh;
              border-radius: 0;
            }
            
            .game-container {
              padding: 0;
            }
            
            .level-display {
              font-size: 14px;
              top: 10px;
              right: 10px;
            }
            
            .score-display {
              font-size: 14px;
              top: 10px;
              left: 10px;
            }
            
            .warning-text {
              font-size: 18px;
              top: 40px;
              right: 10px;
            }
          }
        `}
      </style>
    </div>
  );
};

export default Game; 