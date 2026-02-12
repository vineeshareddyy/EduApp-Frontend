import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

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
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    mobile: '',
    skills: [],
    experience: '',
    specialization: ''
  });
  const [skillInput, setSkillInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { setMounted(true); }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddSkill = (e) => {
    if (e.key === 'Enter' && skillInput.trim()) {
      e.preventDefault();
      if (!formData.skills.includes(skillInput.trim())) {
        setFormData({ ...formData, skills: [...formData.skills, skillInput.trim()] });
      }
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setFormData({ ...formData, skills: formData.skills.filter(skill => skill !== skillToRemove) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      await register({ ...formData, role: 'trainer' });
      navigate('/login');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const formContent = (
    <>
      {/* SNACKBAR for errors */}
      <Snackbar message={error} type="error" onClose={() => setError('')} />

      <form onSubmit={handleSubmit} style={st.form}>
        <div style={st.row}>
          <FormField label="Full Name" name="name" placeholder="John Doe" value={formData.name} onChange={handleChange} required />
          <FormField label="Email Address" name="email" type="email" placeholder="john@example.com" value={formData.email} onChange={handleChange} required />
        </div>
        <div style={st.row}>
          <FormField label="Mobile" name="mobile" type="tel" placeholder="+1 (555) 000-0000" value={formData.mobile} onChange={handleChange} required />
          <FormField label="Password" name="password" type="password" placeholder="••••••••" value={formData.password} onChange={handleChange} required />
        </div>
        <div style={st.row}>
          <FormField label="Confirm Password" name="confirmPassword" type="password" placeholder="••••••••" value={formData.confirmPassword} onChange={handleChange} required />
          <FormField label="Specialization" name="specialization" placeholder="e.g. System Design" value={formData.specialization} onChange={handleChange} required />
        </div>
        <div style={st.row}>
          <SelectField label="Experience" name="experience" value={formData.experience} onChange={handleChange} options={[
            { value: '1-2 years', label: '1-2 years' }, { value: '3-5 years', label: '3-5 years' },
            { value: '5-10 years', label: '5-10 years' }, { value: '10+ years', label: '10+ years' },
          ]} required />
          <div style={{ flex: 1 }} />
        </div>

        <SkillsField
          skillInput={skillInput}
          setSkillInput={setSkillInput}
          handleAddSkill={handleAddSkill}
          skills={formData.skills}
          handleRemoveSkill={handleRemoveSkill}
        />

        <button type="submit" disabled={loading}
          style={{ ...st.submitBtn, ...(loading ? st.submitBtnDisabled : {}) }}
          onMouseEnter={(e) => { if (!loading) e.currentTarget.style.opacity = '0.92'; }}
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

const FormField = ({ label, name, placeholder, type = 'text', value, onChange, required = false }) => {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <label style={{ ...fi.label, color: focused ? '#0ea5e9' : '#9ca3af' }}>{label} {required && '*'}</label>
      <input type={type} name={name} placeholder={placeholder} value={value} onChange={onChange} required={required}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{ ...fi.input, backgroundColor: focused ? '#fff' : 'rgba(255,255,255,0.5)', borderColor: focused ? '#0ea5e9' : 'rgba(255,255,255,0.5)', boxShadow: focused ? '0 0 0 3px rgba(14,165,233,0.1)' : 'none' }}
      />
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
      <label style={{ ...fi.label, color: focused ? '#0ea5e9' : '#9ca3af' }}>Skills (Press Enter to add)</label>
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
  formCard: { width: '520px', minWidth: '520px', maxHeight: '92vh', background: 'rgba(255,255,255,0.70)', backdropFilter: 'blur(48px)', border: '1px solid rgba(255,255,255,0.40)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', borderRadius: '32px', padding: '28px 32px', display: 'flex', flexDirection: 'column' },
  formHeader: { textAlign: 'center', marginBottom: '20px' },
  formTitle: { fontSize: '1.5rem', fontWeight: 900, color: '#111827', letterSpacing: '-0.025em', margin: 0 },
  formSubtitle: { color: '#6b7280', fontSize: '12px', fontWeight: 500, marginTop: '2px' },
  form: { display: 'flex', flexDirection: 'column', gap: '10px' },
  row: { display: 'flex', gap: '12px' },
  chipContainer: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' },
  chip: { display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.3)', borderRadius: '16px', fontSize: '12px', fontWeight: 600, color: '#0369a1' },
  chipDelete: { display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#0369a1', opacity: 0.7 },
  submitBtn: { width: '100%', padding: '12px', marginTop: '4px', borderRadius: '14px', border: 'none', background: 'linear-gradient(to right,#1e3a8a,#0ea5e9)', color: 'white', fontWeight: 700, fontSize: '15px', cursor: 'pointer', transition: 'all 0.3s', boxShadow: '0 8px 24px rgba(14,165,233,0.3)', position: 'relative', overflow: 'hidden', fontFamily: 'inherit' },
  submitBtnDisabled: { background: '#9ca3af', cursor: 'not-allowed', boxShadow: 'none' },
  spinner: { width: '20px', height: '20px', border: '3px solid rgba(255,255,255,0.3)', borderTop: '3px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' },
  loginLink: { marginTop: '16px', textAlign: 'center' },
  loginText: { fontSize: '13px', fontWeight: 700, color: '#6b7280', margin: 0 },
  loginButton: { background: 'none', border: 'none', color: '#0ea5e9', fontWeight: 900, cursor: 'pointer', fontSize: '13px', padding: 0, fontFamily: 'inherit' },
};

export default TrainerRegisterForm;