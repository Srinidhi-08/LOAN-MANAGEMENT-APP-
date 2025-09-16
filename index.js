const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const { poolPromise, sqlDb } = require('./db'); // assumes db.js sets up MSSQL connection
const app = express();
const sql = require('mssql');
const PORT = 2006;
const axios   = require('axios');
const OpenAI = require('openai');



app.use(cors());
app.use(express.json());


// ✅ Log every incoming request
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url}:`, req.body);
  next();
});

// 🚀 Signup Endpoint
app.post('/signup', async (req, res) => {
  const {
    UserName, FullName, PhoneNumber, Gender, DateOfBirth,
    Address, City, State, ZipCode, Country, Email, Password
  } = req.body;

  if (!UserName || !FullName || !Email || !Password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const pool = await poolPromise;

    const checkUser = await pool.request()
      .input('UserName', sqlDb.VarChar(255), UserName)
      .query(`SELECT * FROM Users WHERE UserName = @UserName`);
    if (checkUser.recordset.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const checkEmail = await pool.request()
      .input('Email', sqlDb.VarChar(255), Email)
      .query(`SELECT * FROM Auth WHERE Email = @Email`);
    if (checkEmail.recordset.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const insertUser = await pool.request()
      .input('UserName', sqlDb.VarChar(255), UserName)
      .input('FullName', sqlDb.VarChar(255), FullName)
      .input('PhoneNumber', sqlDb.VarChar(20), PhoneNumber || null)
      .input('Gender', sqlDb.VarChar(10), Gender || null)
      .input('DateOfBirth', sqlDb.Date, DateOfBirth || null)
      .input('Address', sqlDb.Text, Address || null)
      .input('City', sqlDb.VarChar(100), City || null)
      .input('State', sqlDb.VarChar(100), State || null)
      .input('ZipCode', sqlDb.VarChar(20), ZipCode || null)
      .input('Country', sqlDb.VarChar(100), Country || null)
      .query(`
        INSERT INTO Users (UserName, FullName, PhoneNumber, Gender, DateOfBirth, Address, City, State, ZipCode, Country)
        OUTPUT INSERTED.UserID
        VALUES (@UserName, @FullName, @PhoneNumber, @Gender, @DateOfBirth, @Address, @City, @State, @ZipCode, @Country)
      `);

    const userId = insertUser.recordset[0].UserID;
    const hash = await bcrypt.hash(Password, 10);

    await pool.request()
      .input('UserID', sqlDb.Int, userId)
      .input('Email', sqlDb.VarChar(255), Email)
      .input('PasswordHash', sqlDb.VarChar(255), hash)
      .query(`INSERT INTO Auth (UserID, Email, PasswordHash) VALUES (@UserID, @Email, @PasswordHash)`);

    await pool.request()
      .input('UserID', sqlDb.Int, userId)
      .input('Email', sqlDb.VarChar(255), Email)
      .input('IsSuccessful', sqlDb.Bit, 1)
      .query(`INSERT INTO LoginInfo (UserID, Email, IsSuccessful) VALUES (@UserID, @Email, @IsSuccessful)`);

    res.status(200).json({ message: 'Signup successful' });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Signup failed' });
  }
});

// 🔐 Login Endpoint
app.post('/login', async (req, res) => {
  const { Email, Password } = req.body;

  if (!Email || !Password) {
    return res.status(400).json({ error: 'Missing email or password' });
  }

  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .input('Email', sqlDb.VarChar(255), Email)
      .query(`
        SELECT a.AuthID, a.UserID, a.PasswordHash, u.UserName
        FROM Auth a
        JOIN Users u ON a.UserID = u.UserID
        WHERE a.Email = @Email
      `);

    if (result.recordset.length === 0) {
      await pool.request()
        .input('UserID', sqlDb.Int, null)
        .input('Email', sqlDb.VarChar(255), Email)
        .input('IsSuccessful', sqlDb.Bit, 0)
        .query(`INSERT INTO LoginInfo (UserID, Email, IsSuccessful) VALUES (@UserID, @Email, @IsSuccessful)`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.recordset[0];
    const isMatch = await bcrypt.compare(Password, user.PasswordHash);

    await pool.request()
      .input('UserID', sqlDb.Int, user.UserID)
      .input('Email', sqlDb.VarChar(255), Email)
      .input('IsSuccessful', sqlDb.Bit, isMatch ? 1 : 0)
      .query(`INSERT INTO LoginInfo (UserID, Email, IsSuccessful) VALUES (@UserID, @Email, @IsSuccessful)`);

    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    res.status(200).json({ message: 'Login successful', user: { UserName: user.UserName, UserID: user.UserID } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/profile/:email', async (req, res) => {
  const { email } = req.params;

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('Email', sqlDb.VarChar(255), email)
      .query(`
        SELECT 
          u.UserID, u.UserName, u.FullName, u.PhoneNumber, u.Gender, 
          u.DateOfBirth, u.Address, u.City, u.State, u.ZipCode, u.Country,
          a.Email
        FROM Users u
        JOIN Auth a ON u.UserID = a.UserID
        WHERE a.Email = @Email
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json(result.recordset[0]);
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/profile/:email', async (req, res) => {
  const originalEmail = req.params.email;
  const {
    UserName, FullName, PhoneNumber, Gender,
    DateOfBirth, Address, City, State, ZipCode, Country,
    Email: newEmail
  } = req.body;

  try {
    const pool = await poolPromise;
    const transaction = new sqlDb.Transaction(pool);
    await transaction.begin();

    // 1) Lookup UserID
    const lookup = await transaction.request()
      .input('OriginalEmail', sqlDb.VarChar(255), originalEmail)
      .query(`
        SELECT u.UserID
        FROM Users u
        JOIN Auth a ON u.UserID = a.UserID
        WHERE a.Email = @OriginalEmail
      `);

    if (lookup.recordset.length === 0) {
      await transaction.rollback();
      return res.status(404).json({ error: 'User not found' });
    }
    const userID = lookup.recordset[0].UserID;

    // 2) Update Users
    await transaction.request()
      .input('UserID', sqlDb.Int, userID)
      .input('UserName', sqlDb.VarChar(100), UserName)
      .input('FullName', sqlDb.VarChar(255), FullName)
      .input('PhoneNumber', sqlDb.VarChar(50), PhoneNumber)
      .input('Gender', sqlDb.VarChar(10), Gender)
      .input('DateOfBirth', sqlDb.Date, DateOfBirth)
      .input('Address', sqlDb.VarChar(500), Address)
      .input('City', sqlDb.VarChar(100), City)
      .input('State', sqlDb.VarChar(100), State)
      .input('ZipCode', sqlDb.VarChar(20), ZipCode)
      .input('Country', sqlDb.VarChar(100), Country)
      .query(`
        UPDATE Users
        SET
          UserName    = @UserName,
          FullName    = @FullName,
          PhoneNumber = @PhoneNumber,
          Gender      = @Gender,
          DateOfBirth = @DateOfBirth,
          Address     = @Address,
          City        = @City,
          State       = @State,
          ZipCode     = @ZipCode,
          Country     = @Country
        WHERE UserID = @UserID
      `);

    // 3) Update Auth if email changed
    if (newEmail && newEmail !== originalEmail) {
      await transaction.request()
        .input('UserID', sqlDb.Int, userID)
        .input('NewEmail', sqlDb.VarChar(255), newEmail)
        .query(`
          UPDATE Auth
          SET Email = @NewEmail
          WHERE UserID = @UserID
        `);
    }

    await transaction.commit();

    // 4) Return updated profile
    const updated = await pool.request()
      .input('Email', sqlDb.VarChar(255), newEmail || originalEmail)
      .query(`
        SELECT 
          u.UserID, u.UserName, u.FullName, u.PhoneNumber, u.Gender, 
          u.DateOfBirth, u.Address, u.City, u.State, u.ZipCode, u.Country,
          a.Email
        FROM Users u
        JOIN Auth a ON u.UserID = a.UserID
        WHERE a.Email = @Email
      `);

    res.json(updated.recordset[0]);
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


// Loans by Email (JOIN)
// GET all loans for a specific user email
// Then your route:
app.get('/api/loans/:email', async (req, res) => {
  const email = req.params.email;

  try {
    const pool = await poolPromise; // get existing connection pool

    const result = await pool.request()
      .input('Email', sqlDb.VarChar(255), email)
      .query(`
        SELECT 
          l.LoanID,
          l.LoanType,
          l.PrincipalAmount,
          l.InterestRate,
          l.TermMonths,
          l.StartDate,
          l.EndDate,
          l.MonthlyPayment,
          l.OutstandingBalance,
          l.Status,
          l.CreatedAt,
          l.UpdatedAt
        FROM Loans l
        INNER JOIN Users u ON l.UserID = u.UserID
        INNER JOIN Auth a ON u.UserID = a.UserID
        WHERE a.Email = @Email
      `);

    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching loans:', error);
    res.status(500).json({ error: 'Failed to fetch loans' });
  }
});


app.post('/api/add-loan', async (req, res) => {
  const {
    Email,
    LoanType,
    PrincipalAmount,
    InterestRate,
    TermMonths,
    StartDate,
    EndDate,
    MonthlyPayment,
    OutstandingBalance,
    Status,
  } = req.body;

  try {
    const pool = await poolPromise;

    // Step 1: Find UserID from Email
    const userResult = await pool.request()
      .input('Email', sqlDb.VarChar(255), Email)
      .query(`
        SELECT u.UserID
        FROM Users u
        INNER JOIN Auth a ON u.UserID = a.UserID
        WHERE a.Email = @Email
      `);

    if (userResult.recordset.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userID = userResult.recordset[0].UserID;

    // Step 2: Insert new loan
    await pool.request()
      .input('UserID', sqlDb.Int, userID)
      .input('LoanType', sqlDb.VarChar(100), LoanType)
      .input('PrincipalAmount', sqlDb.Float, PrincipalAmount)
      .input('InterestRate', sqlDb.Float, InterestRate)
      .input('TermMonths', sqlDb.Int, TermMonths)
      .input('StartDate', sqlDb.Date, StartDate)
      .input('EndDate', sqlDb.Date, EndDate)
      .input('MonthlyPayment', sqlDb.Float, MonthlyPayment)
      .input('OutstandingBalance', sqlDb.Float, OutstandingBalance)
      .input('Status', sqlDb.VarChar(50), Status)
      .query(`
        INSERT INTO Loans (
          UserID, LoanType, PrincipalAmount, InterestRate, TermMonths,
          StartDate, EndDate, MonthlyPayment, OutstandingBalance, Status, CreatedAt, UpdatedAt
        )
        VALUES (
          @UserID, @LoanType, @PrincipalAmount, @InterestRate, @TermMonths,
          @StartDate, @EndDate, @MonthlyPayment, @OutstandingBalance, @Status, GETDATE(), GETDATE()
        )
      `);

    res.json({ message: 'Loan added successfully' });
  } catch (error) {
    console.error('Error adding loan:', error);
    res.status(500).json({ error: 'Failed to add loan' });
  }
});


  // ✅ Edit Loan
  app.put('/api/edit-loan', async (req, res) => {
  const {
    LoanID,
    LoanType,
    PrincipalAmount,
    InterestRate,
    TermMonths,
    StartDate,
    EndDate,
    MonthlyPayment,
    OutstandingBalance,
    Status,
  } = req.body;

  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .input('LoanID', sqlDb.Int, LoanID)
      .input('LoanType', sqlDb.VarChar(100), LoanType)
      .input('PrincipalAmount', sqlDb.Float, PrincipalAmount)
      .input('InterestRate', sqlDb.Float, InterestRate)
      .input('TermMonths', sqlDb.Int, TermMonths)
      .input('StartDate', sqlDb.Date, StartDate)
      .input('EndDate', sqlDb.Date, EndDate)
      .input('MonthlyPayment', sqlDb.Float, MonthlyPayment)
      .input('OutstandingBalance', sqlDb.Float, OutstandingBalance)
      .input('Status', sqlDb.VarChar(50), Status)
      .query(`
        UPDATE Loans SET
          LoanType = @LoanType,
          PrincipalAmount = @PrincipalAmount,
          InterestRate = @InterestRate,
          TermMonths = @TermMonths,
          StartDate = @StartDate,
          EndDate = @EndDate,
          MonthlyPayment = @MonthlyPayment,
          OutstandingBalance = @OutstandingBalance,
          Status = @Status,
          UpdatedAt = GETDATE()
        WHERE LoanID = @LoanID
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    res.json({ message: 'Loan updated successfully' });
  } catch (error) {
    console.error('Error updating loan:', error);
    res.status(500).json({ error: 'Failed to update loan' });
  }
});


  // ✅ Delete Loan
app.delete('/api/delete-loan/:loanId', async (req, res) => {
  const loanId = parseInt(req.params.loanId);

  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .input('LoanID', sqlDb.Int, loanId)
      .query('DELETE FROM Loans WHERE LoanID = @LoanID');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    res.json({ message: 'Loan deleted successfully' });
  } catch (error) {
    console.error('Error deleting loan:', error);
    res.status(500).json({ error: 'Failed to delete loan' });
  }
});

// Budgets [Getting Budgetes By Email]
// index.js
app.get('/api/budgets/:email', async (req, res) => {
  const email = req.params.email;

  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .input('Email', sqlDb.VarChar(255), email)
      .query(`
        SELECT 
          b.BudgetID, b.BudgetName, b.TotalAmount, b.Category, 
          b.StartDate, b.EndDate, b.Notes, b.CreatedAt, b.UpdatedAt
        FROM Budgets b
        INNER JOIN Users u ON b.UserID = u.UserID
        INNER JOIN Auth a ON u.UserID = a.UserID
        WHERE a.Email = @Email
        ORDER BY b.CreatedAt DESC
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching budgets:', err);
    res.status(500).json({ error: 'Failed to fetch budgets' });
  }
});

// Add Budget
app.post('/api/add-budget', async (req, res) => {
  const {
    Email,
    BudgetName,
    TotalAmount,
    Category,
    StartDate,
    EndDate,
    Notes,
  } = req.body;

  if (!Email || !BudgetName || !TotalAmount || !StartDate || !EndDate) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const pool = await poolPromise;
    const userRes = await pool.request()
      .input('Email', sqlDb.VarChar(255), Email)
      .query(`
        SELECT u.UserID
        FROM Users u
        INNER JOIN Auth a ON u.UserID = a.UserID
        WHERE a.Email = @Email
      `);
    if (!userRes.recordset.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    await pool.request()
      .input('UserID', sqlDb.Int, userRes.recordset[0].UserID)
      .input('BudgetName', sqlDb.VarChar(255), BudgetName)
      .input('TotalAmount', sqlDb.Decimal(18,2), TotalAmount)
      .input('Category', sqlDb.VarChar(100), Category || null)
      .input('StartDate', sqlDb.Date, StartDate)
      .input('EndDate', sqlDb.Date, EndDate)
      .input('Notes', sqlDb.NVarChar(sqlDb.MAX), Notes || null)
      .query(`
        INSERT INTO Budgets 
          (UserID,BudgetName,TotalAmount,Category,StartDate,EndDate,Notes,CreatedAt)
        VALUES 
          (@UserID,@BudgetName,@TotalAmount,@Category,@StartDate,@EndDate,@Notes,GETDATE());
      `);

    res.json({ message: 'Budget added successfully' });
  } catch (err) {
    console.error('Error adding budget:', err);
    res.status(500).json({ error: 'Failed to add budget' });
  }
});


// Edit Budget
// Edit/update an existing budget (no Email required)
app.put('/api/edit-budget', async (req, res) => {
  const {
    BudgetID,
    BudgetName,
    TotalAmount,
    Category,
    StartDate,
    EndDate,
    Notes,
  } = req.body;

  // Validate required fields
  if (!BudgetID || !BudgetName || !TotalAmount || !StartDate || !EndDate) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .input('BudgetID',    sqlDb.Int,     BudgetID)
      .input('BudgetName',  sqlDb.VarChar(255), BudgetName)
      .input('TotalAmount', sqlDb.Decimal(18, 2), TotalAmount)
      .input('Category',    sqlDb.VarChar(100), Category || null)
      .input('StartDate',   sqlDb.Date,         StartDate)
      .input('EndDate',     sqlDb.Date,         EndDate)
      .input('Notes',       sqlDb.NVarChar(sqlDb.MAX), Notes || null)
      .input('UpdatedAt',   sqlDb.DateTime,     new Date())
      .query(`
        UPDATE Budgets
        SET  
          BudgetName  = @BudgetName,
          TotalAmount = @TotalAmount,
          Category    = @Category,
          StartDate   = @StartDate,
          EndDate     = @EndDate,
          Notes       = @Notes,
          UpdatedAt   = @UpdatedAt
        WHERE BudgetID = @BudgetID
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    // Return the updated budget object so front-end can update state
    res.json({
      BudgetID,
      BudgetName,
      TotalAmount,
      Category,
      StartDate,
      EndDate,
      Notes,
      UpdatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error updating budget:', err);
    res.status(500).json({ error: 'Failed to update budget' });
  }
});


// Delete Budget
app.delete('/api/delete-budget/:budgetId', async (req, res) => {
  const budgetId = parseInt(req.params.budgetId, 10);
  if (isNaN(budgetId)) {
    return res.status(400).json({ error: 'Invalid budget ID' });
  }

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('BudgetID', sqlDb.Int, budgetId)
      .query('DELETE FROM Budgets WHERE BudgetID = @BudgetID');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Budget not found' });
    }
    res.json({ message: 'Budget deleted successfully' });
  } catch (err) {
    console.error('Error deleting budget:', err);
    res.status(500).json({ error: 'Failed to delete budget' });
  }
});

//Financial Goals 
// API: Get Financial Goals by Email
// GET /api/financialgoals/:email
app.get('/api/financialgoals/:email', async (req, res) => {
  const email = req.params.email;
  console.log('Fetching goals for:', email);

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('Email', sqlDb.VarChar(255), email)
      .query(`
        SELECT 
          fg.GoalID,
          fg.GoalName,
          fg.TargetAmount,
          fg.CurrentAmount,
          fg.TargetDate,
          fg.Priority,
          fg.Status,
          fg.CreatedAt,
          fg.UpdatedAt
        FROM FinancialGoals fg
        INNER JOIN Users u ON fg.UserID = u.UserID
        INNER JOIN Auth a ON u.UserID = a.UserID
        WHERE a.Email = @Email
        ORDER BY fg.CreatedAt DESC
      `);

    // Return empty array instead of 404 so front-end can render its empty state
    if (!result.recordset.length) {
      return res.status(200).json([]);
    }

    res.json(result.recordset);
  } catch (err) {
    console.error('DB error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new goal
app.post('/api/financialgoals', async (req, res) => {
  const { email, goalName, targetAmount, targetDate, priority } = req.body;
  try {
    const pool = await poolPromise;
    // get the user’s ID
    const user = await pool.request()
      .input('Email', sqlDb.VarChar(255), email)
      .query(`SELECT UserID FROM Auth WHERE Email = @Email`);
    if (!user.recordset.length) return res.status(404).json({ error: 'User not found' });

    const { UserID } = user.recordset[0];
    const insert = await pool.request()
      .input('UserID', sqlDb.Int, UserID)
      .input('GoalName', sqlDb.VarChar(255), goalName)
      .input('TargetAmount', sqlDb.Decimal(18,2), targetAmount)
      .input('TargetDate', sqlDb.Date, targetDate)
      .input('Priority', sqlDb.VarChar(50), priority)
      .query(`
        INSERT INTO FinancialGoals (UserID, GoalName, TargetAmount, TargetDate, Priority)
        VALUES (@UserID, @GoalName, @TargetAmount, @TargetDate, @Priority);
        SELECT SCOPE_IDENTITY() AS GoalID;
      `);
    res.status(201).json({ GoalID: insert.recordset[0].GoalID });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create goal' });
  }
});

// Update an existing goal
app.put('/api/financialgoals/:id', async (req, res) => {
  const { id } = req.params;
  const { goalName, targetAmount, currentAmount, targetDate, priority, status } = req.body;
  try {
    const pool = await poolPromise;
    await pool.request()
      .input('GoalID', sqlDb.Int, id)
      .input('GoalName', sqlDb.VarChar(255), goalName)
      .input('TargetAmount', sqlDb.Decimal(18,2), targetAmount)
      .input('CurrentAmount', sqlDb.Decimal(18,2), currentAmount)
      .input('TargetDate', sqlDb.Date, targetDate)
      .input('Priority', sqlDb.VarChar(50), priority)
      .input('Status', sqlDb.VarChar(50), status)
      .query(`
        UPDATE FinancialGoals
        SET GoalName = @GoalName,
            TargetAmount = @TargetAmount,
            CurrentAmount = @CurrentAmount,
            TargetDate = @TargetDate,
            Priority = @Priority,
            Status = @Status,
            UpdatedAt = GETDATE()
        WHERE GoalID = @GoalID;
      `);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update goal' });
  }
});

// Delete a goal
app.delete('/api/financialgoals/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await poolPromise;
    await pool.request()
      .input('GoalID', sqlDb.Int, id)
      .query(`DELETE FROM FinancialGoals WHERE GoalID = @GoalID;`);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete goal' });
  }
});

app.get('/api/payments/:email', async (req, res) => {
  const email = req.params.email;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('Email', sqlDb.VarChar(255), email)
      .query(`
        SELECT 
          p.PaymentID, 
          p.PaymentDate, 
          p.Amount, 
          p.Category,
          p.PaymentMethod, 
          p.IsRecurring, 
          p.Notes, 
          p.CreatedAt
        FROM PaymentTracker p
        INNER JOIN Users u ON p.UserID = u.UserID
        INNER JOIN Auth a ON u.UserID = a.UserID
        WHERE a.Email = @Email
        ORDER BY p.PaymentDate DESC
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching payments:', err);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// ─── CREATE a Payment ──────────────────────────────────────────────────────────
app.post('/api/payments', async (req, res) => {
  const { email, paymentDate, amount, category, paymentMethod, isRecurring, notes } = req.body;
  try {
    const pool = await poolPromise;
    // find the user
    const userRes = await pool.request()
      .input('Email', sqlDb.VarChar(255), email)
      .query(`SELECT UserID FROM Auth WHERE Email = @Email`);
    if (!userRes.recordset.length) {
      return res.status(404).json({ error: 'User not found' });
    }
    const { UserID } = userRes.recordset[0];

    const insert = await pool.request()
      .input('UserID', sqlDb.Int, UserID)
      .input('PaymentDate', sqlDb.Date, paymentDate)
      .input('Amount', sqlDb.Decimal(18,2), amount)
      .input('Category', sqlDb.VarChar(100), category)
      .input('PaymentMethod', sqlDb.VarChar(50), paymentMethod)
      .input('IsRecurring', sqlDb.Bit, isRecurring ? 1 : 0)
      .input('Notes', sqlDb.Text, notes)
      .query(`
        INSERT INTO PaymentTracker 
          (UserID, PaymentDate, Amount, Category, PaymentMethod, IsRecurring, Notes)
        VALUES
          (@UserID, @PaymentDate, @Amount, @Category, @PaymentMethod, @IsRecurring, @Notes);
        SELECT SCOPE_IDENTITY() AS PaymentID;
      `);

    res.status(201).json({ PaymentID: insert.recordset[0].PaymentID });
  } catch (err) {
    console.error('Error creating payment:', err);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

// ─── UPDATE a Payment ─────────────────────────────────────────────────────────
app.put('/api/payments/:id', async (req, res) => {
  const { id } = req.params;
  const { paymentDate, amount, category, paymentMethod, isRecurring, notes } = req.body;
  try {
    const pool = await poolPromise;
    await pool.request()
      .input('PaymentID', sqlDb.Int, id)
      .input('PaymentDate', sqlDb.Date, paymentDate)
      .input('Amount', sqlDb.Decimal(18,2), amount)
      .input('Category', sqlDb.VarChar(100), category)
      .input('PaymentMethod', sqlDb.VarChar(50), paymentMethod)
      .input('IsRecurring', sqlDb.Bit, isRecurring ? 1 : 0)
      .input('Notes', sqlDb.Text, notes)
      .query(`
        UPDATE PaymentTracker
        SET 
          PaymentDate = @PaymentDate,
          Amount = @Amount,
          Category = @Category,
          PaymentMethod = @PaymentMethod,
          IsRecurring = @IsRecurring,
          Notes = @Notes
        WHERE PaymentID = @PaymentID;
      `);
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating payment:', err);
    res.status(500).json({ error: 'Failed to update payment' });
  }
});

// ─── DELETE a Payment ─────────────────────────────────────────────────────────
app.delete('/api/payments/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await poolPromise;
    await pool.request()
      .input('PaymentID', sqlDb.Int, id)
      .query(`DELETE FROM PaymentTracker WHERE PaymentID = @PaymentID;`);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting payment:', err);
    res.status(500).json({ error: 'Failed to delete payment' });
  }
});

// Get notes for a user
// GET /api/notes/:email — list notes for a given user
app.get('/api/notes/:email', async (req, res) => {
  const { email } = req.params;
  try {
    const pool = await poolPromise;
    const userRes = await pool.request()
      .input('Email', sqlDb.VarChar(255), email)
      .query(`
        SELECT u.UserID
        FROM Users u
        JOIN Auth a ON u.UserID = a.UserID
        WHERE a.Email = @Email
      `);
    if (!userRes.recordset.length) return res.status(404).send('User not found');
    const userID = userRes.recordset[0].UserID;

    const notesRes = await pool.request()
      .input('UserID', sqlDb.Int, userID)
      .query(`
        SELECT NoteID, Content, CreatedAt, UpdatedAt
        FROM ToDoNotes
        WHERE UserID = @UserID
        ORDER BY CreatedAt DESC
      `);

    res.json(notesRes.recordset);
  } catch (err) {
    console.error('GET /api/notes error:', err);
    res.status(500).send('Error fetching notes');
  }
});

// POST /api/notes — add a new note
app.post('/api/notes', async (req, res) => {
  const { email, content } = req.body;
  try {
    const pool = await poolPromise;
    const userRes = await pool.request()
      .input('Email', sqlDb.VarChar(255), email)
      .query(`
        SELECT u.UserID
        FROM Users u
        JOIN Auth a ON u.UserID = a.UserID
        WHERE a.Email = @Email
      `);
    if (!userRes.recordset.length) return res.status(404).send('User not found');
    const userID = userRes.recordset[0].UserID;

    const insertRes = await pool.request()
      .input('UserID',  sqlDb.Int,          userID)
      .input('Content', sqlDb.NVarChar(500), content)
      .query(`
        INSERT INTO ToDoNotes (UserID, Content)
        VALUES (@UserID, @Content);
        SELECT SCOPE_IDENTITY() AS NoteID;
      `);

    res.status(201).json({ NoteID: insertRes.recordset[0].NoteID });
  } catch (err) {
    console.error('POST /api/notes error:', err);
    res.status(500).send('Error adding note');
  }
});

// DELETE /api/notes/:id — remove a note
app.delete('/api/notes/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await poolPromise;
    await pool.request()
      .input('NoteID', sqlDb.Int, id)
      .query(`DELETE FROM ToDoNotes WHERE NoteID = @NoteID`);
    res.sendStatus(204);
  } catch (err) {
    console.error('DELETE /api/notes error:', err);
    res.status(500).send('Error deleting note');
  }
});

// index.js (partial)

app.get('/api/debt-strategy/:email', async (req, res) => {
  const email = req.params.email;

  try {
    const pool = await poolPromise;

    const loansResult = await pool.request()
      .input('Email', sqlDb.VarChar(255), email)
      .query(`
        SELECT 
          l.LoanID,
          l.LoanType,
          l.PrincipalAmount,
          l.InterestRate,
          l.TermMonths,
          l.MonthlyPayment,
          l.OutstandingBalance,
          l.Status
        FROM Loans l
        INNER JOIN Users u ON l.UserID = u.UserID
        INNER JOIN Auth a ON u.UserID = a.UserID
        WHERE a.Email = @Email AND l.Status = 'Active'
      `);

    const loans = loansResult.recordset;

    // Simulate two strategies
    const snowball = [...loans].sort((a, b) => a.OutstandingBalance - b.OutstandingBalance);
    const avalanche = [...loans].sort((a, b) => b.InterestRate - a.InterestRate);

    res.json({ snowball, avalanche });
  } catch (err) {
    console.error('Error in debt strategy:', err);
    res.status(500).json({ error: 'Failed to fetch debt strategies' });
  }
});
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ✅ Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', // or 'gpt-4' if you have access
      messages: [
        {
          role: 'system',
          content: 'You are a financial advisor chatbot. Answer questions about savings, loans, budgeting, etc.',
        },
        {
          role: 'user',
          content: message,
        },
      ],
    });

    res.json({ reply: response.choices[0].message.content });
  } catch (err) {
    console.error('OpenAI Error:', err.message);
    res.status(500).json({ error: 'OpenAI service failed.' });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
