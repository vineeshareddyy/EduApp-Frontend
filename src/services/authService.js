// src/services/authService.js
import { apiRequest } from './API/index';

const authService = {
  // ============================================================
  // STUDENT LOGIN - Real API
  // ============================================================
  loginStudent: async (credential, password) => {
    console.log('🔄 Student Login attempt for:', credential);
    
    try {
      const response = await apiRequest('/api/student/login', {
        method: 'POST',
        body: JSON.stringify({
          Credential: credential,  // Can be email or mobile number
          Password: password
        })
      });
      // In loginStudent, after getting the response:
if (response.Entity_Type && response.Entity_Type !== 'student') {
  throw new Error('Not a student account');
}

      console.log('✅ Student Login successful:', response);

      // Store token and user data
      const userData = {
        id: response.Id,
        name: response.Name,
        role: 'student',
        orgId: response.Org_Id,
        photoUrl: response.Photo_URL,
        entityType: response.Entity_Type
      };

      localStorage.setItem('token', `student_${response.Id}_${Date.now()}`);
      localStorage.setItem('user', JSON.stringify(userData));

      // ✅ ADD THIS LINE RIGHT AFTER:
      localStorage.setItem('student_id', response.Id);

      return {
        success: true,
        data: {
          user: userData,
          token: localStorage.getItem('token')
        }
      };
    } catch (error) {
      console.error('❌ Student Login failed:', error);
      throw new Error(error.message || 'Invalid email or password');
    }
  },

  // ============================================================
  // TRAINER LOGIN - Fixed endpoint and response mapping
  // Backend: POST /api/admin/org/trainer/login
  // Expects: { Credential, Password }
  // Returns: { Message, Entity_Type, Id, Name, Org_Id, Photo_upload, Session_Timeout }
  // ============================================================
  loginTrainer: async (credential, password) => {
    console.log('🔄 Trainer Login attempt for:', credential);
    try {
      const response = await apiRequest('/api/admin/org/trainer/login', {
        method: 'POST',
        body: JSON.stringify({
          Credential: credential,
          Password: password
        }),
      });

      console.log('✅ Trainer Login successful:', response);

      const userData = {
        id: response.Id,
        name: response.Name,
        role: 'trainer',
        orgId: response.Org_Id,
        photoUrl: response.Photo_upload || null  // Backend returns Photo_upload, not Photo_URL
      };

      localStorage.setItem('token', `trainer_${response.Id}_${Date.now()}`);
      localStorage.setItem('user', JSON.stringify(userData));

      return {
        success: true,
        data: {
          user: userData,
          token: localStorage.getItem('token')
        }
      };
    } catch (error) {
      console.error('❌ Trainer Login failed:', error);
      throw new Error(error.message || 'Invalid email or password');
    }
  },

  // ============================================================
  // MENTOR LOGIN - Fixed endpoint and response mapping
  // Backend: POST /api/admin/org/mentor/login
  // Expects: { Credential, Password }
  // Returns: { Message, Entity_Type, Id, Name, Org_Id, Photo_upload, Session_Timeout }
  // ============================================================
  loginMentor: async (credential, password) => {
    console.log('🔄 Mentor Login attempt for:', credential);
    
    try {
      const response = await apiRequest('/api/admin/org/mentor/login', {
        method: 'POST',
        body: JSON.stringify({
          Credential: credential,
          Password: password
        })
      });

      console.log('✅ Mentor Login successful:', response);

      const userData = {
        id: response.Id,
        name: response.Name,
        role: 'mentor',
        orgId: response.Org_Id,
        photoUrl: response.Photo_upload || null  // Backend returns Photo_upload, not Photo_URL
      };

      localStorage.setItem('token', `mentor_${response.Id}_${Date.now()}`);
      localStorage.setItem('user', JSON.stringify(userData));

      return {
        success: true,
        data: {
          user: userData,
          token: localStorage.getItem('token')
        }
      };
    } catch (error) {
      console.error('❌ Mentor Login failed:', error);
      throw new Error(error.message || 'Invalid email or password');
    }
  },

  // ============================================================
  // UNIFIED LOGIN - Tries to detect user type or uses specified type
  // ============================================================
  login: async (email, password, userType = null) => {
    console.log('🔄 Login attempt for:', email, 'Type:', userType);

    // If user type is specified, use that directly
    if (userType === 'student') {
      return await authService.loginStudent(email, password);
    }
    if (userType === 'trainer') {
      return await authService.loginTrainer(email, password);
    }
    if (userType === 'mentor') {
      return await authService.loginMentor(email, password);
    }

    // If no type specified, try student first (most common), then others
   // NEW — 1 API call
// In authService.js, inside the `login` method, replace everything after the "try student first" comment:

// NEW — 1 API call
const response = await apiRequest('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ Credential: email, Password: password })
});

const role = (response.Entity_Type || '').toLowerCase();

const userData = {
  id: response.Id,
  name: response.Name,
  role: role,
  orgId: response.Org_Id,
  photoUrl: role === 'student' ? response.Photo_URL : (response.Photo_upload || null),
  entityType: response.Entity_Type
};

localStorage.setItem('token', `${role}_${response.Id}_${Date.now()}`);
localStorage.setItem('user', JSON.stringify(userData));

if (role === 'student') {
  localStorage.setItem('student_id', response.Id);
}

return {
  success: true,
  data: {
    user: userData,
    token: localStorage.getItem('token')
  }
};
// Uses response.Entity_Type to set the role
  },

  // ============================================================
  // LOGOUT
  // ============================================================
  logout: async () => {
    console.log('🔄 Logout...');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('student_id');
    console.log('✅ Logout successful');
    return { success: true };
  },

  // ============================================================
  // FORGOT PASSWORD
  // ============================================================
  forgotPassword: async (email) => {
    console.log('🔄 Forgot Password for:', email);
    
    try {
      const response = await apiRequest('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email })
      });
      
      return {
        success: true,
        message: response.Message || 'Password reset email sent!'
      };
    } catch (error) {
      throw new Error(error.message || 'Failed to send reset email');
    }
  },

  // ============================================================
  // RESET PASSWORD
  // ============================================================
  resetPassword: async (token, newPassword) => {
    console.log('🔄 Reset Password');
    
    try {
      const response = await apiRequest('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword })
      });
      
      return {
        success: true,
        message: response.Message || 'Password reset successful!'
      };
    } catch (error) {
      throw new Error(error.message || 'Failed to reset password');
    }
  },

  // ============================================================
  // GET CURRENT USER
  // ============================================================
  getCurrentUser: () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
      try {
        const userData = JSON.parse(user);
        console.log('👤 Current user:', userData.name, '- Role:', userData.role);
        return userData;
      } catch (e) {
        console.log('⚠️ Failed to parse user data:', e);
        return null;
      }
    }
    return null;
  },

  // ============================================================
  // CHECK IF AUTHENTICATED
  // ============================================================
  isAuthenticated: () => {
    const isAuth = !!localStorage.getItem('token');
    console.log('🔐 Is authenticated:', isAuth);
    return isAuth;
  },

  // ============================================================
  // GET TOKEN
  // ============================================================
  getToken: () => {
    return localStorage.getItem('token');
  }
};

export default authService; 