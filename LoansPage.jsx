// src/pages/LoansPage.jsx

import React, { useEffect, useState, useCallback } from 'react';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import { getLoansByEmail, addLoan, editLoan, deleteLoan } from '../api';
import { Box, Modal, TextField, Typography, Grid } from '@mui/material';

const LoansPage = () => {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [email] = useState(localStorage.getItem('email') || '');

  const [modalEditOpen, setModalEditOpen] = useState(false);
  const [modalAddOpen, setModalAddOpen] = useState(false);

  const [loanId, setLoanId] = useState(null);
  const [loanType, setLoanType] = useState('');
  const [principal, setPrincipal] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [termMonths, setTermMonths] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [monthlyPayment, setMonthlyPayment] = useState('');
  const [balance, setBalance] = useState('');
  const [status, setStatus] = useState('');

  const fetchLoans = useCallback(async () => {
    if (!email) {
      setError('No email found. Please login first.');
      return;
    }
    setLoading(true);
    try {
      const data = await getLoansByEmail(email);
      setLoans(data);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to fetch loans');
    } finally {
      setLoading(false);
    }
  }, [email]);

  useEffect(() => {
    fetchLoans();
  }, [fetchLoans]);

  const openEditModal = (loan) => {
    setLoanId(loan.LoanID);
    setLoanType(loan.LoanType);
    setPrincipal(loan.PrincipalAmount);
    setInterestRate(loan.InterestRate);
    setTermMonths(loan.TermMonths);
    setStartDate(loan.StartDate.slice(0, 10));
    setEndDate(loan.EndDate.slice(0, 10));
    setMonthlyPayment(loan.MonthlyPayment);
    setBalance(loan.OutstandingBalance);
    setStatus(loan.Status);
    setModalEditOpen(true);
  };

  const closeEditModal = () => {
    setModalEditOpen(false);
    clearLoanForm();
  };

  const openAddModal = () => {
    clearLoanForm();
    setModalAddOpen(true);
  };

  const closeAddModal = () => {
    setModalAddOpen(false);
    clearLoanForm();
  };

  const clearLoanForm = () => {
    setLoanId(null);
    setLoanType('');
    setPrincipal('');
    setInterestRate('');
    setTermMonths('');
    setStartDate('');
    setEndDate('');
    setMonthlyPayment('');
    setBalance('');
    setStatus('');
  };

  const handleDelete = async (loan) => {
    if (window.confirm(`Are you sure you want to delete loan "${loan.LoanType}"?`)) {
      try {
        const res = await deleteLoan(loan.LoanID);
        alert(res.message || 'Loan deleted');
        fetchLoans();
      } catch (error) {
        alert('Delete failed');
        console.error(error);
      }
    }
  };

  const handleEditSubmit = async () => {
    try {
      await editLoan({
        LoanID: loanId,
        LoanType: loanType,
        PrincipalAmount: parseFloat(principal),
        InterestRate: parseFloat(interestRate),
        TermMonths: parseInt(termMonths),
        StartDate: startDate,
        EndDate: endDate,
        MonthlyPayment: parseFloat(monthlyPayment),
        OutstandingBalance: parseFloat(balance),
        Status: status,
        Email: email,
      });
      alert('Loan updated');
      fetchLoans();
      closeEditModal();
    } catch (error) {
      alert('Failed to update loan');
      console.error(error);
    }
  };

  const handleAddSubmit = async () => {
    try {
      await addLoan({
        LoanType: loanType,
        PrincipalAmount: parseFloat(principal),
        InterestRate: parseFloat(interestRate),
        TermMonths: parseInt(termMonths),
        StartDate: startDate,
        EndDate: endDate,
        MonthlyPayment: parseFloat(monthlyPayment),
        OutstandingBalance: parseFloat(balance),
        Status: status,
        Email: email,
      });
      alert('Loan added');
      fetchLoans();
      closeAddModal();
    } catch (error) {
      alert('Failed to add loan');
      console.error(error);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <Typography variant="h4" style={{ color: '#880e4f' }} gutterBottom>
          Your Loans
        </Typography>
        <button onClick={openAddModal} style={styles.addButton}>
          <FontAwesomeIcon icon={faPlus} /> Add Loan
        </button>
      </div>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: '#d32f2f' }}>{error}</p>}
      {!loading && !error && loans.length === 0 && <p>No loans found.</p>}

      {!loading && loans.length > 0 && (
        <table style={styles.table}>
          <thead>
            <tr>
              {['Loan Type','Principal','Interest Rate (%)','Term (Months)','Start Date','End Date','Monthly Payment','Balance','Status','Actions'].map(header => (
                <th key={header} style={styles.th}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loans.map(loan => (
              <tr key={loan.LoanID}>
                <td style={styles.td}>{loan.LoanType}</td>
                <td style={styles.td}>{loan.PrincipalAmount.toFixed(2)}</td>
                <td style={styles.td}>{loan.InterestRate.toFixed(2)}</td>
                <td style={styles.td}>{loan.TermMonths}</td>
                <td style={styles.td}>{new Date(loan.StartDate).toLocaleDateString()}</td>
                <td style={styles.td}>{new Date(loan.EndDate).toLocaleDateString()}</td>
                <td style={styles.td}>{loan.MonthlyPayment.toFixed(2)}</td>
                <td style={styles.td}>{loan.OutstandingBalance.toFixed(2)}</td>
                <td style={styles.td}>{loan.Status}</td>
                <td style={styles.td}>
                  <button onClick={() => openEditModal(loan)} style={styles.actionButton}>
                    <EditIcon />
                  </button>
                  <button onClick={() => handleDelete(loan)} style={styles.actionButton}>
                    <DeleteIcon />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Edit Modal */}
      <Modal open={modalEditOpen} onClose={closeEditModal}>
        <Box sx={styles.modalBox}>
          <Typography variant="h6" mb={2}>Edit Loan</Typography>
          <LoanForm
            loanType={loanType} setLoanType={setLoanType}
            principal={principal} setPrincipal={setPrincipal}
            interestRate={interestRate} setInterestRate={setInterestRate}
            termMonths={termMonths} setTermMonths={setTermMonths}
            startDate={startDate} setStartDate={setStartDate}
            endDate={endDate} setEndDate={setEndDate}
            monthlyPayment={monthlyPayment} setMonthlyPayment={setMonthlyPayment}
            balance={balance} setBalance={setBalance}
            status={status} setStatus={setStatus}
          />
          <Box sx={{ mt:2, display:'flex', justifyContent:'space-between' }}>
            <button onClick={handleEditSubmit} style={styles.submitButton}>Save</button>
            <button onClick={closeEditModal} style={styles.cancelButton}>Cancel</button>
          </Box>
        </Box>
      </Modal>

      {/* Add Modal */}
      <Modal open={modalAddOpen} onClose={closeAddModal}>
        <Box sx={styles.modalBox}>
          <Typography variant="h6" mb={2}>Add Loan</Typography>
          <LoanForm
            loanType={loanType} setLoanType={setLoanType}
            principal={principal} setPrincipal={setPrincipal}
            interestRate={interestRate} setInterestRate={setInterestRate}
            termMonths={termMonths} setTermMonths={setTermMonths}
            startDate={startDate} setStartDate={setStartDate}
            endDate={endDate} setEndDate={setEndDate}
            monthlyPayment={monthlyPayment} setMonthlyPayment={setMonthlyPayment}
            balance={balance} setBalance={setBalance}
            status={status} setStatus={setStatus}
          />
          <Box sx={{ mt:2, display:'flex', justifyContent:'space-between' }}>
            <button onClick={handleAddSubmit} style={styles.submitButton}>Add</button>
            <button onClick={closeAddModal} style={styles.cancelButton}>Cancel</button>
          </Box>
        </Box>
      </Modal>
    </div>
  );
};

const LoanForm = ({
  loanType, setLoanType,
  principal, setPrincipal,
  interestRate, setInterestRate,
  termMonths, setTermMonths,
  startDate, setStartDate,
  endDate, setEndDate,
  monthlyPayment, setMonthlyPayment,
  balance, setBalance,
  status, setStatus
}) => (
  <Grid container spacing={2}>
    <Grid item xs={12} sm={6}>
      <TextField label="Loan Type" fullWidth value={loanType} onChange={e => setLoanType(e.target.value)} />
    </Grid>
    <Grid item xs={12} sm={6}>
      <TextField label="Principal Amount" type="number" fullWidth value={principal} onChange={e => setPrincipal(e.target.value)} />
    </Grid>
    <Grid item xs={12} sm={6}>
      <TextField label="Interest Rate (%)" type="number" fullWidth value={interestRate} onChange={e => setInterestRate(e.target.value)} />
    </Grid>
    <Grid item xs={12} sm={6}>
      <TextField label="Term (Months)" type="number" fullWidth value={termMonths} onChange={e => setTermMonths(e.target.value)} />
    </Grid>
    <Grid item xs={12} sm={6}>
      <TextField label="Start Date" type="date" fullWidth InputLabelProps={{ shrink: true }} value={startDate} onChange={e => setStartDate(e.target.value)} />
    </Grid>
    <Grid item xs={12} sm={6}>
      <TextField label="End Date" type="date" fullWidth InputLabelProps={{ shrink: true }} value={endDate} onChange={e => setEndDate(e.target.value)} />
    </Grid>
    <Grid item xs={12} sm={6}>
      <TextField label="Monthly Payment" type="number" fullWidth value={monthlyPayment} onChange={e => setMonthlyPayment(e.target.value)} />
    </Grid>
    <Grid item xs={12} sm={6}>
      <TextField label="Outstanding Balance" type="number" fullWidth value={balance} onChange={e => setBalance(e.target.value)} />
    </Grid>
    <Grid item xs={12}>
      <TextField label="Status" fullWidth value={status} onChange={e => setStatus(e.target.value)} />
    </Grid>
  </Grid>
);

const styles = {
  container: {
    padding: '20px',
    backgroundColor: '#fff0f6',
    minHeight: '100vh'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  addButton: {
    background: '#f50057',
    color: 'white',
    border: 'none',
    padding: '10px 16px',
    cursor: 'pointer',
    borderRadius: '4px',
    transition: 'background 0.2s'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  th: {
    border: '1px solid #ffd6e7',
    padding: '8px',
    backgroundColor: '#ffd1dc',
    color: '#880e4f',
    fontWeight: 'bold'
  },
  td: {
    border: '1px solid #ffd6e7',
    padding: '8px',
    textAlign: 'center'
  },
  actionButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    margin: '0 5px'
  },
  modalBox: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 600,
    bgcolor: '#fff0f6',
    boxShadow: '0 4px 24px rgba(245, 0, 87, 0.2)',
    p: 4,
    borderRadius: 2,
    border: '2px solid #f50057'
  },
  submitButton: {
    background: '#f50057',
    color: 'white',
    padding: '8px 16px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  cancelButton: {
    background: '#ffc1e3',
    color: '#880e4f',
    padding: '8px 16px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  }
};

export default LoansPage;
