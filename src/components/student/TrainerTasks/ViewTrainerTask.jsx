import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  Paper,
  Divider,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Alert,
  CircularProgress,
  Skeleton,
  IconButton,
  Fade,
  Slide,
  Zoom,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Assignment,
  Schedule,
  ArrowBack,
  QuestionAnswer,
  Group,
  InsertDriveFile,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { trainerTasksAPI } from '../../../services/API/trainertasks';

const fontStack = "'Segoe UI', 'Helvetica Neue', sans-serif";

/* ——— Shimmer ——— */
const ViewTrainerTaskShimmer = () => (
  <Box>
    <Box display="flex" alignItems="center" mb={3} sx={{ p: 2.5, borderRadius: '16px', bgcolor: '#fff', border: '1px solid rgba(41,128,185,0.08)' }}>
      <Skeleton variant="circular" width={42} height={42} sx={{ mr: 2 }} />
      <Box sx={{ flexGrow: 1 }}>
        <Skeleton variant="text" width={280} height={32} sx={{ borderRadius: 2 }} />
        <Skeleton variant="text" width={180} height={22} sx={{ borderRadius: 1 }} />
      </Box>
    </Box>
    <Grid container spacing={2.5}>
      <Grid item xs={12} md={8}>
        <Skeleton variant="rectangular" width="100%" height={180} sx={{ borderRadius: '16px', mb: 2.5 }} />
        <Skeleton variant="rectangular" width="100%" height={200} sx={{ borderRadius: '16px' }} />
      </Grid>
      <Grid item xs={12} md={4}>
        <Skeleton variant="rectangular" width="100%" height={220} sx={{ borderRadius: '16px' }} />
      </Grid>
    </Grid>
    <Box display="flex" justifyContent="center" mt={3} gap={1} alignItems="center">
      <CircularProgress size={18} sx={{ color: '#2980b9' }} />
      <Typography sx={{ fontSize: '0.82rem', color: '#94a3b8' }}>Loading task details...</Typography>
    </Box>
  </Box>
);

