const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

interface GradeResult {
  score: number
  feedback: string
}

export async function gradeSubjectiveAnswer(params: {
  questionText: string
  answerText: string
  studentAnswer: string
  points: number
  questionType: 'SHORT_ANSWER' | 'ESSAY'
}): Promise<GradeResult | null> {
  const apiKey = process.env.OPENROUTER_API_KEY
  const model = process.env.OPENROUTER_MODEL || 'deepseek/deepseek-r1-0528:free'

  if (!apiKey) {
    console.error('OPENROUTER_API_KEY is not set')
    return null
  }

  const { questionText, answerText, studentAnswer, points, questionType } = params

  const hasReferenceAnswer = answerText && answerText.trim().length > 0
  const referenceSection = hasReferenceAnswer
    ? `[참고 정답] ${answerText}\n`
    : ''
  const referenceInstruction = hasReferenceAnswer
    ? '참고 정답을 기준으로 '
    : '당신의 전문 지식을 바탕으로 '

  let prompt: string
  if (questionType === 'SHORT_ANSWER') {
    prompt = `당신은 전기 분야 전문가이자 자격시험 채점관입니다.

[문제] ${questionText}
${referenceSection}[학생 답안] ${studentAnswer}
[배점] ${points}점
[문제 유형] 단답형

${referenceInstruction}학생 답안이 정확하면 만점, 틀리면 0점을 부여하세요.
반드시 아래 형식으로만 답하세요:
점수: {숫자}
이유: {한두 문장으로 채점 이유}`
  } else {
    prompt = `당신은 전기 분야 전문가이자 자격시험 채점관입니다.

[문제] ${questionText}
${referenceSection}[학생 답안] ${studentAnswer}
[배점] ${points}점
[문제 유형] 서술형

${referenceInstruction}학생 답안의 정확성과 핵심 내용 포함 여부에 따라 부분 점수를 부여하세요.
반드시 0~${points} 사이의 정수로 점수를 부여하세요.
반드시 아래 형식으로만 답하세요:
점수: {숫자}
이유: {한두 문장으로 채점 이유}`
  }

  try {
    // 60초 타임아웃
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 60000)

    const res = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://cayson.co.kr',
        'X-Title': 'CBT Grading System',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        max_tokens: 2000,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!res.ok) {
      console.error('[OpenRouter] API error:', res.status, await res.text())
      return null
    }

    const data = await res.json()
    console.log('[OpenRouter] Full response:', JSON.stringify(data).substring(0, 500))

    const message = data.choices?.[0]?.message
    let content = message?.content || ''
    const reasoning = message?.reasoning_content || message?.reasoning || ''

    // content가 비어있으면 reasoning에서 추출
    let textToSearch = content || reasoning

    // <think>...</think> 태그 제거 후 검색
    const withoutThink = textToSearch.replace(/<think>[\s\S]*?<\/think>/g, '')
    if (withoutThink.trim()) {
      textToSearch = withoutThink
    }

    // "점수: N" 패턴 추출
    const match = textToSearch.match(/점수\s*[:：]\s*(\d+)/)
    if (!match) {
      console.error('[OpenRouter] Failed to parse score from:', textToSearch.substring(0, 300))
      return null
    }

    const score = parseInt(match[1], 10)
    const clampedScore = Math.max(0, Math.min(score, points))

    // "이유: ..." 패턴 추출
    const feedbackMatch = textToSearch.match(/이유\s*[:：]\s*(.+)/)
    const feedback = feedbackMatch ? feedbackMatch[1].trim() : ''

    console.log(`[OpenRouter] Parsed score: ${clampedScore}/${points}, feedback: ${feedback.substring(0, 100)}`)
    return { score: clampedScore, feedback }
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      console.error('[OpenRouter] Request timed out (60s)')
    } else {
      console.error('[OpenRouter] API call failed:', error)
    }
    return null
  }
}
