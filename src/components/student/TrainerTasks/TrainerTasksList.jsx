import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Button,
  Chip,
  TextField,
  Alert,
  Tooltip,
  Skeleton,
  Snackbar,
  InputAdornment,
} from '@mui/material';
import {
  Visibility,
  Search,
  Assignment,
  Group,
  Refresh,
  SearchOutlined,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { trainerTasksAPI } from '../../../services/API/trainertasks';

const fontStack = "'Segoe UI', 'Helvetica Neue', sans-serif";

/* ——— Shimmer ——— */
const TrainerTasksShimmer = ({ rows = 6 }) => {
  const shimmerRows = Array.from({ length: rows }, (_, i) => i);
  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Skeleton variant="text" width={220} height={40} sx={{ borderRadius: 2 }} />
      </Box>
      <Box sx={{ p: 2, mb: 3, borderRadius: '14px', bgcolor: '#fff', border: '1px solid rgba(41,128,185,0.08)' }}>
        <Skeleton variant="rectangular" width={350} height={40} sx={{ borderRadius: '10px' }} />
      </Box>
      <Box sx={{ mb: 3 }}>
        <Skeleton variant="rectangular" width="100%" height={70} sx={{ borderRadius: '14px' }} />
      </Box>
      <Box sx={{ borderRadius: '16px', overflow: 'hidden', bgcolor: '#fff', border: '1px solid rgba(41,128,185,0.08)' }}>
        <Table>
          <TableHead>
            <TableRow>
              {['', '', '', '', ''].map((_, i) => (
                <TableCell key={i}><Skeleton variant="text" width={70 + i * 30} /></TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {shimmerRows.map((i) => (
              <TableRow key={i}>
                <TableCell><Skeleton variant="text" width={50} /></TableCell>
                <TableCell><Skeleton variant="text" width={50} /></TableCell>
                <TableCell><Skeleton variant="text" width={60} /></TableCell>
                <TableCell><Skeleton variant="text" width={220} /></TableCell>
                <TableCell align="center"><Skeleton variant="circular" width={34} height={34} sx={{ mx: 'auto' }} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Box>
  );
};

const StudentTrainerTasksList = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const formatTaskData = (task) => ({
    ID: task.ID || task.id,
    Batch_ID: task.Batch_ID || task.batch_id,
    Session_ID: task.Session_ID || task.session_id,
    Task_Box: task.Task_Box || task.task_box || ''
  });

  const fetchTasks = async () => {
    try {
      setError(null);
      const response = await trainerTasksAPI.getAllTasks();
      let tasksData = [];
      if (response?.data) {
        tasksData = Array.isArray(response.data) ? response.data : [response.data];
      } else if (Array.isArray(response)) {
        tasksData = response;
      } else if (response?.tasks) {
        tasksData = Array.isArray(response.tasks) ? response.tasks : [response.tasks];
      }
      setTasks(tasksData.map(formatTaskData));
    } catch (error) {
      setError(error.message || 'Failed to fetch tasks. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchTasks(); }, []);

  const handleRefresh = async () => { setRefreshing(true); await fetchTasks(); };
  const handleSearch = (event) => setSearchTerm(event.target.value);

  const handleView = (taskId) => {
    if (!taskId || taskId === 'undefined' || taskId === 'null') return;
    navigate(`/student/tasks/view/${taskId}`);
  };

  const filteredTasks = tasks.filter(task => {
    const taskBox = (task.Task_Box || '').toLowerCase();
    const s = searchTerm.toLowerCase();
    return taskBox.includes(s) || task.ID.toString().includes(s) || task.Batch_ID.toString().includes(s) || task.Session_ID.toString().includes(s);
  });

  if (loading) return <TrainerTasksShimmer rows={8} />;

  return (
    <Box sx={{ fontFamily: fontStack }}>
      {/* Error Alert */}
      {error && (
        <Alert
          severity="error"
          sx={{ mb: 3, borderRadius: '12px', border: '1px solid rgba(239,68,68,0.15)' }}
          onClose={() => setError(null)}
          action={<Button color="inherit" size="small" onClick={handleRefresh} sx={{ fontWeight: 600, textTransform: 'none' }}>Retry</Button>}
        >
          {error}
        </Alert>
      )}

      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <Box sx={{ width: 38, height: 38, borderRadius: '11px', background: 'linear-gradient(135deg, #1a5276 0%, #2980b9 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Assignment sx={{ color: '#fff', fontSize: 20 }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', fontFamily: fontStack }}>
              Trainer Tasks
            </Typography>
            <Typography sx={{ fontSize: '0.78rem', color: '#94a3b8', fontFamily: fontStack }}>
              {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''} available
            </Typography>
          </Box>
        </Box>
        <IconButton
          onClick={handleRefresh}
          disabled={refreshing}
          title="Refresh tasks"
          sx={{
            width: 38, height: 38, borderRadius: '10px',
            color: '#2980b9', bgcolor: 'rgba(41,128,185,0.06)',
            '&:hover': { bgcolor: 'rgba(41,128,185,0.12)' },
          }}
        >
          <Refresh sx={{
            fontSize: 20,
            animation: refreshing ? 'spin 1s linear infinite' : 'none',
            '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } }
          }} />
        </IconButton>
      </Box>

      {/* Search */}
      <Box sx={{ p: 2, mb: 3, borderRadius: '14px', bgcolor: '#fff', border: '1px solid rgba(41,128,185,0.08)', boxShadow: '0 1px 3px rgba(26,82,118,0.04)' }}>
        <TextField
          placeholder="Search tasks by ID, Batch ID, Session ID, or content..."
          value={searchTerm}
          onChange={handleSearch}
          size="small"
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchOutlined sx={{ fontSize: 20, color: '#94a3b8' }} /></InputAdornment>,
          }}
          sx={{
            width: '100%', maxWidth: 500,
            '& .MuiOutlinedInput-root': {
              borderRadius: '10px', fontSize: '0.85rem', fontFamily: fontStack, bgcolor: '#f8fafc',
              '& fieldset': { borderColor: 'rgba(41,128,185,0.12)' },
              '&:hover fieldset': { borderColor: 'rgba(41,128,185,0.25)' },
              '&.Mui-focused fieldset': { borderColor: '#2980b9', borderWidth: '1.5px' },
            },
          }}
        />
      </Box>

      {/* Summary Card */}
      <Box sx={{
        p: 2.5, mb: 3, borderRadius: '14px', bgcolor: '#fff',
        border: '1px solid rgba(41,128,185,0.08)',
        boxShadow: '0 1px 3px rgba(26,82,118,0.04)',
        display: 'flex', alignItems: 'center', gap: 2,
      }}>
        <Box sx={{ width: 44, height: 44, borderRadius: '12px', background: 'linear-gradient(135deg, #0d9488 0%, #5eead4 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Assignment sx={{ color: '#fff', fontSize: 22 }} />
        </Box>
        <Box>
          <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', lineHeight: 1, fontFamily: fontStack }}>{tasks.length}</Typography>
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: fontStack }}>Total Tasks</Typography>
        </Box>
      </Box>

      {/* Table */}
      <Box sx={{
        borderRadius: '16px', overflow: 'hidden', bgcolor: '#fff',
        border: '1px solid rgba(41,128,185,0.08)',
        boxShadow: '0 1px 3px rgba(26,82,118,0.04), 0 4px 20px rgba(26,82,118,0.03)',
      }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'rgba(41,128,185,0.04)' }}>
                {['Task ID', 'Batch ID', 'Session ID', 'Task Content', 'Actions'].map((h) => (
                  <TableCell key={h} align={h === 'Actions' ? 'center' : 'left'}>
                    <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#1a5276', letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: fontStack }}>
                      {h}
                    </Typography>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Box sx={{ py: 4 }}>
                      <Assignment sx={{ fontSize: 40, color: '#cbd5e1', mb: 1 }} />
                      <Typography sx={{ fontSize: '0.92rem', fontWeight: 600, color: '#475569', mb: 0.5 }}>
                        {tasks.length === 0 ? 'No tasks found.' : 'No tasks match your search criteria.'}
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTasks.map((task) => (
                  <TableRow
                    key={task.ID}
                    hover
                    sx={{
                      transition: 'all 0.15s ease',
                      '&:hover': { bgcolor: 'rgba(41,128,185,0.03)' },
                      '&:last-child td': { borderBottom: 0 },
                      borderBottom: '1px solid rgba(41,128,185,0.06)',
                    }}
                  >
                    <TableCell>
                      <Chip
                        label={`#${task.ID}`}
                        size="small"
                        sx={{
                          height: 24, fontSize: '0.72rem', fontWeight: 700,
                          bgcolor: 'rgba(41,128,185,0.08)', color: '#1a5276',
                          borderRadius: '6px', fontFamily: fontStack,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={0.8}>
                        <Group sx={{ fontSize: 16, color: '#94a3b8' }} />
                        <Typography sx={{ fontSize: '0.85rem', color: '#475569', fontFamily: fontStack, fontWeight: 500 }}>
                          {task.Batch_ID}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: '0.85rem', color: '#475569', fontFamily: fontStack, fontWeight: 500 }}>
                        {task.Session_ID}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{
                        fontSize: '0.85rem', fontWeight: 500, color: '#0f172a', fontFamily: fontStack,
                        wordBreak: 'break-word', maxWidth: 400, overflow: 'hidden',
                        textOverflow: 'ellipsis', display: '-webkit-box',
                        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                      }}>
                        {task.Task_Box || 'No content'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="View Task" arrow>
                        <IconButton
                          size="small"
                          onClick={() => handleView(task.ID)}
                          sx={{
                            width: 34, height: 34, borderRadius: '9px',
                            color: '#2980b9', bgcolor: 'rgba(41,128,185,0.06)',
                            transition: 'all 0.2s ease',
                            '&:hover': { bgcolor: 'rgba(41,128,185,0.12)', transform: 'scale(1.05)' },
                          }}
                        >
                          <Visibility sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
};

export default StudentTrainerTasksList;