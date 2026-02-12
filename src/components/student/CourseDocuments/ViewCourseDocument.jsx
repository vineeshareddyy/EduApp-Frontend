import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  Card,
  Alert,
  Skeleton,
  Tooltip,
  Snackbar,
  Chip,
  Avatar,
  Stack,
  Divider,
  Fade,
  Slide,
  Zoom,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  ArrowBack,
  CheckCircle,
  ErrorOutline,
  Visibility,
  InsertDriveFile,
  Schedule,
  Folder,
  Assignment,
  Description,
  StarBorder,
  OpenInNew,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { courseDocumentsAPI } from '../../../services/API/courseDocuments';

const fontStack = "'Segoe UI', 'Helvetica Neue', sans-serif";

/* ——— Shimmer Loading ——— */
const ViewDocumentShimmer = () => (
  <Box sx={{ py: 2 }}>
    <Fade in timeout={800}>
      <Box>
        <Box display="flex" alignItems="center" mb={3} sx={{ p: 2.5, borderRadius: '16px', bgcolor: '#fff', border: '1px solid rgba(41,128,185,0.08)' }}>
          <Skeleton variant="circular" width={48} height={48} sx={{ mr: 2 }} />
          <Box sx={{ flexGrow: 1 }}>
            <Skeleton variant="text" width={300} height={36} sx={{ borderRadius: 2 }} />
            <Skeleton variant="text" width={200} height={24} sx={{ borderRadius: 1 }} />
          </Box>
          <Skeleton variant="rectangular" width={100} height={40} sx={{ borderRadius: '10px' }} />
        </Box>
        <Box sx={{ p: 4, borderRadius: '16px', bgcolor: '#fff', border: '1px solid rgba(41,128,185,0.08)' }}>
          <Skeleton variant="text" width={250} height={36} sx={{ mb: 3, borderRadius: 2 }} />
          <Grid container spacing={2.5}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Grid item xs={12} sm={6} lg={4} key={i}>
                <Skeleton variant="rectangular" width="100%" height={110} sx={{ borderRadius: '14px' }} />
              </Grid>
            ))}
          </Grid>
        </Box>
      </Box>
    </Fade>
  </Box>
);

