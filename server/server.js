const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Classified Word Bank for Saudi Context
const wordBank = {
  family: [
    "غسيل مواعين", "لعب كورة", "تصفح الجوال", "نوم في الصالة", "تصوير سيلفي",
    "شرب شاهي حار", "لعب بلايستيشن", "أكل همبرقر", "تنظيف البيت", "تفريش الاسنان",
    "قراءة كتاب", "تسوق في السوبرماركت", "كتابة واجب مدرسي", "ركوب دراجة هوائية"
  ],
  challenge: [
    "تغيير كفر السيارة", "مطاردة ذبابة بالصالة", "فتح علبة قاسية جداً", "تعليم القيادة للمبتدئين",
    "الهروب من كلب يلاحقك", "البحث عن المفاتيح الضائعة", "محاولة المشي على الجليد",
    "الوقوف على رجل واحدة", "تمثيل دور رجل آلي خربان", "صعود جبل مرتفع بالحقيبة",
    "لعب جمباز", "شخص ضاع في الصحراء"
  ],
  heritage: [
    "خض اللبن في السقا", "صب القهوة بالدلة", "حرث الأرض بالمحش", "ركوب ناقة أو جمل",
    "خبز الملة في الجمر", "المشي في بطحاء حامية", "تجهيز بيت الشعر", "جني التمر من النخلة",
    "عزف السمسمية أو الربابة", "شرب حليب خلفات", "شبّة النار بالمنفاخ", "تجهيز القهوة السعودية"
  ]
};

const rooms = {};

function generateRoomCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Host creates room
  socket.on('createRoom', () => {
    const roomCode = generateRoomCode();
    rooms[roomCode] = {
      hostId: socket.id,
      teams: [], 
      gameState: 'lobby', 
      gameMode: 'family', 
      currentWord: '',
      activeTeamIndex: 0,
      wordsAvailable: [],
      skipsUsedThisTurn: 0
    };
    socket.join(roomCode);
    socket.emit('roomCreated', roomCode);
  });

  // Client updates game mode in lobby
  socket.on('updateMode', (data) => {
    const { roomCode, mode } = data;
    const room = rooms[roomCode];
    if (room && room.gameState === 'lobby') {
      room.gameMode = mode;
      io.to(roomCode).emit('modeUpdated', mode);
    }
  });

  // Client joins room
  socket.on('joinRoom', (data) => {
    const { roomCode, teamName, members } = data; // members is now a validated array of player names
    const room = rooms[roomCode];
    if (room) {
      if (room.teams.length >= 2) {
        socket.emit('error', 'الغرفة ممتلئة (الحد الأقصى فريقين)');
        return;
      }
      
      const newTeam = {
        id: socket.id,
        name: teamName,
        members: members, // Array of strings e.g. ['سارة', 'فهد']
        score: 0,
        currentPlayerIndex: 0 // Index to distribute turns
      };
      
      room.teams.push(newTeam);
      socket.join(roomCode);
      socket.emit('joined', newTeam);
      
      // Update Host
      io.to(room.hostId).emit('updateTeams', room.teams);

      // Start game if 2 teams are joined
      if (room.teams.length === 2) {
        room.gameState = 'playing';
        room.wordsAvailable = [...wordBank[room.gameMode]];
        io.to(roomCode).emit('gameStateChanged', room.gameState);
        nextTurn(roomCode);
      }
    } else {
      socket.emit('error', 'رقم الغرفة غير صحيح');
    }
  });

  function nextTurn(roomCode) {
    const room = rooms[roomCode];
    if (!room) return;

    if (room.wordsAvailable.length === 0) {
      room.wordsAvailable = [...wordBank[room.gameMode]];
    }

    const wordIndex = Math.floor(Math.random() * room.wordsAvailable.length);
    room.currentWord = room.wordsAvailable.splice(wordIndex, 1)[0];
    room.skipsUsedThisTurn = 0;

    const activeTeam = room.teams[room.activeTeamIndex];
    
    // Distribute turns automatically among registered members
    if (activeTeam.currentPlayerIndex === undefined) {
      activeTeam.currentPlayerIndex = 0;
    }
    
    const activePlayerName = activeTeam.members[activeTeam.currentPlayerIndex];
    
    // Advance index for the team's next turn
    activeTeam.currentPlayerIndex = (activeTeam.currentPlayerIndex + 1) % activeTeam.members.length;
    
    io.to(roomCode).emit('turnUpdate', {
      activeTeamId: activeTeam.id,
      activeTeamName: activeTeam.name,
      activePlayerName: activePlayerName,
      skipsUsed: room.skipsUsedThisTurn
    });
    
    io.to(activeTeam.id).emit('yourTurn', { 
      word: room.currentWord,
      activePlayerName: activePlayerName,
      skipsUsed: room.skipsUsedThisTurn
    });
  }

  // Client starts timer
  socket.on('startTimer', (roomCode) => {
    const room = rooms[roomCode];
    if (room && room.teams[room.activeTeamIndex].id === socket.id) {
      io.to(roomCode).emit('timerStarted');
    }
  });

  // Client skips word
  socket.on('skipWord', (roomCode) => {
    const room = rooms[roomCode];
    if (room && room.teams[room.activeTeamIndex].id === socket.id && room.skipsUsedThisTurn < 1) {
      room.skipsUsedThisTurn += 1;
      
      if (room.wordsAvailable.length === 0) {
        room.wordsAvailable = [...wordBank[room.gameMode]];
      }
      const wordIndex = Math.floor(Math.random() * room.wordsAvailable.length);
      room.currentWord = room.wordsAvailable.splice(wordIndex, 1)[0];

      // 3 seconds penalty
      io.to(room.hostId).emit('skipPenalty', 3); 
      
      const activeTeam = room.teams[room.activeTeamIndex];
      // Keep same player since it's just a skip of word, not change of turn
      const prevPlayerIndex = (activeTeam.currentPlayerIndex - 1 + activeTeam.members.length) % activeTeam.members.length;
      const activePlayerName = activeTeam.members[prevPlayerIndex];

      io.to(socket.id).emit('yourTurn', { 
        word: room.currentWord,
        activePlayerName: activePlayerName,
        skipsUsed: room.skipsUsedThisTurn
      });
      
      io.to(roomCode).emit('skipLogged', {
        activeTeamName: activeTeam.name
      });
    }
  });

  // Client succeeds
  socket.on('success', (roomCode) => {
    const room = rooms[roomCode];
    if (room && room.teams[room.activeTeamIndex].id === socket.id) {
      room.teams[room.activeTeamIndex].score += 1;
      room.activeTeamIndex = (room.activeTeamIndex + 1) % room.teams.length;
      
      io.to(roomCode).emit('updateTeams', room.teams);
      nextTurn(roomCode);
    }
  });
  
  // Timer ran out
  socket.on('timeOut', (roomCode) => {
    const room = rooms[roomCode];
    if(room && room.hostId === socket.id) {
      room.activeTeamIndex = (room.activeTeamIndex + 1) % room.teams.length;
      io.to(roomCode).emit('bombExploded');
      setTimeout(() => {
        nextTurn(roomCode);
      }, 4000);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
