import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Host from './Host';
import Client from './Client';
import './index.css';

function Home() {
  return (
    <div className="container">
      
      {/* Main Container Card */}
      <div className="premium-card" style={{ maxWidth: '750px', width: '100%' }}>
        
        {/* Logo Container */}
        <div className="logo-container">
          <img src="/logo.png" alt="شعار فجرها" className="logo-img" />
        </div>
        
        <h1 className="game-title">فجّرها</h1>
        <p className="subtitle">لعبة التحدي، السرعة، والتمثيل بدون كلام للجمعات والاحتفالات</p>
        
        {/* Grid layout for two actions */}
        <div className="modes-layout" style={{ margin: '30px 0' }}>
          
          {/* Card Option 1: Host Screen */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '20px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
          }}>
            <div>
              <h3 style={{ margin: '0 0 10px 0', color: '#fb8500', fontSize: '1.35rem' }}>📺 شاشة العرض الرئيسية</h3>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem', lineHeight: '1.6' }}>
                افتح هذه الشاشة على التلفزيون أو الكمبيوتر لعرض مؤقت القنبلة وتسجيل نقاط الفريقين بشكل مباشر أمام الجميع.
              </p>
            </div>
            <Link to="/host" style={{ textDecoration: 'none', marginTop: '20px' }}>
              <button className="btn-neon btn-orange" style={{ margin: 0 }}>
                إنشاء غرفة لعب 🚀
              </button>
            </Link>
          </div>

          {/* Card Option 2: Join Client */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '20px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
          }}>
            <div>
              <h3 style={{ margin: '0 0 10px 0', color: '#00b4d8', fontSize: '1.35rem' }}>📱 أجهزة اللاعبين (الجوال)</h3>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem', lineHeight: '1.6' }}>
                ادخل من الجوال لتسجيل أسماء الفرق ورؤية الأمثلة الشعبية السرية التي ستقوم بتمثيلها.
              </p>
            </div>
            <Link to="/join" style={{ textDecoration: 'none', marginTop: '20px' }}>
              <button className="btn-neon btn-cyan" style={{ margin: 0 }}>
                انضمام كلاعب 🎮
              </button>
            </Link>
          </div>

        </div>

        {/* Instructions Section (خانة التعليمات) */}
        <div className="instructions-card">
          <h3>💡 كيف نلعب "فجّرها"؟</h3>
          <ul style={{ margin: 0, paddingRight: '20px', color: '#64748b', lineHeight: '1.8' }}>
            <li>ينقسم الحضور إلى فريقين، ويلعب كل فريق باستخدام جوال واحد مشترك بالدور.</li>
            <li>يقوم ممثل الفريق بقراءة المثال الشعبي السرّي من الجوال ثم يضغط <strong>"ابدأ"</strong>.</li>
            <li>الممثل يمثّل المثال لأعضاء فريقه <strong>بدون كلام نهائياً (إشارات فقط)</strong> خلال دقيقة واحدة (60 ثانية).</li>
            <li>إذا عرف الفريق الحل، يضغط الممثل على <strong>"صح!"</strong> لتنتقل القنبلة والمثال التالي للفريق الآخر فوراً.</li>
            <li>الفريق الذي تنفجر القنبلة في دوره يخسر الجولة وتذهب النقطة للخصم!</li>
          </ul>
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
