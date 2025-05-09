from flask import Flask, request, jsonify
from flask_cors import CORS
from main import chain, story_point_chain
import re
import logging

app = Flask(__name__)
CORS(app)

# Set up basic logging (if not already set)
logging.basicConfig(level=logging.INFO)

def parse_jira_sections(text):
    # Use regex to extract sections
    sections = {
        'title': '',
        'description': '',
        'acceptance_criteria': [],
        'definition_of_done': [],
        'additional_questions': []
    }
    
    # Patterns for each section
    title_pattern = r"\*\*Title:?\*\*\s*(.*)"
    description_pattern = r"\*\*Description:?\*\*\s*([\s\S]*?)(?=\*\*Acceptance Criteria:?\*\*|\*\*Definition of Done:?\*\*|$)"
    acceptance_pattern = r"\*\*Acceptance Criteria:?\*\*\s*([\s\S]*?)(?=\*\*Definition of Done:?\*\*|$)"
    definition_pattern = r"\*\*Definition of Done:?\*\*\s*([\s\S]*)"
    questions_pattern = r"Additional questions:(.*)"

    title_match = re.search(title_pattern, text)
    if title_match:
        sections['title'] = title_match.group(1).strip('" ')

    description_match = re.search(description_pattern, text)
    if description_match:
        sections['description'] = description_match.group(1).strip()

    acceptance_match = re.search(acceptance_pattern, text)
    if acceptance_match:
        ac_text = acceptance_match.group(1).strip()
        ac_items = re.split(r'\n\s*\d+\.\s*', '\n' + ac_text)
        sections['acceptance_criteria'] = [item.strip() for item in ac_items if item.strip()]

    definition_match = re.search(definition_pattern, text)
    if definition_match:
        dd_text = definition_match.group(1).strip()
        # Remove any 'Additional questions:' and everything after from DoD
        dd_text = re.split(r'Additional questions:', dd_text)[0].strip()
        dd_items = re.split(r'\n\s*\*\s*', '\n' + dd_text)
        sections['definition_of_done'] = [item.strip() for item in dd_items if item.strip()]

    questions_match = re.search(questions_pattern, text)
    if questions_match:
        sections['additional_questions'] = [q.strip() for q in re.split(r'\d+\.', questions_match.group(1)) if q.strip()]

    # Fallback: If title is missing or blank, use first 8 words of description or 'Untitled Story'
    if not sections['title']:
        desc = sections['description']
        if desc:
            words = desc.split()
            sections['title'] = ' '.join(words[:8]) + ('...' if len(words) > 8 else '')
        else:
            sections['title'] = 'Untitled Story'

    return sections

@app.route('/clarify', methods=['POST'])
def clarify():
    try:
        data = request.get_json()
        user_prompt = data.get('description')
        if not user_prompt:
            return jsonify({'error': 'Description is required'}), 400

        # Use the LLM to check for clarity or generate a follow-up question
        clarify_prompt = (
            "You are an expert requirements analyst. "
            "Given the following user story prompt, determine if it is clear enough to write a JIRA story. "
            "If it is clear, respond ONLY with a JIRA story (title, description, acceptance criteria, definition of done). "
            "If not, respond ONLY with a single clarifying question and nothing else.\n"
            f"Prompt: {user_prompt}"
        )
        result = chain.invoke({"question": clarify_prompt})
        result = result.strip()

        # Log the raw LLM output
        logging.info("LLM clarify result: %s", result)

        if '**Title:**' in result and '**Description:**' in result:
            if result.startswith('CLEAR'):
                result = result[len('CLEAR'):].strip()
            logging.info("Returning status: clear, story: %s", result)
            return jsonify({'status': 'clear', 'story': result})

        if result.upper() == 'CLEAR':
            logging.info("Returning status: clear (no story)")
            return jsonify({'status': 'clear'})

        logging.info("Returning status: question, question: %s", result)
        return jsonify({'status': 'question', 'question': result})

    except Exception as e:
        logging.error("Error in /clarify: %s", str(e))
        return jsonify({'error': str(e)}), 500

@app.route('/generate-story', methods=['POST'])
def generate_story():
    try:
        data = request.get_json()
        description = data.get('description')
        
        if not description:
            return jsonify({'error': 'Description is required'}), 400
            
        # Generate the JIRA story using our existing chain
        result = chain.invoke({"question": description})
        result = result.strip()

        # Log the generated story content
        logging.info("Generated JIRA Story (raw):\n%s", result)

        # Parse the result into structured format
        sections = parse_jira_sections(result)

        # Log the parsed sections for clarity
        logging.info("Parsed JIRA Story Sections: %s", sections)
        
        return jsonify(sections)
        
    except Exception as e:
        logging.error("Error in /generate-story: %s", str(e))
        return jsonify({'error': str(e)}), 500

@app.route('/estimate-story-points', methods=['POST'])
def estimate_story_points():
    try:
        data = request.get_json()
        description = data.get('description')
        if not description:
            return jsonify({'error': 'Description is required'}), 400
        # Use the story_point_chain to get an estimate
        result = story_point_chain.invoke({"description": description})
        return jsonify({'estimate': result.strip()})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000) 