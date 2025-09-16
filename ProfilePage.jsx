import React, { useEffect, useState } from 'react';
import { getUserProfileByEmail, updateProfile } from '../api';  // make sure updateProfile is exported

const ProfilePage = () => {
  const storedEmail = localStorage.getItem('email');

  // state
  const [originalEmail, setOriginalEmail] = useState(storedEmail);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // fetch profile
  useEffect(() => {
    if (!storedEmail) {
      setError('No email found in localStorage');
      setLoading(false);
      return;
    }
    getUserProfileByEmail(storedEmail)
      .then(data => {
        setProfile(data);
        setForm(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load profile');
        setLoading(false);
      });
  }, [storedEmail]);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSave = async () => {
    try {
      const updated = await updateProfile(originalEmail, form);
      setProfile(updated);
      setForm(updated);
      setOriginalEmail(updated.Email);
      localStorage.setItem('email', updated.Email);
      setIsEditing(false);
    } catch {
      alert('Failed to save changes');
    }
  };

  if (loading) return <p style={{ padding: '20px' }}>Loading...</p>;
  if (error)   return <p style={{ color: 'red', padding: '20px' }}>{error}</p>;

  // —— YOUR ORIGINAL PINKISH STYLES (unchanged) ——
  const pageTitle = {
    fontSize: '22px',
    fontWeight: '600',
    color: '#c2185b',
    marginBottom: '20px',
    fontFamily: 'Arial, sans-serif',
  };
  const pageStyle = {
    padding: '20px',
    backgroundColor: '#fff6fa',
    fontFamily: 'Arial, sans-serif',
  };
  const rowStyle = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '20px',
    alignItems: 'flex-start',
  };
  const columnStyle = {
    flex: '1',
    minWidth: '300px',
    maxWidth: '400px',
  };
  const formGroup = {
    marginBottom: '14px',
    display: 'flex',
    flexDirection: 'column',
  };
  const labelStyle = {
    fontWeight: 'bold',
    marginBottom: '4px',
    fontSize: '13px',
    color: '#ad1457',
  };
  const inputStyle = {
    padding: '8px',
    borderRadius: '6px',
    border: '1px solid #f8bbd0',
    backgroundColor: '#ffe4ec',
    fontSize: '13px',
    color: '#333',
  };
  const formatDate = dateStr => dateStr ? dateStr.split('T')[0] : '';

  const column1Fields = [
    ['UserID', 'User ID'],
    ['UserName', 'User Name'],
    ['FullName', 'Full Name'],
    ['Email', 'Email'],
    ['PhoneNumber', 'Phone Number'],
    ['Gender', 'Gender'],
  ];
  const column2Fields = [
    ['DateOfBirth', 'Date of Birth'],
    ['Address', 'Address'],
    ['City', 'City'],
    ['State', 'State'],
    ['ZipCode', 'Zip Code'],
    ['Country', 'Country'],
  ];

  return (
    <div style={pageStyle}>
      <h2 style={pageTitle}>👤 User Profile</h2>

      {/* Edit / Save / Cancel buttons */}
      <div style={{ marginBottom: '20px' }}>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            style={{
              padding: '8px 12px',
              backgroundColor: '#c2185b',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            ✏️ Edit Profile
          </button>
        ) : (
          <>
            <button
              onClick={handleSave}
              style={{
                padding: '8px 12px',
                backgroundColor: '#c2185b',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                marginRight: '10px',
              }}
            >
              💾 Save
            </button>
            <button
              onClick={() => { setForm(profile); setIsEditing(false); }}
              style={{
                padding: '8px 12px',
                backgroundColor: '#f8bbd0',
                color: '#c2185b',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              ✖️ Cancel
            </button>
          </>
        )}
      </div>

      <div style={rowStyle}>
        {/* Column 1 */}
        <div style={columnStyle}>
          {column1Fields.map(([key, label]) => (
            <div key={key} style={formGroup}>
              <label style={labelStyle}>{label}</label>
              <input
                name={key}
                type="text"
                value={
                  form[key] != null
                    ? key === 'DateOfBirth'
                      ? formatDate(form[key])
                      : form[key]
                    : ''
                }
                onChange={handleChange}
                readOnly={!isEditing || key === 'UserID'}
                style={{
                  ...inputStyle,
                  backgroundColor: (!isEditing || key === 'UserID')
                    ? '#eee'
                    : inputStyle.backgroundColor,
                  cursor: (!isEditing || key === 'UserID')
                    ? 'not-allowed'
                    : 'text',
                }}
              />
            </div>
          ))}
        </div>

        {/* Column 2 */}
        <div style={columnStyle}>
          {column2Fields.map(([key, label]) => (
            <div key={key} style={formGroup}>
              <label style={labelStyle}>{label}</label>
              <input
                name={key}
                type={key === 'DateOfBirth' ? 'date' : 'text'}
                value={
                  form[key] != null
                    ? key === 'DateOfBirth'
                      ? formatDate(form[key])
                      : form[key]
                    : ''
                }
                onChange={handleChange}
                readOnly={!isEditing}
                style={{
                  ...inputStyle,
                  backgroundColor: !isEditing
                    ? '#eee'
                    : inputStyle.backgroundColor,
                  cursor: !isEditing
                    ? 'not-allowed'
                    : 'text',
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
