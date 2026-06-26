import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

const playTickSound = (frequency = 600, duration = 0.05) => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.frequency.value = frequency;
    gainNode.gain.setValueAtTime(0.06, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + duration);
  } catch (e) {
    console.log(e);
  }
};

const playExplosionSound = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const bufferSize = audioCtx.sampleRate * 1.5;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, audioCtx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(10, audioCtx.currentTime + 1.2);
    
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.5);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    
    noise.start();
  } catch (e) {
    console.log(e);
  }
};

const playSuccessSound = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const playTone = (freq, time, dur) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.08, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
      osc.start(time);
      osc.stop(time + dur);
    };
    playTone(523.25, audioCtx.currentTime, 0.15); // C5
    playTone(659.25, audioCtx.currentTime + 0.08, 0.25); // E5
  } catch(e) {}
};

// Custom SVG Components for Game Design Excellence
const BombSVG = ({ shaking, pulsing }) => (
  <svg className={`bomb-icon ${pulsing ? 'pulsing' : ''} ${shaking ? 'shaking' : ''}`} width="140" height="140" viewBox="0 0 100 100" style={{ margin: '0 auto', display: 'block' }}>
    <circle cx="50" cy="55" r="30" fill="url(#bombGrad)" />
    <rect x="45" y="20" width="10" height="7" rx="2" fill="#475569" />
    <path d="M50 20 Q55 12 65 10" fill="none" stroke="#fb8500" strokeWidth="3" />
    {/* Fuse Spark */}
    <circle cx="65" cy="10" r="6" fill="#ffb703" className="fuse-spark" />
    <circle cx="65" cy="10" r="2" fill="#fff" />
    <defs>
      <radialGradient id="bombGrad" cx="30%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#64748b" />
        <stop offset="60%" stopColor="#1e293b" />
        <stop offset="100%" stopColor="#0f172a" />
      </radialGradient>
    </defs>
  </svg>
);

const BlastSVG = () => (
  <svg width="150" height="150" viewBox="0 0 100 100" style={{ margin: '0 auto', display: 'block' }}>
    <path d="M50 10 L58 35 L82 25 L68 50 L92 60 L68 70 L82 92 L50 80 L18 92 L32 70 L8 60 L32 50 L18 25 L42 35 Z" fill="#ff0055" filter="drop-shadow(0 0 12px #ff0055)" />
    <path d="M50 22 L55 38 L72 30 L62 48 L78 55 L62 62 L72 78 L50 70 L28 78 L38 62 L22 55 L38 48 L28 30 L45 38 Z" fill="#ffb703" />
  </svg>
);

