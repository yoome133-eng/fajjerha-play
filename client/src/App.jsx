import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Host from './Host';
import Client from './Client';
import './index.css';

function Home() {
  return (
    <div className="container">
      
      {/* Main Container Card */}
      <div className="premium-card" style={{ maxWidth: '750px', width: '100%' }}>
        
        {/* Header Section (Logo + Title side by side) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', marginBottom: '10px' }}>
          <img src="/logo.png" alt="شعار فجرها" style={{ width: '80px', height: '80px', objectFit: 'contain', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }} />
          <h1 className="game-title" style={{ margin: 0, fontSize: '4rem' }}>فجّرها</h1>
        </div>
        
        <p className="subtitle" style={{ marginBottom: '25px', fontSize: '1.15rem', fontWeight: 'bold' }}>لعبة التحدي والسرعة بالأمثال الشعبية للجمعات والاحتفالات 💣🌴</p>

        {/* Primary Action Button (Moved UP!) */}
        <Link to="/host" style={{ textDecoration: 'none', width: '100%', display: 'block', marginBottom: '15px' }}>
          <button className="btn-neon btn-orange" style={{ margin: '0 auto', maxWidth: '400px', fontSize: '1.5rem', padding: '18px', borderRadius: '20px', boxShadow: '0 8px 25px rgba(251, 133, 0, 0.4)' }}>
            ابدأ اللعبة الآن 🚀
          </button>
        </Link>
        
        <div style={{ marginBottom: '35px' }}>
          <Link to="/join" style={{ color: '#00b4d8', fontSize: '1.1rem', fontWeight: 'bold', textDecoration: 'none' }}>
            📱 <span style={{ textDecoration: 'underline' }}>هل تريد الانضمام كلاعب؟ اضغط هنا</span>
          </Link>
        </div>

        {/* Info Grid (Side by side for large screens, stack for mobile) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', textAlign: 'right' }}>
          
          {/* About Game Section */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#fb8500', fontSize: '1.25rem' }}>💡 عن اللعبة:</h3>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem', lineHeight: '1.7' }}>
              <strong>"فجّرها"</strong> هي لعبة حماسية تعتمد على سرعة البديهة والتمثيل الصامت. 
              ينقسم الحضور لفريقين، ويتناوب اللاعبون على تمثيل الأمثال الشعبية لأعضاء فريقهم بالإشارة فقط، قبل أن ينتهي مؤقت القنبلة وتنفجر في دور فريقهم!
            </p>
          </div>

          {/* Instructions Section */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#00b4d8', fontSize: '1.25rem' }}>🎮 كيف تلعبونها؟</h3>
            <ul style={{ margin: 0, paddingRight: '20px', color: '#64748b', lineHeight: '1.7', fontSize: '0.95rem' }}>
              <li><strong>1.</strong> افتحوا اللعبة على التلفزيون واضغطوا "ابدأ اللعبة".</li>
              <li><strong>2.</strong> امسحوا الباركود بالجوالات للانضمام للغرفة.</li>
              <li><strong>3.</strong> سلّم الجوال للممثل ليقرأ المثل السرّي.</li>
              <li><strong>4.</strong> شغّل الوقت ومثّل لفريقك بالإشارة ليعرفوا المثل.</li>
              <li><strong>5.</strong> اضغط "صح" لتنتقل القنبلة للخصم قبل انفجارها!</li>
            </ul>
          </div>

        </div>

      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/host" element={<Host />} />
        <Route path="/join" element={<Client />} />
      </Routes>
    </Router>
  );
}