const StudentViewCourseDocument = () => {
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const navigate = useNavigate();
  const { id } = useParams();

  const transformDocumentData = (apiDoc) => {
    if (!apiDoc) return null;
    return {
      batchId: apiDoc.Batch_ID || apiDoc.batchId,
      documentId: apiDoc.Document_ID || apiDoc.id,
      title: apiDoc.Document_Title ? apiDoc.Document_Title.replace(/"/g, '') : 'Untitled',
      path: apiDoc.Document_Path || apiDoc.path,
      uploadDateTime: apiDoc.Document_Upload_DateTime || apiDoc.uploadDate || apiDoc.createdAt,
      _original: apiDoc
    };
  };

  const fetchDocument = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await courseDocumentsAPI.getById(id);
      const documentData = response.data || response.document || response;
      if (documentData) {
        setDocument(transformDocumentData(documentData));
      } else {
        setError('Document not found');
        setDocument(null);
      }
    } catch (error) {
      setError(error.message || 'Failed to load document');
      setDocument(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (id) fetchDocument(); }, [id]);

  const handleView = () => {
    if (document.path && document.path.startsWith('http')) {
      window.open(document.path, '_blank');
      setSnackbar({ open: true, message: 'Opening document in new tab...', severity: 'success' });
    } else {
      setSnackbar({ open: true, message: 'Document path not available for viewing', severity: 'error' });
    }
  };

  const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false });

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Not available';
    try {
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
    } catch { return dateString; }
  };

  if (loading) return <ViewDocumentShimmer />;

  if (error && !document) {
    return (
      <Box sx={{ py: 2 }}>
        <Fade in timeout={600}>
          <Box>
            <Box
              sx={{
                p: 3, mb: 3, borderRadius: '16px', bgcolor: '#fff',
                border: '1px solid rgba(239,68,68,0.15)',
                boxShadow: '0 2px 12px rgba(239,68,68,0.06)',
              }}
            >
              <Box display="flex" alignItems="center">
                <IconButton
                  onClick={() => navigate('/student/course-documents')}
                  sx={{
                    mr: 2, width: 44, height: 44, borderRadius: '11px',
                    bgcolor: 'rgba(239,68,68,0.08)', color: '#ef4444',
                    '&:hover': { bgcolor: 'rgba(239,68,68,0.12)' },
                  }}
                >
                  <ArrowBack sx={{ fontSize: 22 }} />
                </IconButton>
                <Box>
                  <Typography sx={{ fontSize: '1.15rem', fontWeight: 700, color: '#ef4444', fontFamily: fontStack }}>
                    Document Not Found
                  </Typography>
                  <Typography sx={{ fontSize: '0.82rem', color: '#94a3b8', fontFamily: fontStack }}>
                    The requested document could not be located
                  </Typography>
                </Box>
              </Box>
            </Box>
            <Alert
              severity="error"
              icon={<ErrorOutline />}
              sx={{ borderRadius: '12px', border: '1px solid rgba(239,68,68,0.15)' }}
            >
              {error}
            </Alert>
          </Box>
        </Fade>
      </Box>
    );
  }

  if (!document) {
    return (
      <Box sx={{ py: 2 }}>
        <Box display="flex" alignItems="center" mb={3}>
          <IconButton onClick={() => navigate('/student/course-documents')} sx={{ mr: 2 }}>
            <ArrowBack />
          </IconButton>
          <Typography sx={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>Document Not Found</Typography>
        </Box>
        <Alert severity="error" sx={{ borderRadius: '12px' }}>The requested document could not be found.</Alert>
      </Box>
    );
  }

  /* ——— Info card helper ——— */
  const InfoCard = ({ icon, label, value, delay = 0, mono = false }) => (
    <Zoom in timeout={500} style={{ transitionDelay: `${delay}ms` }}>
      <Card
        sx={{
          p: 2.5, borderRadius: '14px', bgcolor: '#fff',
          border: '1px solid rgba(41,128,185,0.08)',
          boxShadow: '0 1px 3px rgba(26,82,118,0.04)',
          transition: 'all 0.25s ease',
          height: '100%',
          '&:hover': {
            transform: 'translateY(-3px)',
            boxShadow: '0 6px 20px rgba(41,128,185,0.10)',
            borderColor: 'rgba(41,128,185,0.18)',
          },
        }}
      >
        <Box display="flex" alignItems="center" gap={1} mb={1.5}>
          <Box sx={{ color: '#2980b9', display: 'flex' }}>
            {React.cloneElement(icon, { sx: { fontSize: 22 } })}
          </Box>
          <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: '#1a5276', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: fontStack }}>
            {label}
          </Typography>
        </Box>
        <Typography
          sx={{
            fontSize: mono ? '0.82rem' : '1.05rem',
            fontWeight: mono ? 500 : 700,
            color: '#0f172a',
            wordBreak: 'break-word',
            lineHeight: 1.4,
            fontFamily: mono ? 'monospace' : fontStack,
            ...(mono && {
              bgcolor: 'rgba(41,128,185,0.04)',
              p: 1.2, borderRadius: '8px',
              border: '1px solid rgba(41,128,185,0.06)',
              fontSize: '0.78rem', color: '#475569',
            }),
          }}
        >
          {value || 'N/A'}
        </Typography>
      </Card>
    </Zoom>
  );

  return (
    <Box sx={{ py: 2, fontFamily: fontStack }}>
      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: '12px', border: '1px solid rgba(239,68,68,0.15)' }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

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
          {/* Decorative */}
          <Box sx={{ position: 'absolute', top: -30, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />

          <Box display="flex" alignItems="center" position="relative" zIndex={1}>
            <IconButton
              onClick={() => navigate('/student/course-documents')}
              sx={{
                mr: 2, width: 42, height: 42, borderRadius: '11px',
                bgcolor: 'rgba(255,255,255,0.15)', color: '#fff',
                border: '1px solid rgba(255,255,255,0.20)',
                backdropFilter: 'blur(8px)',
                transition: 'all 0.2s ease',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.25)', transform: 'translateY(-1px)' },
              }}
            >
              <ArrowBack sx={{ fontSize: 22 }} />
            </IconButton>

            <Box sx={{ flexGrow: 1 }}>
              <Typography sx={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', fontFamily: fontStack }}>
                Document Center
              </Typography>
              <Typography sx={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.65)', fontFamily: fontStack }}>
                View document details and information
              </Typography>
            </Box>

            <Tooltip title="View Document" arrow>
              <Button
                variant="contained"
                startIcon={<Visibility sx={{ fontSize: '18px !important' }} />}
                onClick={handleView}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.92)', color: '#1a5276',
                  borderRadius: '10px', px: 2.5, py: 0.9,
                  fontWeight: 700, fontSize: '0.82rem',
                  textTransform: 'none', fontFamily: fontStack,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                  '&:hover': { bgcolor: '#fff', transform: 'translateY(-1px)', boxShadow: '0 4px 14px rgba(0,0,0,0.18)' },
                  transition: 'all 0.2s ease',
                }}
              >
                View
              </Button>
            </Tooltip>
          </Box>
        </Box>
      </Fade>

      {/* ═══ Document Info Card ═══ */}
      <Slide in direction="up" timeout={700}>
        <Box
          sx={{
            p: 3, borderRadius: '16px', bgcolor: '#fff',
            border: '1px solid rgba(41,128,185,0.08)',
            boxShadow: '0 1px 3px rgba(26,82,118,0.04), 0 4px 20px rgba(26,82,118,0.03)',
            position: 'relative', overflow: 'hidden',
          }}
        >
          {/* Top accent bar */}
          <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #1a5276 0%, #2980b9 50%, #0d9488 100%)' }} />

          {/* Document Title Section */}
          <Box display="flex" alignItems="center" mb={3} mt={1}>
            <Avatar
              sx={{
                width: 56, height: 56, mr: 2.5,
                background: 'linear-gradient(135deg, #2980b9 0%, #0d9488 100%)',
                boxShadow: '0 4px 14px rgba(41,128,185,0.25)',
                border: '3px solid #fff',
              }}
            >
              <Description sx={{ fontSize: 28, color: '#fff' }} />
            </Avatar>
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography
                sx={{
                  fontSize: '1.2rem', fontWeight: 700, mb: 1,
                  background: 'linear-gradient(135deg, #1a5276 0%, #2980b9 40%, #0d9488 100%)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  fontFamily: fontStack,
                }}
              >
                {document.title}
              </Typography>
              <Stack direction="row" spacing={1}>
                <Chip
                  icon={<Description sx={{ fontSize: '16px !important' }} />}
                  label="Course Document"
                  size="small"
                  sx={{
                    height: 26, fontSize: '0.72rem', fontWeight: 600,
                    bgcolor: 'rgba(41,128,185,0.08)', color: '#1a5276',
                    borderRadius: '7px', fontFamily: fontStack,
                    '& .MuiChip-icon': { color: '#2980b9' },
                  }}
                />
                <Chip
                  icon={<StarBorder sx={{ fontSize: '16px !important' }} />}
                  label="Active"
                  size="small"
                  variant="outlined"
                  sx={{
                    height: 26, fontSize: '0.72rem', fontWeight: 600,
                    borderColor: 'rgba(13,148,136,0.25)', color: '#0d9488',
                    borderRadius: '7px', fontFamily: fontStack,
                    '& .MuiChip-icon': { color: '#0d9488' },
                  }}
                />
              </Stack>
            </Box>
          </Box>

          <Divider sx={{ mb: 3, borderColor: 'rgba(41,128,185,0.06)' }} />

          <Box display="flex" alignItems="center" gap={1} mb={2.5}>
            <InsertDriveFile sx={{ color: '#2980b9', fontSize: 22 }} />
            <Typography sx={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', fontFamily: fontStack }}>
              Document Information
            </Typography>
          </Box>

          <Grid container spacing={2.5}>
            <Grid item xs={12} sm={6} lg={4}>
              <InfoCard icon={<Folder />} label="Batch ID" value={document.batchId} delay={100} />
            </Grid>
            <Grid item xs={12} sm={6} lg={4}>
              <InfoCard icon={<Assignment />} label="Document ID" value={document.documentId} delay={200} />
            </Grid>
            <Grid item xs={12} sm={6} lg={4}>
              <InfoCard icon={<Description />} label="Document Title" value={document.title} delay={300} />
            </Grid>
            <Grid item xs={12} lg={6}>
              <InfoCard icon={<Schedule />} label="Upload Date & Time" value={formatDateTime(document.uploadDateTime)} delay={400} />
            </Grid>
            <Grid item xs={12} lg={6}>
              <InfoCard icon={<OpenInNew />} label="Document Path" value={document.path || 'Path not available'} delay={500} mono />
            </Grid>
          </Grid>
        </Box>
      </Slide>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        TransitionComponent={Slide}
        TransitionProps={{ direction: 'up' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          icon={snackbar.severity === 'success' ? <CheckCircle /> : <ErrorOutline />}
          sx={{
            width: '100%', borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(26,82,118,0.15)',
            border: snackbar.severity === 'success' ? '1px solid rgba(13,148,136,0.2)' : '1px solid rgba(239,68,68,0.2)',
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default StudentViewCourseDocument;