import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function migrateQuestionCodes() {
  console.log('🚀 Starting question code migration...\n')

  const migrations = [
    // 전기기능사 (exam_id = 1)
    { exam_id: 1, subject_id: 1, prefix: 'ELEC-F-TH-', name: '전기기능사 - 전기이론' },
    { exam_id: 1, subject_id: 2, prefix: 'ELEC-F-MA-', name: '전기기능사 - 전기기기' },
    { exam_id: 1, subject_id: 3, prefix: 'ELEC-F-FA-', name: '전기기능사 - 전기설비' },

    // 전기산업기사 (exam_id = 2)
    { exam_id: 2, subject_id: 4, prefix: 'ELEC-I-TH-', name: '전기산업기사 - 전기이론' },
    { exam_id: 2, subject_id: 5, prefix: 'ELEC-I-MA-', name: '전기산업기사 - 전기기기' },
    { exam_id: 2, subject_id: 6, prefix: 'ELEC-I-CI-', name: '전기산업기사 - 회로이론' },
    { exam_id: 2, subject_id: 7, prefix: 'ELEC-I-CT-', name: '전기산업기사 - 제어공학' },
    { exam_id: 2, subject_id: 8, prefix: 'ELEC-I-EL-', name: '전기산업기사 - 전기설비기술기준' },

    // 전기기사 (exam_id = 3)
    { exam_id: 3, subject_id: 9, prefix: 'ELEC-E-TH-', name: '전기기사 - 전기이론' },
    { exam_id: 3, subject_id: 10, prefix: 'ELEC-E-MA-', name: '전기기사 - 전기기기' },
    { exam_id: 3, subject_id: 11, prefix: 'ELEC-E-PC-', name: '전기기사 - 전력공학' },
    { exam_id: 3, subject_id: 12, prefix: 'ELEC-E-EL-', name: '전기기사 - 전기설비기술기준' },
    { exam_id: 3, subject_id: 13, prefix: 'ELEC-E-CT-', name: '전기기사 - 제어공학' },
  ]

  let totalUpdated = 0

  for (const migration of migrations) {
    console.log(`📝 Migrating: ${migration.name}`)

    // Get all questions for this exam/subject
    const { data: questions, error: fetchError } = await supabase
      .from('questions')
      .select('id, question_code, created_at')
      .eq('exam_id', migration.exam_id)
      .eq('subject_id', migration.subject_id)
      .order('created_at', { ascending: true })

    if (fetchError) {
      console.error(`   ❌ Failed to fetch: ${fetchError.message}`)
      continue
    }

    if (!questions || questions.length === 0) {
      console.log(`   ⏭️  No questions found, skipping\n`)
      continue
    }

    // Update each question with new code
    let updated = 0
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i]
      const newCode = `${migration.prefix}${String(i + 1).padStart(3, '0')}`

      const { error: updateError } = await supabase
        .from('questions')
        .update({ question_code: newCode })
        .eq('id', question.id)

      if (updateError) {
        console.error(`   ❌ Failed to update question ${question.id}: ${updateError.message}`)
      } else {
        updated++
      }
    }

    console.log(`   ✅ Updated ${updated}/${questions.length} questions\n`)
    totalUpdated += updated
  }

  console.log(`\n🎉 Migration complete! Total questions updated: ${totalUpdated}`)
}

migrateQuestionCodes()
  .then(() => {
    console.log('\n✅ Migration finished successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  })
