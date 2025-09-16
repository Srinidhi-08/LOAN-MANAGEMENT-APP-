import React, { useEffect, useState } from 'react';
import {
  getLoansByEmail,
  fetchDebtStrategy,
  getPaymentsByEmail,
  addPayment
} from '../api';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer
} from 'recharts';

const COLORS = ['#e84393','#d63031','#fd79a8','#ff7675','#fab1a0','#fdcb6e'];

export default function DebtStrategy() {
  const email = localStorage.getItem('userEmail');

  const [loans, setLoans] = useState([]);
  const [strategies, setStrategies] = useState({ snowball: [], avalanche: [] });
  const [currentStrategy, setCurrentStrategy] = useState('snowball');
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedLoanId, setSelectedLoanId] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    async function loadAll() {
      if (!email) return;
      try {
        const [loanData, stratData, payData] = await Promise.all([
          getLoansByEmail(email),
          fetchDebtStrategy(email),
          getPaymentsByEmail(email)
        ]);
        setLoans(loanData || []);
        setStrategies({
          snowball: stratData?.snowball || [],
          avalanche: stratData?.avalanche || []
        });
        const loanTypes = (loanData || []).map(l => l.LoanType);
        setPayments((payData || []).filter(p => loanTypes.includes(p.Category)));
      } catch (err) {
        console.error('Error loading data', err);
      }
      setLoading(false);
    }
    loadAll();
  }, [email]);

  const orderedLoans = (strategies[currentStrategy] || [])
    .map(o => loans.find(l => l.LoanID === o.LoanID))
    .filter(Boolean);

  const chartData = orderedLoans.map(l => ({
    name: l.LoanType,
    value: l.OutstandingBalance
  }));

  const handleRecord = async () => {
    if (!selectedLoanId) {
      alert('Select a loan');
      return;
    }
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      alert('Enter a valid amount');
      return;
    }
    const loan = loans.find(l => l.LoanID === parseInt(selectedLoanId, 10));
    if (!loan) {
      alert('Invalid loan');
      return;
    }
    try {
      await addPayment({
        email,
        paymentDate: new Date().toISOString().split('T')[0],
        amount: parseFloat(amount),
        category: loan.LoanType,
        paymentMethod: 'LoanPayment',
        isRecurring: false,
        notes
      });
      const payData = await getPaymentsByEmail(email);
      const loanTypes = loans.map(l => l.LoanType);
      setPayments(payData.filter(p => loanTypes.includes(p.Category)));
      setSelectedLoanId('');
      setAmount('');
      setNotes('');
      alert('Spending recorded!');
    } catch (err) {
      console.error('Error recording spending', err);
      alert('Failed to record spending');
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', margin: '2rem', color: '#e84393' }}>Loading…</div>;
  }

  return (
    <div style={{
      maxWidth: 800,
      margin: '2rem auto',
      padding: 20,
      background: '#ffe4ec',
      border: '1px solid #fab1a0',
      borderRadius: 8,
      fontFamily: 'Arial, sans-serif',
      color: '#2d3436'
    }}>
      <h1 style={{ textAlign: 'center', marginBottom: 20, color: '#d63031' }}>Debt Repayment Strategy</h1>

      {/* Strategy Toggle */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 15 }}>
        {['snowball', 'avalanche'].map(s => (
          <button key={s}
            onClick={() => setCurrentStrategy(s)}
            style={{
              padding: '8px 16px',
              borderRadius: 4,
              border: '1px solid #d63031',
              background: currentStrategy === s ? '#d63031' : '#ffcccc',
              color: currentStrategy === s ? '#fff' : '#2d3436',
              cursor: 'pointer'
            }}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Strategy Explanation */}
      <div style={{
        background: '#ffd1dc',
        padding: 10,
        borderLeft: '5px solid #e84393',
        marginBottom: 20
      }}>
        {currentStrategy === 'snowball'
          ? <p><strong>Snowball:</strong> Pay smallest outstanding balances first to build momentum.</p>
          : <p><strong>Avalanche:</strong> Pay highest-interest balances first to minimize total interest.</p>
        }
      </div>

      {/* Pie Chart */}
      {chartData.length > 0 ? (
        <div style={{ width: '100%', height: 250, marginBottom: 20 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie data={chartData} dataKey="value" nameKey="name"
                   cx="50%" cy="50%" outerRadius={80} label>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={v => `₹${v.toLocaleString()}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p>No loan data for chart.</p>
      )}

      {/* Ordered Loan List */}
      <div>
        {orderedLoans.length === 0
          ? <p>No loans to display.</p>
          : orderedLoans.map((loan, idx) => (
            <div key={loan.LoanID} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 10,
              marginBottom: 10,
              background: '#ffe4ec',
              border: '1px solid #fab1a0',
              borderRadius: 4
            }}>
              <div>
                <strong>{idx + 1}. {loan.LoanType}</strong><br/>
                Balance: ₹{loan.OutstandingBalance.toLocaleString()}<br/>
                Rate: {loan.InterestRate}% • EMI: ₹{loan.MonthlyPayment}
              </div>
            </div>
          ))
        }
      </div>

      {/* Spending Recorder */}
      <div style={{ marginTop: 30, borderTop: '1px solid #fab1a0', paddingTop: 20 }}>
        <h3 style={{ marginBottom: 10, color: '#e84393' }}>Record Loan Spending</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <select value={selectedLoanId} onChange={e => setSelectedLoanId(e.target.value)}
            style={{ padding: 8, minWidth: 150, border: '1px solid #d63031' }}>
            <option value=''>Select Loan</option>
            {loans.map(l => (
              <option key={l.LoanID} value={l.LoanID}>{l.LoanType}</option>
            ))}
          </select>
          <input type="number" placeholder="Amount" value={amount}
            onChange={e => setAmount(e.target.value)}
            style={{ padding: 8, width: 100, border: '1px solid #d63031' }} />
          <input type="text" placeholder="Notes" value={notes}
            onChange={e => setNotes(e.target.value)}
            style={{ padding: 8, flex: 1, border: '1px solid #d63031' }} />
          <button onClick={handleRecord} style={{
            padding: '8px 16px',
            background: '#e84393',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer'
          }}>
            Record
          </button>
        </div>

        {/* Payments Table */}
        <h4 style={{ marginTop: 20, color: '#d63031' }}>Loan Payments</h4>
        {payments.length === 0 ? (
          <p>No loan payments recorded.</p>
        ) : (
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            marginTop: 10
          }}>
            <thead>
              <tr style={{ background: '#ffccd5' }}>
                {['Date','Loan','Amount','Notes'].map(h => (
                  <th key={h} style={{
                    padding: 8,
                    border: '1px solid #fab1a0',
                    textAlign: 'left',
                    color: '#2d3436'
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.map((p, i) => (
                <tr key={i}>
                  <td style={{ padding: 8, border: '1px solid #fab1a0' }}>{p.PaymentDate}</td>
                  <td style={{ padding: 8, border: '1px solid #fab1a0' }}>{p.Category}</td>
                  <td style={{ padding: 8, border: '1px solid #fab1a0' }}>₹{p.Amount}</td>
                  <td style={{ padding: 8, border: '1px solid #fab1a0' }}>{p.Notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
