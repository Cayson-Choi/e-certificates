export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-gray-900 dark:bg-gray-950 text-white py-8 mt-auto border-t border-gray-800 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center">
          <div className="mb-4">
            <h3 className="text-xl font-bold mb-2">CAYSON TECH</h3>
            <p className="text-gray-400 dark:text-gray-500 text-sm">전기 자격시험 CBT 시스템</p>
          </div>

          <div className="border-t border-gray-700 dark:border-gray-800 pt-4">
            <p className="text-sm text-gray-400 dark:text-gray-500">
              © {currentYear} CAYSON TECH. All rights reserved.
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-600 mt-2">
              본 사이트의 모든 콘텐츠는 CAYSON TECH의 소유이며, 무단 전재 및 재배포를 금지합니다.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
