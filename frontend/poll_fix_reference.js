// Fixed poll logic - this is the corrected code to replace lines 166-207

// Check if activeQuestionId is already a full object (if so, use it directly)
if (typeof session.activeQuestionId === 'object' && session.activeQuestionId._id) {
    const question = session.activeQuestionId;
    console.log('Question already populated:', question);

    if (question && question.text) {
        showQuestion(question);
    } else {
        console.error('Invalid question data:', question);
    }
    return;
}

// Otherwise fetch the question by ID
const questionId = session.activeQuestionId;

const qResponse = await fetch(`${API_BASE_URL}/questions/${questionId}`);

if (!qResponse.ok) {
    console.error('Failed to fetch question:', qResponse.status);
    return;
}

const question = await qResponse.json();
console.log('Question fetched:', question);

if (question && question.text) {
    showQuestion(question);
} else {
    console.error('Invalid question data:', question);
}
