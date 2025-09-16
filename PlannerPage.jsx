import React, { useEffect, useState, useCallback } from 'react';
import {
  getBudgetsByEmail,
  addBudget,
  editBudget,
  deleteBudget,
} from '../api';

const cardStyle = {
  border: '1px solid #ddd',
  borderRadius: '10px',
  padding: '15px',
  backgroundColor: '#fdf6fb',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  position: 'relative',
};

const buttonStyle = {
  margin: '5px 10px 5px 0',
  padding: '6px 12px',
  borderRadius: '5px',
  border: 'none',
  cursor: 'pointer',
};

const toInputDate = (value) => {
  if (!value) return '';
  if (typeof value === 'string') {
    return value.slice(0, 10);
  }
  return value.toISOString().slice(0, 10);
};

const PlannerPage = ({ email: propEmail }) => {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editBudgetData, setEditBudgetData] = useState(null);
  const [formData, setFormData] = useState({
    BudgetName: '',
    TotalAmount: '',
    Category: '',
    StartDate: '',
    EndDate: '',
    Notes: '',
  });

  const email = propEmail || localStorage.getItem('email');

  const fetchBudgets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getBudgetsByEmail(email);
      setBudgets(data);
    } catch (err) {
      console.error('Failed to fetch budgets:', err);
      setError('Unable to load budgets');
    } finally {
      setLoading(false);
    }
  }, [email]);

  useEffect(() => {
    if (email) fetchBudgets();
  }, [email, fetchBudgets]);

  const openModal = (budget = null) => {
    if (budget) {
      setEditBudgetData(budget);
      setFormData({
        BudgetName: budget.BudgetName || '',
        TotalAmount: budget.TotalAmount ?? '',
        Category: budget.Category || '',
        StartDate: toInputDate(budget.StartDate),
        EndDate: toInputDate(budget.EndDate),
        Notes: budget.Notes || '',
      });
    } else {
      setEditBudgetData(null);
      setFormData({
        BudgetName: '',
        TotalAmount: '',
        Category: '',
        StartDate: '',
        EndDate: '',
        Notes: '',
      });
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setError(null);
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const { BudgetName, TotalAmount, StartDate, EndDate } = formData;
    if (!BudgetName || !TotalAmount || !StartDate || !EndDate) {
      alert('Please fill in all required fields.');
      return;
    }
    try {
      if (editBudgetData) {
        alert('Budget updated successfully!'); // alert for edit
        await editBudget({ BudgetID: editBudgetData.BudgetID, ...formData });
      } else {
        await addBudget({ Email: email, ...formData });
      }
      await fetchBudgets(); // Refresh after add/edit
      closeModal();
    } catch (err) {
      console.error('Error saving budget:', err);
      alert('Failed to save budget. Please try again.');
    }
  };

  const onDelete = async (budgetId) => {
    if (!window.confirm('Are you sure you want to delete this budget?')) return;
    try {
      await deleteBudget(budgetId);
      setBudgets((prev) => prev.filter((b) => b.BudgetID !== budgetId));
    } catch (err) {
      console.error('Failed to delete budget:', err);
      alert('Failed to delete budget.');
    }
  };

  if (!email) return <p>Please log in to view your budgets.</p>;
  if (loading) return <p style={{ fontStyle: 'italic', color: '#b30059' }}>Loading budgets...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ marginBottom: 20, color: '#b30059' }}>Your Budgets</h1>

      <button
        onClick={() => openModal(null)}
        style={{ ...buttonStyle, backgroundColor: '#b30059', color: '#fff' }}
      >
        + Add Budget
      </button>

      {budgets.length === 0 ? (
        <p>No budgets found.</p>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 20,
            marginTop: 20,
          }}
        >
          {budgets.map((budget) => (
            <div key={budget.BudgetID} style={cardStyle}>
              <h2 style={{ color: '#b30059' }}>{budget.BudgetName}</h2>
              <p><strong>Amount:</strong> ₹{(budget.TotalAmount ?? 0).toFixed(2)}</p>
              <p><strong>Category:</strong> {budget.Category || '-'}</p>
              <p>
                <strong>Duration:</strong>{' '}
                {budget.StartDate ? new Date(budget.StartDate).toLocaleDateString() : '—'} to{' '}
                {budget.EndDate ? new Date(budget.EndDate).toLocaleDateString() : '—'}
              </p>
              <p><strong>Notes:</strong> {budget.Notes || 'None'}</p>
              <div style={{ marginTop: 10 }}>
                <button
                  onClick={() => openModal(budget)}
                  style={{ ...buttonStyle, backgroundColor: '#ff69b4', color: '#fff' }}
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(budget.BudgetID)}
                  style={{ ...buttonStyle, backgroundColor: '#e60039', color: '#fff' }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div
          onClick={closeModal}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.3)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 100,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'white',
              padding: 20,
              borderRadius: 10,
              minWidth: 320,
              boxShadow: '0 3px 15px rgba(0,0,0,0.3)',
            }}
          >
            <h2 style={{ color: '#b30059', marginBottom: 15 }}>
              {editBudgetData ? 'Edit Budget' : 'Add Budget'}
            </h2>
            <form onSubmit={onSubmit}>
              <div style={{ marginBottom: 10 }}>
                <label>
                  Budget Name*:
                  <input
                    type="text"
                    name="BudgetName"
                    value={formData.BudgetName}
                    onChange={onChange}
                    required
                    style={{ width: '100%', padding: 6, marginTop: 4 }}
                  />
                </label>
              </div>
              <div style={{ marginBottom: 10 }}>
                <label>
                  Total Amount*:
                  <input
                    type="number"
                    name="TotalAmount"
                    value={formData.TotalAmount}
                    onChange={onChange}
                    step="0.01"
                    min="0"
                    required
                    style={{ width: '100%', padding: 6, marginTop: 4 }}
                  />
                </label>
              </div>
              <div style={{ marginBottom: 10 }}>
                <label>
                  Category:
                  <input
                    type="text"
                    name="Category"
                    value={formData.Category}
                    onChange={onChange}
                    style={{ width: '100%', padding: 6, marginTop: 4 }}
                  />
                </label>
              </div>
              <div style={{ marginBottom: 10 }}>
                <label>
                  Start Date*:
                  <input
                    type="date"
                    name="StartDate"
                    value={formData.StartDate}
                    onChange={onChange}
                    required
                    style={{ width: '100%', padding: 6, marginTop: 4 }}
                  />
                </label>
              </div>
              <div style={{ marginBottom: 10 }}>
                <label>
                  End Date*:
                  <input
                    type="date"
                    name="EndDate"
                    value={formData.EndDate}
                    onChange={onChange}
                    required
                    style={{ width: '100%', padding: 6, marginTop: 4 }}
                  />
                </label>
              </div>
              <div style={{ marginBottom: 10 }}>
                <label>
                  Notes:
                  <textarea
                    name="Notes"
                    value={formData.Notes}
                    onChange={onChange}
                    rows={3}
                    style={{ width: '100%', padding: 6, marginTop: 4 }}
                  />
                </label>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={closeModal}
                  style={{ ...buttonStyle, backgroundColor: '#ccc' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ ...buttonStyle, backgroundColor: '#b30059', color: '#fff' }}
                >
                  {editBudgetData ? 'Save' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlannerPage;