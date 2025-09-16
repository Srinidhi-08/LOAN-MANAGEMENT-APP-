import React, { useState } from 'react';

const LoanCalci = () => {
  const [loanAmount, setLoanAmount] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [loanTenure, setLoanTenure] = useState('');
  const [monthlySalary, setMonthlySalary] = useState('');
  const [emi, setEmi] = useState(null);
  const [maxLoan, setMaxLoan] = useState(null);
  const [history, setHistory] = useState([]);
  const [mode, setMode] = useState('emi');

  const calculateEMI = (e) => {
    e.preventDefault();
    const principal = parseFloat(loanAmount);
    const annualInterestRate = parseFloat(interestRate);
    const months = parseFloat(loanTenure);

    const monthlyInterestRate = annualInterestRate / 12 / 100;
    const calculatedEmi =
      principal *
      monthlyInterestRate *
      Math.pow(1 + monthlyInterestRate, months) /
      (Math.pow(1 + monthlyInterestRate, months) - 1);

    const emiValue = calculatedEmi.toFixed(2);
    setEmi(emiValue);

    const calculationDetails = {
      loanAmount,
      interestRate,
      loanTenure,
      emi: emiValue,
      date: new Date().toLocaleString(),
    };
    setHistory([...history, calculationDetails].slice(-5));
  };

  const calculateLoanAmount = (e) => {
    e.preventDefault();
    const monthlyEMI = parseFloat(emi);
    const annualInterestRate = parseFloat(interestRate);
    const months = parseFloat(loanTenure);

    const monthlyInterestRate = annualInterestRate / 12 / 100;
    const loan =
      monthlyEMI *
      (Math.pow(1 + monthlyInterestRate, months) - 1) /
      (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, months));

    const loanVal = loan.toFixed(2);
    setMaxLoan(loanVal);
  };

  const deleteHistory = (indexToDelete) => {
    setHistory(history.filter((_, index) => index !== indexToDelete));
  };

  const styles = {
    wrapper: {
      display: 'flex',
      justifyContent: 'start',
      alignItems: 'center',
      minHeight: '100vh',
      flexDirection: 'column',
      backgroundColor: '#fef6f9',
      padding: '20px',
    },
    container: {
      width: '300px',
      padding: '20px',
      borderRadius: '15px',
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
      backgroundColor: '#fff0f5',
      fontFamily: 'Arial, sans-serif',
      zIndex: 1,
    },
    title: {
      textAlign: 'center',
      color: '#d6336c',
      marginBottom: '20px',
      fontSize: '18px',
    },
    form: {
      display: 'flex',
      flexDirection: 'column',
    },
    inputGroup: {
      marginBottom: '15px',
    },
    label: {
      marginBottom: '5px',
      fontWeight: 'bold',
      color: '#d6336c',
    },
    input: {
      width: '100%',
      padding: '8px',
      border: '1px solid #ff69b4',
      borderRadius: '5px',
      fontSize: '14px',
      outlineColor: '#ff69b4',
    },
    button: {
      padding: '8px',
      backgroundColor: '#ff69b4',
      color: 'white',
      border: 'none',
      borderRadius: '5px',
      cursor: 'pointer',
      fontSize: '14px',
      marginTop: '10px',
    },
    result: {
      marginTop: '15px',
      fontSize: '14px',
      textAlign: 'center',
      color: '#d6336c',
      fontWeight: 'bold',
    },
    toggleButton: {
      margin: '10px auto',
      padding: '6px 12px',
      fontSize: '13px',
      color: '#ff69b4',
      background: '#fff',
      border: '1px solid #ff69b4',
      borderRadius: '20px',
      cursor: 'pointer',
      display: 'block',
    },
    historyContainer: {
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'center',
      marginTop: '15px',
      gap: '10px',
      maxWidth: '330px',
    },
    historyBubble: {
      backgroundColor: '#ff69b4',
      color: '#fff',
      borderRadius: '15px',
      padding: '8px 12px',
      fontSize: '12px',
      position: 'relative',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    },
    deleteBtn: {
      position: 'absolute',
      top: '-6px',
      right: '-6px',
      backgroundColor: '#fff',
      color: '#ff69b4',
      border: 'none',
      borderRadius: '50%',
      width: '18px',
      height: '18px',
      fontSize: '12px',
      cursor: 'pointer',
      lineHeight: '18px',
      padding: 0,
    },
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.container}>
        <h2 style={styles.title}>
          {mode === 'emi' ? 'Loan EMI Calculator' : 'Loan Affordability Calculator'}
        </h2>

        <button
          style={styles.toggleButton}
          onClick={() => {
            setMode(mode === 'emi' ? 'loan' : 'emi');
            setEmi(null);
            setMaxLoan(null);
          }}
        >
          Switch to {mode === 'emi' ? 'Loan Calculator' : 'EMI Calculator'}
        </button>

        <form onSubmit={mode === 'emi' ? calculateEMI : calculateLoanAmount} style={styles.form}>
          {mode === 'emi' && (
            <div style={styles.inputGroup}>
              <label style={styles.label}>Loan Amount:</label>
              <input
                type="number"
                style={styles.input}
                value={loanAmount}
                onChange={(e) => setLoanAmount(e.target.value)}
                required
                placeholder="Enter loan amount"
              />
            </div>
          )}

          <div style={styles.inputGroup}>
            <label style={styles.label}>Interest Rate (% per annum):</label>
            <input
              type="number"
              style={styles.input}
              value={interestRate}
              onChange={(e) => setInterestRate(e.target.value)}
              required
              placeholder="Enter interest rate"
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Loan Tenure (months):</label>
            <input
              type="number"
              style={styles.input}
              value={loanTenure}
              onChange={(e) => setLoanTenure(e.target.value)}
              required
              placeholder="Enter loan tenure"
            />
          </div>

          {mode === 'loan' && (
            <div style={styles.inputGroup}>
              <label style={styles.label}>Desired EMI:</label>
              <input
                type="number"
                style={styles.input}
                value={emi || ''}
                onChange={(e) => setEmi(e.target.value)}
                required
                placeholder="Enter desired EMI"
              />
            </div>
          )}

          {mode === 'emi' && (
            <div style={styles.inputGroup}>
              <label style={styles.label}>Monthly Salary:</label>
              <input
                type="number"
                style={styles.input}
                value={monthlySalary}
                onChange={(e) => setMonthlySalary(e.target.value)}
                placeholder="Optional"
              />
            </div>
          )}

          <button type="submit" style={styles.button}>
            Calculate
          </button>
        </form>

        {emi && mode === 'emi' && (
          <div style={styles.result}>
            <p>Your EMI is: ₹{emi}</p>
            {monthlySalary &&
              parseFloat(emi) > 0.4 * parseFloat(monthlySalary) && (
                <p style={{ color: 'red', fontSize: '13px' }}>
                  Warning: EMI exceeds 40% of your salary
                </p>
              )}
          </div>
        )}

        {maxLoan && mode === 'loan' && (
          <div style={styles.result}>
            <p>You can afford a loan of: ₹{maxLoan}</p>
          </div>
        )}
      </div>

      {history.length > 0 && (
        <div style={styles.historyContainer}>
          {history.map((calculation, index) => (
            <div key={index} style={styles.historyBubble}>
              <button style={styles.deleteBtn} onClick={() => deleteHistory(index)}>×</button>
              <div><strong>₹{calculation.emi}</strong></div>
              <div style={{ fontSize: '10px' }}>{calculation.date}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LoanCalci;