export default function Host() {
  const [socket, setSocket] = useState(null);
  const [roomCode, setRoomCode] = useState('');
  const [teams, setTeams] = useState([]);
  const [gameState, setGameState] = useState('lobby');
  const [gameMode, setGameMode] = useState('family');
  const [timer, setTimer] = useState(60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [activeTeamId, setActiveTeamId] = useState(null);
  const [activePlayerName, setActivePlayerName] = useState('');
  const [exploded, setExploded] = useState(false);
  const [audioAllowed, setAudioAllowed] = useState(false);
  const [muted, setMuted] = useState(false);

  // Animation indicators
  const [particles, setParticles] = useState([]);
  const [bumpScoreTeamId, setBumpScoreTeamId] = useState(null);

  useEffect(() => {
    const newSocket = io(SERVER_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('createRoom');
    });

    newSocket.on('roomCreated', (code) => {
      setRoomCode(code);
    });

    newSocket.on('modeUpdated', (mode) => {
      setGameMode(mode);
    });

    newSocket.on('updateTeams', (updatedTeams) => {
      setTeams((prevTeams) => {
        // Find which team score increased to trigger bounce animation
        if (prevTeams.length > 0) {
          updatedTeams.forEach(t => {
            const old = prevTeams.find(o => o.id === t.id);
            if (old && t.score > old.score) {
              setBumpScoreTeamId(t.id);
              setTimeout(() => setBumpScoreTeamId(null), 400);
            }
          });
        }
        return updatedTeams;
      });
      if (gameState === 'playing' && !muted) {
        playSuccessSound();
      }
    });

    newSocket.on('gameStateChanged', (state) => {
      setGameState(state);
    });

    newSocket.on('turnUpdate', (data) => {
      setActiveTeamId(data.activeTeamId);
      setActivePlayerName(data.activePlayerName);
      setTimer(60);
      setIsTimerRunning(false);
      setExploded(false);
    });

    newSocket.on('timerStarted', () => {
      setIsTimerRunning(true);
    });

    newSocket.on('bombExploded', () => {
      setIsTimerRunning(false);
      setTimer(0);
      setExploded(true);
      if (!muted) {
        playExplosionSound();
      }
    });

    newSocket.on('skipPenalty', (seconds) => {
      setTimer((prev) => Math.max(0, prev - seconds));
    });

    return () => newSocket.disconnect();
  }, [gameState, muted]);

  // Handle particle explosion generation
  useEffect(() => {
    if (exploded) {
      const arr = [];
      const colors = ['#00b4d8', '#ffb703', '#fb8500', '#ff0055'];
      for (let i = 0; i < 40; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 60 + Math.random() * 200;
        arr.push({
          dx: `${Math.cos(angle) * speed}px`,
          dy: `${Math.sin(angle) * speed}px`,
          color: colors[Math.floor(Math.random() * colors.length)],
          left: `${50 + (Math.random() * 10 - 5)}%`,
          top: `${50 + (Math.random() * 10 - 5)}%`
        });
      }
      setParticles(arr);
    } else {
      setParticles([]);
    }
  }, [exploded]);

  useEffect(() => {
    let interval;
    if (isTimerRunning && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            socket.emit('timeOut', roomCode);
            return 0;
          }
          // Sound ticked if not muted
          if (!muted) {
            if (prev <= 10) {
              playTickSound(800, 0.08); 
            } else {
              playTickSound(500, 0.05); 
            }
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timer, socket, roomCode, muted]);

  const handleAllowAudio = () => {
    setAudioAllowed(true);
    playSuccessSound();
  };

  const radius = 100;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (timer / 60) * circumference;

  const modeNames = {
    family: "عائلي",
    challenge: "تحدي وقوة",
    heritage: "شيبان وتراث"
  };

  return (
    <div className="container">
      {!audioAllowed && (
        <div className="audio-init-overlay">
          <div className="premium-card" style={{ maxWidth: '400px' }}>
            <h2 style={{ color: '#fb8500' }}>تفعيل المؤثرات الصوتية 🔊</h2>
            <p style={{ margin: '20px 0', color: '#64748b', lineHeight: '1.6' }}>
              لتسمع دقات القنبلة وصوت الانفجارات الحماسية، اضغط هنا لتفعيل الصوت.
            </p>
            <button className="btn-neon btn-orange" onClick={handleAllowAudio}>
              بدء اللعب بالصوت
            </button>
          </div>
        </div>
      )}

      {gameState === 'lobby' && (
        <div className="premium-card" style={{ maxWidth: '700px' }}>
          <div className="logo-container">
            <img src="/logo.png" alt="شعار فجرها" className="logo-img" />
          </div>
          <h2 style={{ color: 'var(--text-dark)', marginBottom: '5px' }}>بانتظار تجهيز القنابل...</h2>
          <span style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>
            الطور المختار: <strong style={{ color: 'var(--color-orange)' }}>{modeNames[gameMode]}</strong>
          </span>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: '30px', margin: '25px 0' }}>
            <div className="room-code-container" style={{ margin: 0, maxWidth: '280px', flex: '1 1 200px' }}>
              <span style={{ fontSize: '0.95rem', color: 'var(--text-muted)' }}>كود الدخول للغرفة</span>
              <h1 className="room-code-display" style={{ fontSize: '3.5rem', letterSpacing: '8px', marginLeft: '-8px' }}>{roomCode}</h1>
            </div>
            
            {roomCode && (
              <div style={{ background: '#ffffff', padding: '15px', borderRadius: '20px', boxShadow: '0 8px 24px rgba(0,0,0,0.05)', border: '1px solid #edf2f7', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`${window.location.origin}/join?room=${roomCode}`)}`} 
                  alt="QR Code" 
                  style={{ display: 'block', width: '150px', height: '150px', borderRadius: '8px' }} 
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginTop: '10px', fontWeight: 'bold' }}>امسح الكود للدخول مباشرة 📱</span>
              </div>
            )}
          </div>
          
          <div className="teams-grid">
            {teams.map((t, i) => (
              <div key={i} className="team-card active-team" style={{ borderColor: i === 0 ? 'var(--color-cyan)' : 'var(--color-red)' }}>
                <h3 style={{ color: i === 0 ? 'var(--color-cyan)' : 'var(--color-red)', margin: '0 0 10px 0' }}>{t.name}</h3>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', margin: 0 }}>الأعضاء: {t.members.join(' ، ')}</p>
              </div>
            ))}
            {Array.from({ length: Math.max(0, 2 - teams.length) }).map((_, i) => (
              <div key={i} className="team-card" style={{ borderStyle: 'dashed', borderColor: '#e2e8f0', background: 'none' }}>
                <h3 style={{ color: 'var(--text-muted)', opacity: 0.5 }}>بانتظار فريق...</h3>
              </div>
            ))}
          </div>
          {teams.length < 2 && (
            <p style={{ marginTop: '30px', color: 'var(--color-red)', fontWeight: 'bold', animation: 'pulse 1s infinite alternate' }}>
              ⚠️ بانتظار دخول فريقين للبدء
            </p>
          )}
        </div>
      )}

      {gameState === 'playing' && (
        <div className="premium-card" style={{ maxWidth: '650px' }}>
          
          {/* Mute Audio controller */}
          <button onClick={() => setMuted(!muted)} style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'none',
            border: 'none',
            fontSize: '1.5rem',
            cursor: 'pointer'
          }}>
            {muted ? '🔇' : '🔊'}
          </button>

          <span style={{ fontSize: '0.95rem', color: 'var(--text-muted)' }}>
            الطور: {modeNames[gameMode]}
          </span>

          <div className="teams-grid" style={{ marginTop: '10px', marginBottom: '25px' }}>
            {teams.map((t, i) => (
              <div 
                key={i} 
                className={`team-card ${activeTeamId === t.id ? 'active-team' : ''}`}
                style={{ 
                  borderColor: activeTeamId === t.id ? (i === 0 ? 'var(--color-cyan)' : 'var(--color-red)') : '#e2e8f0',
                }}
              >
                <h2 style={{ color: i === 0 ? 'var(--color-cyan)' : 'var(--color-red)' }}>{t.name}</h2>
                <h1 className={bumpScoreTeamId === t.id ? 'score-bump' : ''}>{t.score}</h1>
              </div>
            ))}
          </div>
          
          <div className={`timer-container ${timer <= 10 && isTimerRunning ? 'shaking' : ''}`}>
            <svg className="timer-svg" viewBox="0 0 240 240">
              <circle className="timer-circle-bg" cx="120" cy="120" r={radius} />
              <circle
                className="timer-circle-progress"
                cx="120"
                cy="120"
                r={radius}
                stroke={timer <= 10 ? 'var(--color-red)' : 'var(--color-orange)'}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
              />
            </svg>
            <div className="timer-text">{timer}</div>
          </div>

          <div style={{ marginTop: '20px', position: 'relative' }}>
            {exploded ? (
              <div>
                <BlastSVG />
                <h2 style={{ color: 'var(--color-red)', fontSize: '2rem', fontWeight: '900', marginTop: '15px' }}>بــووم! لقموها! 💥</h2>
                
                {/* CSS Particle explosion */}
                <div className="explosion-overlay">
                  {particles.map((p, i) => (
                    <div 
                      key={i} 
                      className="particle" 
                      style={{
                        backgroundColor: p.color,
                        left: p.left,
                        top: p.top,
                        '--dx': p.dx,
                        '--dy': p.dy
                      }} 
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <BombSVG shaking={timer <= 10 && isTimerRunning} pulsing={isTimerRunning} />
                {!isTimerRunning ? (
                  <p style={{ color: 'var(--color-orange)', fontWeight: 'bold', fontSize: '1.25rem', marginTop: '15px' }}>
                    بانتظار الممثل <span style={{ textDecoration: 'underline', color: 'var(--color-red)' }}>{activePlayerName}</span> للبدء...
                  </p>
                ) : (
                  <p style={{ color: 'var(--text-muted)', marginTop: '15px', fontSize: '1.2rem' }}>
                    الممثل الحالي: <strong style={{ color: 'var(--color-orange)' }}>{activePlayerName}</strong> (مثّل بدون كلام!)
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
