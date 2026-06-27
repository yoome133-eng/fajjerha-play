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
const wordBank = [
  "اللي ما يعرف الصقر يشويه", "رجعت حليمه لعادتها القديمه", "اسأل مجرب ولا تسأل طبيب", "مد رجليك على قد لحافك", 
  "درهم وقاية خير من قنطار علاج", "الصبر مفتاح الفرج", "لكل مجتهد نصيب", "من جد وجد ومن زرع حصد", 
  "اليد الواحدة ما تصفق", "اللي فات مات", "اللي أوله شرط آخره نور", "الباب اللي يجيك منه الريح سده واستريح", 
  "الطيور على أشكالها تقع", "اللي ما يطول العنب يقول حامض", "إذا فات الفوت ما ينفع الصوت", "جبتك عون صرتلي فرعون", 
  "من شب على شيء شاب عليه", "الحاجة أم الاختراع", "رب أخ لك لم تلده أمك", "من حفر حفرة لأخيه وقع فيها", 
  "صام صام وفطر على بصله", "اللي بيته من زجاج لا يرمي الناس بالحجارة", "العين بصيرة واليد قصيرة", "القنعانه شبعانه والطمعانه جيعانه", 
  "ما كل ما يتمنى المرء يدركه", "اللي سبق لبق", "كل تأخيرة فيها خيرة", "اللي يزرع يحصد", 
  "كل إناء بما فيه ينضح", "إذا كان الكلام من فضة فالسكوت من ذهب", "الجار قبل الدار", "لسانك حصانك إن صنته صانك وإن هنته هانك", 
  "اللي يده في النار مو مثل اللي يده في الموية", "امشِ عدل يحتار عدوك فيك", "إن غاب القط العب يا فأر", "لا تؤجل عمل اليوم إلى الغد", 
  "النار ما تحرق إلا رجل واطيها", "الكذب حبله قصير", "الضربة اللي ما تكسرك تقويك", "اللي يبي الدح ما يقول أح", 
  "من طق باب الناس طقوا بابه", "القرد في عين أمه غزال", "ما يحك جلدك مثل ظفرك", "الطول طول نخلة والعقل عقل صخلة", 
  "إذا طاح الجمل كثرت سكاكينه", "إذا صاحبك عسل لا تلحسه كله", "قال أنفخ يا شريم قال ما من برطم", "كل يشوف الناس بعين طبعه", 
  "جلد موب جلدك جره على الشوك", "أقلب الجرة على فمها تطلع البنت لأمها", "يامن شراله من حلاله علّه", "قالو ثور قال احلبوه", 
  "ما يبطي السيل إلا من كبره", "الحي يحييك والميت يزيدك غبن"
];

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
        room.wordsAvailable = [...wordBank];
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
      room.wordsAvailable = [...wordBank];
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
        room.wordsAvailable = [...wordBank];
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
