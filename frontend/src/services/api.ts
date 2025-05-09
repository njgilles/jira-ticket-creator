import axios from 'axios';


const API_URL = 'http://localhost:5000';

export interface JiraStory {
    title: string;
    description: string;
    acceptance_criteria: string[];
    definition_of_done: string[];
    additional_questions?: string[];
    story_points?: string;
    loadingStoryPoints?: boolean;
}

export const generateJiraStory = async (description: string): Promise<JiraStory> => {
    try {
        const response = await axios.post(`${API_URL}/generate-story`, { description });
        return response.data;
    } catch (error) {
        console.error('Error generating JIRA story:', error);
        throw error;
    }
};

export const estimateStoryPoints = async (description: string): Promise<string> => {
    try {
        const response = await axios.post(`${API_URL}/estimate-story-points`, { description });
        return response.data.estimate;
    } catch (error) {
        console.error('Error estimating story points:', error);
        throw error;
    }
};

export const clarifyPrompt = async (description: string): Promise<{status: string, question?: string, story?: string}> => {
    try {
        const response = await axios.post(`${API_URL}/clarify`, { description });
        return response.data;
    } catch (error) {
        console.error('Error clarifying prompt:', error);
        throw error;
    }
}; 