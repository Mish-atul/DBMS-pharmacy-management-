import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [view, setView] = useState('login'); // login, register, medicines, upload, chat
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [medicines, setMedicines] = useState([]);
  const [ocrResult, setOcrResult] = useState('');
  const [chatLog, setChatLog] = useState([{ role: 'bot', text: 'Hello! I am your AI health assistant. How can I help you today?' }]);
  const [chatInput, setChatInput] = useState('');

  // --- Auth Handlers ---
  const handleLogin = async (e) => {
    e.preventDefault();
    const username = e.target.username.value;
    const password = e.target.password.value;
    const res = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (res.ok) {
      setUser(data.user);
      setView('medicines');
    } else {
      alert(data.error);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const username = e.target.username.value;
    const password = e.target.password.value;
    const res = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (res.ok) {
      alert("Registered! Please login.");
      setView('login');
    } else {
      alert(data.error);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setView('login');
  };

  // --- Medicine Handlers ---
  const fetchMedicines = async () => {
    const url = searchTerm
      ? `http://localhost:3000/api/medicines?search=${searchTerm}`
      : 'http://localhost:3000/api/medicines';
    const res = await fetch(url);
    const data = await res.json();
    setMedicines(data.medicines);
  };

  useEffect(() => {
    if (view === 'medicines') {
      fetchMedicines();
    }
  }, [view, searchTerm]);

  // --- OCR Handler ---
  const handleUpload = async (e) => {
    e.preventDefault();
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('prescription', file);

    setOcrResult("Processing... please wait.");

    const res = await fetch('http://localhost:3000/api/upload-prescription', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (res.ok) {
      setOcrResult(data.extractedText);
    } else {
      setOcrResult("Error: " + data.error);
    }
  };

  // --- Chat Handler ---
  const handleChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newLog = [...chatLog, { role: 'user', text: chatInput }];
    setChatLog(newLog);
    const msg = chatInput;
    setChatInput('');

    const res = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg })
    });
    const data = await res.json();
    setChatLog([...newLog, { role: 'bot', text: data.reply }]);
  };


  // --- Render Sections ---
  if (!user && view !== 'register') {
    return (
      <div className="auth-container">
        <div className="auth-box">
          <h1>Welcome Back</h1>
          <p>Login to access your pharmacy dashboard</p>
          <form className="auth-form" onSubmit={handleLogin}>
            <div className="input-group">
              <i className="fas fa-user"></i>
              <input name="username" placeholder="Username" required />
            </div>
            <div className="input-group">
              <i className="fas fa-lock"></i>
              <input name="password" type="password" placeholder="Password" required />
            </div>
            <button className="primary-btn" type="submit">Login</button>
          </form>
          <p style={{ marginTop: '20px' }}>
            New here?
            <button className="link-btn" onClick={() => setView('register')}>Create an account</button>
          </p>
        </div>
      </div>
    );
  }

  if (!user && view === 'register') {
    return (
      <div className="auth-container">
        <div className="auth-box">
          <h1>Create Account</h1>
          <p>Join PharmaDemo today</p>
          <form className="auth-form" onSubmit={handleRegister}>
            <div className="input-group">
              <i className="fas fa-user-plus"></i>
              <input name="username" placeholder="Choose Username" required />
            </div>
            <div className="input-group">
              <i className="fas fa-key"></i>
              <input name="password" type="password" placeholder="Choose Password" required />
            </div>
            <button className="primary-btn" type="submit">Register</button>
          </form>
          <p style={{ marginTop: '20px' }}>
            Already have an account?
            <button className="link-btn" onClick={() => setView('login')}>Login here</button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <nav className="navbar">
        <div className="logo">
          <i className="fas fa-prescription-bottle-alt"></i>
          PharmaDemo
        </div>
        <div className="nav-links">
          <button className={view === 'medicines' ? 'active' : ''} onClick={() => setView('medicines')}>
            <i className="fas fa-pills"></i> Medicines
          </button>
          <button className={view === 'upload' ? 'active' : ''} onClick={() => setView('upload')}>
            <i className="fas fa-file-medical-alt"></i> Upload Rx
          </button>
          <button className={view === 'chat' ? 'active' : ''} onClick={() => setView('chat')}>
            <i className="fas fa-robot"></i> AI Assistant
          </button>
          <button className="logout-btn" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>
      </nav>

      <main className="content">
        {view === 'medicines' && (
          <div className="medicines-page">
            <div className="page-header">
              <h2>Find Medicines</h2>
              <p style={{ color: '#64748b' }}>Search our extensive database of medicines</p>
            </div>
            <div className="search-bar">
              <input
                placeholder="Search medicines, composition, usage..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button className="search-btn" onClick={fetchMedicines}>
                <i className="fas fa-search"></i>
              </button>
            </div>
            <div className="medicine-grid">
              {medicines.map(med => (
                <div key={med.medicine_id} className="medicine-card">
                  <div className="card-img-wrapper">
                    {med.image_url ?
                      <img src={med.image_url} alt={med.name} onError={(e) => e.target.style.display = 'none'} />
                      : <i className="fas fa-image placeholder-img"></i>
                    }
                  </div>
                  <div className="card-content">
                    <h3>{med.name}</h3>
                    <span className="badge">{med.composition}</span>
                    <p className="details"><strong>Uses:</strong> {med.uses}</p>
                    <div className="stats">
                      <div className="rating">
                        <i className="fas fa-star"></i> {med.excellent_review_pct}%
                      </div>
                      <button className="add-btn" onClick={() => alert('Added to cart mock!')}>
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'upload' && (
          <div className="upload-container">
            <h2>Upload Prescription</h2>
            <p style={{ color: '#64748b', marginBottom: '30px' }}>Upload a clear image of your prescription to digitize it.</p>

            <label className="upload-box">
              <input type="file" className="file-input" accept="image/*" onChange={handleUpload} />
              <i className="fas fa-cloud-upload-alt upload-icon"></i>
              <h4>Click or Drag to Upload</h4>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Supported formats: PNG, JPG, JPEG</p>
            </label>

            {ocrResult && (
              <div className="ocr-result-box">
                <h3><i className="fas fa-file-alt"></i> Extracted Text</h3>
                <div className="ocr-code">{ocrResult}</div>
              </div>
            )}
          </div>
        )}

        {view === 'chat' && (
          <div className="chat-container">
            <div className="chat-header">
              <i className="fas fa-user-md"></i>
              <div>
                <h2>Dr. Bot</h2>
                <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>Always online</span>
              </div>
            </div>

            <div className="chat-messages">
              {chatLog.map((msg, idx) => (
                <div key={idx} className={`message-bubble ${msg.role}`}>
                  {msg.text}
                </div>
              ))}
            </div>

            <form onSubmit={handleChat} className="chat-input-wrapper">
              <div className="input-row">
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder="Type your symptoms or questions..."
                />
                <button type="submit" className="send-btn">
                  <i className="fas fa-paper-plane"></i>
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
