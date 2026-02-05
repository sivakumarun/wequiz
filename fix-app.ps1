# PowerShell script to fix the app.js file
$filePath = "frontend\app.js"
$content = Get-Content $filePath -Raw

# Remove the currentQuestionId variable declaration
$content = $content -replace 'let answeredQuestions = new Set\(\); // Track questions user has answered\r?\nlet currentQuestionId = null; // Track current active question', 'let answeredQuestions = new Set(); // Track questions user has answered'

# Fix first branch (populated question)
$pattern1 = '(?s)const questionId = question\._id \|\| question\.id;\s+// Only show if.*?if \(questionId !== currentQuestionId\) \{\s+currentQuestionId = questionId;\s+if \(question && question\.text\) \{'
$replacement1 = 'if (question && question.text) {'
$content = $content -replace $pattern1, $replacement1

# Fix the closing braces for first branch
$pattern2 = '(?s)\} else \{\s+console\.error\(''Invalid question data:'', question\);\s+\}\s+\}\s+return;'
$replacement2 = '} else {'+"`r`n"+'                        console.error(''Invalid question data:'', question);'+"`r`n"+'                    }'+"`r`n"+'                    return;'
$content = $content -replace $pattern2, $replacement2

# Fix second branch (fetch question)
$pattern3 = '(?s)const questionId = session\.activeQuestionId;\s+// Only fetch and show if.*?if \(questionId !== currentQuestionId\) \{\s+currentQuestionId = questionId;\s+const qResponse'
$replacement3 = 'const questionId = session.activeQuestionId;'+"`r`n"+"`r`n"+'                const qResponse'
$content = $content -replace $pattern3, $replacement3

# Fix the closing brace for second branch
$pattern4 = '(?s)console\.error\(''Invalid question data:'', question\);\s+\}\s+\}\s+\} else \{'
$replacement4 = 'console.error(''Invalid question data:'', question);'+"`r`n"+'                    }'+"`r`n"+'            } else {'
$content = $content -replace $pattern4, $replacement4

# Save the fixed content
$content | Set-Content $filePath -NoNewline

Write-Host "File fixed successfully!"
