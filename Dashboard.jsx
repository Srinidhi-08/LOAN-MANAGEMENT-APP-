// src/pages/DashboardPage.jsx
import React, { useEffect, useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { PieChart, Pie, Cell, Tooltip as ReTooltip, Legend } from 'recharts';
import {
  getNotesByEmail,
  addNote,
  deleteNote,
  getPaymentsByEmail,
  addPayment,
  deletePayment,
  getLoansByEmail,
  getFinancialGoalsByEmail
} from '../api';

const PINK = '#FF69B4';
const LIGHT_PINK = '#FFE4EC';
const ACCENT = '#FFB6C1';
const LOAN_COLORS = ['#FF8FB1','#FFA3B1','#FFB3C1','#FFD1DC'];

export default function DashboardPage() {
  const email = localStorage.getItem('userEmail');
  const [notes, setNotes] = useState([]);
  const [newNoteText, setNewNoteText] = useState('');
  const [payments, setPayments] = useState([]);
  const [newSpend, setNewSpend] = useState({ date:'', amount:'', category:'' });
  const [loans, setLoans] = useState([]);
  const [goals, setGoals] = useState([]);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [reminders, setReminders] = useState([]);
  const [completedLoans, setCompletedLoans] = useState(0);

  useEffect(() => {
    if (!email) return;
    getNotesByEmail(email).then(setNotes).catch(console.error);
    getPaymentsByEmail(email).then(setPayments).catch(console.error);
    getFinancialGoalsByEmail(email).then(setGoals).catch(console.error);
    getLoansByEmail(email)
      .then(data => {
        setLoans(data); // triggers second useEffect
      })
      .catch(console.error);
  }, [email]);

  // Recalculate reminders and completed loans whenever `loans` updates
  useEffect(() => {
    const today = new Date();

    const upcoming = loans.filter(l => {
      const due = new Date(l.EndDate);
      const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
      return l.Status === 'Active' && diff >= 0 && diff <= 7;
    });
    setReminders(upcoming);

    const paidOffCount = loans.filter(l => l.Status === 'Paid Off').length;
    setCompletedLoans(paidOffCount);
  }, [loans]);

  const handleAddNote = async () => {
    if (!newNoteText.trim()) return;
    const { NoteID } = await addNote(email, newNoteText);
    setNotes(ns => [{ NoteID, Content: newNoteText }, ...ns]);
    setNewNoteText('');
  };

  const handleDeleteNote = async id => {
    if (!window.confirm('Delete?')) return;
    await deleteNote(id);
    setNotes(ns => ns.filter(n => n.NoteID !== id));
  };

  const handleSpendAdd = async e => {
    e.preventDefault();
    await addPayment({ email, paymentDate:newSpend.date, amount:newSpend.amount, category:newSpend.category });
    setPayments(await getPaymentsByEmail(email));
    setNewSpend({ date:'', amount:'', category:'' });
  };

  const handleSpendDelete = async id => {
    await deletePayment(id);
    setPayments(ps => ps.filter(p => p.PaymentID !== id));
  };

  const loanCount = loans.reduce((m, l) => {
    m[l.LoanType] = (m[l.LoanType]||0) + 1;
    return m;
  }, {});
  const loanPie = Object.entries(loanCount).map(([n,v],i)=>({ name:n, value:v, fill: LOAN_COLORS[i%LOAN_COLORS.length] }));

  const totalSpend = payments.reduce((s,p)=>s+Number(p.Amount),0);
  const totalGoal = goals.reduce((s,g)=>s+Number(g.TargetAmount||0),0);

  // Styles
  const page = { padding:24, background:LIGHT_PINK, fontFamily:'Arial,sans-serif' };
  const section = { background:'#fff', padding:16, borderRadius:8, boxShadow:'0 2px 6px rgba(0,0,0,0.1)', marginBottom:24 };
  const summaryCard = { flex:1, margin:8, padding:16, background:PINK, borderRadius:8, color:'#fff', textAlign:'center' };
  const btn = { padding:'6px 12px', background:PINK, color:'#fff', border:'none', borderRadius:4, cursor:'pointer' };
  const input = { padding:8, marginBottom:8, borderRadius:4, border:'1px solid #ccc', width:'100%' };
  const calendarStyle = {
    padding: 8,
    borderRadius: 8,
    border: '1px solid #ddd',
    background: '#fff',
    boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
  };

  return (
    <div style={page}>
      <h1 style={{ color:PINK, marginBottom:16 }}>Dashboard</h1>

      {reminders.length>0 && (
        <div style={{ ...section, background:ACCENT, border:`1px solid ${PINK}`, color:PINK }}>
          ⚠️ You have {reminders.length} loan{reminders.length>1?'s':''} due within 7 days.
        </div>
      )}

      <div style={{ display:'flex', flexWrap:'wrap', gap:16, marginBottom:24 }}>
        <div style={summaryCard}>
          <div>✅ Completed Loans</div>
          <div style={{ fontSize:24, fontWeight:'bold' }}>{completedLoans}</div>
        </div>
        <div style={summaryCard}>
          <div>💰 Total Spending</div>
          <div style={{ fontSize:24, fontWeight:'bold' }}>₹{totalSpend.toLocaleString()}</div>
        </div>
        <div style={summaryCard}>
          <div>🎯 Goal Target</div>
          <div style={{ fontSize:24, fontWeight:'bold' }}>₹{totalGoal.toLocaleString()}</div>
        </div>
      </div>

      <div style={{ display:'flex', flexWrap:'wrap', gap:24 }}>
        {/* Notes & Spending */}
        <div style={{ flex:1, minWidth:280, maxWidth:380 }}>
          {/* Notes */}
          <div style={section}>
            <h2 style={{ color:PINK }}>📝 Notes</h2>
            <textarea
              rows={3}
              value={newNoteText}
              onChange={e=>setNewNoteText(e.target.value)}
              placeholder="New note..."
              style={{ ...input, fontFamily:'monospace', resize:'none' }}
            />
            <button onClick={handleAddNote} style={btn}>Add Note</button>
            <ul style={{ padding:0, marginTop:12, maxHeight:140, overflowY:'auto' }}>
              {notes.map(n=>(
                <li key={n.NoteID} style={{ listStyle:'none', background:LIGHT_PINK, marginBottom:8,
                  padding:8, borderRadius:4, display:'flex', justifyContent:'space-between' }}>
                  <span>{n.Content}</span>
                  <button onClick={()=>handleDeleteNote(n.NoteID)} style={{ ...btn, background:'#D6336C' }}>Del</button>
                </li>
              ))}
            </ul>
          </div>

          {/* Spending */}
          <div style={section}>
            <h2 style={{ color:'#e55383' }}>💸 Spending</h2>
            <form onSubmit={handleSpendAdd}>
              <input type="date" required value={newSpend.date}
                onChange={e=>setNewSpend(s=>({...s,date:e.target.value}))}
                style={input}
              />
              <input type="number" placeholder="Amount" required value={newSpend.amount}
                onChange={e=>setNewSpend(s=>({...s,amount:e.target.value}))}
                style={input}
              />
              <input type="text" placeholder="Category" required value={newSpend.category}
                onChange={e=>setNewSpend(s=>({...s,category:e.target.value}))}
                style={input}
              />
              <button type="submit" style={btn}>Add Spend</button>
            </form>
            <ul style={{ padding:0, marginTop:12, maxHeight:140, overflowY:'auto' }}>
              {payments.map(p=>(
                <li key={p.PaymentID} style={{ listStyle:'none', background:LIGHT_PINK, marginBottom:8,
                  padding:8, borderRadius:4, display:'flex', justifyContent:'space-between', flexDirection:'column' }}>
                  <span>
                    {new Date(p.PaymentDate).toLocaleDateString()} — ₹{p.Amount}
                    <br />
                    <small style={{ color:'#555' }}>Category: {p.Category}</small>
                  </span>
                  <div style={{ marginTop:4, alignSelf:'flex-end' }}>
                    <button onClick={()=>handleSpendDelete(p.PaymentID)} style={{ ...btn, background:'#D6336C' }}>Del</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Loan Pie Chart */}
        <div style={{ flex:1, minWidth:280, maxWidth:380, ...section, textAlign:'center' }}>
          <h2 style={{ color:PINK }}>📊 Loan Types</h2>
          {loanPie.length === 0 ? (
            <p>No loans.</p>
          ) : (
            <PieChart width={260} height={260}>
              <Pie data={loanPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                {loanPie.map((_,i)=><Cell key={i} fill={loanPie[i].fill}/>)}
              </Pie>
              <ReTooltip />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          )}
        </div>

        {/* Calendar + Loan/Goal Progress */}
        <div style={{ flex:1, minWidth:300, display:'flex', gap:16 }}>
          <div style={{ flex:1, ...section, textAlign:'center' }}>
            <h2 style={{ color:'#007bff' }}>📅 Check-In</h2>
            <div style={calendarStyle}>
              <Calendar onChange={setCalendarDate} value={calendarDate} />
            </div>
          </div>

          <div style={{ flex:1, display:'flex', flexDirection:'column', gap:16 }}>
            <div style={{ ...section, maxHeight:160, overflowY:'auto' }}>
              <h2 style={{ color:'#28a745' }}>📈 Loan Progress</h2>
              {loans.map(loan=>{
                const total = Number(loan.PrincipalAmount || 0);
                const paid = total - Number(loan.OutstandingBalance || 0);
                const pct = total > 0 ? Math.min((paid / total) * 100, 100) : 0;
                return (
                  <div key={loan.LoanID} style={{ marginBottom:12 }}>
                    <div style={{ fontWeight:600 }}>{loan.LoanType}</div>
                    <div style={{ background:'#fde4ec', borderRadius:8, height:12, overflow:'hidden' }}>
                      <div style={{ width:`${pct}%`, height:'100%', backgroundColor:PINK, transition:'width .5s' }}/>
                    </div>
                    <div style={{ fontSize:11, color:'#666' }}>₹{paid.toLocaleString()} / ₹{total.toLocaleString()} ({pct.toFixed(1)}%)</div>
                  </div>
                );
              })}
            </div>
            <div style={{ ...section, maxHeight:160, overflowY:'auto' }}>
              <h2 style={{ color:'#7F3FBF' }}>🎯 Goals Progress</h2>
              {goals.map(goal=>{
                const target = Number(goal.TargetAmount || 0);
                const curr = Number(goal.CurrentAmount || 0);
                const pct = target > 0 ? Math.min((curr / target) * 100, 100) : 0;
                return (
                  <div key={goal.GoalID} style={{ marginBottom:12 }}>
                    <div style={{ fontWeight:600 }}>{goal.GoalName}</div>
                    <div style={{ background:'#fde4ec', borderRadius:8, height:12, overflow:'hidden' }}>
                      <div style={{ width:`${pct}%`, height:'100%', backgroundColor:ACCENT, transition:'width .5s' }}/>
                    </div>
                    <div style={{ fontSize:11, color:'#666' }}>₹{curr.toLocaleString()} / ₹{target.toLocaleString()} ({pct.toFixed(1)}%)</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
