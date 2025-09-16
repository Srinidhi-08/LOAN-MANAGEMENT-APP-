import React from 'react';
import { useNavigate } from 'react-router-dom';

function Sidebar() {
  const navigate = useNavigate();

  const buttonStyle = {
    backgroundColor: '#fff',
    color: '#e91e63', // pink
    border: '1px solid #f8bbd0',
    padding: '14px 20px',
    margin: '12px 20px',
    fontSize: '1rem',
    fontWeight: '500',
    cursor: 'pointer',
    textAlign: 'left',
    width: 'calc(100% - 40px)',
    transition: 'all 0.3s ease',
    borderRadius: '10px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  };

  const handleMouseEnter = (e) => {
    e.currentTarget.style.backgroundColor = '#ffe6f1';
    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.08)';
  };

  const handleMouseLeave = (e) => {
    e.currentTarget.style.backgroundColor = '#fff';
    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
  };

  return (
    <div
      style={{
        width: '250px',
        backgroundColor: '#fff0f6',
        height: '100vh',
        paddingTop: '2rem',
        boxShadow: '2px 0 10px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <h2 style={{
        textAlign: 'center',
        color: '#e91e63',
        marginBottom: '1.5rem',
        fontSize: '1.4rem',
        fontWeight: '600',
      }}>
        Loan Assistant
      </h2>

      <button
        style={buttonStyle}
        onClick={() => navigate('/dashboard')}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        Dashboard
      </button>

      
      <button
        style={buttonStyle}
        onClick={() => navigate('chatbot')}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        ChatBot
      </button>
      
      <button
        style={buttonStyle}
        onClick={() => navigate('strategy')}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        Loan Strategy
      </button>

      <button
        style={buttonStyle}
        onClick={() => navigate('payments')}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        Payment Tracker
      </button>

      <button
        style={buttonStyle}
        onClick={() => navigate('loancalci')}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        Loan Calculator
      </button>

      <button
        style={buttonStyle}
        onClick={() => navigate('loanpage')}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        Loans
      </button>

      <button
        style={buttonStyle}
        onClick={() => navigate('planner')}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
      Budget
      </button>

      <button
        style={buttonStyle}
        onClick={() => navigate('financial')}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
      Financial Goals 
      </button>

      <button
        style={buttonStyle}
        onClick={() => navigate('profile')}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        Profile
      </button>

      <button
        style={{ ...buttonStyle, color: '#d32f2f', borderColor: '#ffcdd2' }}
        onClick={() => navigate('/')}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#ffe6e6';
          e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.08)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#fff';
          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
        }}
      >
        Logout
      </button>
    </div>
  );
}

export default Sidebar;