/* ——— Info Row helper ——— */
const InfoRow = ({ icon, label, value }) => (
  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
    <Box sx={{ width: 34, height: 34, minWidth: 34, borderRadius: '9px', bgcolor: 'rgba(41,128,185,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 0.2 }}>
      {React.cloneElement(icon, { sx: { fontSize: 18, color: '#2980b9' } })}
    </Box>
    <Box>
      <Typography sx={{ fontSize: '0.68rem', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: fontStack, mb: 0.2 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: '0.92rem', fontWeight: 600, color: '#0f172a', fontFamily: fontStack }}>
        {value}
      </Typography>
    </Box>
  </Box>
);

const StudentViewTrainerTask = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id && id !== 'undefined') {
      fetchTask();
    } else {
      setError('Invalid task ID provided');
      setLoading(false);
    }
  }, [id]);

  const fetchTask = async () => {
    try {
      setLoading(true);
      setError('');
      if (!id || id === 'undefined' || id === 'null') throw new Error('Invalid task ID');
      const response = await trainerTasksAPI.getTaskById(id);
      if (!response) throw new Error('No data received from server');
      const transformedTask = transformApiResponse(response);
      setTask(transformedTask);
    } catch (err) {
      setError('Failed to fetch task details: ' + (err.message || err.toString()));
    } finally {
      setLoading(false);
    }
  };

  const transformApiResponse = (apiData) => {
    if (!apiData) return null;
    const taskData = Array.isArray(apiData) ? apiData[0] : apiData;
    if (!taskData) return null;
    const questions = taskData.Task_Box
      ? taskData.Task_Box.split('?').map(q => q.trim()).filter(q => q).map(q => q.endsWith('?') ? q : q + '?')
      : [];
    return {
      id: taskData.ID,
      batchId: taskData.Batch_ID,
      sessionId: taskData.Session_ID,
      title: `Task #${taskData.ID} - Session ${taskData.Session_ID}`,
      description: `Training task for Batch ${taskData.Batch_ID} containing ${questions.length} question${questions.length !== 1 ? 's' : ''}`,
      questions,
      taskBox: taskData.Task_Box,
      assignedDate: new Date().toISOString(),
      originalData: taskData
    };
  };

  if (loading) return <ViewTrainerTaskShimmer />;

  if (error) {
    return (
      <Box sx={{ fontFamily: fontStack }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/student/tasks')}
          sx={{
            mb: 2, textTransform: 'none', fontWeight: 600, fontSize: '0.85rem',
            color: '#2980b9', borderRadius: '10px', fontFamily: fontStack,
            '&:hover': { bgcolor: 'rgba(41,128,185,0.06)' },
          }}
        >
          Back to Tasks
        </Button>
        <Alert severity="error" sx={{ borderRadius: '12px', border: '1px solid rgba(239,68,68,0.15)', mb: 2 }}>{error}</Alert>
        <Button
          variant="contained"
          onClick={() => window.location.reload()}
          sx={{
            textTransform: 'none', fontWeight: 600, fontSize: '0.85rem',
            background: 'linear-gradient(135deg, #1a5276 0%, #2980b9 100%)',
            borderRadius: '10px', px: 3, fontFamily: fontStack,
            '&:hover': { opacity: 0.9 },
          }}
        >
          Retry
        </Button>
      </Box>
    );
  }

  if (!task) {
    return (
      <Box sx={{ fontFamily: fontStack }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/student/tasks')}
          sx={{ mb: 2, textTransform: 'none', fontWeight: 600, color: '#2980b9', borderRadius: '10px' }}>
          Back to Tasks
        </Button>
        <Alert severity="warning" sx={{ borderRadius: '12px' }}>Task not found</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ fontFamily: fontStack }}>

      {/* ═══ Header Bar ═══ */}
      <Fade in timeout={600}>
        <Box
          sx={{
            p: 2.5, mb: 3, borderRadius: '16px',
            background: 'linear-gradient(135deg, #1a5276 0%, #2980b9 50%, #0d9488 100%)',
            boxShadow: '0 4px 20px rgba(26,82,118,0.18)',
            position: 'relative', overflow: 'hidden',
          }}
        >
          <Box sx={{ position: 'absolute', top: -30, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />

          <Box display="flex" alignItems="center" position="relative" zIndex={1}>
            <IconButton
              onClick={() => navigate('/student/tasks')}
              sx={{
                mr: 2, width: 42, height: 42, borderRadius: '11px',
                bgcolor: 'rgba(255,255,255,0.15)', color: '#fff',
                border: '1px solid rgba(255,255,255,0.20)',
                backdropFilter: 'blur(8px)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.25)', transform: 'translateY(-1px)' },
                transition: 'all 0.2s ease',
              }}
            >
              <ArrowBack sx={{ fontSize: 22 }} />
            </IconButton>
            <Box sx={{ flexGrow: 1 }}>
              <Typography sx={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', fontFamily: fontStack }}>
                {task.title}
              </Typography>
              <Typography sx={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.65)', fontFamily: fontStack }}>
                {task.description}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Fade>

      <Grid container spacing={2.5}>
        {/* ═══ LEFT — Main Content ═══ */}
        <Grid item xs={12} md={8}>
          <Box display="flex" flexDirection="column" gap={2.5}>

            {/* Task Details Card */}
            <Slide in direction="up" timeout={600}>
              <Card sx={{
                borderRadius: '16px', bgcolor: '#fff',
                border: '1px solid rgba(41,128,185,0.08)',
                boxShadow: '0 1px 3px rgba(26,82,118,0.04), 0 4px 20px rgba(26,82,118,0.03)',
                overflow: 'hidden', position: 'relative',
              }}>
                <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #1a5276 0%, #2980b9 50%, #0d9488 100%)' }} />
                <CardContent sx={{ p: 3, pt: 3.5 }}>
                  <Box display="flex" alignItems="center" gap={1} mb={2.5}>
                    <InsertDriveFile sx={{ color: '#2980b9', fontSize: 22 }} />
                    <Typography sx={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', fontFamily: fontStack }}>
                      Task Details
                    </Typography>
                  </Box>

                  <Typography sx={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.7, mb: 2.5, fontFamily: fontStack }}>
                    {task.description}
                  </Typography>

                  <Divider sx={{ borderColor: 'rgba(41,128,185,0.06)', mb: 2.5 }} />

                  <Grid container spacing={2.5}>
                    <Grid item xs={6} md={4}>
                      <InfoRow icon={<Assignment />} label="Task ID" value={`#${task.id}`} />
                    </Grid>
                    <Grid item xs={6} md={4}>
                      <InfoRow icon={<Group />} label="Batch ID" value={task.batchId} />
                    </Grid>
                    <Grid item xs={6} md={4}>
                      <InfoRow icon={<Schedule />} label="Session ID" value={task.sessionId} />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Slide>

            {/* Questions Card */}
            <Slide in direction="up" timeout={800}>
              <Card sx={{
                borderRadius: '16px', bgcolor: '#fff',
                border: '1px solid rgba(41,128,185,0.08)',
                boxShadow: '0 1px 3px rgba(26,82,118,0.04), 0 4px 20px rgba(26,82,118,0.03)',
              }}>
                <CardContent sx={{ p: 3 }}>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <Box sx={{ width: 34, height: 34, borderRadius: '9px', background: 'linear-gradient(135deg, #2980b9 0%, #0d9488 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <QuestionAnswer sx={{ color: '#fff', fontSize: 18 }} />
                    </Box>
                    <Typography sx={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', fontFamily: fontStack }}>
                      Task Questions ({task.questions.length})
                    </Typography>
                  </Box>

                  {task.questions.length > 0 ? (
                    <List disablePadding>
                      {task.questions.map((question, index) => (
                        <ListItem
                          key={index}
                          disableGutters
                          sx={{
                            px: 1.5, py: 1.2, borderRadius: '12px', mb: 0.5,
                            transition: 'all 0.15s ease',
                            '&:hover': { bgcolor: 'rgba(41,128,185,0.03)' },
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 38 }}>
                            <Avatar sx={{
                              width: 28, height: 28, fontSize: '0.75rem', fontWeight: 700,
                              background: 'linear-gradient(135deg, #2980b9 0%, #0d9488 100%)',
                              color: '#fff', fontFamily: fontStack,
                            }}>
                              {index + 1}
                            </Avatar>
                          </ListItemIcon>
                          <ListItemText
                            primary={question}
                            primaryTypographyProps={{
                              sx: { fontSize: '0.88rem', fontWeight: 500, color: '#0f172a', lineHeight: 1.6, fontFamily: fontStack },
                            }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Box sx={{ py: 3, textAlign: 'center' }}>
                      <QuestionAnswer sx={{ fontSize: 36, color: '#cbd5e1', mb: 1 }} />
                      <Typography sx={{ fontSize: '0.85rem', color: '#94a3b8', fontFamily: fontStack }}>
                        No questions available for this task.
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Slide>
          </Box>
        </Grid>

        {/* ═══ RIGHT — Sidebar ═══ */}
        <Grid item xs={12} md={4}>
          <Zoom in timeout={700}>
            <Card sx={{
              borderRadius: '16px', bgcolor: '#fff',
              border: '1px solid rgba(41,128,185,0.08)',
              boxShadow: '0 1px 3px rgba(26,82,118,0.04), 0 4px 20px rgba(26,82,118,0.03)',
              position: 'sticky', top: 80,
            }}>
              <CardContent sx={{ p: 3 }}>
                <Typography sx={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', mb: 2.5, fontFamily: fontStack }}>
                  Task Summary
                </Typography>

                {/* Question count highlight */}
                <Box sx={{
                  p: 2.5, borderRadius: '14px', mb: 2.5,
                  background: 'linear-gradient(135deg, rgba(41,128,185,0.06) 0%, rgba(13,148,136,0.04) 100%)',
                  border: '1px solid rgba(41,128,185,0.08)',
                  textAlign: 'center',
                }}>
                  <Typography sx={{ fontSize: '2rem', fontWeight: 800, color: '#2980b9', lineHeight: 1, fontFamily: fontStack }}>
                    {task.questions.length}
                  </Typography>
                  <Typography sx={{ fontSize: '0.68rem', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', mt: 0.5, fontFamily: fontStack }}>
                    Total Questions
                  </Typography>
                </Box>

                <Divider sx={{ borderColor: 'rgba(41,128,185,0.06)', mb: 2 }} />

                {/* Key-Value pairs */}
                <Box display="flex" flexDirection="column" gap={1.5}>
                  {[
                    { label: 'Task ID', value: `#${task.id}` },
                    { label: 'Batch ID', value: task.batchId },
                    { label: 'Session ID', value: task.sessionId },
                    { label: 'Questions', value: task.questions.length },
                  ].map((item) => (
                    <Box key={item.label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography sx={{ fontSize: '0.82rem', color: '#94a3b8', fontFamily: fontStack }}>{item.label}</Typography>
                      <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', fontFamily: fontStack }}>{item.value}</Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Zoom>
        </Grid>
      </Grid>
    </Box>
  );
};

export default StudentViewTrainerTask;