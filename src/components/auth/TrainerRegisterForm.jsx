import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../../services/API/index';

// ============================================================
// SNACKBAR COMPONENT
// ============================================================
const Snackbar = ({ message, type = 'error', onClose }) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  const isError = type === 'error';
  return (
    <div style={{
      position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, minWidth: '320px', maxWidth: '560px', width: 'auto',
      padding: '14px 20px 14px 16px', borderRadius: '14px',
      background: isError ? 'linear-gradient(135deg, #dc2626, #ef4444)' : 'linear-gradient(135deg, #16a34a, #22c55e)',
      color: '#fff', fontWeight: 600, fontSize: '13.5px', fontFamily: 'inherit',
      boxShadow: isError ? '0 12px 40px rgba(220,38,38,0.35)' : '0 12px 40px rgba(22,163,74,0.35)',
      display: 'flex', alignItems: 'center', gap: '10px',
      animation: 'snackSlideIn 0.35s ease-out',
      backdropFilter: 'blur(12px)',
    }}>
      <span style={{ fontSize: '18px' }}>{isError ? '⚠️' : '✅'}</span>
      <span style={{ flex: 1, lineHeight: 1.4 }}>{message}</span>
      <button onClick={onClose} style={{
        background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
        cursor: 'pointer', fontSize: '14px', fontWeight: 800, borderRadius: '8px',
        width: '26px', height: '26px', display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexShrink: 0, fontFamily: 'inherit',
      }}>✕</button>
    </div>
  );
};

