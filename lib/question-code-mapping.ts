/**
 * 문제 코드 매핑 시스템
 * 형식: [분야(4)]-[등급(1)]-[과목(2)]-[번호(3)]
 * 예: ELEC-F-TH-001
 */

// 시험명 → 코드 매핑
export const EXAM_TO_CODE: Record<string, { field: string; level: string }> = {
  // 전기 계열
  '전기기능사': { field: 'ELEC', level: 'F' },
  '전기산업기사': { field: 'ELEC', level: 'I' },
  '전기기사': { field: 'ELEC', level: 'E' },

  // 전기공사 계열
  '전기공사기능사': { field: 'ELCS', level: 'F' },
  '전기공사산업기사': { field: 'ELCS', level: 'I' },
  '전기공사기사': { field: 'ELCS', level: 'E' },

  // 전자 계열
  '전자기능사': { field: 'ELET', level: 'F' },
  '전자산업기사': { field: 'ELET', level: 'I' },
  '전자기사': { field: 'ELET', level: 'E' },

  // 소방설비 계열 - 전기 (일반형)
  '소방설비산업기사(전기)': { field: 'FIEE', level: 'I' },
  '소방설비기사(전기)': { field: 'FIEE', level: 'E' },

  // 소방설비 계열 - 전기 (과정평가형)
  '소방설비산업기사(전기) 과정평가형': { field: 'FIEP', level: 'I' },

  // 소방설비 계열 - 기계 (일반형)
  '소방설비산업기사(기계)': { field: 'FIME', level: 'I' },
  '소방설비기사(기계)': { field: 'FIME', level: 'E' },

  // 소방설비 계열 - 기계 (과정평가형)
  '소방설비산업기사(기계) 과정평가형': { field: 'FIMP', level: 'I' },

  // 추후 추가
  // '공유압기능사': { field: 'HYDR', level: 'F' },
  // '정보처리기능사': { field: 'INFO', level: 'F' },
}

// 과목명 → 코드 매핑
export const SUBJECT_TO_CODE: Record<string, string> = {
  // 전기 분야
  '전기이론': 'TH',
  '전기기기': 'MA',
  '전기설비': 'FA',
  '회로이론': 'CI',
  '제어공학': 'CT',
  '전기설비기술기준': 'EL',
  '전력공학': 'PC',

  // 소방 분야 (예시 - 실제 과목명에 맞게 수정 필요)
  '소방원론': 'FR',
  '소방유체역학': 'FL',
  '소방전기': 'FE',
  '소방기계': 'FM',
  '소방관계법규': 'FL',

  // 추후 추가
  // '유체역학': 'HD',
  // '공압': 'PN',
}

// 코드 → 시험명 역매핑
export const CODE_TO_EXAM: Record<string, string> = {
  // 전기
  'ELEC-F': '전기기능사',
  'ELEC-I': '전기산업기사',
  'ELEC-E': '전기기사',

  // 전기공사
  'ELCS-F': '전기공사기능사',
  'ELCS-I': '전기공사산업기사',
  'ELCS-E': '전기공사기사',

  // 전자
  'ELET-F': '전자기능사',
  'ELET-I': '전자산업기사',
  'ELET-E': '전자기사',

  // 소방설비(전기) 일반형
  'FIEE-I': '소방설비산업기사(전기)',
  'FIEE-E': '소방설비기사(전기)',

  // 소방설비(전기) 과정평가형
  'FIEP-I': '소방설비산업기사(전기) 과정평가형',

  // 소방설비(기계) 일반형
  'FIME-I': '소방설비산업기사(기계)',
  'FIME-E': '소방설비기사(기계)',

  // 소방설비(기계) 과정평가형
  'FIMP-I': '소방설비산업기사(기계) 과정평가형',

  // 추후 추가
  // 'HYDR-F': '공유압기능사',
  // 'INFO-F': '정보처리기능사',
}

// 코드 → 과목명 역매핑
export const CODE_TO_SUBJECT: Record<string, string> = {
  // 전기
  'TH': '전기이론',
  'MA': '전기기기',
  'FA': '전기설비',
  'CI': '회로이론',
  'CT': '제어공학',
  'EL': '전기설비기술기준',
  'PC': '전력공학',

  // 소방 (예시 - 실제 과목명에 맞게 수정 필요)
  'FR': '소방원론',
  'FL': '소방유체역학',
  'FE': '소방전기',
  'FM': '소방기계',
  'FL': '소방관계법규',

  // 추후 추가
  // 'HD': '유체역학',
  // 'PN': '공압',
}

/**
 * 문제 코드 생성
 * @param examName - 시험명 (예: "전기기능사")
 * @param subjectName - 과목명 (예: "전기이론")
 * @param number - 문제 번호 (예: 1)
 * @returns 문제 코드 (예: "ELEC-F-TH-001")
 */
export function generateQuestionCode(
  examName: string,
  subjectName: string,
  number: number
): string {
  const examCode = EXAM_TO_CODE[examName]
  const subjectCode = SUBJECT_TO_CODE[subjectName]

  if (!examCode) {
    throw new Error(`알 수 없는 시험: ${examName}`)
  }

  if (!subjectCode) {
    throw new Error(`알 수 없는 과목: ${subjectName}`)
  }

  const { field, level } = examCode
  const paddedNumber = String(number).padStart(3, '0')

  return `${field}-${level}-${subjectCode}-${paddedNumber}`
}

/**
 * 문제 코드 파싱
 * @param code - 문제 코드 (예: "ELEC-F-TH-001")
 * @returns 파싱된 정보
 */
export function parseQuestionCode(code: string): {
  field: string
  level: string
  subject: string
  number: number
} | null {
  const match = code.match(/^([A-Z]{4})-([A-Z])-([A-Z]{2})-(\d{3})$/)

  if (!match) {
    return null
  }

  return {
    field: match[1],
    level: match[2],
    subject: match[3],
    number: parseInt(match[4], 10),
  }
}

/**
 * 다음 문제 코드 생성
 * @param lastCode - 마지막 문제 코드 (예: "ELEC-F-TH-050")
 * @returns 다음 문제 코드 (예: "ELEC-F-TH-051")
 */
export function getNextQuestionCode(lastCode: string): string | null {
  const parsed = parseQuestionCode(lastCode)

  if (!parsed) {
    return null
  }

  const nextNumber = parsed.number + 1
  return `${parsed.field}-${parsed.level}-${parsed.subject}-${String(nextNumber).padStart(3, '0')}`
}
