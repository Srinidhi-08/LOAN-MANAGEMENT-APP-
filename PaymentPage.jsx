// src/pages/PaymentDashboard.jsx
import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, Legend,
  PieChart, Pie, Cell
} from 'recharts';
import {
  getLoansByEmail,
  getPaymentsByEmail,
  addPayment,
  editPayment,
  deletePayment
} from '../api';

const LOAN_COLOR    = '#7F3FBF';
const PAYMENT_COLOR = '#D6336C';
const CAT_COLORS    = ['#FFB3C1','#FF8FA3','#FFA3B1','#FF5E94','#FF3B7E'];

export default function PaymentDashboard() {
  const email = localStorage.getItem('userEmail');
  const [loans, setLoans]       = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading]   = useState(true);

  // Form/modal state
  const [formOpen, setFormOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [form, setForm] = useState({
    paymentDate: '',
    amount: '',
    category: '',
    paymentMethod: '',
    isRecurring: false,
    notes: '',
  });

  useEffect(() => {
    if (!email) return;
    Promise.all([
      getLoansByEmail(email),
      getPaymentsByEmail(email)
    ]).then(([loanData, paymentData]) => {
      setLoans(loanData);
      setPayments(paymentData);
      setLoading(false);
    });
  }, [email]);

  // LOAN BAR CHART DATA: total EMI by month
  const loanMonthMap = {};
  loans.forEach(l => {
    const m = new Date(l.StartDate).getMonth();
    loanMonthMap[m] = (loanMonthMap[m] || 0) + Number(l.MonthlyPayment);
  });
  const loanBarData = Object.keys(loanMonthMap)
    .map(m => ({
      name: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m],
      EMI: loanMonthMap[m]
    }));

  // SPENDING PIE CHART DATA
  const catMap = {};
  payments.forEach(p => {
    const c = p.Category || 'Uncategorized';
    catMap[c] = (catMap[c] || 0) + Number(p.Amount);
  });
  const pieData = Object.entries(catMap).map(([name, value]) => ({ name, value }));

  // CRUD handlers for spending
  const openForm = (p=null) => {
    if (p) {
      setEditData(p);
      setForm({
        paymentDate: p.PaymentDate.slice(0,10),
        amount: p.Amount,
        category: p.Category,
        paymentMethod: p.PaymentMethod,
        isRecurring: p.IsRecurring===1,
        notes: p.Notes||''
      });
    } else {
      setEditData(null);
      setForm({ paymentDate:'',amount:'',category:'',paymentMethod:'',isRecurring:false,notes:'' });
    }
    setFormOpen(true);
  };
  const closeForm = () => setFormOpen(false);

  const onFormChange = e => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type==='checkbox'?checked:value }));
  };

  const onFormSubmit = async e => {
    e.preventDefault();
    const payload = { email, ...form };
    if (editData) await editPayment(editData.PaymentID, payload);
    else await addPayment(payload);
    setPayments(await getPaymentsByEmail(email));
    closeForm();
  };

  const onDelete = async id => {
    if (!window.confirm('Delete?')) return;
    await deletePayment(id);
    setPayments(ps => ps.filter(x=>x.PaymentID!==id));
  };

  if (loading) return <div style={{padding:20}}>Loading…</div>;

  // INLINE STYLES
  const page = { display:'flex', gap:'24px', padding:'24px', fontFamily:'sans-serif', background:'#fdf', minHeight:'100vh' };
  const column = { flex:1, background:'#fff', borderRadius:'8px', padding:'16px', boxShadow:'0 2px 8px rgba(0,0,0,0.1)' };
  const header = { fontSize:'1.5rem', marginBottom:'16px', color:'#7F3FBF' };
  const btn = { marginBottom:'16px', padding:'8px 12px', background:PAYMENT_COLOR, color:'#fff', border:'none', borderRadius:'4px', cursor:'pointer' };

  return (
    <div style={page}>
      {/* Left: Loan Tracker */}
      <div style={column}>
        <h2 style={header}>Loan Payments</h2>
        <BarChart width={350} height={250} data={loanBarData}>
          <CartesianGrid strokeDasharray="3 3"/>
          <XAxis dataKey="name"/>
          <YAxis/>
          <ReTooltip/>
          <Legend/>
          <Bar dataKey="EMI" fill={LOAN_COLOR}/>
        </BarChart>
        <h3 style={{marginTop:'24px'}}>Upcoming Loans</h3>
        {loans.map(l => (
          <div key={l.LoanID} style={{marginBottom:'12px',padding:'8px',border:'1px solid #ddd',borderRadius:'4px'}}>
            <strong>{l.LoanType}</strong><br/>
            EMI: ₹{l.MonthlyPayment.toFixed(2)}<br/>
            Due: {new Date(l.EndDate).toLocaleDateString()}
          </div>
        ))}
      </div>

      {/* Right: Spending Tracker */}
      <div style={column}>
        <h2 style={header}>Spending Tracker</h2>
        <button style={btn} onClick={()=>openForm()}>+ Add Spending</button>

        <PieChart width={300} height={200} style={{marginBottom:'16px'}}>
          <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label>
            {pieData.map((_,i)=><Cell key={i} fill={CAT_COLORS[i%CAT_COLORS.length]}/>)}
          </Pie>
          <ReTooltip/>
          <Legend verticalAlign="bottom"/>
        </PieChart>

        {payments.map(p => (
          <div key={p.PaymentID}
               style={{marginBottom:'12px',padding:'8px',border:'1px solid #ddd',borderRadius:'4px'}}>
            <strong>{p.Category||'Uncategorized'}</strong><br/>
            ₹{p.Amount.toFixed(2)} on {new Date(p.PaymentDate).toLocaleDateString()}<br/>
            <button onClick={()=>openForm(p)} style={{marginRight:'8px'}}>Edit</button>
            <button onClick={()=>onDelete(p.PaymentID)}>Delete</button>
          </div>
        ))}

        {formOpen && (
          <div style={{
            position:'fixed',top:0,left:0,width:'100%',height:'100%',
            background:'rgba(0,0,0,0.3)',display:'flex',justifyContent:'center',alignItems:'center'}}>
            <div style={{background:'#fff',padding:'16px',borderRadius:'8px',minWidth:'280px'}}>
              <h3>{editData?'Edit':'Add'} Spending</h3>
              <form onSubmit={onFormSubmit}>
                <label>
                  Date*<br/>
                  <input type="date" name="paymentDate" required
                         value={form.paymentDate} onChange={onFormChange}/>
                </label><br/>
                <label>
                  Amount*<br/>
                  <input type="number" name="amount" step="0.01" min="0" required
                         value={form.amount} onChange={onFormChange}/>
                </label><br/>
                <label>
                  Category<br/>
                  <input type="text" name="category" value={form.category} onChange={onFormChange}/>
                </label><br/>
                <label>
                  Method<br/>
                  <input type="text" name="paymentMethod" value={form.paymentMethod} onChange={onFormChange}/>
                </label><br/>
                <label>
                  Recurring
                  <input type="checkbox" name="isRecurring"
                         checked={form.isRecurring} onChange={onFormChange}/>
                </label><br/>
                <label>
                  Notes<br/>
                  <textarea name="notes" rows="2" value={form.notes} onChange={onFormChange}/>
                </label><br/>
                <button type="button" onClick={closeForm}>Cancel</button>
                <button type="submit" style={{marginLeft:'8px'}}>Save</button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
