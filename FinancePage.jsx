import React, { useEffect, useState } from 'react';
import {
  getFinancialGoalsByEmail,
  addFinancialGoal,
  editFinancialGoal,
  deleteFinancialGoal,
} from '../api';

const FinancePage = () => {
  const email = localStorage.getItem('userEmail') || '';
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Styles as JS objects
  const styles = {
    page: {
      padding: 24,
      backgroundColor: '#FCE8F3',
      minHeight: '100vh',
      fontFamily: 'sans-serif',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 32,
    },
    title: {
      fontSize: 32,
      fontWeight: 'bold',
      color: '#BE185D',
    },
    addButton: {
      backgroundColor: '#BE185D',
      color: 'white',
      padding: '8px 16px',
      border: 'none',
      borderRadius: 8,
      fontSize: 16,
      cursor: 'pointer',
    },
    message: {
      textAlign: 'center',
      color: '#9F1239',
      fontSize: 18,
      padding: '40px 0',
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: 24,
    },
    card: {
      position: 'relative',
      backgroundColor: 'white',
      borderRadius: 16,
      padding: 24,
      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
      border: '1px solid #FBCFE8',
    },
    cardTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: '#9D174D',
      marginBottom: 12,
    },
    list: {
      listStyle: 'none',
      padding: 0,
      margin: 0,
      color: '#831843',
      lineHeight: 1.5,
    },
    iconButtons: {
      position: 'absolute',
      top: 12,
      right: 12,
      display: 'flex',
      gap: 8,
    },
    iconBtn: {
      width: 28,
      height: 28,
      border: 'none',
      borderRadius: '50%',
      cursor: 'pointer',
      fontSize: 14,
      lineHeight: '28px',
    },
    modalOverlay: {
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
    modal: {
      backgroundColor: 'white',
      borderRadius: 16,
      width: '90%',
      maxWidth: 600,
      padding: 32,
      boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
    },
    modalTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#BE185D',
      marginBottom: 24,
    },
    formGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 16,
    },
    formControl: {
      width: '100%',
      padding: '10px 12px',
      border: '2px solid #FBCFE8',
      borderRadius: 8,
      fontSize: 16,
      outline: 'none',
    },
    formControlFull: {
      gridColumn: '1 / -1',
    },
    modalButtons: {
      marginTop: 24,
      display: 'flex',
      justifyContent: 'flex-end',
      gap: 16,
    },
    submitBtn: {
      backgroundColor: '#BE185D',
      color: 'white',
      padding: '10px 20px',
      border: 'none',
      borderRadius: 8,
      cursor: 'pointer',
      fontSize: 16,
    },
    cancelBtn: {
      backgroundColor: 'white',
      color: '#BE185D',
      padding: '10px 20px',
      border: '2px solid #FBCFE8',
      borderRadius: 8,
      cursor: 'pointer',
      fontSize: 16,
    },
  };

  // Fetch goals
  useEffect(() => {
    if (!email) {
      setGoals([]);
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      try {
        const data = await getFinancialGoalsByEmail(email);
        setGoals(data);
      } catch {
        setGoals([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [email]);

  // Handlers
  const openModal = goal => {
    setModalOpen(true);
    if (goal) {
      setEditingId(goal.GoalID);
      setForm({
        goalName: goal.GoalName,
        targetAmount: goal.TargetAmount,
        currentAmount: goal.CurrentAmount,
        targetDate: goal.TargetDate.slice(0, 10),
        priority: goal.Priority,
        status: goal.Status,
      });
    } else {
      setEditingId(null);
      setForm({});
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm({});
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const payload = {
      email,
      goalName: form.goalName,
      targetAmount: parseFloat(form.targetAmount),
      targetDate: form.targetDate,
      priority: form.priority,
    };
    try {
      if (editingId) {
        await editFinancialGoal(editingId, {
          ...payload,
          currentAmount: parseFloat(form.currentAmount || 0),
          status: form.status || 'In Progress',
        });
      } else {
        await addFinancialGoal(payload);
      }
      closeModal();
      const updated = await getFinancialGoalsByEmail(email);
      setGoals(updated);
    } catch {
      /* ignore */
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('Delete this goal?')) return;
    await deleteFinancialGoal(id);
    setGoals(goals.filter(g => g.GoalID !== id));
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>🎀 My Financial Goals</h1>
        <button style={styles.addButton} onClick={() => openModal()}>
          ➕ Add Goal
        </button>
      </div>

      {loading ? (
        <p style={styles.message}>Loading…</p>
      ) : goals.length === 0 ? (
        <p style={styles.message}>
          {email
            ? 'You haven’t set any goals yet.'
            : 'Please log in to see your financial goals.'}
        </p>
      ) : (
        <div style={styles.grid}>
          {goals.map(goal => (
            <div key={goal.GoalID} style={styles.card}>
              <div style={styles.iconButtons}>
                <button
                  style={{
                    ...styles.iconBtn,
                    backgroundColor: '#FBCFE8',
                    color: '#9D174D',
                  }}
                  onClick={() => openModal(goal)}
                >
                  ✏️
                </button>
                <button
                  style={{
                    ...styles.iconBtn,
                    backgroundColor: '#BE185D',
                    color: 'white',
                  }}
                  onClick={() => handleDelete(goal.GoalID)}
                >
                  🗑️
                </button>
              </div>
              <h3 style={styles.cardTitle}>{goal.GoalName}</h3>
              <ul style={styles.list}>
                <li>🎯 Target: ₹{goal.TargetAmount}</li>
                <li>💰 Saved: ₹{goal.CurrentAmount}</li>
                <li>📅 By: {new Date(goal.TargetDate).toLocaleDateString()}</li>
                <li>⚡ Priority: {goal.Priority}</li>
                <li>Status: {goal.Status}</li>
              </ul>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h2 style={styles.modalTitle}>
              {editingId ? 'Edit Goal' : 'Add New Goal'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div style={styles.formGrid}>
                <input
                  type="text"
                  placeholder="Goal Name"
                  value={form.goalName || ''}
                  onChange={e =>
                    setForm(f => ({ ...f, goalName: e.target.value }))
                  }
                  required
                  style={{ ...styles.formControl, ...styles.formControlFull }}
                />
                <input
                  type="number"
                  placeholder="Target Amount"
                  value={form.targetAmount || ''}
                  onChange={e =>
                    setForm(f => ({ ...f, targetAmount: e.target.value }))
                  }
                  required
                  style={styles.formControl}
                />
                {editingId && (
                  <input
                    type="number"
                    placeholder="Current Amount"
                    value={form.currentAmount || ''}
                    onChange={e =>
                      setForm(f => ({ ...f, currentAmount: e.target.value }))
                    }
                    style={styles.formControl}
                  />
                )}
                <input
                  type="date"
                  value={form.targetDate || ''}
                  onChange={e =>
                    setForm(f => ({ ...f, targetDate: e.target.value }))
                  }
                  required
                  style={styles.formControl}
                />
                <select
                  value={form.priority || ''}
                  onChange={e =>
                    setForm(f => ({ ...f, priority: e.target.value }))
                  }
                  required
                  style={styles.formControl}
                >
                  <option value="" disabled>
                    Priority
                  </option>
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
                {editingId && (
                  <select
                    value={form.status}
                    onChange={e =>
                      setForm(f => ({ ...f, status: e.target.value }))
                    }
                    style={styles.formControl}
                  >
                    <option>In Progress</option>
                    <option>Achieved</option>
                    <option>Cancelled</option>
                  </select>
                )}
              </div>
              <div style={styles.modalButtons}>
                <button type="submit" style={styles.submitBtn}>
                  {editingId ? 'Save Changes' : 'Add Goal'}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  style={styles.cancelBtn}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancePage;