const TrainerRegisterForm = ({ embedded = false }) => {
  // Trainer_Code removed from state — Admin/Super_Admin assigns later
  const [formData, setFormData] = useState({
    First_Name: '',
    Last_Name: '',
    Mobile_Number: '',
    Alternate_Number: '',
    Email: '',
    Password: '',
    ConfirmPassword: '',
    Qualification: '',
    Experience: '',
    Dob: '',
    Org_ID: '',
    Address: '',
    District: '',
    State: '',
    Pincode: '',
    Country: 'India',
    Govt_Id_Type: 'Aadhar',
    Govt_Id_Number: '',
  });
  const [skillInput, setSkillInput] = useState('');
  const [skills, setSkills] = useState([]);
  const [photoBase64, setPhotoBase64] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const navigate = useNavigate();

  useEffect(() => { setMounted(true); }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleAddSkill = (e) => {
    if (e.key === 'Enter' && skillInput.trim()) {
      e.preventDefault();
      if (!skills.includes(skillInput.trim())) {
        setSkills([...skills, skillInput.trim()]);
      }
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setSkills(skills.filter(skill => skill !== skillToRemove));
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Photo size must be less than 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError('Please upload a valid image file');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhotoBase64(event.target.result);
        setPhotoPreview(event.target.result);
        setError('');
      };
      reader.onerror = () => setError('Failed to read the image file');
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoBase64(null);
    setPhotoPreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // --- Client-side validation ---
    if (formData.Password !== formData.ConfirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }
    if (formData.Password.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }
    if (!/[A-Z]/.test(formData.Password)) {
      setError('Password must contain at least one uppercase letter');
      setLoading(false);
      return;
    }
    if (!/[a-z]/.test(formData.Password)) {
      setError('Password must contain at least one lowercase letter');
      setLoading(false);
      return;
    }
    if (!/\d/.test(formData.Password)) {
      setError('Password must contain at least one number');
      setLoading(false);
      return;
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(formData.Password)) {
      setError('Password must contain at least one special character');
      setLoading(false);
      return;
    }
    if (!/^\d{10,13}$/.test(formData.Mobile_Number)) {
      setError('Mobile Number must be 10-13 digits');
      setLoading(false);
      return;
    }
    if (!/^\d{10,13}$/.test(formData.Alternate_Number)) {
      setError('Alternate Number must be 10-13 digits');
      setLoading(false);
      return;
    }
    if (skills.length === 0) {
      setError('Please add at least one skill');
      setLoading(false);
      return;
    }
    if (!formData.Govt_Id_Number.trim()) {
      setError('Government ID Number is required');
      setLoading(false);
      return;
    }
    if (!photoBase64) {
      setError('Profile photo is required');
      setLoading(false);
      return;
    }

    try {
      // Build JSON body — Trainer_Code not included (Admin/Super_Admin assigns later)
      const payload = {
        First_Name: formData.First_Name,
        Last_Name: formData.Last_Name,
        Mobile_Number: formData.Mobile_Number,
        Alternate_Number: formData.Alternate_Number,
        Email: formData.Email,
        Password: formData.Password,
        Qualification: formData.Qualification,
        Skills: skills.join(', '),
        Experience: parseInt(formData.Experience, 10),
        Dob: formData.Dob,
        Org_ID: parseInt(formData.Org_ID, 10),
        Address: formData.Address,
        District: formData.District,
        State: formData.State,
        Pincode: formData.Pincode,
        Country: formData.Country,
        Govt_Id_Type: formData.Govt_Id_Type,
        Govt_Id_Number: formData.Govt_Id_Number,
      };

      // Add photo if uploaded (backend expects base64 data:image string)
      if (photoBase64) {
        payload.Photo_upload = photoBase64;
      }

      // Backend endpoint: POST /api/trainer/register
      const response = await apiRequest('/api/trainer/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      console.log('Trainer registration response:', response);
      setSuccess(
        response.Trainer_Id
          ? `${response.Message || 'Registration successful!'} (Trainer ID: ${response.Trainer_Id})`
          : response.Message || 'Registration successful! Pending admin approval.'
      );

      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      console.error('Trainer registration error:', err);
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const formContent = (
    <>
      {/* SNACKBAR for errors & success */}
      <Snackbar message={error} type="error" onClose={() => setError('')} />
      <Snackbar message={success} type="success" onClose={() => setSuccess('')} />

      <form onSubmit={handleSubmit} style={st.form}>
        {/* Row 1 — Trainer_Code removed, Organization ID stands alone */}
        <div style={st.row}>
          <FormField label="Organization ID" name="Org_ID" type="number" placeholder="e.g. 1" value={formData.Org_ID} onChange={handleChange} required />
        </div>
        {/* Row 2 */}
        <div style={st.row}>
          <FormField label="First Name" name="First_Name" placeholder="John" value={formData.First_Name} onChange={handleChange} required />
          <FormField label="Last Name" name="Last_Name" placeholder="Doe" value={formData.Last_Name} onChange={handleChange} required />
        </div>
        {/* Row 3 */}
        <div style={st.row}>
          <FormField label="Email Address" name="Email" type="email" placeholder="john@example.com" value={formData.Email} onChange={handleChange} required />
          <FormField label="Mobile Number" name="Mobile_Number" type="tel" placeholder="10-13 digits" value={formData.Mobile_Number} onChange={handleChange} required />
        </div>
        {/* Row 4 */}
        <div style={st.row}>
          <FormField label="Alternate Number" name="Alternate_Number" type="tel" placeholder="10-13 digits" value={formData.Alternate_Number} onChange={handleChange} required />
          <FormField label="Qualification" name="Qualification" placeholder="e.g. M.Tech" value={formData.Qualification} onChange={handleChange} required />
        </div>
        {/* Row 5 */}
        <div style={st.row}>
          <FormField label="Experience (Years)" name="Experience" type="number" placeholder="e.g. 5" value={formData.Experience} onChange={handleChange} required />
          <FormField label="Date of Birth" name="Dob" type="date" value={formData.Dob} onChange={handleChange} required />
        </div>
        {/* Row 6 */}
        <FormField label="Address" name="Address" placeholder="Full address" value={formData.Address} onChange={handleChange} required />
        {/* Row 7 */}
        <div style={st.row}>
          <FormField label="District" name="District" placeholder="e.g. Hyderabad" value={formData.District} onChange={handleChange} required />
          <FormField label="State" name="State" placeholder="e.g. Telangana" value={formData.State} onChange={handleChange} required />
        </div>
        {/* Row 8 */}
        <div style={st.row}>
          <FormField label="Pincode" name="Pincode" placeholder="e.g. 500001" value={formData.Pincode} onChange={handleChange} required />
          <FormField label="Country" name="Country" placeholder="e.g. India" value={formData.Country} onChange={handleChange} required />
        </div>
        {/* Row 9 — Govt ID */}
        <div style={st.row}>
          <SelectField label="Govt ID Type" name="Govt_Id_Type" value={formData.Govt_Id_Type} onChange={handleChange} options={[
            { value: 'Aadhar', label: 'Aadhar Card' },
            { value: 'PAN', label: 'PAN Card' },
            { value: 'Passport', label: 'Passport' },
            { value: 'License', label: 'Driving License' },
          ]} required />
          <FormField label="Govt ID Number" name="Govt_Id_Number" placeholder={
            formData.Govt_Id_Type === 'Aadhar' ? '12 digits' :
            formData.Govt_Id_Type === 'PAN' ? 'ABCDE1234F' :
            formData.Govt_Id_Type === 'Passport' ? '6-9 chars' : 'XX-00-0000-0000000'
          } value={formData.Govt_Id_Number} onChange={handleChange} required />
        </div>
        {/* Row 10 — Passwords */}
        <div style={st.row}>
          <FormField label="Password" name="Password" type="password" placeholder="••••••••" value={formData.Password} onChange={handleChange} required hint="Min 8: upper, lower, number, special" />
          <FormField label="Confirm Password" name="ConfirmPassword" type="password" placeholder="••••••••" value={formData.ConfirmPassword} onChange={handleChange} required />
        </div>

        {/* Skills */}
        <SkillsField
          skillInput={skillInput}
          setSkillInput={setSkillInput}
          handleAddSkill={handleAddSkill}
          skills={skills}
          handleRemoveSkill={handleRemoveSkill}
        />

        {/* Profile Photo Upload */}
        <div>
          <label style={{ ...fi.label, color: '#9ca3af' }}>Profile Photo *</label>
          {!photoPreview ? (
            <label style={st.photoUploadBox}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              <span style={{ color: '#6b7280', fontSize: '12px', fontWeight: 600 }}>Click to upload photo</span>
              <span style={{ color: '#9ca3af', fontSize: '10px' }}>JPG, PNG (Max 5MB)</span>
              <input hidden type="file" accept="image/jpeg,image/png,image/jpg" onChange={handlePhotoUpload} />
            </label>
          ) : (
            <div style={st.photoPreviewContainer}>
              <img src={photoPreview} alt="Profile" style={st.photoPreviewThumb} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#16a34a' }}>✓ Photo uploaded</div>
                <button type="button" onClick={handleRemovePhoto} style={st.photoRemoveBtn}>Remove</button>
              </div>
            </div>
          )}
        </div>

        <button type="submit" disabled={loading || !!success}
          style={{ ...st.submitBtn, ...((loading || success) ? st.submitBtnDisabled : {}) }}
          onMouseEnter={(e) => { if (!loading && !success) e.currentTarget.style.opacity = '0.92'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
        >
          {loading ? <div style={st.spinner} /> : <span>Register as Trainer</span>}
        </button>
      </form>

      {!embedded && (
        <div style={st.loginLink}>
          <p style={st.loginText}>
            Already have an account?{' '}
            <button onClick={() => navigate('/login')} style={st.loginButton}>Sign in here</button>
          </p>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes snackSlideIn { from { opacity: 0; transform: translateX(-50%) translateY(-20px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
      `}</style>
    </>
  );

  if (embedded) return formContent;

  return (
    <div style={st.pageWrapper}>
      <div style={st.bgLayer}>
        <div style={st.bgOverlay} />
        <img src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=2000" alt="Workspace" style={{ ...st.bgImage, transform: mounted ? 'scale(1.1)' : 'scale(1)' }} />
      </div>
      <div style={st.floatingContainer}>
        <div style={st.floatingCircle1}><UserSVG /></div>
        <div style={st.floatingCircle2}><ShieldSVG /></div>
      </div>
      <div style={{ ...st.mainContainer, opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(48px)' }}>
        <BrandPanel />
        <div style={st.formCard}>
          <div style={st.formHeader}>
            <h1 style={st.formTitle}>Trainer Registration</h1>
            <p style={st.formSubtitle}>Fill in the details to create your profile</p>
          </div>
          {formContent}
        </div>
      </div>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes snackSlideIn { from { opacity: 0; transform: translateX(-50%) translateY(-20px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        *{box-sizing:border-box;margin:0;padding:0}html,body{overflow:hidden}
      `}</style>
    </div>
  );
};

/* ========== SUB-COMPONENTS ========== */

const FormField = ({ label, name, placeholder, type = 'text', value, onChange, required = false, hint = '' }) => {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <label style={{ ...fi.label, color: focused ? '#0ea5e9' : '#9ca3af' }}>{label} {required && '*'}</label>
      <input type={type} name={name} placeholder={placeholder} value={value} onChange={onChange} required={required}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{ ...fi.input, backgroundColor: focused ? '#fff' : 'rgba(255,255,255,0.5)', borderColor: focused ? '#0ea5e9' : 'rgba(255,255,255,0.5)', boxShadow: focused ? '0 0 0 3px rgba(14,165,233,0.1)' : 'none' }}
      />
      {hint && <div style={{ fontSize: '9px', color: '#9ca3af', marginTop: '2px', marginLeft: '2px' }}>{hint}</div>}
    </div>
  );
};

const SelectField = ({ label, name, value, onChange, options, required = false }) => {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <label style={{ ...fi.label, color: focused ? '#0ea5e9' : '#9ca3af' }}>{label} {required && '*'}</label>
      <select name={name} value={value} onChange={onChange} required={required}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{ ...fi.input, backgroundColor: focused ? '#fff' : 'rgba(255,255,255,0.5)', borderColor: focused ? '#0ea5e9' : 'rgba(255,255,255,0.5)', boxShadow: focused ? '0 0 0 3px rgba(14,165,233,0.1)' : 'none', cursor: 'pointer', appearance: 'auto' }}
      >
        <option value="">Select...</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
};

const SkillsField = ({ skillInput, setSkillInput, handleAddSkill, skills, handleRemoveSkill }) => {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label style={{ ...fi.label, color: focused ? '#0ea5e9' : '#9ca3af' }}>Skills (Press Enter to add) *</label>
      <input type="text" placeholder="Type a skill and press Enter" value={skillInput}
        onChange={(e) => setSkillInput(e.target.value)} onKeyDown={handleAddSkill}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{ ...fi.input, backgroundColor: focused ? '#fff' : 'rgba(255,255,255,0.5)', borderColor: focused ? '#0ea5e9' : 'rgba(255,255,255,0.5)', boxShadow: focused ? '0 0 0 3px rgba(14,165,233,0.1)' : 'none' }}
      />
      {skills.length > 0 && (
        <div style={st.chipContainer}>
          {skills.map((skill, index) => (
            <div key={index} style={st.chip}>
              <span>{skill}</span>
              <button type="button" onClick={() => handleRemoveSkill(skill)} style={st.chipDelete}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const BrandPanel = () => (
  <div style={st.brandPanel}>
    <div style={st.brandContent}>
      <div style={st.iconBadge}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
        </svg>
      </div>
      <h2 style={st.brandTitle}>Start Your <br /><span style={st.brandTitleAccent}>Expert Journey.</span></h2>
      <p style={st.brandDescription}>Join thousands of professionals and students. iMentora provides the tools you need to excel in your next interview.</p>
    </div>
  </div>
);

const UserSVG = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
const ShieldSVG = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

/* ========== STYLES ========== */

const fi = {
  label: { display: 'block', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '5px', marginLeft: '2px', transition: 'color 0.2s' },
  input: { width: '100%', padding: '11px 16px', border: '1px solid rgba(255,255,255,0.5)', borderRadius: '12px', outline: 'none', transition: 'all 0.3s', color: '#111827', fontWeight: 600, fontSize: '13.5px', fontFamily: 'inherit' },
};

const st = {
  pageWrapper: { position: 'relative', height: '100vh', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', fontFamily: "'Inter','Segoe UI',system-ui,-apple-system,sans-serif" },
  bgLayer: { position: 'absolute', inset: 0, zIndex: 0 },
  bgOverlay: { position: 'absolute', inset: 0, background: 'linear-gradient(to top right,rgba(30,58,138,0.95),rgba(14,165,233,0.80),rgba(13,148,136,0.90))', zIndex: 10, mixBlendMode: 'multiply' },
  bgImage: { width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 25s ease-out' },
  floatingContainer: { position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none' },
  floatingCircle1: { position: 'absolute', top: '8%', left: '6%', width: '60px', height: '60px', background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(48px)', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  floatingCircle2: { position: 'absolute', top: '10%', right: '4%', width: '70px', height: '70px', background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(48px)', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  mainContainer: { position: 'relative', zIndex: 20, width: '100%', maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'row', padding: '16px', transition: 'all 1s ease-out', alignItems: 'center', height: '100vh' },
  brandPanel: { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingRight: '48px', color: 'white' },
  brandContent: { display: 'flex', flexDirection: 'column', gap: '18px' },
  iconBadge: { background: 'rgba(255,255,255,0.10)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.20)', padding: '10px', borderRadius: '14px', width: 'fit-content' },
  brandTitle: { fontSize: 'clamp(2rem, 4vw, 3.2rem)', fontWeight: 900, lineHeight: 0.95, letterSpacing: '-0.04em', margin: 0 },
  brandTitleAccent: { background: 'linear-gradient(to right,#bfdbfe,#99f6e4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' },
  brandDescription: { fontSize: 'clamp(0.9rem, 1.1vw, 1.1rem)', color: 'rgba(255,255,255,0.80)', fontWeight: 500, lineHeight: 1.6, maxWidth: '400px', margin: 0 },
  formCard: { width: '520px', minWidth: '520px', maxHeight: '92vh', background: 'rgba(255,255,255,0.70)', backdropFilter: 'blur(48px)', border: '1px solid rgba(255,255,255,0.40)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', borderRadius: '32px', padding: '28px 32px', display: 'flex', flexDirection: 'column', overflow: 'auto' },
  formHeader: { textAlign: 'center', marginBottom: '20px' },
  formTitle: { fontSize: '1.5rem', fontWeight: 900, color: '#111827', letterSpacing: '-0.025em', margin: 0 },
  formSubtitle: { color: '#6b7280', fontSize: '12px', fontWeight: 500, marginTop: '2px' },
  form: { display: 'flex', flexDirection: 'column', gap: '10px' },
  row: { display: 'flex', gap: '12px' },
  chipContainer: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' },
  chip: { display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.3)', borderRadius: '16px', fontSize: '12px', fontWeight: 600, color: '#0369a1' },
  chipDelete: { display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#0369a1', opacity: 0.7 },
  photoUploadBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '20px', border: '2px dashed rgba(0,0,0,0.12)', borderRadius: '16px', background: 'rgba(255,255,255,0.3)', cursor: 'pointer', transition: 'all 0.2s' },
  photoPreviewContainer: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'rgba(22,163,74,0.06)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: '14px' },
  photoPreviewThumb: { width: '48px', height: '48px', borderRadius: '12px', objectFit: 'cover', border: '2px solid rgba(22,163,74,0.3)' },
  photoRemoveBtn: { background: 'none', border: 'none', color: '#dc2626', fontSize: '11px', fontWeight: 700, cursor: 'pointer', padding: 0, marginTop: '2px', fontFamily: 'inherit' },
  submitBtn: { width: '100%', padding: '12px', marginTop: '4px', borderRadius: '14px', border: 'none', background: 'linear-gradient(to right,#1e3a8a,#0ea5e9)', color: 'white', fontWeight: 700, fontSize: '15px', cursor: 'pointer', transition: 'all 0.3s', boxShadow: '0 8px 24px rgba(14,165,233,0.3)', position: 'relative', overflow: 'hidden', fontFamily: 'inherit' },
  submitBtnDisabled: { background: '#9ca3af', cursor: 'not-allowed', boxShadow: 'none' },
  spinner: { width: '20px', height: '20px', border: '3px solid rgba(255,255,255,0.3)', borderTop: '3px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' },
  loginLink: { marginTop: '16px', textAlign: 'center' },
  loginText: { fontSize: '13px', fontWeight: 700, color: '#6b7280', margin: 0 },
  loginButton: { background: 'none', border: 'none', color: '#0ea5e9', fontWeight: 900, cursor: 'pointer', fontSize: '13px', padding: 0, fontFamily: 'inherit' },
};

export default TrainerRegisterForm;
