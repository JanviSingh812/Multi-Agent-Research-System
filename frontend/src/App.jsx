import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import './index.css'
import './darkmode.css'

const FollowUpChat = ({ report }) => {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;
    
    const newMsg = { role: 'user', content: question };
    setMessages(prev => [...prev, newMsg]);
    const currentQ = question;
    setQuestion('');
    setLoading(true);
    
    // We can't rely on state length synchronously for the next index, so we use a functional update
    let aiMsgIndex = 0;
    setMessages(prev => {
      aiMsgIndex = prev.length;
      return [...prev, { role: 'ai', content: '' }];
    });

    try {
      const res = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report, question: currentQ })
      });

      if (!res.body) throw new Error("ReadableStream not supported");
      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim() !== '');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.substring(6);
            const data = JSON.parse(dataStr);
            if (data.type === 'chunk') {
              setMessages(prev => {
                const newMsgs = [...prev];
                if (newMsgs[aiMsgIndex]) {
                  newMsgs[aiMsgIndex].content += data.content;
                }
                return newMsgs;
              });
            }
          } else {
             try {
                const data = JSON.parse(line);
                if (data.type === 'chunk') {
                  setMessages(prev => {
                    const newMsgs = [...prev];
                    if (newMsgs[aiMsgIndex]) {
                      newMsgs[aiMsgIndex].content += data.content;
                    }
                    return newMsgs;
                  });
                }
             } catch(err) {}
          }
        }
      }
    } catch (e) {
      console.error(e);
      setMessages(prev => {
        const newMsgs = [...prev];
        if (newMsgs[aiMsgIndex]) {
           newMsgs[aiMsgIndex].content += "\n[Error connecting to AI]";
        }
        return newMsgs;
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--border-color)'}}>
      <h3 className="section-title" style={{color: 'var(--text-main)', fontSize: '1.2rem', marginBottom: '1rem'}}>💬 Follow-Up Q&A</h3>
      <div style={{background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)'}}>
        <div style={{maxHeight: '300px', overflowY: 'auto', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem'}}>
          {messages.length === 0 && <p style={{color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center'}}>Ask a question about this report!</p>}
          {messages.map((m, i) => (
            <div key={i} style={{alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', background: m.role === 'user' ? '#3b82f6' : 'var(--bg-main)', color: m.role === 'user' ? 'white' : 'var(--text-main)', padding: '0.75rem 1rem', borderRadius: '8px', maxWidth: '80%', border: m.role === 'ai' ? '1px solid var(--border-color)' : 'none'}}>
              <ReactMarkdown>{m.content}</ReactMarkdown>
            </div>
          ))}
        </div>
        <form onSubmit={handleAsk} style={{display: 'flex', gap: '0.5rem'}}>
          <input 
            type="text" 
            placeholder="E.g., What are the main limitations mentioned?" 
            value={question}
            onChange={e => setQuestion(e.target.value)}
            disabled={loading}
            style={{flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-main)'}}
          />
          <button type="submit" disabled={loading} style={{padding: '0.75rem 1.5rem', borderRadius: '8px', background: '#3b82f6', color: 'white', border: 'none', fontWeight: 'bold', cursor: 'pointer', opacity: loading ? 0.7 : 1}}>
            {loading ? '...' : 'Ask'}
          </button>
        </form>
      </div>
    </div>
  );
};

function App() {
  const [topic, setTopic] = useState('LLM agents 2025')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState({})
  const [focusArea, setFocusArea] = useState('General Web')
  
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userId, setUserId] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [currentPage, setCurrentPage] = useState('home')
  const [historyList, setHistoryList] = useState([])
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null)
  const [researchDepth, setResearchDepth] = useState('Standard')

  useEffect(() => {
    document.body.classList.toggle('dark', isDarkMode)
    document.documentElement.classList.toggle('dark', isDarkMode)
  }, [isDarkMode])

  const loadHistory = async () => {
    if (!userId) return;
    try {
      const res = await fetch(`http://localhost:8000/api/history?user_id=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setHistoryList(data);
      }
    } catch(e) { console.error(e) }
  }

  useEffect(() => {
    if (currentPage === 'history') loadHistory();
  }, [currentPage, userId])
  
  // Mock live logs
  const [logs, setLogs] = useState([])
  const logsEndRef = useRef(null)

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [logs])

  const addLog = (msg) => {
    setLogs(prev => [...prev, msg])
  }

  const handleRun = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setResults({});
    setLogs([]);
    addLog(`[System] Initializing ResearchMind for topic: ${topic}...`);
    
    try {
      const response = await fetch('http://localhost:8000/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, user_id: userId })
      });

      if (!response.body) throw new Error('ReadableStream not yet supported in this browser.');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          addLog(`[System] Pipeline complete.`);
          break;
        }
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim() !== '');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const dataStr = line.substring(6);
              const data = JSON.parse(dataStr);
              setResults(prev => ({
                ...prev,
                [data.step]: { status: data.status, result: data.result }
              }));
              
              if (data.status === 'running') {
                 addLog(`[${data.step.toUpperCase()}] Started task...`);
              } else if (data.status === 'done') {
                 addLog(`[${data.step.toUpperCase()}] Finished processing successfully.`);
              }
            } catch (e) {
              console.error("Error parsing JSON:", e, "Line:", line);
            }
          }
        }
      }
    } catch (error) {
      console.error("Pipeline failed", error);
      addLog(`[Error] Pipeline failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  // Helper to extract URLs for the mock Reference Feed
  const extractUrls = (text) => {
    if (!text) return [];
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = text.match(urlRegex) || [];
    // remove markdown trailing characters if any
    return urls.map(u => u.replace(/[)\]"']$/, '')).slice(0, 5); 
  }

  const searchUrls = extractUrls(results.search?.result);
  
  // Provide mock references if none yet
  const refList = searchUrls.length > 0 ? searchUrls : [
    "https://www.nature.com/articles/s41586",
    "https://arxiv.org/abs/2305.14322",
    "https://github.com/langchain-ai",
    "https://www.technologyreview.com/"
  ];

  const getStatusText = (stepName) => {
    if (!results[stepName]) return 'WAITING';
    if (results[stepName].status === 'running') return stepName === 'search' ? 'GATHERING' : stepName === 'reader' ? 'ANALYZING' : 'GENERATING';
    if (results[stepName].status === 'done') return 'DONE';
    return 'WAITING';
  };

  const [isLoginPage, setIsLoginPage] = useState(false);
  const [authMode, setAuthMode] = useState('login');

  const getCardClass = (stepName, baseClass) => {
    if (!results[stepName]) return `${baseClass} card-inactive`;
    if (results[stepName].status === 'running' || results[stepName].status === 'done') return baseClass;
    return `${baseClass} card-inactive`;
  }

  const handleAuth = async (e) => {
    e.preventDefault();
    const endpoint = authMode === 'login' ? '/api/login' : '/api/signup';
    try {
      const res = await fetch(`http://localhost:8000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (res.ok) {
        const data = await res.json();
        setUserId(data.id);
        setIsAuthenticated(true);
        setIsLoginPage(false);
        setShowAuthModal(false);
      } else {
        const err = await res.json();
        alert(`Error: ${err.detail}`);
      }
    } catch(e) { console.error(e); alert('Connection error'); }
  }

  const renderAuthCardContent = () => (
    <div className="auth-card-inner">
      <div style={{ padding: '2rem 2rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'center' }}>
        <div style={{ width: '48px', height: '48px', position: 'relative' }}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M24 4L40 13V31L24 40L8 31V13L24 4Z" stroke="#8b5cf6" strokeWidth="2" strokeLinejoin="round" fill="rgba(139,92,246,0.1)"/>
            <circle cx="24" cy="4" r="3" fill="#4c148b"/>
            <circle cx="40" cy="13" r="3" fill="#4c148b"/>
            <circle cx="40" cy="31" r="3" fill="#4c148b"/>
            <circle cx="24" cy="40" r="3" fill="#4c148b"/>
            <circle cx="8" cy="31" r="3" fill="#4c148b"/>
            <circle cx="8" cy="13" r="3" fill="#4c148b"/>
            <text x="24" y="29" fontSize="16" fontWeight="bold" fill="#4c148b" textAnchor="middle">RM</text>
            <path d="M40 13L46 7M46 7H40M46 7V13" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div style={{ textAlign: 'left' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>ResearchMind</h2>
          <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>Multi-Agent AI System</p>
        </div>
      </div>

      <div className="auth-tabs">
         <button className={`auth-tab ${authMode === 'login' ? 'active' : ''}`} onClick={() => setAuthMode('login')}>Log In</button>
         <button className={`auth-tab ${authMode === 'signup' ? 'active' : ''}`} onClick={() => setAuthMode('signup')}>Sign Up</button>
      </div>

      <div className="auth-body">
        <form className="auth-form" onSubmit={handleAuth}>
           <div className="auth-field">
             <label>Email</label>
             <input type="email" placeholder="name@example.com" className="auth-input-new" required value={email} onChange={e=>setEmail(e.target.value)} />
           </div>
           <div className="auth-field">
             <label>Password</label>
             <input type="password" placeholder="••••••••" className="auth-input-new" required value={password} onChange={e=>setPassword(e.target.value)} />
           </div>
           
           <button type="submit" className="auth-submit-btn-new">
             {authMode === 'login' ? 'Sign in' : 'Create Account'}
           </button>
        </form>

        {authMode === 'login' && (
          <div className="auth-helper-links">
             <button type="button" className="helper-link-btn">Forgot your password?</button>
             <button type="button" className="helper-link-btn">Sign in via magic link</button>
          </div>
        )}
      </div>

      <div className="auth-social-section">
         <button type="button" className="social-btn-white" onClick={() => {setIsAuthenticated(true); setIsLoginPage(false); setShowAuthModal(false);}}>
           <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.43 9.8 8.2 11.38.6.11.82-.26.82-.58v-2.16c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.49.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.53.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 016 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.8 5.62-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58C20.57 21.8 24 17.31 24 12c0-6.63-5.37-12-12-12z"/></svg>
           Continue with GitHub
         </button>
         <button type="button" className="social-btn-white" onClick={() => {setIsAuthenticated(true); setIsLoginPage(false); setShowAuthModal(false);}}>
           <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#EA4335" d="M12 4.62c1.78 0 3.39.61 4.65 1.8l3.49-3.49A11.96 11.96 0 0012 0C7.29 0 3.22 2.72 1.15 6.75l4.03 3.12C6.15 6.64 8.84 4.62 12 4.62z"/><path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.68-.22-2.48H12v4.69h6.44c-.28 1.5-1.12 2.77-2.38 3.61v3h3.86c2.26-2.08 3.58-5.14 3.58-8.82z"/><path fill="#FBBC05" d="M5.18 9.87A7.19 7.19 0 004.82 12c0 .76.13 1.49.36 2.13l-4.03 3.12A11.96 11.96 0 010 12c0-1.92.46-3.73 1.25-5.35l3.93 3.22z"/><path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.86-3c-1.08.73-2.45 1.16-4.08 1.16-3.16 0-5.85-2.02-6.82-4.75l-4.03 3.12C3.22 21.28 7.29 24 12 24z"/></svg>
           Continue with Google
         </button>
      </div>

      {authMode === 'signup' && (
        <div className="auth-footer-terms">
          By signing up, you agree to our <a>Terms of Service</a> and <a>Privacy Policy</a>
        </div>
      )}
    </div>
  );

  if (isLoginPage) {
    return (
      <div className="login-page-container">
        <button className="auth-close-btn" style={{position:'absolute', top:'2rem', right:'2rem'}} onClick={() => setIsLoginPage(false)}>
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
        <div className="auth-modal-card" style={{ animation: 'fadeIn 0.5s ease-out' }}>
          {renderAuthCardContent()}
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Auth Modal Overlay */}
      {showAuthModal && (
        <div className="auth-modal-overlay" onClick={() => setShowAuthModal(false)}>
          <div style={{position:'relative', width: '100%', maxWidth: '400px', display: 'flex', justifyContent: 'center'}}>
            <button className="auth-close-btn" style={{position:'absolute', right:'-40px', top:'0', background:'white', borderRadius:'50%', padding:'8px', color:'black', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}} onClick={() => setShowAuthModal(false)}>
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
            <div className="auth-modal-card" onClick={e => e.stopPropagation()}>
              {renderAuthCardContent()}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="header-wrapper">
        <div className="top-right-actions" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
           <button className="action-btn" onClick={() => setIsDarkMode(!isDarkMode)} title="Toggle Dark Mode" style={{ border: 'none', background: 'transparent', boxShadow: 'none' }}>
             {isDarkMode ? (
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color: '#facc15'}}>
                 <circle cx="12" cy="12" r="5"></circle>
                 <line x1="12" y1="1" x2="12" y2="3"></line>
                 <line x1="12" y1="21" x2="12" y2="23"></line>
                 <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                 <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                 <line x1="1" y1="12" x2="3" y2="12"></line>
                 <line x1="21" y1="12" x2="23" y2="12"></line>
                 <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                 <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
               </svg>
             ) : (
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color: '#4c148b'}}>
                 <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
               </svg>
             )}
           </button>
           {isAuthenticated && (
             <button className="btn-run" onClick={() => setCurrentPage(currentPage === 'home' ? 'history' : 'home')} style={{ width: 'auto', padding: '0.5rem 1.2rem', fontSize: '0.9rem', borderRadius: '20px', background: '#3b82f6' }}>
               {currentPage === 'home' ? 'History' : 'Home'}
             </button>
           )}
           {!isAuthenticated ? (
             <button className="btn-run" onClick={() => setShowAuthModal(true)} style={{ width: 'auto', padding: '0.5rem 1.2rem', fontSize: '0.9rem', borderRadius: '20px' }}>
               Sign In
             </button>
           ) : (
             <button className="btn-run" onClick={() => { setIsAuthenticated(false); setUserId(null); setCurrentPage('home'); }} style={{ width: 'auto', padding: '0.5rem 1.2rem', fontSize: '0.9rem', borderRadius: '20px', background: '#ec4899' }}>
               Sign Out
             </button>
           )}
        </div>
        <h1 className="main-title">ResearchMind</h1>
        <p className="sub-title">
          Four specialized AI agents collaborate — searching, scraping,<br/>
          writing, and critiquing — to deliver a polished research report.
        </p>
      </div>

      {currentPage === 'history' ? (
        <div className="history-layout">
          <div className="history-sidebar">
            <h3 style={{fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--text-main)'}}>Search History</h3>
            {historyList.length === 0 && <p style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>No history found.</p>}
            {historyList.map(item => (
              <div key={item.id} className={`history-item ${selectedHistoryItem?.id === item.id ? 'active' : ''}`} onClick={() => {
                setSelectedHistoryItem(item);
              }}>
                <div style={{fontWeight: 600, marginBottom: '0.2rem'}}>{item.topic}</div>
                <div style={{fontSize: '0.7rem', color: 'var(--text-muted)'}}>{new Date(item.timestamp).toLocaleString()}</div>
              </div>
            ))}
          </div>
          <div className="history-content">
            {selectedHistoryItem ? (
              <div className="glass-panel" style={{height: '100%', overflowY: 'auto', padding: '2rem'}}>
                <h2 className="section-title" style={{color: '#4c148b', marginBottom: '1.5rem'}}>{selectedHistoryItem.topic}</h2>
                <div className="markdown-content">
                  <ReactMarkdown
                    components={{
                      a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" style={{color: '#3b82f6', textDecoration: 'underline'}} />
                    }}
                  >
                    {selectedHistoryItem.result}
                  </ReactMarkdown>
                </div>
                
                {/* Embedded Follow-Up Chat for History */}
                <FollowUpChat report={selectedHistoryItem.result} />
              </div>
            ) : (
              <div className="glass-panel" style={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)'}}>
                Select an item from history to view the full report here.
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Main Grid */}
          <div className="dashboard-grid">
        
        {/* Left Column */}
        <div className="left-col">
          <div className="glass-panel input-card">
            <span className="label-sm">RESEARCH TOPIC</span>
            <div className="search-input-wrapper">
              <input 
                type="text" 
                className="search-input"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="e.g. LLM agents 2025"
                disabled={loading}
              />
              <svg className="search-icon" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
            <button className="btn-run" onClick={handleRun} disabled={loading || !topic.trim()}>
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
              {loading ? 'Pipeline Running...' : 'Run Research Pipeline'}
            </button>
          </div>

          <div className="try-section">
            <span className="try-label">TRY →</span>
            {["LLM agents 2025", "CRISPR gene editing", "Fusion energy progress"].map(ex => (
              <span key={ex} className="try-chip" onClick={() => !loading && setTopic(ex)}>
                {ex}
              </span>
            ))}
          </div>

          <div className="glass-panel">
            <div className="config-header">
              <div className="config-title">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{color: '#fb923c'}}><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                Advanced Config
              </div>
              <svg width="16" height="16" fill="none" stroke="#94a3b8" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 15l7-7 7 7"></path></svg>
            </div>
            
            <div className="slider-container">
              <span className="label-sm">
                Research Depth
                {isAuthenticated ? <span style={{color: '#10b981', marginLeft: '6px', fontSize: '0.65rem'}}>🔓 Premium Enabled</span> : <span style={{color: '#f59e0b', marginLeft: '6px', fontSize: '0.65rem'}}>🔒 Deep search requires login</span>}
              </span>
              <div className="slider-track">
                 <div className="slider-fill" style={{ width: researchDepth === 'Quick' ? '0%' : researchDepth === 'Standard' ? '50%' : '100%', transition: 'width 0.3s' }}></div>
                 <div className="slider-thumb" style={{ left: researchDepth === 'Quick' ? '0%' : researchDepth === 'Standard' ? '50%' : '100%', transition: 'left 0.3s' }}></div>
              </div>
              <div className="slider-labels">
                 <span onClick={() => setResearchDepth('Quick')} style={{cursor:'pointer', color: researchDepth==='Quick'?'#4c148b':''}}>Quick</span>
                 <span onClick={() => setResearchDepth('Standard')} style={{cursor:'pointer', color: researchDepth==='Standard'?'#4c148b':''}}>Standard</span>
                 <span onClick={() => { if(!isAuthenticated) setShowAuthModal(true); else setResearchDepth('Deep'); }} style={{cursor:'pointer', color: researchDepth==='Deep'?'#4c148b':''}}>Deep</span>
              </div>
            </div>

            <div className="slider-container" style={{marginBottom: 0}}>
              <span className="label-sm">Focus Area</span>
              <div className="focus-area-group">
                 {['General Web', 'Academic Papers', 'GitHub'].map(area => (
                   <button 
                     key={area}
                     className={`focus-btn ${focusArea === area ? 'active' : ''}`}
                     onClick={() => setFocusArea(area)}
                   >
                     {area}
                   </button>
                 ))}
              </div>
            </div>
          </div>
        </div>

        {/* Middle Column */}
        <div className="mid-col">
          <h2 className="section-title">Pipeline</h2>
          <div className="pipeline-grid">
            
            {/* Search Card */}
            <div className={`pipe-card ${getCardClass('search', 'card-search')}`}>
               <div className="pipe-card-header">
                  <div className="pipe-card-title">
                     <svg className="icon" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7l6-2.5 5.447 2.724A1 1 0 0121 8.118v10.764a1 1 0 01-1.447.894L15 17l-6 2.5z"></path></svg>
                     Search Agent
                  </div>
                  <span className="pipe-card-num">01</span>
               </div>
               <span className="pipe-card-status">{getStatusText('search')}</span>
               <div className="card-content-text">
                  {results.search?.status === 'done' ? `Found: 5 sources\nProcessing completed.` : `Awaiting search query...`}
               </div>
               {/* Mock Chart SVG */}
               <svg style={{marginTop: 'auto', opacity: 0.6}} width="100%" height="30" viewBox="0 0 150 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M0 25C10 25 15 15 25 15C35 15 40 25 50 20C60 15 65 5 75 10C85 15 90 28 100 25C110 22 115 10 125 15C135 20 140 28 150 25" stroke="currentColor" className="icon" strokeWidth="2" strokeLinecap="round"/>
               </svg>
            </div>

            {/* Reader Card */}
            <div className={`pipe-card ${getCardClass('reader', 'card-reader')}`}>
               <div className="pipe-card-header">
                  <div className="pipe-card-title">
                     <svg className="icon" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                     Reader Agent
                  </div>
                  <span className="pipe-card-num">02</span>
               </div>
               <span className="pipe-card-status">{getStatusText('reader')}</span>
               <div className="card-content-text">
                  {results.reader?.status === 'done' ? `Processed all links.` : `Processing: link1, link2...`}
               </div>
               <div style={{marginTop: 'auto', width: '100%'}}>
                  <div style={{display:'flex', justifyContent:'space-between', fontSize:'0.6rem', color:'#60a5fa', marginBottom:'0.2rem'}}>
                     <span>Progressing</span>
                  </div>
                  <div className="progress-bar-bg">
                     <div className="progress-bar-fill" style={{width: results.reader?.status === 'done' ? '100%' : results.reader?.status === 'running' ? '60%' : '0%'}}></div>
                  </div>
               </div>
            </div>

            {/* Writer Card */}
            <div className={`pipe-card ${getCardClass('writer', 'card-writer')}`}>
               <div className="pipe-card-header">
                  <div className="pipe-card-title">
                     <svg className="icon" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                     Writer Chain
                  </div>
                  <span className="pipe-card-num">03</span>
               </div>
               <span className="pipe-card-status">{getStatusText('writer')}</span>
               {/* Mock bars graphic */}
               <div style={{marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end', opacity: 0.8}}>
                  <div style={{height: '6px', width: '80%', border: '1px solid currentColor', borderRadius: '3px'}} className="icon"></div>
                  <div style={{height: '6px', width: '60%', border: '1px solid currentColor', borderRadius: '3px'}} className="icon"></div>
                  <div style={{height: '6px', width: '40%', border: '1px solid currentColor', borderRadius: '3px'}} className="icon"></div>
               </div>
            </div>

            {/* Critic Card */}
            <div className={`pipe-card ${getCardClass('critic', 'card-critic')}`}>
               <div className="pipe-card-header">
                  <div className="pipe-card-title">
                     <svg className="icon" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                     Critic Chain
                  </div>
                  <span className="pipe-card-num">04</span>
               </div>
               <span className="pipe-card-status">{getStatusText('critic')}</span>
            </div>

          </div>

          <h2 className="section-title">Live Output</h2>
          <div className="terminal-window">
             {logs.length === 0 && <span style={{opacity: 0.5}}>&gt; Waiting to start...</span>}
             {logs.map((log, i) => (
                <div key={i} className="terminal-line new">{log}</div>
             ))}
             <div ref={logsEndRef} />
          </div>

        </div>

        {/* Right Column */}
        <div className="right-col">
          <div className="ref-header">
            <span>Reference Feed</span>
            <span style={{fontSize:'0.7rem', color:'#64748b'}}>Top Found Sources</span>
          </div>
          
          <div className="ref-list">
            {refList.map((url, idx) => {
              // Extract domain for display
              let domain = url;
              try { domain = new URL(url).hostname; } catch(e){}
              
              return (
              <a href={url} target="_blank" rel="noopener noreferrer" style={{textDecoration: 'none', color: 'inherit', display: 'block'}} key={idx}>
                <div className="ref-item" style={{cursor: 'pointer'}}>
                  <div className="ref-url-group">
                    <div className="ref-favicon">{domain.charAt(0).toUpperCase()}</div>
                    <div className="ref-url" title={url}>{url}</div>
                  </div>
                  <div className="ref-quality">
                    Quality <span className="star-icon">★★</span>
                  </div>
                </div>
              </a>
            )})}
          </div>
        </div>
      </div>

      {/* Render Final Report Below Grid if available */}
      {results.writer?.result && (
        <div className="report-panel">
            <h2 className="section-title" style={{color: '#4c148b', marginBottom: '1.5rem'}}>📝 Final Research Report</h2>
            <div className="markdown-content">
               <ReactMarkdown
                 components={{
                   a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" style={{color: '#3b82f6', textDecoration: 'underline'}} />
                 }}
               >
                 {results.writer.result}
               </ReactMarkdown>
            </div>
            
            {results.critic?.result && (
              <div style={{marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid #e2e8f0'}}>
                <h3 className="section-title" style={{color: '#d97706', fontSize: '1rem', marginBottom: '1rem'}}>🧐 Critic Feedback</h3>
                <div className="markdown-content" style={{whiteSpace: 'pre-wrap'}}>
                    {results.critic.result}
                </div>
              </div>
            )}

            {/* Embedded Follow-Up Chat for Live Report */}
            <FollowUpChat report={results.writer.result} />
        </div>
      )}
      </>
      )}

    </div>
  )
}

export default App
