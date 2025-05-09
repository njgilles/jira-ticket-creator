import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    TextField,
    Paper,
    Typography,
    CircularProgress,
    Alert,
    Avatar,
    IconButton,
    Divider,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import { generateJiraStory, JiraStory, clarifyPrompt, estimateStoryPoints } from '../services/api';
import logo from '../logo.svg';
import Cat from '../assets/animals/Cat';
import Dog from '../assets/animals/Dog';
import Elephant from '../assets/animals/Elephant';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

function parseJiraSections(text: string) {
    const sections: {
        title?: string;
        description?: string;
        acceptance_criteria?: string[];
        definition_of_done?: string[];
        additional_questions?: string[];
    } = {};

    // Title
    const titleMatch = text.match(/\*\*Title:?\*\*\s*(.*)/i);
    if (titleMatch) sections.title = titleMatch[1].trim();

    // Description
    const descMatch = text.match(/\*\*Description:?\*\*\s*([\s\S]*?)(?=\*\*Acceptance Criteria:?\*\*|\*\*Definition of Done:?\*\*|\*\*|$)/i);
    if (descMatch) sections.description = descMatch[1].trim();

    // Acceptance Criteria (robust: stops at next double asterisk section or end)
    const acMatch = text.match(/\*\*Acceptance Criteria:?\*\*\s*([\s\S]*?)(?=\*\*[A-Za-z ]+:?\*\*|$)/i);
    if (acMatch) {
        // Split by lines or numbers/bullets
        sections.acceptance_criteria = acMatch[1]
            .split(/\n|(?<=\d\.)\s+|(?<=\*)\s+/)
            .map(s => s.replace(/^[\d\*\.\-\s]+/, '').trim())
            .filter(Boolean);
    }

    // Definition of Done (robust: stops at next double asterisk section or end)
    const dodMatch = text.match(/\*\*Definition of Done.*?\*\*\s*([\s\S]*?)(?=\*\*[A-Za-z ]+:?\*\*|$)/i);
    if (dodMatch) {
        sections.definition_of_done = dodMatch[1]
            .split(/\n|(?<=\d\.)\s+|(?<=\*)\s+/)
            .map(s => s.replace(/^[\d\*\.\-\s]+/, '').trim())
            .filter(Boolean);
    }

    // Additional Questions
    const questionsMatch = text.match(/Additional questions:(.*)/i);
    if (questionsMatch) {
        sections.additional_questions = questionsMatch[1]
            .split(/\d+\./)
            .map(s => s.trim())
            .filter(Boolean);
    }

    return sections;
}

// Animal avatar array
const animalAvatars = [Cat, Dog, Elephant];

