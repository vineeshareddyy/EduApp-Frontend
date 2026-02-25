import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Avatar,
  Box,
  Divider,
  ListItemIcon,
  ListItemText,
  InputBase,
} from '@mui/material';
import {
  NotificationsOutlined,
  ExitToApp,
  PersonOutline,
  SettingsOutlined,
  SearchOutlined,
  HelpOutlineOutlined,
  MenuOutlined,
  KeyboardArrowDown,
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const _headerKf = document.getElementById('header-keyframes') || (() => {
  const style = document.createElement('style');
  style.id = 'header-keyframes';
  style.textContent = `
    @keyframes headerSlideDown {
      0% { opacity: 0; transform: translateY(-100%); }
      100% { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
  return style;
})();

const Header = ({ title, onMenuToggle }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifAnchor, setNotifAnchor] = useState(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleProfileMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);
  const handleLogout = () => { logout(); navigate('/login'); handleMenuClose(); };

  const getUserInitials = (name) => name?.split(' ').map((w) => w[0]).join('').toUpperCase() || 'U';
  const getRoleLabel = () => { if (!user?.role) return 'Student'; return user.role.charAt(0).toUpperCase() + user.role.slice(1); };
  const getPortalLabel = () => { if (!user?.role) return 'STUDENT PORTAL'; return `${user.role.toUpperCase()} PORTAL`; };

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        background: 'linear-gradient(135deg, #3B5998 0%, #2D7DD2 50%, #1A8A8A 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.10)',
        boxShadow: '0 2px 12px rgba(26,138,138,0.30)',
        animation: 'headerSlideDown 0.4s ease-out',
       
      }}
    >
      <Toolbar sx={{ minHeight: { xs: 68, sm: 76 }, px: { xs: 1.5, sm: 2.5 },  display:"flex",
        justifyContent:"space-between" }}>
        {/* ── Brand ── */}
        <Box display="flex" alignItems="center" gap={1} sx={{ cursor: 'pointer', '&:hover': { opacity: 0.85 }, minWidth: 'fit-content' }} onClick={() => navigate('/')}>
          {onMenuToggle && (
            <IconButton onClick={(e) => { e.stopPropagation(); onMenuToggle(); }} sx={{ color: 'rgba(255,255,255,0.7)', mr: 0.5, display: { md: 'none' } }}>
              <MenuOutlined />
            </IconButton>
          )}
          <Box sx={{ width: 38, height: 38, borderRadius: '10px', background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Typography sx={{ fontWeight: 900, fontSize: '1.15rem', color: '#fff', lineHeight: 1 }}>i</Typography>
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: '1.05rem', color: '#fff', letterSpacing: '-0.01em', lineHeight: 1.15, fontFamily: "'Segoe UI', 'Helvetica Neue', sans-serif" }}>
              iMentora
            </Typography>
            <Typography sx={{ fontSize: '0.58rem', fontWeight: 700, color: 'rgba(255,255,255,0.65)', letterSpacing: '0.12em', textTransform: 'uppercase', lineHeight: 1 }}>
              {getPortalLabel()}
            </Typography>
          </Box>
        </Box>

       
        {/* ── Right Actions ── */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.3, sm: 1 } }}>
          <IconButton sx={{ color: 'rgba(255,255,255,0.55)', width: 36, height: 36, borderRadius: '9px', display: { xs: 'none', sm: 'flex' }, '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.12)' } }}>
            <HelpOutlineOutlined sx={{ fontSize: 20 }} />
          </IconButton>
          <IconButton onClick={(e) => setNotifAnchor(e.currentTarget)} sx={{ color: 'rgba(255,255,255,0.55)', width: 36, height: 36, borderRadius: '9px', '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.12)' } }}>
            <Badge badgeContent={0} sx={{ '& .MuiBadge-badge': { bgcolor: '#ef4444', fontSize: '0.6rem', minWidth: 16, height: 16 } }}>
              <NotificationsOutlined sx={{ fontSize: 20 }} />
            </Badge>
          </IconButton>
          <IconButton sx={{ color: 'rgba(255,255,255,0.55)', width: 36, height: 36, borderRadius: '9px', display: { xs: 'none', sm: 'flex' }, '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.12)' } }}>
            <SettingsOutlined sx={{ fontSize: 20 }} />
          </IconButton>

          <Box sx={{ width: '1px', height: 28, bgcolor: 'rgba(255,255,255,0.15)', mx: 0.5, display: { xs: 'none', sm: 'block' } }} />

          {/* User Chip */}
          <Box onClick={handleProfileMenuOpen} sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', borderRadius: '10px', px: { xs: 0.5, sm: 1.2 }, py: 0.5, '&:hover': { bgcolor: 'rgba(255,255,255,0.10)' } }}>
            <Box sx={{ display: { xs: 'none', sm: 'block' }, textAlign: 'right' }}>
              <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: '#fff', lineHeight: 1.2 }}>{user?.name || 'User'}</Typography>
              <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, color: 'rgba(255,255,255,0.60)', letterSpacing: '0.06em', textTransform: 'uppercase', lineHeight: 1.2 }}>BATCH #42A</Typography>
            </Box>
            <Box sx={{ position: 'relative' }}>
              <Avatar sx={{ width: 38, height: 38, fontSize: '0.82rem', fontWeight: 700, background: 'rgba(255,255,255,0.20)', color: '#fff', border: '2px solid rgba(255,255,255,0.25)' }}>
                {user?.name ? getUserInitials(user.name) : 'U'}
              </Avatar>
              <Box sx={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: '50%', bgcolor: '#10b981', border: '2px solid #2D7DD2' }} />
            </Box>
            <KeyboardArrowDown sx={{ fontSize: 18, color: 'rgba(255,255,255,0.4)', display: { xs: 'none', sm: 'block' } }} />
          </Box>
        </Box>

        {/* Notification Menu */}
        <Menu anchorEl={notifAnchor} open={Boolean(notifAnchor)} onClose={() => setNotifAnchor(null)}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }} anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          PaperProps={{ sx: { mt: 1.5, borderRadius: '14px', background: '#fff', boxShadow: '0 16px 48px rgba(0,0,0,0.15)', minWidth: 260 } }}
        >
          <Box sx={{ px: 2.5, py: 1.5 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>Notifications</Typography>
            <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8', mt: 0.3 }}>You're all caught up</Typography>
          </Box>
        </Menu>

        {/* Profile Menu */}
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }} anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          PaperProps={{ sx: { mt: 1.5, borderRadius: '14px', background: '#fff', boxShadow: '0 16px 48px rgba(0,0,0,0.15)', minWidth: 220 } }}
        >
          <Box sx={{ px: 2.5, py: 1.8, textAlign: 'center' }}>
            <Avatar sx={{ width: 48, height: 48, fontSize: '1rem', fontWeight: 700, background: 'linear-gradient(135deg, #3B5998 0%, #2D7DD2 100%)', color: '#fff', mx: 'auto', mb: 1, boxShadow: '0 4px 14px rgba(45,125,210,0.30)' }}>
              {user?.name ? getUserInitials(user.name) : 'U'}
            </Avatar>
            <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>{user?.name || 'User'}</Typography>
            <Box sx={{ display: 'inline-block', mt: 0.5, px: 1.5, py: 0.2, borderRadius: '50px', bgcolor: 'rgba(45,125,210,0.08)', border: '1px solid rgba(45,125,210,0.15)' }}>
              <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, color: '#2D7DD2', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{getRoleLabel()}</Typography>
            </Box>
          </Box>
          <Divider sx={{ borderColor: 'rgba(0,0,0,0.06)', mx: 1.5 }} />
          <MenuItem onClick={handleMenuClose} sx={{ mx: 1, my: 0.5, borderRadius: '10px', py: 1.2, '&:hover': { bgcolor: 'rgba(45,125,210,0.06)' } }}>
            <ListItemIcon sx={{ minWidth: 36 }}><PersonOutline sx={{ fontSize: 20, color: '#64748b' }} /></ListItemIcon>
            <ListItemText primary="Profile" primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }} />
          </MenuItem>
          <MenuItem onClick={handleMenuClose} sx={{ mx: 1, my: 0.5, borderRadius: '10px', py: 1.2, '&:hover': { bgcolor: 'rgba(45,125,210,0.06)' } }}>
            <ListItemIcon sx={{ minWidth: 36 }}><SettingsOutlined sx={{ fontSize: 20, color: '#64748b' }} /></ListItemIcon>
            <ListItemText primary="Settings" primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }} />
          </MenuItem>
          <Divider sx={{ borderColor: 'rgba(0,0,0,0.06)', mx: 1.5 }} />
          <MenuItem onClick={handleLogout} sx={{ mx: 1, my: 0.5, mb: 1, borderRadius: '10px', py: 1.2, '&:hover': { bgcolor: 'rgba(239,68,68,0.06)' } }}>
            <ListItemIcon sx={{ minWidth: 36 }}><ExitToApp sx={{ fontSize: 20, color: '#ef4444' }} /></ListItemIcon>
            <ListItemText primary="Log Out" primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 600, color: '#ef4444' }} />
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default Header;