from langchain_ollama.llms import OllamaLLM
from langchain_core.prompts import ChatPromptTemplate
from flask import Flask, request, jsonify

app = Flask(__name__)

model = OllamaLLM(model="llama3.1")

template = """
You are a Software Engineer who is great at writing JIRA stories.

If the following prompt is clear and detailed enough, provide ONLY a JIRA story with the following sections, clearly labeled:

**Title:** <title>
**Description:** <description>
**Acceptance Criteria:**
1. <criterion 1>
2. <criterion 2>
...
**Definition of Done:**
1. <done 1>
2. <done 2>
...

Do NOT invent or assume any specific names (e.g., database names, table names, service names) or values that are not explicitly provided in the prompt. If a name or value is needed but not given, use a generic placeholder (e.g., <database name>) or a general description.

If the prompt is too short, vague, or unclear (for example, if it is just one word or lacks enough detail), respond ONLY with a single clarifying question and nothing else. Do NOT include any commentary, the word 'CLEAR', or a story if clarification is needed.

Prompt: {question}
"""

prompt = ChatPromptTemplate.from_template(template)

chain = prompt | model
print('chain', chain)
# Story point estimation prompt and chain
sp_template = """
You are an experienced Agile team member. Given the following JIRA story description, estimate the story points using the Fibonacci sequence (1, 2, 3, 5, 8, 13, 21).

- 1: Very simple, almost no effort, no unknowns.
- 2: Simple, small, little complexity.
- 3: Small, some complexity or minor unknowns (e.g., a few variables, simple calculations, straightforward logic, deploying one resource).
- 5: Medium, moderate complexity or some unknowns.
- 8: Large, high complexity, significant unknowns or dependencies.
- 13: Very large, very complex, many unknowns, may need to be split.
- 21: Epic, too large for a sprint, should be split.

Consider effort, complexity, uncertainty, and dependencies. Respond ONLY with the number and a one-sentence rationale.

Story Description:
{description}
"""

sp_prompt = ChatPromptTemplate.from_template(sp_template)
story_point_chain = sp_prompt | model

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

        # If the result contains a story (Title/Description), treat as clear, even if it starts with 'CLEAR'
        if '**Title:**' in result and '**Description:**' in result:
            # Remove 'CLEAR' if present at the start
            if result.startswith('CLEAR'):
                result = result[len('CLEAR'):].strip()
            return jsonify({'status': 'clear', 'story': result})

        # If the result is just 'CLEAR', treat as clear (shouldn't happen with new prompt)
        if result.upper() == 'CLEAR':
            return jsonify({'status': 'clear'})

        # Otherwise, treat as a clarifying question
        return jsonify({'status': 'question', 'question': result})

    except Exception as e:
        return jsonify({'error': str(e)}), 500

def main():
    while True:
        print("\n\n-------------------------------")
        question = input("Describe the feature or task (q to quit): ")
        print("\n\n")
        if question.lower() == "q":
            break
        
        result = chain.invoke({"question": question})
        print(result)

if __name__ == "__main__":
    main()