const JiraStoryForm: React.FC = () => {
    const [description, setDescription] = useState('');
    const [clarification, setClarification] = useState('');
    const [clarifyQuestion, setClarifyQuestion] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [story, setStory] = useState<JiraStory | null>(null);
    const [stories, setStories] = useState<JiraStory[]>([]);
    const [step, setStep] = useState<'initial' | 'clarify' | 'generating'>('initial');
    const [selectedStory, setSelectedStory] = useState<JiraStory | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [copyStatus, setCopyStatus] = useState<{[key: string]: boolean}>({});

    useEffect(() => {
        const savedStories = localStorage.getItem('jiraStories');
        if (savedStories) {
            setStories(JSON.parse(savedStories));
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('jiraStories', JSON.stringify(stories));
    }, [stories]);

    const handleInitialSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setStory(null);
        setClarifyQuestion(null);
        setStep('initial');

        try {
            const result = await clarifyPrompt(description);
            if (result.status === 'clear' && result.story) {
                setStep('generating');
                await handleGenerate(result.story);
                setStep('initial');
            } else if (result.status === 'clear') {
                setStep('generating');
                await handleGenerate(description);
                setStep('initial');
            } else if (result.status === 'question' && result.question) {
                setClarifyQuestion(result.question);
                setStep('clarify');
            } else {
                setError('Unexpected response from clarification.');
            }
        } catch (err) {
            setError('Failed to clarify prompt. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleClarificationSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setStep('generating');
        try {
            // Combine the original description and the clarification answer
            const combined = `${description}\n\nClarification: ${clarification}`;
            await handleGenerate(combined);
        } catch (err) {
            setError('Failed to generate JIRA story. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async (desc: string) => {
        try {
            const result = await generateJiraStory(desc);
            // Estimate story points
            const sp = await estimateStoryPoints(result.description);
            const storyWithPoints = { ...result, story_points: sp };
            setStory(storyWithPoints);
            setStories([storyWithPoints, ...stories]); // Add new story to the top
            setStep('initial');
            setClarification('');
            setClarifyQuestion(null);
        } catch (err) {
            setError('Failed to generate JIRA story. Please try again.');
        }
    };

    const handleOpenDialog = (story: JiraStory) => {
        setSelectedStory(story);
        setDialogOpen(true);
        // Log the parsed acceptance criteria for debugging
        const parsed = story.description && story.description.includes('**Title:**')
            ? parseJiraSections(story.description)
            : null;
        if (parsed) {
            console.log('Parsed acceptance criteria:', parsed.acceptance_criteria);
        }
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setSelectedStory(null);
    };

    const handleCopy = (key: string, value: string | string[] | undefined) => {
        if (!value) return;
        const text = Array.isArray(value) ? value.join('\n') : value;
        navigator.clipboard.writeText(text);
        setCopyStatus((prev) => ({ ...prev, [key]: true }));
        setTimeout(() => setCopyStatus((prev) => ({ ...prev, [key]: false })), 1200);
    };

    const parsed = selectedStory?.description && selectedStory.description.includes('**Title:**')
        ? parseJiraSections(selectedStory.description)
        : null;

    const definitionOfDone = parsed?.definition_of_done ?? selectedStory?.definition_of_done;
    const acceptanceCriteria = parsed?.acceptance_criteria ?? selectedStory?.acceptance_criteria;

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                py: 0,
            }}
        >
            <Paper
                elevation={6}
                sx={{
                    width: '100%',
                    maxWidth: 700,
                    borderRadius: 5,
                    p: { xs: 2, sm: 4 },
                    background: '#fff',
                    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
                    mb: 4,
                }}
            >
                <Typography
                    variant="h3"
                    fontWeight={700}
                    align="center"
                    gutterBottom
                    sx={{
                        background: 'linear-gradient(90deg, #7b2ff2 0%, #f357a8 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}
                >
                    JIRA Story Generator
                </Typography>
                {step === 'initial' && (
                    <form onSubmit={handleInitialSubmit}>
                        {loading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 120 }}>
                                <img
                                    src={logo}
                                    alt="Loading..."
                                    style={{
                                        height: 64,
                                        width: 64,
                                        animation: 'spin 1.2s linear infinite',
                                    }}
                                />
                                <style>
                                    {`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}
                                </style>
                            </Box>
                        ) : (
                            <TextField
                                fullWidth
                                multiline
                                rows={4}
                                label="Feature Description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                margin="normal"
                                required
                            />
                        )}
                        <Button
                            type="submit"
                            variant="contained"
                            color="primary"
                            disabled={loading || !description.trim()}
                            sx={{ mt: 2 }}
                        >
                            {loading ? <CircularProgress size={24} /> : 'Generate Story'}
                        </Button>
                    </form>
                )}
                {step === 'clarify' && clarifyQuestion && (
                    <form onSubmit={handleClarificationSubmit}>
                        <Alert severity="info" sx={{ mt: 2, mb: 2 }}>{clarifyQuestion}</Alert>
                        <TextField
                            fullWidth
                            multiline
                            rows={2}
                            label="Your Answer"
                            value={clarification}
                            onChange={(e) => setClarification(e.target.value)}
                            margin="normal"
                            required
                        />
                        <Button
                            type="submit"
                            variant="contained"
                            color="primary"
                            disabled={loading || !clarification.trim()}
                            sx={{ mt: 2 }}
                        >
                            {loading ? <CircularProgress size={24} /> : 'Submit Clarification'}
                        </Button>
                    </form>
                )}
                {error && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                        {error}
                    </Alert>
                )}
            </Paper>
            {/* Stories Grid */}
            {stories.length > 0 && (
                <Box sx={{ mt: 2, width: '100%', maxWidth: 900 }}>
                    <Typography variant="h5" gutterBottom sx={{ color: '#fff', fontWeight: 600 }}>
                        Generated JIRA Stories
                    </Typography>
                    <Box
                        sx={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 2,
                            justifyContent: 'flex-start',
                        }}
                    >
                        {stories.map((s, idx) => (
                            <Box
                                key={idx}
                                sx={{
                                    flex: '1 1 250px',
                                    maxWidth: 320,
                                    minWidth: 250,
                                    mb: 2,
                                }}
                            >
                                <Paper
                                    elevation={3}
                                    onClick={() => handleOpenDialog(s)}
                                    sx={{
                                        background: idx === 0 ? '#FFF9E1' : '#f8f6ff',
                                        borderRadius: 3,
                                        p: 2,
                                        minHeight: 120,
                                        cursor: 'pointer',
                                        boxShadow: 2,
                                        border: idx === 0 ? '2.5px solid #FFD600' : '2px solid transparent',
                                        transition: 'box-shadow 0.2s, border 0.2s, background 0.2s',
                                        '&:hover': {
                                            boxShadow: 8,
                                            border: idx === 0 ? '2.5px solid #FFD600' : '2px solid #f357a8',
                                            background: idx === 0 ? '#FFF9E1' : '#f3eaff',
                                        },
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                        <Avatar sx={{ bgcolor: 'primary.main', mr: 1 }}>
                                            {React.createElement(animalAvatars[idx % animalAvatars.length])}
                                        </Avatar>
                                        <Box sx={{ flex: 1 }}>
                                            <Typography
                                                variant="subtitle1"
                                                fontWeight={600}
                                                noWrap
                                                sx={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}
                                            >
                                                {s.title}
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                                sx={{
                                                    maxWidth: '200px',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                    display: 'block',
                                                }}
                                            >
                                                {s.description}
                                            </Typography>
                                        </Box>
                                        {s.story_points && (
                                            <Box sx={{ ml: 1, px: 1.2, py: 0.2, bgcolor: '#FFD600', color: '#333', borderRadius: 2, fontWeight: 700, fontSize: 15, minWidth: 32, textAlign: 'center' }}>
                                                {s.story_points.split(' ')[0]}
                                            </Box>
                                        )}
                                    </Box>
                                </Paper>
                            </Box>
                        ))}
                    </Box>
                </Box>
            )}
            <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span>{parsed?.title || selectedStory?.title}</span>
                    <IconButton size="small" onClick={() => handleCopy('title', parsed?.title || selectedStory?.title)}>
                        <ContentCopyIcon fontSize="small" color={copyStatus['title'] ? 'success' : 'inherit'} />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers sx={{ background: '#f8f6ff' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle1" gutterBottom>Description</Typography>
                        <IconButton size="small" onClick={() => handleCopy('description', parsed?.description || selectedStory?.description)}>
                            <ContentCopyIcon fontSize="small" color={copyStatus['description'] ? 'success' : 'inherit'} />
                        </IconButton>
                    </Box>
                    <Typography paragraph>
                        {parsed?.description || selectedStory?.description}
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                    {definitionOfDone && definitionOfDone.length > 0 && (
                        <>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <Typography variant="subtitle1" gutterBottom>Definition of Done</Typography>
                                <IconButton size="small" onClick={() => handleCopy('dod', definitionOfDone)}>
                                    <ContentCopyIcon fontSize="small" color={copyStatus['dod'] ? 'success' : 'inherit'} />
                                </IconButton>
                            </Box>
                            <ul>
                                {definitionOfDone.map((item, i) => (
                                    <li key={i}><Typography>{item}</Typography></li>
                                ))}
                            </ul>
                            <Divider sx={{ my: 1 }} />
                        </>
                    )}
                    {acceptanceCriteria && acceptanceCriteria.length > 0 && (
                        <>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <Typography variant="subtitle1" gutterBottom>Acceptance Criteria</Typography>
                                <IconButton size="small" onClick={() => handleCopy('ac', acceptanceCriteria)}>
                                    <ContentCopyIcon fontSize="small" color={copyStatus['ac'] ? 'success' : 'inherit'} />
                                </IconButton>
                            </Box>
                            <ul>
                                {acceptanceCriteria.map((item, i) => (
                                    <li key={i}><Typography>{item}</Typography></li>
                                ))}
                            </ul>
                            <Divider sx={{ my: 1 }} />
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default JiraStoryForm; 