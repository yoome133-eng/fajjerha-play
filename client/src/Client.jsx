import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

const FamilyIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const ChallengeIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5" />
    <line x1="12" y1="22" x2="12" y2="15.5" />
    <polyline points="22 8.5 12 15 2 8.5" />
    <polyline points="2 15.5 12 9 22 15.5" />
    <line x1="12" y1="2" x2="12" y2="9" />
  </svg>
);

const HeritageIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

export default function Client() {
  const [socket, setSocket] = useState(null);
  const [roomCode, setRoomCode] = useState('');
  const [teamName, setTeamName] = useState('');
  
  // Dynamic Player List (Mandatory, min 2 players)
  const [playerNames, setPlayerNames] = useState(['', '']);

  const [joined, setJoined] = useState(false);
  const [myTeam, setMyTeam] = useState(null);
  const [error, setError] = useState('');

  const [isMyTurn, setIsMyTurn] = useState(false);
  const [activePlayerName, setActivePlayerName] = useState('');
  const [currentWord, setCurrentWord] = useState('');
  const [isWordRevealed, setIsWordRevealed] = useState(false);
  const [timerStarted, setTimerStarted] = useState(false);
  const [exploded, setExploded] = useState(false);

  const [selectedMode, setSelectedMode] = useState('family');
  const [skipsUsed, setSkipsUsed] = useState(0);

  // Keep a mutable ref of myTeam to prevent stale closure in socket listeners without reconnecting
  const myTeamRef = useRef(null);

  useEffect(() => {
    myTeamRef.current = myTeam;
  }, [myTeam]);

  useEffect(() => {
    const newSocket = io(SERVER_URL);
    setSocket(newSocket);

    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setRoomCode(roomParam);
    }

    newSocket.on('joined', (team) => {
      setJoined(true);
      setMyTeam(team);
      setError('');
      if (window.navigator.vibrate) {
        window.navigator.vibrate(100);
      }
    });

    newSocket.on('error', (msg) => {
      setError(msg);
    });

    newSocket.on('modeUpdated', (mode) => {
      setSelectedMode(mode);
    });

    newSocket.on('turnUpdate', (data) => {
      setTimerStarted(false);
      setExploded(false);
      setCurrentWord('');
      setIsWordRevealed(false); // Hide the word on a new turn
      setSkipsUsed(data.skipsUsed);
      setActivePlayerName(data.activePlayerName);
      
      const currentTeam = myTeamRef.current;
      if (currentTeam && data.activeTeamId === currentTeam.id) {
        setIsMyTurn(true);
        if (window.navigator.vibrate) {
          window.navigator.vibrate([150, 100, 150]);
        }
      } else {
        setIsMyTurn(false);
      }
    });

    newSocket.on('yourTurn', (data) => {
      setCurrentWord(data.word);
      setSkipsUsed(data.skipsUsed);
      setActivePlayerName(data.activePlayerName);
    });

    newSocket.on('bombExploded', () => {
      setExploded(true);
      if (window.navigator.vibrate) {
        window.navigator.vibrate([500, 200, 500]);
      }
    });

    return () => newSocket.disconnect();
  }, []);

  const handleJoin = () => {
    // Filter out empty player names
    const validPlayers = playerNames.map(p => p.trim()).filter(p => p !== '');
    
    if (!roomCode || !teamName) {
      setError('الرجاء إدخال كود الغرفة واسم الفريق');
      return;
    }
    
    if (validPlayers.length < 2) {
      setError('يجب إدخال اسم لاعبين اثنين على الأقل للمنافسة');
      return;
    }

    socket.emit('joinRoom', { 
      roomCode, 
      teamName, 
      members: validPlayers 
    });
  };

  const handleStart = () => {
    socket.emit('startTimer', roomCode);
    setTimerStarted(true);
  };

  const handleSuccess = () => {
    socket.emit('success', roomCode);
  };

  const handleSkip = () => {
    if (skipsUsed < 1) {
      socket.emit('skipWord', roomCode);
      if (window.navigator.vibrate) {
        window.navigator.vibrate(50);
      }
    }
  };

  const handleModeChange = (mode) => {
    setSelectedMode(mode);
    socket.emit('updateMode', { roomCode, mode });
  };

  // Dynamic inputs methods
  const addPlayerField = () => {
    setPlayerNames([...playerNames, '']);
  };

  const removePlayerField = (index) => {
    if (playerNames.length > 2) {
      const updated = playerNames.filter((_, idx) => idx !== index);
      setPlayerNames(updated);
    }
  };

  const updatePlayerName = (index, value) => {
    const updated = [...playerNames];
    updated[index] = value;
    setPlayerNames(updated);
  };

  return (
    <div className="container" style={{ padding: '20px 10px' }}>
      {!joined ? (
        <div className="premium-card" style={{ width: '95%' }}>
          <div className="logo-container" style={{ width: '100px', height: '100px', marginBottom: '15px' }}>
            <img src="/logo.png" alt="شعار فجرها" className="logo-img" style={{ width: '80px', height: '80px' }} />
          </div>
          <h2 style={{ color: 'var(--text-dark)', marginBottom: '25px' }}>الانضمام للعبة</h2>
          
          {error && (
            <div style={{ background: 'rgba(255, 0, 85, 0.05)', border: '1px solid var(--color-red)', borderRadius: '12px', padding: '12px', marginBottom: '20px', color: 'var(--color-red)', fontSize: '0.95rem' }}>
              ⚠️ {error}
            </div>
          )}

          <input className="glass-input" placeholder="كود الغرفة (4 أرقام)" value={roomCode} onChange={e => setRoomCode(e.target.value)} type="tel" maxLength="4" />
          <input className="glass-input" placeholder="اسم الفريق (مثال: الهلال)" value={teamName} onChange={e => setTeamName(e.target.value)} />
          
          {/* Dynamic player list registration */}
          <div style={{ textAlign: 'right', margin: '20px 0' }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: 'var(--text-dark)', display: 'block', marginBottom: '10px' }}>
              أعضاء الفريق (الحد الأدنى 2):
            </span>
            {playerNames.map((name, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                <input 
                  className="glass-input" 
                  style={{ marginBottom: 0, padding: '12px', fontSize: '1rem', flex: 1 }} 
                  placeholder={`اسم اللاعب ${idx + 1}`} 
                  value={name} 
                  onChange={e => updatePlayerName(idx, e.target.value)} 
                />
                {playerNames.length > 2 && (
                  <button 
                    onClick={() => removePlayerField(idx)} 
                    style={{
                      background: 'rgba(255,0,85,0.05)',
                      border: '1px solid var(--color-red)',
                      borderRadius: '12px',
                      color: 'var(--color-red)',
                      padding: '12px',
                      cursor: 'pointer',
                      fontSize: '1rem'
                    }}
                  >
                    🗑️
                  </button>
                )}
              </div>
            ))}
            <button 
              onClick={addPlayerField} 
              style={{
                background: 'rgba(0,180,216,0.05)',
                border: '1px dashed var(--color-cyan)',
                borderRadius: '12px',
                color: 'var(--color-cyan)',
                padding: '10px 15px',
                cursor: 'pointer',
                fontWeight: 'bold',
                width: '100%',
                marginTop: '5px'
              }}
            >
              + إضافة لاعب جديد
            </button>
          </div>

          <button className="btn-neon btn-cyan" style={{ marginTop: '10px' }} onClick={handleJoin}>
            انضمام للغرفة 🎮
          </button>
        </div>
      ) : (
        <div style={{ width: '100%', maxWidth: '500px' }}>
          <div className="premium-card" style={{ width: '100%', padding: '30px 20px' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>فريقك الحالي</span>
            <h2 style={{ color: 'var(--color-cyan)', margin: '5px 0 25px 0', fontSize: '2rem' }}>{myTeam.name}</h2>
            
            {/* Lobby View Mode Selector */}
            {!isMyTurn && !exploded && currentWord === '' && (
              <div style={{ marginBottom: '20px' }}>
                <span style={{ fontSize: '0.95rem', color: 'var(--text-dark)', fontWeight: 'bold' }}>اختر طور اللعب:</span>
                <div className="modes-grid">
                  <div className={`mode-card family ${selectedMode === 'family' ? 'selected' : ''}`} onClick={() => handleModeChange('family')}>
                    <FamilyIcon />
                    <h4>عائلي</h4>
                    <p>ألعاب وعادات يومية</p>
                  </div>
                  <div className={`mode-card challenge ${selectedMode === 'challenge' ? 'selected' : ''}`} onClick={() => handleModeChange('challenge')}>
                    <ChallengeIcon />
                    <h4>تحدي</h4>
                    <p>مواقف صعبة كوميدية</p>
                  </div>
                  <div className={`mode-card heritage ${selectedMode === 'heritage' ? 'selected' : ''}`} onClick={() => handleModeChange('heritage')}>
                    <HeritageIcon />
                    <h4>تراثي</h4>
                    <p>أمثال وعادات شعبية</p>
                  </div>
                </div>
              </div>
            )}

            {exploded ? (
              <div style={{ animation: 'shake 0.3s' }}>
                <h1 className="bomb-icon">💥</h1>
                <h2 style={{ color: 'var(--color-red)', fontSize: '2rem', fontWeight: '900', marginTop: '15px' }}>لـقـمـنـا! 💀</h2>
                <p style={{ color: 'var(--text-muted)', marginTop: '10px' }}>انفجرت القنبلة في دورنا. استعدوا للجولة القادمة!</p>
              </div>
            ) : isMyTurn ? (
              <div>
                <span className="btn-neon btn-orange" style={{ width: 'fit-content', margin: '0 auto 20px auto', fontSize: '0.9rem', padding: '6px 16px', borderRadius: '20px', cursor: 'default' }}>
                  🔥 دور فريقكم الآن
                </span>
                
                {!isWordRevealed ? (
                  <div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', lineHeight: '1.6' }}>
                      الرجاء تسليم الجوال للممثل الحالي:
                    </p>
                    <div style={{
                      background: 'rgba(251, 133, 0, 0.08)',
                      border: '2px solid var(--color-orange)',
                      borderRadius: '16px',
                      padding: '20px',
                      fontSize: '1.6rem',
                      fontWeight: 'bold',
                      color: 'var(--color-orange)',
                      margin: '15px 0'
                    }}>
                      👤 {activePlayerName}
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '25px' }}>
                      ⚠️ ممنوع على باقي أعضاء الفريق النظر إلى الشاشة!
                    </p>
                    <button className="btn-neon btn-cyan" style={{ fontSize: '1.3rem', padding: '16px' }} onClick={() => setIsWordRevealed(true)}>
                      أنا {activePlayerName} ومستعد! 👁️
                    </button>
                  </div>
                ) : !timerStarted ? (
                  <div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: '1.6' }}>
                      هذه هي كلمتك السرية. اقرأها جيداً ثم اضغط على زر البدء لتشغيل الوقت:
                    </p>
                    <div className="word-box" style={{ animation: 'pulse 1s infinite alternate' }}>
                      {currentWord}
                    </div>
                    <button className="btn-neon btn-orange" style={{ fontSize: '1.5rem', padding: '20px', marginTop: '20px' }} onClick={handleStart}>
                      ابدأ الوقت واللعب ⏳
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="word-box" style={{ borderColor: 'var(--color-orange)', boxShadow: '0 10px 20px rgba(251,133,0,0.05)' }}>
                      {currentWord}
                    </div>
                    <p style={{ color: 'var(--color-orange)', fontWeight: 'bold' }}>
                      الممثل الحالي: <strong>{activePlayerName}</strong> ⏳ مثّل الآن!
                    </p>

                    <button className="btn-neon btn-green" style={{ fontSize: '1.6rem', padding: '22px', marginTop: '20px' }} onClick={handleSuccess}>
                      صح! (حزروها) 🎉
                    </button>

                    {skipsUsed < 1 ? (
                      <button className="btn-neon btn-danger" style={{ fontSize: '1.1rem', padding: '14px', marginTop: '15px' }} onClick={handleSkip}>
                        تخطي الكلمة (خصم 3 ثوانٍ) 🔄
                      </button>
                    ) : (
                      <p style={{ fontSize: '0.85rem', color: 'var(--color-red)', marginTop: '15px' }}>
                        ⚠️ استخدمت التخطي المتاح لك في هذه الجولة!
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '4rem', margin: '20px 0' }}>⏳</div>
                <h3 style={{ color: 'var(--text-dark)' }}>بانتظار دوركم...</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                  الفريق الآخر يلعب الآن. الممثل الحالي لديهم هو: <strong>{activePlayerName}</strong>.
                  راقبوا شاشة العرض واستعدوا للضحك!
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
