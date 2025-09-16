import React, { useState } from 'react';
import { signup, login } from '../api';
import { useNavigate } from 'react-router-dom';

function AuthPage() {
  const [isSignup, setIsSignup] = useState(false);
  const [form, setForm] = useState({
    UserName: '',
    FullName: '',
    PhoneNumber: '',
    Gender: '',
    DateOfBirth: '',
    Address: '',
    City: '',
    State: '',
    ZipCode: '',
    Country: '',
    Email: '',
    Password: ''
  });

  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    try {
      if (isSignup) {
        await signup(form);
        alert('Signup successful!');
        setIsSignup(false);
      } else {
        // Removed unused variable assignment here:
        await login({ Email: form.Email, Password: form.Password });
        alert('Login successful!');
        localStorage.setItem('email', form.Email);
        navigate('/dashboard');
      }
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || 'Request failed'));
    }
  };

  return (
    <div style={styles.page}>
      <div style={{ ...styles.card, maxWidth: isSignup ? '900px' : '400px' }}>
        <h2 style={styles.title}>{isSignup ? 'Sign Up' : 'Login'}</h2>

        {isSignup ? (
          <>
            <div style={styles.signupGrid}>
              {["UserName", "FullName", "PhoneNumber", "Gender", "DateOfBirth", "Email", "Password", "Address", "City", "State", "ZipCode", "Country"].map(field => (
                <input
                  key={field}
                  style={styles.signupInput}
                  name={field}
                  placeholder={field}
                  type={field === 'DateOfBirth' ? 'date' : field === 'Password' ? 'password' : 'text'}
                  onChange={handleChange}
                />
              ))}
            </div>
            <button style={styles.signupButton} onClick={handleSubmit}>Sign Up</button>
          </>
        ) : (
          <div style={styles.loginFormCenter}>
            <input style={styles.loginInput} name="Email" placeholder="Email" onChange={handleChange} />
            <input style={styles.loginInput} name="Password" type="password" placeholder="Password" onChange={handleChange} />
            <button style={styles.loginButton} onClick={handleSubmit}>Login</button>
          </div>
        )}

        <p style={styles.toggleText}>
          {isSignup ? 'Already have an account?' : "Don't have an account?"}
          <span style={styles.link} onClick={() => setIsSignup(!isSignup)}>
            {isSignup ? ' Login' : ' Sign Up'}
          </span>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    height: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: 'linear-gradient(135deg, #f9f9f9, #e0e0e0)',
    padding: '1rem',
  },
  card: {
    backgroundColor: '#fff',
    padding: '2rem',
    borderRadius: '16px',
    width: '100%',
    boxShadow: '0 12px 28px rgba(0,0,0,0.15)',
    border: '1px solid rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
  },
  title: {
    textAlign: 'center',
    marginBottom: '1.5rem',
    color: '#333',
    fontWeight: '600',
    fontSize: '1.8rem',
  },
  signupGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '20px',
    marginBottom: '1.5rem',
  },
  signupInput: {
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid #ccc',
    fontSize: '1rem',
  },
  signupButton: {
    padding: '12px',
    backgroundColor: '#ff69b4',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1.1rem',
    cursor: 'pointer',
    alignSelf: 'center',
  },
  loginFormCenter: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1.25rem',
    marginBottom: '2rem',
  },
  loginInput: {
    width: '100%',
    maxWidth: '320px',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #ccc',
  },
  loginButton: {
    width: '160px',
    padding: '12px',
    backgroundColor: '#ff69b4',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  toggleText: {
    textAlign: 'center',
    color: '#555',
  },
  link: {
    marginLeft: '5px',
    color: '#ff69b4',
    fontWeight: '700',
    cursor: 'pointer',
  },
};

export default AuthPage;
